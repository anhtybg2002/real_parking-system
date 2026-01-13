export const STATUS_META = {
  EMPTY: {
    label: "Trống",
    bg: "#F3F4F6",      
    color: "#374151",   
  },
  OCCUPIED: {
    label: "Đang đỗ",
    bg: "#16A34A",     
    color: "#FFFFFF",
  },
};
export const VEHICLE_TYPE_LABEL = {
  motorbike: "Xe máy",
  car: "Ô tô",
  bicycle: "Xe đạp",
  truck: "Xe tải",
};

export const VEHICLE_TYPE_ICON = {
  motorbike: "🏍️",
  car: "🚗",
  bicycle: "🚲",
  truck: "🚚",
};


export const CELL_KIND_META = {
  ENTRANCE: {
    label: "Cổng vào",
    bg: "#2563EB",     // xanh dương đậm
    color: "#FFFFFF",
    icon: "➡️",
  },
  EXIT: {
    label: "Cổng ra",
    bg: "#DC2626",     // đỏ đậm
    color: "#FFFFFF",
    icon: "⬅️",
  },
  LANE: {
    label: "Đường đi",
    bg: "#FACC15",     // vàng
    color: "#713F12",
    icon: "⇢",
  },
  BLOCKED: {
    label: "Chan",
    bg: "#111827",
    color: "#FFFFFF",
    icon: "X",
  },
  
  PARKING_CAR:  { 
    label: "Chỗ đỗ ô tô",  
    icon: "🚗", bg: "#dbeafe", 
    color: "#1e3a8a" 
  },
  PARKING_BIKE: { 
    label: "Chỗ đỗ xe máy", 
    icon: "🏍️", 
    bg: "#dcfce7", 
    color: "#065f46" 
  },
};

export const renderVehicleType = (type) => VEHICLE_TYPE_LABEL[type] || type || "—";
export const renderVehicleIcon = (type) => VEHICLE_TYPE_ICON[type] || "🚘";
