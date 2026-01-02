// src/pages/StaffEditPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import Card from "../components/common/Card";
import AlertMessages from "../components/inout/AlertMessages";
import axiosClient from "../api/axiosClient";
import commonStyles from "../styles/commonStyles";




export default function StaffEditPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get("id");

  const [alert, setAlert] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    username: "",
    full_name: "",
    phone: "",
    email: "",
    role: "staff",
    is_active: true,
  });

  // Nếu không có id thì quay lại danh sách
  useEffect(() => {
    if (!userId) {
      setAlert({
        type: "error",
        message: "Thiếu thông tin nhân viên cần chỉnh sửa.",
      });
      // cho hiển alert chút rồi quay lại
      setTimeout(() => navigate("/dashboard/staff"), 800);
    }
  }, [userId, navigate]);

  // Lấy thông tin nhân viên
  useEffect(() => {
    if (!userId) return;

    const fetchUser = async () => {
      try {
        setLoading(true);
        const res = await axiosClient.get(`/users/${userId}`);
        const data = res?.data ?? res;

        setForm({
          username: data.username || "",
          full_name: data.full_name || "",
          phone: data.phone || "",
          email: data.email || "",
          role: data.role || "staff",
          is_active: !!data.is_active,
        });
      } catch (err) {
        console.error(err);
        setAlert({
          type: "error",
          message:
            err?.response?.data?.detail ||
            "Không tải được thông tin nhân viên.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId) return;

    setAlert({ type: "", message: "" });
    try {
      setSaving(true);

      const payload = {
        full_name: form.full_name || null,
        phone: form.phone || null,
        email: form.email || null,
        role: form.role,
        is_active: form.is_active,
      };

      await axiosClient.put(`/users/${userId}`, payload);

      setAlert({
        type: "entry",
        message: "Cập nhật thông tin nhân viên thành công.",
      });

      setTimeout(() => {
        navigate("/dashboard/staff");
      }, 800);
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.detail ||
        "Không thể cập nhật nhân viên. Vui lòng kiểm tra lại.";
      setAlert({ type: "error", message: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout title="Chỉnh sửa nhân viên">
      <AlertMessages alert={alert} />

      <Card
        style={{
          maxWidth: "100%",
        }}
      >
        <h2
          style={{
            fontSize: 20,
            fontWeight: 600,
            marginBottom: 12,
          }}
        >
          Chỉnh sửa thông tin nhân viên
        </h2>

        {loading ? (
          <div style={{ padding: 12 }}>Đang tải thông tin nhân viên...</div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{
              ...commonStyles.form,
              maxWidth: 720,
              margin: "8px auto 0",
            }}
          >
            {/* Username chỉ xem, không chỉnh sửa */}
            <label style={commonStyles.label}>
              Tên đăng nhập
              <input
                value={form.username}
                readOnly
                style={{
                  ...commonStyles.input,
                  backgroundColor: "#f3f4f6",
                  cursor: "not-allowed",
                }}
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
                onClick={() => navigate("/dashboard/staff")}
                disabled={saving}
              >
                Hủy
              </button>
              <button
                type="submit"
                style={commonStyles.buttonPrimary}
                disabled={saving}
              >
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </form>
        )}
      </Card>
    </AppLayout>
  );
}
