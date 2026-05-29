"use client";

import type { StudioPanel } from "@/lib/studio/despiece";

const fmt = (v: number) => v.toFixed(3);
const TH = "py-2 px-3 font-medium";
const TD = "py-2 px-3 text-[#9aa4b6]";

export function PanelCutlistTable({ panels }: { panels: StudioPanel[] }) {
  return (
    <table className="w-full border-collapse text-xs">
      <thead>
        <tr className="text-left text-[#7d879a]">
          <th className={TH}>Role</th>
          <th className={TH}>Orientation</th>
          <th className={TH}>Width</th>
          <th className={TH}>Height</th>
          <th className={TH}>Thickness</th>
          <th className={TH}>Qty</th>
        </tr>
      </thead>
      <tbody>
        {panels.map((p) => (
          <tr key={p.key} className="border-t border-[#1c2330]">
            <td className="px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#e8eaee] text-[10px] font-bold text-[#0b0e14]">
                  {p.badge}
                </span>
                <span className="text-[#d7dde9]">{p.role}</span>
              </div>
            </td>
            <td className={TD}>{p.orientation}</td>
            <td className={TD}>{fmt(p.width)}</td>
            <td className={TD}>{fmt(p.height)}</td>
            <td className={TD}>{fmt(p.thickness)}</td>
            <td className="px-3 py-2 font-semibold text-[#d7dde9]">{p.qty}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
