// src/pages/EmployeeCreatePage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import Card from "../components/common/Card";
import AlertMessages from "../components/inout/AlertMessages";
import axiosClient from "../api/axiosClient";
import commonStyles from "../styles/commonStyles";

export default function StaffCreatePage() {
  const navigate = useNavigate();
  const [alert, setAlert] = useState({ type: "", message: "" });
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    username: "",
    password: "",
    full_name: "",
    phone: "",
    email: "",
    role: "staff",
    is_active: true,
  });

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert({ type: "", message: "" });

    if (!form.username.trim() || !form.password.trim()) {
      setAlert({
        type: "error",
        message: "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.",
      });
      return;
    }

    try {
      setSaving(true);
      const payload = {
        username: form.username.trim(),
        password: form.password,
        full_name: form.full_name.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        role: form.role,
        is_active: form.is_active,
      };

      await axiosClient.post("/users", payload);

      setAlert({
        type: "entry",
        message: "Tạo tài khoản nhân viên thành công.",
      });

      // Có thể cho 1 alert nhỏ hoặc quay lại danh sách luôn
      setTimeout(() => {
        navigate("/dashboard/staff");
      }, 800);
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.detail ||
        "Không thể tạo nhân viên. Vui lòng kiểm tra lại dữ liệu.";
      setAlert({ type: "error", message: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout title="Thêm nhân viên">
      <AlertMessages alert={alert} />

      <Card>
        <h2
          style={{
            maxWidth: "100%",
            fontSize: 20,
            fontWeight: 600,
            marginBottom: 12,
          }}
        >
          Thêm nhân viên mới
        </h2>

        <form
          onSubmit={handleSubmit}
          style={{
            ...commonStyles.form,
            maxWidth: 720,
            margin: "8px auto 0",
          }}
        >
          <label style={commonStyles.label}>
            Tên đăng nhập
            <input
              name="username"
              value={form.username}
              onChange={handleChange}
              style={commonStyles.input}
              placeholder="vd: nhanvien01"
              required
            />
          </label>

          <label style={commonStyles.label}>
            Mật khẩu
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              style={commonStyles.input}
              placeholder="Mật khẩu đăng nhập"
              required
            />
          </label>

          <label style={commonStyles.label}>
            Họ và tên
            <input
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              style={commonStyles.input}
              placeholder="Tên nhân viên"
            />
          </label>

          <label style={commonStyles.label}>
            Số điện thoại
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              style={commonStyles.input}
              placeholder="SĐT liên hệ"
            />
          </label>

          <label style={commonStyles.label}>
            Email
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              style={commonStyles.input}
              placeholder="Email (nếu có)"
            />
          </label>

          <label style={commonStyles.label}>
            Vai trò
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              style={commonStyles.select}
            >
              <option value="staff">Nhân viên</option>
              <option value="admin">Quản trị</option>
            </select>
          </label>

          <label
            style={{
              ...commonStyles.label,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <input
              type="checkbox"
              name="is_active"
              checked={form.is_active}
              onChange={handleChange}
            />
            <span>Tài khoản đang hoạt động</span>
          </label>

          <div
            style={{
              ...commonStyles.actionsRow,
              justifyContent: "flex-end",
              marginTop: 8,
            }}
          >
            <button
              type="button"
              style={commonStyles.buttonSecondary}
              onClick={() => navigate("dashboard/staff")}
              disabled={saving}
            >
              Hủy
            </button>
            <button
              type="submit"
              style={commonStyles.buttonPrimary}
              disabled={saving}
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </form>
      </Card>
    </AppLayout>
  );
}
