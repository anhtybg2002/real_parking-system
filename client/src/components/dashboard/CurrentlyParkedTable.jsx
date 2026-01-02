
import React from "react";
import Card from "../common/Card";
import DataTable from "../common/DataTable";

export default function CurrentlyParkedTable({
  loading,
  activeLogs,
  fetchData,
  tableColumns,
  tableData,
}) {
  return (
    <Card title="Danh sách xe đang đỗ">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 10,
          fontSize: 12,
          color: "#6b7280",
        }}
      >
        <span>
          {loading
            ? "Đang tải dữ liệu..."
            : `${activeLogs.length} lượt gửi xe đang hoạt động`}
        </span>
        <button
          onClick={fetchData}
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid #d1d5db",
            backgroundColor: "#ffffff",
            fontSize: 11,
            cursor: "pointer",
          }}
        >
          Làm mới
        </button>
      </div>

      <DataTable columns={tableColumns} data={tableData} />
    </Card>
  );
}
