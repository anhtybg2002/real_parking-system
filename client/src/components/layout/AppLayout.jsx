// src/components/layout/AppLayout.jsx
import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

const AppLayout = ({ title, children }) => {
  const [active, setActive] = useState("Dashboard");

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        background: "#e5e7eb",
        padding: "16px",
        boxSizing: "border-box",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, system-ui, -system-ui, "SF Pro Text", sans-serif',
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "230px 1fr",
          gap: "18px",
          width: "100%",
        }}
      >
        <Sidebar active={active} onNavigate={setActive} />

        <main
          style={{
            background: "#f9fafb",
            borderRadius: "18px",
            boxShadow: "0 14px 40px rgba(15,23,42,0.07)",
            display: "flex",
            flexDirection: "column",
            width: "100%",
            minHeight: "calc(100vh - 32px)",
          }}
        >
          <Topbar title={title || active} user={{ name: "Admin" }} />
          <div style={{ padding: "6px 24px 20px 24px" }}>{children}</div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
