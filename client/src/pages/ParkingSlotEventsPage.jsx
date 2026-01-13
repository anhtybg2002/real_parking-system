// src/pages/ParkingSlotEventsPage.jsx
import { useEffect, useState } from "react";
import AppLayout from "../components/layout/AppLayout";
import Card from "../components/common/Card";
import DataTable from "../components/common/DataTable";
import commonStyles from "../styles/commonStyles";
import { getParkingSlotEvents } from "../api/parkingSlotEvents";
import axiosClient from "../api/axiosClient";
import { formatTime } from "../components/common/deps";

export default function ParkingSlotEventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [parkingAreas, setParkingAreas] = useState([]);

  // Filters
  const [filters, setFilters] = useState({
    license_plate: "",
    parking_area_id: "",
    slot_code: "",
    date_from: "",
    date_to: "",
  });

  // Fetch parking areas for filter dropdown
  useEffect(() => {
    const fetchAreas = async () => {
      try {
        const res = await axiosClient.get("/inout/parking-areas");
        const data = res?.data ?? res ?? [];
        setParkingAreas(data);
      } catch (err) {
        console.error("Error fetching parking areas:", err);
      }
    };
    fetchAreas();
  }, []);

  // Fetch events
  const fetchEvents = async () => {
    try {
      setLoading(true);
      const params = {};
      
      if (filters.license_plate.trim()) params.license_plate = filters.license_plate.trim();
      if (filters.parking_area_id) params.parking_area_id = filters.parking_area_id;
      if (filters.slot_code.trim()) params.slot_code = filters.slot_code.trim();
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;

      console.log("Fetching events with params:", params);
      const res = await getParkingSlotEvents(params);
      console.log("Response:", res);
      const data = res?.data ?? res ?? [];
      console.log("Events data:", data);
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching events:", err);
      console.error("Error response:", err?.response?.data);
      alert("Không thể tải danh sách sự kiện: " + (err?.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    fetchEvents();
  };

  const handleReset = () => {
    setFilters({
      license_plate: "",
      parking_area_id: "",
      slot_code: "",
      date_from: "",
      date_to: "",
    });
    setTimeout(() => fetchEvents(), 100);
  };

  // Event type labels
  const eventTypeLabel = (type) => {
    const labels = {
      ASSIGN: "Gán chỗ",
      RELEASE: "Giải phóng",
      SWAP: "Đổi chỗ",
      MOVE: "Di chuyển",
      LOCK: "Khóa slot",
      UNLOCK: "Mở khóa",
    };
    return labels[type] || type;
  };

  // Event color mapping
  const getEventColor = (type) => {
    const colors = {
      ASSIGN: "#10b981",
      RELEASE: "#ef4444",
      SWAP: "#f59e0b",
      MOVE: "#3b82f6",
      LOCK: "#6b7280",
      UNLOCK: "#8b5cf6",
    };
    return colors[type] || "#6b7280";
  };

  // Table columns
  const columns = [
    { key: "index", label: "#" },
    { key: "created_at", label: "Thời gian" },
    { key: "event_type", label: "Loại sự kiện" },
    { key: "license_plate", label: "Biển số" },
    { key: "parking_area", label: "Bãi xe" },
    { key: "from_slot", label: "Từ slot" },
    { key: "to_slot", label: "Đến slot" },
    { key: "staff", label: "Nhân viên" },
    { key: "note", label: "Ghi chú" },
  ];

  // Table data
  const tableData = events.map((event, index) => ({
    index: index + 1,
    created_at: formatTime(event.created_at),
    event_type: (
      <span
        style={{
          padding: "4px 8px",
          borderRadius: 4,
          fontSize: 11,
          fontWeight: 600,
          backgroundColor: getEventColor(event.event_type),
          color: "#fff",
        }}
      >
        {eventTypeLabel(event.event_type)}
      </span>
    ),
    license_plate: event.license_plate || "—",
    parking_area: event.parking_area_name || "—",
    from_slot: event.from_slot_code || "—",
    to_slot: event.to_slot_code || "—",
    staff: event.staff_name || "—",
    note: event.note || "—",
  }));

  return (
    <AppLayout title="Lịch sử chỗ đỗ xe">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Filters */}
        <Card>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
            Bộ lọc
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12,
            }}
          >
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
                Biển số xe
              </label>
              <input
                type="text"
                placeholder="Nhập biển số..."
                value={filters.license_plate}
                onChange={(e) => handleFilterChange("license_plate", e.target.value)}
                style={{ ...commonStyles.input, width: "100%", marginTop: 4 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
                Bãi xe
              </label>
              <select
                value={filters.parking_area_id}
                onChange={(e) => handleFilterChange("parking_area_id", e.target.value)}
                style={{ ...commonStyles.input, width: "100%", marginTop: 4 }}
              >
                <option value="">Tất cả</option>
                {parkingAreas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
                Mã slot
              </label>
              <input
                type="text"
                placeholder="Nhập mã slot..."
                value={filters.slot_code}
                onChange={(e) => handleFilterChange("slot_code", e.target.value)}
                style={{ ...commonStyles.input, width: "100%", marginTop: 4 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
                Từ ngày
              </label>
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => handleFilterChange("date_from", e.target.value)}
                style={{ ...commonStyles.input, width: "100%", marginTop: 4 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
                Đến ngày
              </label>
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => handleFilterChange("date_to", e.target.value)}
                style={{ ...commonStyles.input, width: "100%", marginTop: 4 }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
              <button
                onClick={handleSearch}
                style={{
                  ...commonStyles.buttonPrimary,
                  flex: 1,
                  padding: "10px 16px",
                }}
              >
                Tìm kiếm
              </button>
              <button
                onClick={handleReset}
                style={{
                  ...commonStyles.buttonSecondary,
                  padding: "10px 16px",
                }}
              >
                Đặt lại
              </button>
            </div>
          </div>
        </Card>

        {/* Results */}
        <Card>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              Danh sách sự kiện ({events.length})
            </div>
            <button
              onClick={fetchEvents}
              style={{
                ...commonStyles.buttonSecondary,
                padding: "6px 12px",
                fontSize: 12,
              }}
            >
              🔄 Làm mới
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: 32, color: "#6b7280" }}>
              Đang tải...
            </div>
          ) : events.length === 0 ? (
            <div style={{ textAlign: "center", padding: 32, color: "#6b7280" }}>
              Không có dữ liệu
            </div>
          ) : (
            <DataTable columns={columns} data={tableData} />
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
