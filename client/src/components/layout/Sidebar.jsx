// src/components/layout/Sidebar.jsx
import React, { useEffect, useMemo, useState } from "react";
import SidebarItem from "./SidebarItem";
import { useNavigate, useLocation } from "react-router-dom";
import axiosClient from "../../api/axiosClient";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Menu master (UI)
  const menuMaster = useMemo(
    () => [
      { label: "Trang chủ", icon: "dashboard", path: "/dashboard" },
      { label: "Xe Vào/ Ra", icon: "entry", path: "/dashboard/inout" },
      { label: "Vé Tháng", icon: "monthly_ticket", path: "/dashboard/monthly-ticket" },
      { label: "Cấu hình giá", icon: "pricing", path: "/dashboard/pricing" },
      { label: "Hóa đơn", icon: "invoices", path: "/dashboard/invoices" },
      { label: "Quản lý chỗ đỗ bãi xe", icon: "", path: "/dashboard/parking-area" },
      { label: "Nhân viên", icon: "staff", path: "/dashboard/staff" },
      { label: "Báo cáo", icon: "reports", path: "/dashboard/reports" },
      { label: "Cài đặt", icon: "settings", path: "/dashboard/settings" },
    ],
    []
  );

  // Permission state
  const [allowedPaths, setAllowedPaths] = useState(null); // null = đang load
  const [permLoading, setPermLoading] = useState(false);

  // Load permissions của user (khi sidebar mount)
  useEffect(() => {
    let mounted = true;

    async function loadPerms() {
      try {
        setPermLoading(true);

        // Ưu tiên endpoint bạn đang có trên swagger:
        // GET /admin/permissions/me
        // Nếu bạn đổi sang /permissions/me thì sửa ở đây.
        const res = await axiosClient.get("/admin/permissions/me");

        const data = res?.data || {};
        const paths = Array.isArray(data.allowed_paths) ? data.allowed_paths : [];

        if (mounted) setAllowedPaths(paths);
      } catch (e) {
        console.error("Load permissions failed:", e);
        // Nếu lỗi, để tránh “mất menu”, cho hiển thị tất cả (hoặc none tùy bạn)
        if (mounted) setAllowedPaths(menuMaster.map((m) => m.path));
      } finally {
        if (mounted) setPermLoading(false);
      }
    }

    loadPerms();
    return () => {
      mounted = false;
    };
  }, [menuMaster]);

  const handleNavigate = (path) => {
    navigate(path);
  };

  const isActive = (item) => {
    if (item.path === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(item.path);
  };

  // Filter theo allowedPaths (nếu chưa load xong thì tạm hiển thị menuMaster hoặc hiển thị skeleton)
  const menuVisible = useMemo(() => {
    if (allowedPaths == null) return menuMaster; // đang load: bạn có thể đổi thành [] nếu muốn ẩn
    const allowSet = new Set(allowedPaths);
    return menuMaster.filter((m) => allowSet.has(m.path));
  }, [allowedPaths, menuMaster]);

  return (
    <aside
      style={{
        width: "230px",
        background: "#020817",
        color: "#e5e7eb",
        padding: "18px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 18,
        borderRadius: "18px",
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "4px 6px 14px 6px",
          borderBottom: "1px solid rgba(148,163,253,0.12)",
          marginBottom: 2,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 999,
            background: "#1d4ed8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 18,
          }}
        >
          🚗
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: "15px", letterSpacing: "0.06em" }}>
            HỆ THỐNG QUẢN LÝ ĐỖ XE
          </div>
          {permLoading && (
            <div style={{ fontSize: 11, color: "rgba(229,231,235,0.7)", marginTop: 3 }}>
              Đang tải quyền...
            </div>
          )}
        </div>
      </div>

      {/* Menu */}
      <nav style={{ marginTop: 4 }}>
        {menuVisible.map((item) => (
          <SidebarItem
            key={item.path}
            label={item.label}
            icon={item.icon}
            active={isActive(item)}
            onClick={() => handleNavigate(item.path)}
          />
        ))}

        {/* Nếu user không có quyền gì */}
        {allowedPaths?.length === 0 && (
          <div style={{ fontSize: 12, color: "rgba(229,231,235,0.7)", padding: "8px 6px" }}>
            Tài khoản chưa được cấp quyền truy cập trang nào.
          </div>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
