import { useEffect, useMemo, useState } from "react";
import { getParkingAreas, getParkingMap, getParkingSlots } from "../api/parking";

const safeParseJSON = (raw) => {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error("parse map_data fail", e);
      return {};
    }
  }
  return {};
};

export default function useParkingSlotData(initialAreaId = null) {
  const [areas, setAreas] = useState([]);
  const [areaId, setAreaId] = useState(null);

  const [mapCfg, setMapCfg] = useState({
    map_rows: 10,
    map_cols: 12,
    cell_size: 36,
    cells: {},
    mode: "GRID",
  });

  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);

  // 1) Load areas once
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await getParkingAreas();
        const data = res?.data || [];
        if (!mounted) return;

        setAreas(data);

        // ưu tiên initialAreaId nếu hợp lệ
        const init = Number(initialAreaId);
        if (init && data.some((a) => a.id === init)) {
          setAreaId(init);
        } else if (data.length) {
          setAreaId(data[0].id);
        } else {
          setAreaId(null);
        }
      } catch (e) {
        console.error("getParkingAreas error", e);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [initialAreaId]);

  // 2) Load map + slots when areaId changes
  useEffect(() => {
    if (!areaId) return;

    let mounted = true;
    setLoading(true);

    Promise.all([getParkingMap(areaId), getParkingSlots(areaId)])
      .then(([m, s]) => {
        if (!mounted) return;

        const mapData = safeParseJSON(m?.data?.map_data);

        setMapCfg({
          map_rows: m?.data?.map_rows ?? 10,
          map_cols: m?.data?.map_cols ?? 12,
          cell_size: m?.data?.cell_size ?? 36,
          cells: mapData?.cells || {},
          mode: mapData?.mode || "GRID",
        });

        setSlots(s?.data || []);
      })
      .catch((e) => console.error("load map/slots error", e))
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [areaId]);

  const refreshSlots = async () => {
    if (!areaId) return;
    const res = await getParkingSlots(areaId);
    setSlots(res?.data || []);
  };

  const areaMap = useMemo(() => new Map((areas || []).map((a) => [a.id, a])), [areas]);

  return {
    areas,
    areaId,
    setAreaId,
    mapCfg,
    slots,
    setSlots,
    loading,
    refreshSlots,
    areaMap,
  };
}
