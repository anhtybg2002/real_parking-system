import React, { useEffect, useMemo, useRef, useState } from "react";
import AppLayout from "../components/layout/AppLayout";
import { getParkingAreas, getParkingMap, updateParkingMap, getParkingSlots } from "../api/parking";
import { useNavigate } from "react-router-dom";
import EditorToolbar from "../components/parkingmapeditor/EditorToolsbar";
import Legend from "../components/parkingslot/Legend";
import MapGrid from "../components/parkingslot/MapGrid";
import { TOOL } from "../utils/parkingmapeditor/editorMeta";

const ROAD_KIND = "LANE";
const deepClone = (obj) => JSON.parse(JSON.stringify(obj || {}));

const slotsToCells = (slots = []) => {
  const out = {};
  (slots || []).forEach((s) => {
    const key = `${s.row}-${s.col}`;
    const t = (s.vehicle_type_allowed || "").toLowerCase();
    const kind = t === "motorbike" ? TOOL.PARKING_BIKE : TOOL.PARKING_CAR;
    out[key] = { kind, name: s.code };
  });
  return out;
};

const pruneCellsOutOfGrid = (cells, rows, cols) => {
  const next = { ...(cells || {}) };
  Object.keys(next).forEach((k) => {
    const [rStr, cStr] = (k || "").split("-");
    const r = Number(rStr);
    const c = Number(cStr);
    if (!Number.isFinite(r) || !Number.isFinite(c) || r < 0 || c < 0 || r >= rows || c >= cols) {
      delete next[k];
    }
  });
  return next;
};

const clampInt = (v, min, max) => {
  const n = Number(v);
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
};

// ===== history helpers =====
const snapshotState = (cfg, draftMapData) => ({
  cfg: deepClone(cfg),
  draftMapData: deepClone(draftMapData),
});

export default function ParkingMapEditorPage() {
  const [areas, setAreas] = useState([]);
  const [areaId, setAreaId] = useState(null);

  const [cfg, setCfg] = useState({ map_rows: 10, map_cols: 12, cell_size: 30 });

  // origin = bản gốc DB (để reset)
  const [originMapData, setOriginMapData] = useState({ cells: {}, paths: [] });

  // draft = bản sao cho user chỉnh sửa
  const [draftMapData, setDraftMapData] = useState({ cells: {}, paths: [] });

  const [slots, setSlots] = useState([]);

  const [tool, setTool] = useState(TOOL.ROAD_PATH);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // drag
  const [mouseDown, setMouseDown] = useState(false);
  const dragLastKeyRef = useRef(null);
  const dragDirtyRef = useRef(false);

  // Rows/Cols UI (pending)
  const [pendingRows, setPendingRows] = useState(cfg.map_rows);
  const [pendingCols, setPendingCols] = useState(cfg.map_cols);

  // ===== UNDO/REDO state =====
  const historyRef = useRef([]); // array snapshots
  const historyIdxRef = useRef(-1);

  // để nút Undo/Redo luôn re-render đúng
  const [, forceRender] = useState(0);
  const bump = () => forceRender((x) => x + 1);

  const canUndo = historyIdxRef.current > 0;
  const canRedo = historyIdxRef.current >= 0 && historyIdxRef.current < historyRef.current.length - 1;

  const navigate = useNavigate();

  // ===== FIX LOGIC: luôn đồng bộ input rows/cols theo cfg hiện tại =====
  useEffect(() => {
    setPendingRows(cfg.map_rows);
    setPendingCols(cfg.map_cols);
  }, [cfg.map_rows, cfg.map_cols]);

  const pushHistory = (nextCfg, nextDraft) => {
    const snap = snapshotState(nextCfg, nextDraft);
    const arr = historyRef.current;
    const idx = historyIdxRef.current;

    // nếu đang ở giữa stack -> cắt phần redo
    const trimmed = idx >= 0 ? arr.slice(0, idx + 1) : [];
    trimmed.push(snap);

    historyRef.current = trimmed;
    historyIdxRef.current = trimmed.length - 1;
    bump();
  };

  const applySnapshot = (snap) => {
    if (!snap) return;
    setCfg(snap.cfg);
    setDraftMapData(snap.draftMapData);
    bump();
  };

  const undo = () => {
    const idx = historyIdxRef.current;
    if (idx <= 0) return;
    historyIdxRef.current = idx - 1;
    applySnapshot(historyRef.current[historyIdxRef.current]);
  };

  const redo = () => {
    const idx = historyIdxRef.current;
    if (idx < 0) return;
    if (idx >= historyRef.current.length - 1) return;
    historyIdxRef.current = idx + 1;
    applySnapshot(historyRef.current[historyIdxRef.current]);
  };

  // phím tắt Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z
  useEffect(() => {
    const onKeyDown = (e) => {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      if (!ctrlOrCmd) return;

      if (e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      if ((e.key.toLowerCase() === "z" && e.shiftKey) || e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // load areas
  useEffect(() => {
    getParkingAreas().then((res) => {
      const data = res.data || [];
      setAreas(data);
      if (data.length) setAreaId(data[0].id);
    });
  }, []);

  // load map + slots => origin + draft
  useEffect(() => {
    if (!areaId) return;
    setLoading(true);

    Promise.all([getParkingMap(areaId), getParkingSlots(areaId)])
      .then(([mapRes, slotRes]) => {
        const d = mapRes?.data || {};

        const nextCfg = {
          map_rows: d.map_rows ?? 10,
          map_cols: d.map_cols ?? 12,
          cell_size: d.cell_size ?? 30,
        };
        setCfg(nextCfg);

        let md = d.map_data || {};
        if (typeof md === "string") {
          try {
            md = JSON.parse(md);
          } catch (e) {
            console.error("Invalid map_data JSON:", e);
            md = {};
          }
        }

        const origin = {
          cells: md.cells || {},
          paths: Array.isArray(md.paths) ? md.paths : [],
        };
        setOriginMapData(origin);

        const dbSlots = slotRes?.data || [];
        setSlots(dbSlots);

        const slotCells = slotsToCells(dbSlots);
        const mergedCells = { ...slotCells, ...(origin.cells || {}) };

        const nextDraft = {
          cells: deepClone(mergedCells),
          paths: deepClone(origin.paths || []),
        };
        setDraftMapData(nextDraft);

        // init history = 1 snapshot
        historyRef.current = [snapshotState(nextCfg, nextDraft)];
        historyIdxRef.current = 0;
        bump();

        dragLastKeyRef.current = null;
        setMouseDown(false);
        dragDirtyRef.current = false;
      })
      .finally(() => setLoading(false));
  }, [areaId]);

  const resetDraft = () => {
    const slotCells = slotsToCells(slots);
    const mergedCells = { ...slotCells, ...(originMapData.cells || {}) };

    const nextDraft = {
      cells: deepClone(mergedCells),
      paths: deepClone(originMapData.paths || []),
    };

    setDraftMapData(nextDraft);
    pushHistory(cfg, nextDraft);

    dragLastKeyRef.current = null;
    setMouseDown(false);
    dragDirtyRef.current = false;
  };

  const canResetDraft = useMemo(() => {
    try {
      const baseline = {
        cells: { ...slotsToCells(slots), ...(originMapData.cells || {}) },
        paths: originMapData.paths || [],
      };
      return JSON.stringify(draftMapData) !== JSON.stringify(baseline);
    } catch {
      return true;
    }
  }, [draftMapData, originMapData, slots]);

  // ===== warning when resize would lose slots =====
  const getSlotsOutOfGrid = (rows, cols) => {
    return (slots || []).filter((s) => (s?.row ?? 0) >= rows || (s?.col ?? 0) >= cols);
  };

  const confirmResizeIfLoseSlots = (rows, cols) => {
    const lost = getSlotsOutOfGrid(rows, cols);
    if (!lost.length) return true;

    const preview = lost
      .slice(0, 8)
      .map((s) => `${s.code}(${s.row}-${s.col})`)
      .join(", ");

    return window.confirm(
      `Bạn đang giảm kích thước map và sẽ làm MẤT ${lost.length} slot (vị trí vượt ngoài lưới mới).\n\nVí dụ: ${preview}${
        lost.length > 8 ? ", ..." : ""
      }\n\nBạn có chắc muốn tiếp tục không?`
    );
  };

  const applyGridConfig = () => {
    const rows = clampInt(pendingRows, 3, 200);
    const cols = clampInt(pendingCols, 3, 200);

    const ok = confirmResizeIfLoseSlots(rows, cols);
    if (!ok) return;

    const nextCfg = { ...cfg, map_rows: rows, map_cols: cols };
    const nextDraft = {
      ...draftMapData,
      cells: pruneCellsOutOfGrid(draftMapData.cells, rows, cols),
    };

    setCfg(nextCfg);
    setDraftMapData(nextDraft);
    pushHistory(nextCfg, nextDraft);
  };

  const paintCell = (k) => {
    // đánh dấu drag đã thay đổi để mouseup push history
    dragDirtyRef.current = true;

    setDraftMapData((prev) => {
      const next = {
        ...(prev || {}),
        cells: { ...((prev && prev.cells) || {}) },
        paths: (prev && prev.paths) || [],
      };

      if (tool === TOOL.ERASER) {
        delete next.cells[k];
        return next;
      }

      if (tool === TOOL.ROAD_PATH) {
        next.cells[k] = { kind: ROAD_KIND };
        return next;
      }

      next.cells[k] = { kind: tool };
      return next;
    });
  };

  // mouse up: kết thúc drag + push undo snapshot nếu có thay đổi
  useEffect(() => {
    const onUp = () => {
      if (!mouseDown) return;

      setMouseDown(false);
      dragLastKeyRef.current = null;

      if (dragDirtyRef.current) {
        pushHistory(cfg, draftMapData);
        dragDirtyRef.current = false;
      }
    };

    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mouseDown, cfg, draftMapData]);

  const save = async () => {
    if (!areaId) return;
    try {
      setSaving(true);

      await updateParkingMap(areaId, {
        map_rows: cfg.map_rows,
        map_cols: cfg.map_cols,
        cell_size: cfg.cell_size,
        map_data: draftMapData,
      });

      alert("Đã lưu bản đồ khu đỗ.");
      setOriginMapData(deepClone(draftMapData));
      navigate(`/dashboard/parking-area/`);

      // sau khi save: coi state hiện tại là “mốc” (reset history)
      historyRef.current = [snapshotState(cfg, draftMapData)];
      historyIdxRef.current = 0;
      bump();
    } catch (e) {
      if (e?.response?.status === 409) {
        alert(e.response.data.detail);
        navigate(`/dashboard/parking-slot?areaId=${areaId}`);
        return;
      }
      const msg = e?.response?.data?.detail || "Không lưu được bản đồ...";
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  // ===== UI styles =====
  const cfgBox = {
    display: "flex",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
    padding: 12,
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    background: "#fff",
  };
  const cfgLabel = { fontSize: 12, color: "#6b7280", fontWeight: 700 };
  const cfgInput = {
    width: 110,
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    fontSize: 13,
  };
  const smallBtn = {
    padding: "8px 12px",
    borderRadius: 9999,
    border: "1px solid #e5e7eb",
    backgroundColor: "#fff",
    color: "#4b5563",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: 13,
  };

  return (
    <AppLayout title="Cài đặt bản đồ khu đỗ">
      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
        <EditorToolbar
          areas={areas}
          areaId={areaId}
          setAreaId={setAreaId}
          tool={tool}
          setTool={setTool}
          onSave={save}
          saving={saving}
          loading={loading}
          buildingPath={false}
          onResetDraft={resetDraft}
          canResetDraft={canResetDraft}
        />

        {/* Rows/Cols + Undo/Redo */}
        <div style={cfgBox}>
          <div style={{ fontWeight: 900, color: "#111827" }}>Cấu hình lưới</div>

          <div>
            <div style={cfgLabel}>Số hàng (rows)</div>
            <input
              type="number"
              min={3}
              max={200}
              value={pendingRows}
              onChange={(e) => setPendingRows(e.target.value)}
              style={cfgInput}
            />
          </div>

          <div>
            <div style={cfgLabel}>Số cột (cols)</div>
            <input
              type="number"
              min={3}
              max={200}
              value={pendingCols}
              onChange={(e) => setPendingCols(e.target.value)}
              style={cfgInput}
            />
          </div>

          <button
            type="button"
            style={{
              padding: "8px 14px",
              borderRadius: 9999,
              border: "none",
              background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 40%, #8b5cf6 100%)",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
              alignSelf: "flex-end",
            }}
            onClick={applyGridConfig}
          >
            Áp dụng
          </button>

          <div style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: 8 }}>
            <button type="button" style={{ ...smallBtn, opacity: canUndo ? 1 : 0.5 }} onClick={undo} disabled={!canUndo}>
              Undo
            </button>
            <button type="button" style={{ ...smallBtn, opacity: canRedo ? 1 : 0.5 }} onClick={redo} disabled={!canRedo}>
              Redo
            </button>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Phím tắt: Ctrl+Z / Ctrl+Y (hoặc Ctrl+Shift+Z)</div>
          </div>

          <div style={{ fontSize: 12, color: "#6b7280" }}>
            Lưu ý: giảm rows/cols có thể làm slot vượt biên (sẽ cảnh báo). Các cell ngoài biên sẽ tự xoá khỏi bản đồ.
          </div>
        </div>

        <Legend />

        <MapGrid
          rows={cfg.map_rows}
          cols={cfg.map_cols}
          cellSize={cfg.cell_size}
          zoom={1.6}
          slots={slots}
          cells={draftMapData.cells}
          selectedId={null}
          onSelect={null}
          onCellPointerDown={(key, e) => {
            e.preventDefault();
            setMouseDown(true);
            dragLastKeyRef.current = key;

            // bắt đầu drag
            dragDirtyRef.current = false;
            paintCell(key);
          }}
          onCellPointerEnter={(key) => {
            if (!mouseDown) return;
            if (dragLastKeyRef.current === key) return;
            dragLastKeyRef.current = key;
            paintCell(key);
          }}
        />
      </div>
    </AppLayout>
  );
}
