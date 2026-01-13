

import base64
import threading
from pathlib import Path
import re

import cv2
import easyocr
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from ultralytics import YOLO

router = APIRouter(prefix="/streaming", tags=["Parking - Capture"])

# ============ MODEL & OCR (lazy load) ============

MODEL_PATH = Path("best.pt")

_model = None
_reader = None
_model_lock = threading.Lock() # để tránh trường hợp nhiều request cùng load model lúc đầu

_reader_lock = threading.Lock()


def get_model():
  
  global _model
  if _model is None:
      with _model_lock:
          if _model is None:  # double-check
              try:
                  _model = YOLO(str(MODEL_PATH))
                  print("✅ YOLO model loaded.")
              except Exception as e:
                  print("❌ Lỗi load YOLO model best.pt:", e)
                  raise RuntimeError("Không thể load YOLO model") from e
  return _model


def get_reader():
 
  global _reader
  if _reader is None:
      with _reader_lock:
          if _reader is None:
              try:
                  _reader = easyocr.Reader(["en"], gpu=False)
                  print("✅ EasyOCR reader loaded.")
              except Exception as e:
                  print("❌ Lỗi khởi tạo EasyOCR:", e)
                  raise RuntimeError("Không thể khởi tạo EasyOCR") from e
  return _reader




cap = None  # đối tượng VideoCapture dùng chung
cam_lock = threading.Lock()  # lock để tránh 2 thread đọc camera cùng lúc


def get_camera():
    
    global cap
    if cap is None or not cap.isOpened():
        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            cap.release()
            cap = None
            raise RuntimeError("Không mở được camera")
    return cap




def detect_plate_in_frame(frame):
    model = get_model()
    reader = get_reader()

    results = model(frame, imgsz=640, conf=0.3)
    all_texts = []

    for r in results:
        for box in r.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist()) # Cắt vùng nghi biển số từ ảnh gốc
            plate = frame[y1:y2, x1:x2]

            if plate.size == 0: # bỏ qua nếu vùng cắt rỗng
                continue

            # texts: list các chuỗi OCR (thường theo từng dòng / cụm chữ)
            texts = reader.readtext(plate, detail=0)
            if texts:
                all_texts.extend(texts)

            # vẽ khung
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

    if all_texts:
        # Ghép các dòng/cụm lại với 1 dấu cách giữa các phần
        # Ví dụ: ["73-K9", "9999"] -> "73-K9 9999"
        raw_text = " ".join(t.strip() for t in all_texts if t.strip())

        # Chuẩn hóa lại khoảng trắng (phòng khi OCR trả nhiều khoảng trắng)
        plate_text = re.sub(r"\s+", " ", raw_text).strip()
        
        plate_text = plate_text.upper()

        if plate_text == "":
            plate_text = None
    else:
        plate_text = None

    if plate_text:
        cv2.putText(
            frame,
            plate_text,
            (20, 40),
            cv2.FONT_HERSHEY_SIMPLEX,
            1.2,
            (0, 255, 0),
            2,
            cv2.LINE_AA,
        )

    return plate_text, frame



# ============ LIVESTREAM ============

def gen_frames():
    """
    Đọc camera liên tục, stream MJPEG.
    Camera được mở khi có client, và sẽ được release khi stream kết thúc.
    """
    global cap

    cam = get_camera()

    try:
        while True:
            # đọc frame dưới lock để tránh xung đột với API snap
            with cam_lock:
                ok, frame = cam.read()
            if not ok or frame is None:
                break

            # YOLO + OCR + vẽ khung
            _, annotated = detect_plate_in_frame(frame)

            ret, buffer = cv2.imencode(".jpg", annotated)
            if not ret:
                continue
            jpg_bytes = buffer.tobytes()

            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + jpg_bytes + b"\r\n"
            )
    finally:
        # Khi client đóng kết nối → vòng while thoát → giải phóng camera
        with cam_lock:
            if cap is not None and cap.isOpened():
                cap.release()
                cap = None
                print("✅ Camera released (stream ended)")


@router.get("/capture_in")
def capture_in_stream():
    """Livestream camera để hiển thị ở frontend (thẻ <img>)."""
    try:
        return StreamingResponse(
            gen_frames(),
            media_type="multipart/x-mixed-replace; boundary=frame",
        )
    except RuntimeError as e:
        # lỗi mở camera / lỗi load model / ocr
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        print("Lỗi stream:", e)
        raise HTTPException(
            status_code=500,
            detail="Lỗi không xác định khi livestream camera",
        )


# ============ SNAP + OCR ============

@router.post("/capture_in_snap")
def capture_in_snap():
    """
    Chụp 1 frame từ camera chung, đọc biển số, trả về text + ảnh base64.
    """
    global cap

    try:
        cam = get_camera()
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    # đọc 1 frame dưới lock
    with cam_lock:
        ok, frame = cam.read()

    if not ok or frame is None:
        raise HTTPException(
            status_code=500,
            detail="Không đọc được frame từ camera",
        )

    try:
        plate_text, annotated = detect_plate_in_frame(frame)
    except RuntimeError as e:
        # lỗi load model / ocr
        raise HTTPException(status_code=500, detail=str(e))

    if not plate_text:
        raise HTTPException(status_code=404, detail="Không tìm thấy biển số")

    ok, buffer = cv2.imencode(".jpg", annotated)
    if not ok:
        raise HTTPException(status_code=500, detail="Không encode được ảnh")

    img_b64 = base64.b64encode(buffer.tobytes()).decode("utf-8")

    return {
        "plate_number": plate_text,
        "image_base64": img_b64,
    }
