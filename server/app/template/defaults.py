# app/settings/defaults.py
DEFAULT_TEMPLATES = {
    "invoice_print": {
        "subject": None,
        "description": "Mẫu in hóa đơn",
        "body": (
            '<div style="font-family: Arial, sans-serif; font-size: 13px; line-height: 1.5; white-space: pre-wrap;">'
            '  <div style="text-align:center; font-weight: 800; font-size: 16px;">{site_name}</div>'
            '  <div style="text-align:center; font-size: 12px; color: #555;">{site_address}</div>'
            '  <div style="text-align:center; font-size: 12px; color: #555;">SĐT: {site_phone}</div>'
            '  <hr style="border:none; border-top:1px dashed #ccc; margin:10px 0;" />'
            '  <div style="font-size: 13px;">'
            '    <div><b>Loại hóa đơn:</b> {log_type}</div>'
            '    <div><b>Biển số:</b> {license_plate}</div>'
            '    <div><b>Loại xe:</b> {vehicle_type}</div>'
            '    <div><b>Vào:</b> {entry_time}</div>'
            '    <div><b>Ra:</b> {exit_time}</div>'
            '  </div>'
            '  <hr style="border:none; border-top:1px dashed #ccc; margin:10px 0;" />'
            '  <div style="text-align:right; font-weight:800; font-size: 14px;">Tổng tiền: {amount} VND</div>'
            '  <div style="margin-top: 10px; text-align:center; font-size: 12px;">{invoice_note}</div>'
            '  <div style="margin-top: 8px; text-align:center; font-weight:700;">Xin cảm ơn!</div>'
            '</div>'
        ),
    },

    "monthly_expiry_email": {
        "subject": "[Nhắc hạn] Vé tháng của {license_plate} sắp hết hạn",
        "description": "Email nhắc vé tháng sắp hết hạn",
        "body": (
            # Email có thể giữ text, hoặc cũng chuyển sang HTML nếu bạn muốn format
            "Chào {customer_name},\n\n"
            "Vé tháng của xe {license_plate} sẽ hết hạn vào ngày {end_date}.\n"
            "Hiện còn {days_left} ngày.\n\n"
            "Vui lòng liên hệ bãi xe để gia hạn.\n"
            "Xin cảm ơn.\n"
            "{site_name} - {site_phone}\n"
        ),
    },
}
