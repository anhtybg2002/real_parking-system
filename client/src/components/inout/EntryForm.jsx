// src/components/inout/EntryForm.jsx

import React from "react";
import Card from "../common/Card";
import useVehicleTypes from "../../hooks/useVehicleTypes";
export default function EntryForm({
  onSubmit,
  onScanPlate,
  scanning,
  entryPlate,
  setEntryPlate,
  entryVehicleType,
  setEntryVehicleType,
  entryArea,
  setEntryArea,
  areas,
  inputStyle,
  primaryBtnStyle,
  scanBtnStyle,
  capturedPlateImage,
  onOpenManageVehicleTypes,
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit && onSubmit();
  };

  const vt = useVehicleTypes();

  return (
    <Card title="Vehicle Entry">
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
            placeholder="VD: 30G-123.45"
            value={entryPlate}
            onChange={(e) => setEntryPlate(e.target.value)}
            style={inputStyle}
          />

          {/* Nút quét biển số từ camera */}
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

        {/* Loại xe */}
        <div style={{ marginBottom: 8 }}>
          <label
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "#374151",
            }}
          >
            Loại xe
          </label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select
            value={entryVehicleType}
            onChange={(e) => setEntryVehicleType(e.target.value)}
            style={{ ...inputStyle, width: "100%" }}
          >
            {vt.list.length
              ? vt.list.map((v) => (
                  <option key={v.key} value={v.key}>
                    {v.label}
                  </option>
                ))
              : [
                  { key: "car", label: "Ô tô" },
                  { key: "motorbike", label: "Xe máy" },
                  { key: "other", label: "Khác" },
                ].map((v) => (
                  <option key={v.key} value={v.key}>
                    {v.label}
                  </option>
                ))}
            </select>
            <button
              type="button"
              style={{ padding: "6px 8px", borderRadius: 8 }}
              onClick={() => onOpenManageVehicleTypes?.()}
            >
              Quản lý
            </button>
          </div>
        </div>

        {/* Khu vực */}
        <div style={{ marginBottom: 8 }}>
          <label
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "#374151",
            }}
          >
            Khu vực
          </label>
          <select
            value={entryArea}
            onChange={(e) => setEntryArea(e.target.value)}
            style={{ ...inputStyle, width: "100%" }}
          >
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        {/* Preview ảnh biển số (nếu có) */}
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
              alt="Ảnh biển số"
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

        {/* Nút submit */}
        <button type="submit" style={primaryBtnStyle}>
          Ghi nhận xe vào bãi
        </button>
      </form>
    </Card>
  );
}
