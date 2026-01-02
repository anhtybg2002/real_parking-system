// src/pages/EmployeesPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";        // 👈 thêm
import AppLayout from "../components/layout/AppLayout";
import Card from "../components/common/Card";
import DataTable from "../components/common/DataTable";
import AlertMessages from "../components/inout/AlertMessages";
import axiosClient from "../api/axiosClient";
import commonStyles from "../styles/commonStyles";

export default function StaffPage() {
  const [employees, setEmployees] = useState([]);
  const [alert, setAlert] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const navigate = useNavigate();                     

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get("/users");
      const data = res?.data ?? res;
      setEmployees(Array.isArray(data) ? data : data.data ?? []);
    } catch (err) {
      console.error(err);
      setAlert({
        type: "error",
        message: "Không thể tải danh sách nhân viên.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const statusPill = (isActive) =>
    isActive ? (
      <span
        style={{
          ...commonStyles.pill,
          backgroundColor: "#dcfce7",
          color: "#166534",
        }}
      >
        Hoạt động
      </span>
    ) : (
      <span
        style={{
          ...commonStyles.pill,
          backgroundColor: "#fee2e2",
          color: "#b91c1c",
        }}
      >
        Không hoạt động
      </span>
    );

  const roleLabel = (role) => {
    if (role === "admin") return "Quản trị";
    if (role === "staff") return "Nhân viên";
    return "Nhân viên";
  };

  const filteredEmployees = employees.filter((u) => {
    const q = search.toLowerCase();

    const matchSearch =
      !q ||
      (u.full_name || "").toLowerCase().includes(q) ||
      (u.username || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.phone || "").toLowerCase().includes(q);

    const matchRole =
      filterRole === "all" ? true : (u.role || "staff") === filterRole;

    const isActive = !!u.is_active;
    const matchStatus =
      filterStatus === "all"
        ? true
        : filterStatus === "active"
        ? isActive
        : !isActive;

    return matchSearch && matchRole && matchStatus;
  });

  const columns = [
    { key: "name", label: "Họ tên" },
    { key: "phone", label: "Số điện thoại" },
    { key: "email", label: "Email" },
    { key: "statusNode", label: "Trạng thái" },
    { key: "role", label: "Vai trò" },
    { key: "edit", label: "Chỉnh sửa", align: "center" },
    { key: "delete", label: "Xóa", align: "center" },
  ];

  const tableData = filteredEmployees.map((u) => ({
    name: u.full_name || u.username,
    phone: u.phone || u.phone_number || "",
    email: u.email || "",
    statusNode: statusPill(u.is_active),
    role: roleLabel(u.role),
    edit: (
      <button
        style={{
          ...commonStyles.buttonPrimary,
          padding: "6px 14px",
          fontSize: 12,
          borderRadius: 9999,
        }}
        onClick={() =>
          navigate(`/dashboard/staff/edit?id=${u.id}`)
        }
      >
        Chỉnh sửa
      </button>
    ),


    delete: (
    <button
      style={{
        ...commonStyles.buttonDanger,
        padding: "6px 14px",
        fontSize: 12,
        borderRadius: 9999,
      }}
      onClick={() => handleDelete(u)}
    >
      Xóa
    </button>
    ),

  }));


  const handleDelete = async (user) => {
  if (!window.confirm(`Xóa nhân viên "${user.full_name || user.username}" ?`)) {
    return;
  }

  try {
    await axiosClient.delete(`/users/${user.id}`);

    setAlert({
      type: "entry",
      message: "Đã xóa nhân viên thành công.",
    });

    fetchEmployees(); // load lại bảng
  } catch (err) {
    console.error(err);
    setAlert({
      type: "error",
      message:
        err?.response?.data?.detail || "Không thể xóa nhân viên. Vui lòng thử lại.",
    });
  }
};


  return (
    <AppLayout title="Quản lý nhân viên">
      <AlertMessages alert={alert} />

      <Card>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>Quản lý nhân viên</h2>

          <button
            type="button"
            style={commonStyles.buttonPrimary}
            onClick={() => navigate("/dashboard/staff/new")} 
          >
            + Thêm nhân viên
          </button>
        </div>

        {/* Search + Filter */}
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 16,
            alignItems: "center",
          }}
        >
          <input
            placeholder="Tìm theo tên / email / SĐT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...commonStyles.input, maxWidth: 260 }}
          />

          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            style={commonStyles.select}
          >
            <option value="all">Tất cả vai trò</option>
            <option value="admin">Quản trị</option>
            <option value="staff">Nhân viên</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={commonStyles.select}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="inactive">Không hoạt động</option>
          </select>

          <button
            type="button"
            onClick={fetchEmployees}
            style={commonStyles.buttonSecondary}
          >
            Làm mới
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ padding: 12 }}>Đang tải...</div>
        ) : (
          <DataTable columns={columns} data={tableData} />
        )}
      </Card>
    </AppLayout>
  );
}
