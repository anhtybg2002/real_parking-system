// src/pages/Login.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/auth";
import commonStyles from "../styles/commonStyles";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await login(username, password);
    if (ok) {
      navigate("/dashboard");
    } else {
      setError("Sai tài khoản hoặc mật khẩu!");
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h1 style={styles.title}>Hệ thống bãi gửi xe</h1>
        <p style={styles.subtitle}>Đăng nhập để quản lý bãi xe</p>

        <form onSubmit={handleSubmit} style={commonStyles.form}>
          {error && <div style={styles.errorBox}>{error}</div>}

          <label style={commonStyles.label}>
            Tên đăng nhập
            <input
              style={commonStyles.input}
              placeholder="Nhập tên đăng nhập"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </label>

          <label style={commonStyles.label}>
            Mật khẩu
            <input
              style={commonStyles.input}
              type="password"
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          <button type="submit" style={styles.loginButton}>
            Đăng nhập
          </button>
        </form>

        <p style={styles.footerText}>© {new Date().getFullYear()} Parking System</p>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    width: "100vw",
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 40%, #e5e7eb 100%)",
    padding: 16,
    boxSizing: "border-box",
    overflow: "hidden",
  },

  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: "28px 26px",
    boxShadow: "0 20px 55px rgba(15, 23, 42, 0.18)",
    animation: "fadeIn 0.3s ease",
  },

  title: {
    fontSize: 24,
    fontWeight: 700,
    textAlign: "center",
    color: "#111827",
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 14,
    textAlign: "center",
    color: "#6b7280",
    marginBottom: 18,
  },

  loginButton: {
    ...commonStyles.buttonPrimary,
    width: "100%",
    marginTop: 6,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
  },

  errorBox: {
    ...commonStyles.buttonDanger,
    width: "100%",
    textAlign: "center",
    padding: "8px 0",
    marginBottom: 4,
  },

  footerText: {
    marginTop: 16,
    fontSize: 11,
    textAlign: "center",
    color: "#9ca3af",
  },
};
