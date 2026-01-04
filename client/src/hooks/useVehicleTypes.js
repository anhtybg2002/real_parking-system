import { useEffect, useState } from "react";
import { getVehicleTypes } from "../api/vehicleTypes";

export default function useVehicleTypes() {
  const [list, setList] = useState([]);
  const [map, setMap] = useState({});
  const [icons, setIcons] = useState({});
  const [loading, setLoading] = useState(false);
  async function load() {
    try {
      setLoading(true);
      const res = await getVehicleTypes();
      const data = res?.data ?? res ?? [];
      const arr = Array.isArray(data) ? data : [];
      setList(arr);
      const m = {};
      const mIcons = {};
      arr.forEach((r) => {
        m[r.key] = r.label;
        mIcons[r.key] = r.icons ?? null;
      });
      setMap(m);
      setIcons(mIcons);
    } catch (e) {
      console.error(e);
      setList([]);
      setMap({});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    if (!mounted) return;
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return { list, map, icons, loading, reload: load };
}
