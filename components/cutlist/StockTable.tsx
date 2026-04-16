"use client";

import { StockSheet } from "@/lib/domain/types";

interface Props {
  sheets: StockSheet[];
}

export function StockTable({ sheets }: Props) {
  if (sheets.length === 0) return null;

  return (
    <div style={{ marginTop: 12 }}>
      <table className="table">
        <thead>
          <tr>
            <th>Tablero</th>
            <th style={{ textAlign: "right" }}>L</th>
            <th style={{ textAlign: "right" }}>W</th>
            <th style={{ textAlign: "right" }}>Stock</th>
            <th style={{ textAlign: "right" }}>Precio</th>
          </tr>
        </thead>
        <tbody>
          {sheets.map((s) => (
            <tr key={s.odooId}>
              <td
                style={{
                  maxWidth: 160,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {s.name}
              </td>
              <td style={{ textAlign: "right" }}>{s.L} cm</td>
              <td style={{ textAlign: "right" }}>{s.W} cm</td>
              <td style={{ textAlign: "right" }}>{s.qty}</td>
              <td style={{ textAlign: "right" }} className="price">
                ${s.pricePerSheet.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
