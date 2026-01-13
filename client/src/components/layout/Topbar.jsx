// src/components/layout/Topbar.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";   
import Avatar from "../common/Avatar";
import axiosClient from "../../api/axiosClient";
import { logout } from "../../services/auth";

const Topbar = ({ title = "Dashboard" }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();              

  useEffect(() => {
    let isMounted = true;

    const fetchMe = async () => {
      try {
        const res = await axiosClient.get("/auth/me");
        const data = res?.data ?? res;
        if (isMounted) setCurrentUser(data);
      } catch (err) {
        console.error("Lỗi lấy thông tin /auth/me:", err);
      }
    };

    fetchMe();

    return () => {
      isMounted = false;
    };
  }, []);

  // đóng menu khi click ra ngoài
  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (e) => {
      if (
        e.target.closest("[data-topbar-menu]") ||
        e.target.closest("[data-topbar-avatar]")
      ) {
        return;
      }
      setMenuOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const name = currentUser?.full_name || "Người dùng";

  const handleToggleMenu = () => {
    setMenuOpen((prev) => !prev);
  };

  const handleGotoProfile = () => {
    if (!currentUser?.id) return;

    // dùng React Router navigate thay vì window.location
    navigate(`/dashboard/staff/edit?id=${currentUser.id}`);   // 👈 chỉnh path cho khớp route của bạn
  };

  const handleGotoSettings = () => {
    navigate("/settings");
  };

  const handleLogout = async () => {
    try {
      // gọi API logout nếu có
      try {
        await axiosClient.post("/auth/logout");
      } catch (e) {
        console.warn("Logout API lỗi hoặc không tồn tại, bỏ qua:", e);
      }

      // xoá token local nếu bạn đang lưu ở đây
      try {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
      } catch (e) {
        // ignore
      }
      logout();

      // điều hướng về trang đăng nhập
      navigate("/login", { replace: true }); // 👈 replace để không quay lại được bằng nút Back
    } catch (err) {
      console.error("Lỗi khi đăng xuất:", err);
    }
  };

  return (
    <div
      style={{
        padding: "18px 24px 10px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid #e5e7eb",
        backgroundColor: "#fff",
        position: "relative",
        zIndex: 10,
      }}
    >
      <h1
        style={{
          fontSize: "28px",
          fontWeight: 700,
          color: "#111827",
        }}
      >
        {title}
      </h1>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          position: "relative",
        }}
      >
        {/* Khu vực click để mở menu */}
        <button
          type="button"
          onClick={handleToggleMenu}
          data-topbar-avatar
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "4px 8px",
            borderRadius: 999,
            border: "1px solid #e5e7eb",
            backgroundColor: "#f9fafb",
            cursor: "pointer",
          }}
        >
          <span
            style={{
              fontSize: "14px",
              color: "#374151",
              fontWeight: 500,
              maxWidth: 160,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {name}
          </span>
          <Avatar name={name} />
          <span
            style={{
              fontSize: 16,
              color: "#9ca3af",
              transform: menuOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.15s",
            }}
          >
            ▾
          </span>
        </button>

        {/* Dropdown menu */}
        {menuOpen && (
          <div
            data-topbar-menu
            style={{
              position: "absolute",
              top: "100%",
              right: 0,
              marginTop: 8,
              width: 220,
              backgroundColor: "#ffffff",
              borderRadius: 8,
              boxShadow:
                "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
              border: "1px solid #e5e7eb",
              overflow: "hidden",
            }}
          >
            {/* Header nhỏ trong menu */}
            <div
              style={{
                padding: "10px 12px",
                borderBottom: "1px solid #e5e7eb",
                backgroundColor: "#f9fafb",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#111827",
                }}
              >
                {name}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#6b7280",
                  marginTop: 2,
                }}
              >
                Tài khoản hiện tại
              </div>
            </div>

            {/* Menu items */}
            <button
              type="button"
              onClick={handleGotoProfile}
              style={menuItemStyle}
            >
              👤 Thông tin cá nhân
            </button>

            <button
              type="button"
              onClick={handleGotoSettings}
              style={menuItemStyle}
            >
              🖼️ Đổi ảnh đại diện / bìa
            </button>

            <div
              style={{
                borderTop: "1px solid #e5e7eb",
                marginTop: 4,
              }}
            />

            <button
              type="button"
              onClick={handleLogout}
              style={{
                ...menuItemStyle,
                color: "#b91c1c",
              }}
            >
              🚪 Đăng xuất
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// style chung cho item trong menu
const menuItemStyle = {
  width: "100%",
  textAlign: "left",
  padding: "8px 12px",
  fontSize: 13,
  color: "#374151",
  backgroundColor: "transparent",
  border: "none",
  cursor: "pointer",
  outline: "none",
  display: "block",
};

export default Topbar;
