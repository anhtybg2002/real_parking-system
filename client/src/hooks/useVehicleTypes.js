import { useEffect, useState } from "react";
import { VEHICLE_TYPES } from "../constants/vehicleTypes";

export default function useVehicleTypes() {
  const [list, setList] = useState([]);
  const [map, setMap] = useState({});
  const [icons, setIcons] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const arr = Object.keys(VEHICLE_TYPES).map((key) => {
      const item = VEHICLE_TYPES[key];
      return {
        key,
        value: item.value,
        label: item.label,
        icons: item.icons ?? null,
        enabled: true,
      };
    });

    const m = {};
    const mIcons = {};
    arr.forEach((r) => {
      m[r.key] = r.label;
      mIcons[r.key] = r.icons ?? null;
    });

    setList(arr);
    setMap(m);
    setIcons(mIcons);
    setLoading(false);
  }, []);

  // reload is a no-op since vehicle types are static constants now
  const reload = async () => {};

  return { list, map, icons, loading, reload };
}
