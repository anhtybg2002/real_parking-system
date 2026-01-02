// src/components/common/DataTable.jsx
import React from "react";
import commonStyles from "../../styles/commonStyles";

const DataTable = ({ columns, data }) => {
  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <table style={commonStyles.table}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  ...commonStyles.th,
                  textAlign: col.align || "left",
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                style={{ ...commonStyles.td, color: "#9ca3af", textAlign: "center" }}
              >
                Không có dữ liệu
              </td>
            </tr>
          )}

          {data.map((row, idx) => (
            <tr key={idx}>
              {columns.map((col) => {
                const cell = row[col.key];

                return (
                  <td
                    key={col.key}
                    style={{
                      ...commonStyles.td,
                      textAlign: col.align || "left",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {/* Render JSX hoặc text */}
                    {cell}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
