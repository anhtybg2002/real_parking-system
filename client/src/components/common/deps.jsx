export const formatTime = (timeString) => {
  if (!timeString) return "";

  // Nếu chuỗi không có timezone thì coi là UTC để convert về giờ VN
  const iso = timeString.endsWith("Z") ? timeString : timeString + "Z";
  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) return timeString;

  const pad = (n) => n.toString().padStart(2, "0");

  const dd = pad(d.getDate());
  const mm = pad(d.getMonth() + 1);
  const yyyy = d.getFullYear();

  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  const ss = pad(d.getSeconds());

  return `${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`;
};