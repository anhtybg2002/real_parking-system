# app/in_out/validator.py
import re
from typing import Tuple

def validate_vietnamese_license_plate(license_plate: str) -> Tuple[bool, str]:
    """
    Kiểm tra biển số xe Việt Nam có đúng định dạng không.
    
    Định dạng biển số xe Việt Nam:
    - Xe máy: XX-YY ZZZ (VD: 29-H1 12345, 51-L1 456.78)
    - Xe ô tô: XX[A-Z]-XXX.XX hoặc XX[A-Z]XXXXX (VD: 30A-123.45, 51L-12345)
    - Xe ngoại giao: NN-XXXX (VD: NG-1234)
    
    Args:
        license_plate: Biển số xe cần kiểm tra
        
    Returns:
        Tuple[bool, str]: (True/False, message lỗi nếu có)
    """
    if not license_plate:
        return False, "Biển số xe không được để trống"
    
    # Loại bỏ khoảng trắng và chuyển sang chữ hoa
    plate = license_plate.strip().upper().replace(" ", "")
    
    # Danh sách mã tỉnh/thành phố hợp lệ (01-99)
    # Một số mã tỉnh thực tế: 11-20, 29-39, 43, 47-52, 59-99
    province_codes = list(range(11, 100))  # 11-99
    
    # Pattern cho xe ô tô:
    # - Định dạng: [Mã tỉnh 2 số][Chữ cái][Số 4-5 chữ số] hoặc [Mã tỉnh][Chữ][Số.Số]
    # - VD: 30A12345, 30A-12345, 30A123.45, 30A-123.45
    car_pattern = r'^(\d{2})([A-Z]{1})[-]?(\d{3}[.]\d{2}|\d{4,6})$'
    
    # Pattern cho xe máy:
    # - Định dạng: [Mã tỉnh]-[Chữ cái 1-2 ký tự]-[Số 4-6 chữ số có thể có dấu chấm]
    # - VD: 29-H112345, 51-L1456.78, 29H112345, 51L1456.78
    # Hỗ trợ cả số có dấu chấm như 456.78 hoặc 1456.78
    motorbike_pattern = r'^(\d{2})[-]?([A-Z]{1,2})[-]?(\d+[.]\d+|\d{4,6})$'
    
    # Pattern cho xe ngoại giao, quân đội
    special_pattern = r'^(NG|QD|HC|CD|LD|NN)[-]?(\d{4,5})$'
    
    # Kiểm tra các pattern
    car_match = re.match(car_pattern, plate)
    motorbike_match = re.match(motorbike_pattern, plate)
    special_match = re.match(special_pattern, plate)
    
    if special_match:
        # Biển số đặc biệt (ngoại giao, quân đội)
        return True, ""
    
    if car_match:
        province_code = int(car_match.group(1))
        if province_code not in province_codes:
            return False, f"Mã tỉnh/thành phố '{province_code}' không hợp lệ"
        return True, ""
    
    if motorbike_match:
        province_code = int(motorbike_match.group(1))
        if province_code not in province_codes:
            return False, f"Mã tỉnh/thành phố '{province_code}' không hợp lệ"
        return True, ""
    
    # Nếu không khớp pattern nào
    return False, (
        "Biển số xe không đúng định dạng. "
        "Định dạng hợp lệ: "
        "Ô tô: 30A-123.45 hoặc 30A12345, "
        "Xe máy: 29-H112345 hoặc 51L1456.78, "
        "Đặc biệt: NG-1234"
    )


def format_license_plate(license_plate: str) -> str:
    """
    Chuẩn hóa biển số xe về định dạng chuẩn (uppercase, loại bỏ khoảng trắng thừa)
    
    Args:
        license_plate: Biển số xe cần chuẩn hóa
        
    Returns:
        str: Biển số đã chuẩn hóa
    """
    return license_plate.strip().upper().replace(" ", "")
