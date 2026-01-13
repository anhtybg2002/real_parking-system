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

    "entry_ticket_print": {
        "subject": None,
        "description": "Mẫu in vé khi xe vào bãi",
        "body": (
            '<div style="font-family: Arial, sans-serif; font-size: 13px; line-height: 1.5; white-space: pre-wrap;">'
            '  <div style="text-align:center; font-weight: 800; font-size: 16px;">📋 VÉ VÀO BÃI</div>'
            '  <div style="text-align:center; font-size: 12px; color: #555;">{site_name}</div>'
            '  <div style="text-align:center; font-size: 11px; color: #555;">{site_address}</div>'
            '  <div style="text-align:center; font-size: 11px; color: #555;">SĐT: {site_phone}</div>'
            '  <hr style="border:none; border-top:1px dashed #ccc; margin:10px 0;" />'
            '  <div style="font-size: 13px;">'
            '    <div>🚗 <b>Biển số:</b> <span style="color:#d32f2f; font-weight:bold;">{license_plate}</span></div>'
            '    <div>⚙️ <b>Loại xe:</b> {vehicle_type}</div>'
            '    <div>🕐 <b>Giờ vào:</b> {entry_time}</div>'
            '    <div>🏠 <b>Vị trí:</b> {parking_area} - {parking_slot}</div>'
            '  </div>'
            '  <div style="border: 2px dashed #ccc; padding: 10px; margin: 10px 0; text-align: center;">'
            '    <div style="font-size: 11px; color: #666;">Số hiệu vé</div>'
            '    <div style="font-weight:bold; font-size: 18px; letter-spacing:2px; font-family:monospace; margin:4px 0;">{ticket_id}</div>'
            '    <div style="font-size: 11px; color: #666; margin-top: 4px;">{parking_slot}</div>'
            '  </div>'
            '  <div style="margin-top: 10px; text-align:center; font-size: 11px; color: #666;">Vui lòng giữ vé. Cần vé để ra bãi.</div>'
            '</div>'
        ),
    },
}
