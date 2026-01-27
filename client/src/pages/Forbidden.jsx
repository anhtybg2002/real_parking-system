// src/pages/Forbidden.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

const ForbiddenPage = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: "#f9fafb",
        padding: "20px",
      }}
    >
      <div
        style={{
          textAlign: "center",
          maxWidth: "500px",
          backgroundColor: "white",
          padding: "40px",
          borderRadius: "12px",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        }}
      >
        <div
          style={{
            fontSize: "72px",
            fontWeight: "bold",
            color: "#dc2626",
            marginBottom: "20px",
          }}
        >
          403
        </div>
        
        <h1
          style={{
            fontSize: "24px",
            fontWeight: "600",
            color: "#1f2937",
            marginBottom: "12px",
          }}
        >
          Không có quyền truy cập
        </h1>
        
        <p
          style={{
            fontSize: "16px",
            color: "#6b7280",
            marginBottom: "32px",
            lineHeight: "1.6",
          }}
        >
          Xin lỗi, bạn không có quyền truy cập chức năng này. Vui lòng liên hệ quản trị viên.
        </p>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: "10px 20px",
              backgroundColor: "#f3f4f6",
              color: "#374151",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
            }}
          >
            ← Quay lại
          </button>
          
          <button
            onClick={() => navigate("/dashboard")}
            style={{
              padding: "10px 20px",
              backgroundColor: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
            }}
          >
            Về trang chủ
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForbiddenPage;
