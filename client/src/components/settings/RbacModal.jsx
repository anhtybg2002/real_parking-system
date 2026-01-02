// RbacModal.jsx (all-in-one: UI + API + state)
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import ModalShell from "../common/ModalShell";
import commonStyles from "../../styles/commonStyles";
import axiosClient from "../../api/axiosClient";

// ----------------------------
// MENU SOURCE (UI reference)
// ----------------------------
const menu = [
  { label: "Trang chủ", icon: "dashboard", path: "/dashboard" },
  { label: "Xe Vào/ Ra", icon: "entry", path: "/dashboard/inout" },
  { label: "Vé Tháng", icon: "monthly_ticket", path: "/dashboard/monthly-ticket" },
  { label: "Cấu hình giá", icon: "pricing", path: "/dashboard/pricing" },
  { label: "Hóa đơn", icon: "invoices", path: "/dashboard/invoices" },
  { label: "Quản lý chỗ đỗ bãi xe", icon: "", path: "/dashboard/parking-area" },
  { label: "Nhân viên", icon: "staff", path: "/dashboard/staff" },
  { label: "Báo cáo", icon: "reports", path: "/dashboard/reports" },
  { label: "Cài đặt", icon: "settings", path: "/dashboard/settings" },
];

// ----------------------------
// CONSTS
// ----------------------------
const ADMIN_ROLE = "admin";
const STAFF_ROLE = "staff";
const BASE_ADMIN = "/admin/permissions";

// ----------------------------
// API (inline)
// ----------------------------
function adminListPermissions() {
  return axiosClient.get(`${BASE_ADMIN}`);
}
function adminCreatePermission(payload) {
  // payload: { label, icon, path, roles: ["admin"]... }
  return axiosClient.post(`${BASE_ADMIN}`, payload);
}
function adminUpdatePermission(id, payload) {
  // payload: { roles?: [...] , label?, icon?, path? }
  return axiosClient.put(`${BASE_ADMIN}/${id}`, payload);
}

// ----------------------------
// helpers
// ----------------------------
function ensureRole(roles, role) {
  const s = new Set(Array.isArray(roles) ? roles : []);
  s.add(role);
  return Array.from(s);
}
function removeRole(roles, role) {
  const s = new Set(Array.isArray(roles) ? roles : []);
  s.delete(role);
  return Array.from(s);
}
function buildPermListFromMenu(menuItems) {
  return menuItems.map((m) => ({
    key: m.path, // dùng path làm key
    label: m.label,
    icon: m.icon,
    path: m.path,
  }));
}
function buildStaffMapFromRows(rows) {
  const map = {};
  for (const r of rows || []) {
    map[r.path] = Array.isArray(r.roles) && r.roles.includes(STAFF_ROLE);
  }
  return map;
}

export default function RbacModal({ open, onClose }) {
  const permList = useMemo(() => buildPermListFromMenu(menu), []);

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]); // rows DB: [{id,label,icon,path,roles}]
  const [permissions, setPermissions] = useState({}); // map[path] => staff can access?
  const snapshotRef = useRef({}); // để reset

  const loadAndSync = useCallback(async () => {
    setLoading(true);
    try {
      // 1) load all permissions from DB
      const res = await adminListPermissions();
      let serverRows = res?.data || [];

      // 2) sync: ensure every menu item exists in DB
      const byPath = new Map(serverRows.map((r) => [r.path, r]));
      const missing = permList.filter((it) => !byPath.has(it.path));

      if (missing.length > 0) {
        const created = [];
        for (const it of missing) {
          const payload = {
            label: it.label,
            icon: it.icon || null,
            path: it.path,
            roles: [ADMIN_ROLE], // mặc định chỉ admin, staff OFF
          };
          const c = await adminCreatePermission(payload);
          if (c?.data) created.push(c.data);
        }
        serverRows = [...serverRows, ...created];
      }

      // 3) set state
      setRows(serverRows);
      const staffMap = buildStaffMapFromRows(serverRows);
      setPermissions(staffMap);
      snapshotRef.current = staffMap;
    } finally {
      setLoading(false);
    }
  }, [permList]);

  useEffect(() => {
    if (open) loadAndSync();
  }, [open, loadAndSync]);

  const onReset = useCallback(() => {
    setPermissions(snapshotRef.current || {});
  }, []);

  const onToggle = useCallback((path, checked) => {
    setPermissions((prev) => ({ ...prev, [path]: checked }));
  }, []);

  const onSave = useCallback(async () => {
    setLoading(true);
    try {
      const byPath = new Map(rows.map((r) => [r.path, r]));
      const tasks = [];

      for (const it of permList) {
        const row = byPath.get(it.path);
        if (!row) continue;

        const wantStaff = !!permissions[it.path];
        const hadStaff = Array.isArray(row.roles) && row.roles.includes(STAFF_ROLE);

        if (wantStaff === hadStaff) continue;

        let nextRoles = wantStaff
          ? ensureRole(row.roles, STAFF_ROLE)
          : removeRole(row.roles, STAFF_ROLE);

        // luôn giữ admin để tránh tự khóa hệ thống
        nextRoles = ensureRole(nextRoles, ADMIN_ROLE);

        tasks.push(adminUpdatePermission(row.id, { roles: nextRoles }));
      }

      if (tasks.length > 0) await Promise.all(tasks);

      // reload cho chắc chắn
      await loadAndSync();
      onClose?.();
    } finally {
      setLoading(false);
    }
  }, [rows, permList, permissions, loadAndSync, onClose]);

  if (!open) return null;

  const p = permissions || {};

  return (
    <ModalShell
      title="Nhân viên & phân quyền"
      subtitle="Bật/tắt quyền truy cập các trang đối với tài khoản nhân viên (staff)."
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            style={commonStyles.buttonSecondary}
            onClick={onReset}
            disabled={loading}
          >
            Khôi phục mặc định
          </button>
          <button
            type="button"
            style={commonStyles.buttonSecondary}
            onClick={onClose}
            disabled={loading}
          >
            Hủy
          </button>
          <button
            type="button"
            style={commonStyles.buttonPrimary}
            onClick={onSave}
            disabled={loading}
          >
            {loading ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </>
      }
    >
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 14,
          padding: 14,
          background: "#fff",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>
          Quyền theo trang (Role: staff)
        </div>
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
          Nếu tắt một trang, nhân viên sẽ không thấy menu và bị chặn khi truy cập URL trực tiếp.
        </div>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {(permList || []).map((it) => (
            <label
              key={it.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                border: "1px solid #eef2f7",
                borderRadius: 12,
                padding: 10,
                background: "#fafafa",
                opacity: loading ? 0.7 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={!!p[it.path]}
                disabled={loading}
                onChange={(e) => onToggle(it.path, e.target.checked)}
              />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
                  {it.label}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  {p[it.path] ? "Được phép truy cập" : "Bị chặn truy cập"}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: "#6b7280" }}>
        Backend: GET/POST/PUT tại <code>/admin/permissions</code>. Quyền staff được lưu bằng việc thêm/bỏ
        chuỗi <code>"staff"</code> trong mảng <code>roles</code>.
      </div>
    </ModalShell>
  );
}
