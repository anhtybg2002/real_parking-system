import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

import AppLayout from "../components/layout/AppLayout";
import commonStyles from "../styles/commonStyles";

import useParkingSlotData from "../hooks/useParkingSlotData";

import {
  updateParkingSlot,
  releaseParkingSlot,
  swapParkingSlots,
  getUnassignedVehicles,
  assignVehicleToSlot,
  canEditParkingMap, // ✅ THÊM IMPORT NÀY
} from "../api/parking";

import ParkingHeader from "../components/parkingslot/ParkingHeader";
import ParkingAreaSelector from "../components/parkingslot/ParkingAreaSelector";
import ParkingStats from "../components/parkingslot/ParkingStats";
import SegmentedTabs from "../components/parkingslot/SegmentedTabs";
import ParkingMapPanel from "../components/parkingslot/ParkingMapPanel";
import SlotDetailPanel from "../components/parkingslot/SlotDetailPanel";
import SlotListPanel from "../components/parkingslot/SlotListPanel";
import UnassignedVehiclesPanel from "../components/parkingslot/UnassignedVehiclesPanel";

export default function ParkingSlotPage() {
  const [tab, setTab] = useState("map");

  // ✅ lấy areaId từ URL để mở đúng khu khi bấm "Xem chi tiết"
  const [searchParams] = useSearchParams();
  const initialAreaId = useMemo(() => searchParams.get("areaId"), [searchParams]);

  // data hook
  const { areas, areaId, setAreaId, mapCfg, slots, loading, refreshSlots } =
    useParkingSlotData(initialAreaId);

  // UI state
  const [editMode, setEditMode] = useState(false);
  const [zoom, setZoom] = useState(1);

  const [selected, setSelected] = useState(null);

  const [swapMode, setSwapMode] = useState(false);
  const [swapFrom, setSwapFrom] = useState(null);

  const [filters, setFilters] = useState({ q: "", status: "all", type: "all" });

  const [unassigned, setUnassigned] = useState([]);
  const [unassignedLoading, setUnassignedLoading] = useState(false);

  const [pendingAssign, setPendingAssign] = useState(null);

  const [checkingEditMap, setCheckingEditMap] = useState(false);

  const navigate = useNavigate();

  // ✅ THÊM HÀM NÀY (bạn đang dùng nhưng chưa khai báo)
  const refreshUnassigned = async () => {
    if (!areaId) return;
    setUnassignedLoading(true);
    try {
      const res = await getUnassignedVehicles(areaId);
      setUnassigned(res?.data || []);
    } catch (e) {
      console.error("getUnassignedVehicles error", e);
    } finally {
      setUnassignedLoading(false);
    }
  };

  const goEditMap = async () => {
    const id = areaId || Number(initialAreaId || 0);
    if (!id) {
      alert("Chưa xác định được bãi xe để chỉnh bản đồ.");
      return;
    }
    if (checkingEditMap) return;

    setCheckingEditMap(true);
    try {
      const res = await canEditParkingMap(id);
      const data = res?.data;

      if (!data?.can_edit) {
        alert(
          `Không thể chỉnh sửa bản đồ.\n\n` +
            `${data?.reason || "Bãi vẫn còn xe."}\n` +
            `Số slot OCCUPIED: ${data?.occupied_count ?? "?"}\n\n` +
            `Vui lòng đưa tất cả xe ra khỏi bãi rồi thử lại.`
        );
        return;
      }

      navigate(`/dashboard/parking-area/editor?areaId=${id}`);
    } catch (e) {
      console.error("canEditParkingMap error", e);
      alert("Không kiểm tra được trạng thái bãi. Vui lòng thử lại.");
    } finally {
      setCheckingEditMap(false);
    }
  };

  // Khi đổi khu: load unassigned + reset các state liên quan thao tác
  useEffect(() => {
    if (!areaId) return;

    refreshUnassigned();

    setSelected(null);
    setSwapMode(false);
    setSwapFrom(null);
    setPendingAssign(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaId]);

  // ===== Actions =====
  const startSwap = () => {
    if (!selected) return;
    if (selected.status !== "OCCUPIED") {
      alert("Slot phải OCCUPIED mới đổi chỗ được.");
      return;
    }
    setSwapMode(true);
    setSwapFrom(selected);
  };

  const cancelSwap = () => {
    setSwapMode(false);
    setSwapFrom(null);
  };

  const toggleLock = async () => {
    if (!selected) return;
    const next = selected.status === "LOCKED" ? "EMPTY" : "LOCKED";
    await updateParkingSlot(selected.id, { status: next });
    await refreshSlots();
    setSelected(null);
  };

  const releaseSlot = async () => {
    if (!selected) return;
    const ok = window.confirm(`Đặt trống slot ${selected.code} và gỡ khỏi xe đang đỗ?`);
    if (!ok) return;

    await releaseParkingSlot(selected.id);
    await refreshSlots();
    await refreshUnassigned();
    setSelected(null);
  };

  const onSelectSlot = async (slot) => {
    // 0) Nếu đang gán xe (pendingAssign) => click slot để assign
    if (pendingAssign) {
      if (slot.status !== "EMPTY") {
        alert("Chỉ gán vào slot Trống (EMPTY).");
        return;
      }

      if (
        (slot.vehicle_type_allowed || "").toLowerCase() !==
        (pendingAssign.vehicle_type || "").toLowerCase()
      ) {
        alert("Loại xe không phù hợp với slot.");
        return;
      }

      const ok = window.confirm(
        `Gán xe ${pendingAssign.license_plate_number} vào slot ${slot.code}?`
      );
      if (!ok) return;

      await assignVehicleToSlot(slot.id, pendingAssign.log_id);
      await refreshSlots();
      await refreshUnassigned();

      setPendingAssign(null);
      setSelected(null);
      return;
    }

    // 1) Không swap mode => chỉ select
    if (!swapMode) {
      setSelected(slot);
      return;
    }

    // 2) Swap mode
    const a = swapFrom;
    const b = slot;
    if (!a || a.id === b.id) return;

    if (
      (a.vehicle_type_allowed || "").toLowerCase() !==
      (b.vehicle_type_allowed || "").toLowerCase()
    ) {
      alert("Chỉ đổi chỗ khi 2 xe cùng loại xe.");
      return;
    }

    if (a.status !== "OCCUPIED" || b.status !== "OCCUPIED") {
      alert("Chỉ đổi chỗ khi cả hai slot đang có xe (OCCUPIED).");
      return;
    }

    const ok = window.confirm(
      `Đổi chỗ giữa ${a.code} (${a.current_plate || "—"}) và ${b.code} (${b.current_plate || "—"})?`
    );
    if (!ok) return;

    await swapParkingSlots(a.id, b.id);
    await refreshSlots();
    await refreshUnassigned();

    setSwapMode(false);
    setSwapFrom(null);
    setSelected(null);
  };

  // list handlers
  const onViewOnMap = (s) => {
    setTab("map");
    setSelected(s);
  };

  const onToggleLockInline = async (s) => {
    const next = s.status === "LOCKED" ? "EMPTY" : "LOCKED";
    await updateParkingSlot(s.id, { status: next });
    await refreshSlots();
  };

  const onReleaseInline = async (s) => {
    const ok = window.confirm(`Đặt trống slot ${s.code}?`);
    if (!ok) return;
    await releaseParkingSlot(s.id);
    await refreshSlots();
  };

  return (
    <AppLayout title="Quản lý chỗ đỗ xe">
      <div style={{ padding: 24 }}>
        <ParkingHeader goEditMap={goEditMap} checkingEditMap={checkingEditMap} />

        <ParkingAreaSelector
          areas={areas}
          areaId={areaId}
          setAreaId={setAreaId}
          loading={loading}
          readonly={initialAreaId}
        />

        <ParkingStats slots={slots} />

        <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <SegmentedTabs value={tab} onChange={setTab} />
        </div>

        {tab === "map" ? (
          <div style={{ marginTop: 14, ...commonStyles.pageGrid }}>
            <ParkingMapPanel
              mapCfg={mapCfg}
              slots={slots}
              selectedId={selected?.id}
              onSelect={onSelectSlot}
              editMode={editMode}
              setEditMode={setEditMode}
              zoom={zoom}
              setZoom={setZoom}
            />

            <SlotDetailPanel
              selected={selected}
              swapMode={swapMode}
              swapFrom={swapFrom}
              onStartSwap={startSwap}
              onCancelSwap={cancelSwap}
              onToggleLock={toggleLock}
              onRelease={releaseSlot}
              onRefresh={refreshSlots}
            />

            <UnassignedVehiclesPanel
              items={unassigned}
              loading={unassignedLoading}
              pendingAssign={pendingAssign}
              onPick={(x) => {
                setSwapMode(false);
                setSwapFrom(null);
                setPendingAssign(x);
              }}
              onCancel={() => setPendingAssign(null)}
              onRefresh={refreshUnassigned}
            />
          </div>
        ) : (
          <SlotListPanel
            slots={slots}
            filters={filters}
            setFilters={setFilters}
            onRefresh={refreshSlots}
            onViewOnMap={onViewOnMap}
            onToggleLockInline={onToggleLockInline}
            onReleaseInline={onReleaseInline}
          />
        )}
      </div>
    </AppLayout>
  );
}
