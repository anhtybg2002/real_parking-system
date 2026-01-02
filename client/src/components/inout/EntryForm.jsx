// src/components/inout/EntryForm.jsx

import React from "react";
import Card from "../common/Card";
import { VEHICLE_TYPES } from "../../constants/vehicleTypes";
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
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit && onSubmit();
  };

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
          <select
            value={entryVehicleType}
            onChange={(e) => setEntryVehicleType(e.target.value)}
            style={{ ...inputStyle, width: "100%" }}
          >
            {Object.values(VEHICLE_TYPES).map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>
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
