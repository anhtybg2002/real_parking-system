// src/components/inout/ExitForm.jsx
import React from "react";
import Card from "../common/Card";

export default function ExitForm({
  onSubmit,
  onScanPlate,
  scanning,
  exitPlate,
  setExitPlate,
  inputStyle,
  primaryBtnStyle,   // giống entry
  scanBtnStyle,       // giống entry
  capturedPlateImage,
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit && onSubmit();
  };

  return (
    <Card title="Ghi nhận xe ra">
      <form onSubmit={handleSubmit}>
        {/* Biển số xe */}
        <div style={{ marginBottom: 8 }}>
          <label
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "#374151",
            }}
          >
            Biển số xe
          </label>
          <input
            type="text"
            placeholder="Nhập biển số cần cho ra"
            value={exitPlate}
            onChange={(e) => setExitPlate(e.target.value)}
            style={inputStyle}
          />

          {/* Nút quét biển số */}
          <div style={{ marginTop: 6 }}>
            <button
              type="button"
              onClick={onScanPlate}
              style={scanBtnStyle}
              disabled={scanning}
            >
              {scanning ? "Đang quét..." : "Quét biển số từ camera"}
            </button>
          </div>
        </div>

        {/* Preview ảnh */}
        {capturedPlateImage && (
          <div style={{ marginTop: 10 }}>
            <div
              style={{
                fontSize: 12,
                color: "#6b7280",
                marginBottom: 4,
              }}
            >
              Ảnh biển số vừa quét:
            </div>
            <img
              src={`data:image/jpeg;base64,${capturedPlateImage}`}
              style={{
                width: "100%",
                maxHeight: 160,
                objectFit: "contain",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
              }}
            />
          </div>
        )}

        {/* Nút xác nhận ra — dùng primaryBtnStyle giống entry */}
        <button type="submit" style={primaryBtnStyle}>
          Xác nhận xe ra
        </button>
      </form>
    </Card>
  );
}
