# test_validator.py - Test biển số xe Việt Nam
from app.in_out.validator import validate_vietnamese_license_plate, format_license_plate

def test_license_plates():
    """Test các trường hợp biển số xe"""
    
    test_cases = [
        # (biển số, expected_valid, description)
        ("30A-123.45", True, "Ô tô Hà Nội định dạng có dấu chấm"),
        ("30A12345", True, "Ô tô Hà Nội không dấu chấm"),
        ("51L-12345", True, "Ô tô TP.HCM"),
        ("51L12345", True, "Ô tô TP.HCM không dấu gạch"),
        ("29-H112345", True, "Xe máy Hà Nội"),
        ("29H112345", True, "Xe máy Hà Nội không dấu gạch"),
        ("51-L1456.78", True, "Xe máy TP.HCM có dấu chấm"),
        ("NG-1234", True, "Xe ngoại giao"),
        ("QD-12345", True, "Xe quân đội"),
        ("HC-1234", True, "Xe Hội đồng nhân dân"),
        
        # Các trường hợp không hợp lệ
        ("", False, "Biển số trống"),
        ("123", False, "Chỉ có số"),
        ("ABC123", False, "Không đúng format"),
        ("00A-12345", False, "Mã tỉnh không hợp lệ (00)"),
        ("99A", False, "Thiếu số"),
        ("30-12345", False, "Thiếu chữ cái"),
    ]
    
    print("=" * 70)
    print("TEST VALIDATION BIỂN SỐ XE VIỆT NAM")
    print("=" * 70)
    
    passed = 0
    failed = 0
    
    for plate, expected_valid, description in test_cases:
        is_valid, error_msg = validate_vietnamese_license_plate(plate)
        status = "✓ PASS" if is_valid == expected_valid else "✗ FAIL"
        
        if is_valid == expected_valid:
            passed += 1
        else:
            failed += 1
        
        print(f"\n{status} | {description}")
        print(f"  Biển số: '{plate}'")
        print(f"  Kết quả: {is_valid} (Mong đợi: {expected_valid})")
        if error_msg:
            print(f"  Lỗi: {error_msg}")
        if is_valid:
            formatted = format_license_plate(plate)
            print(f"  Chuẩn hóa: '{formatted}'")
    
    print("\n" + "=" * 70)
    print(f"KẾT QUẢ: {passed}/{len(test_cases)} PASS, {failed}/{len(test_cases)} FAIL")
    print("=" * 70)

if __name__ == "__main__":
    test_license_plates()
