"use client";

import type { StudioOperation } from "@/lib/studio/despiece";

const dim = (v?: number) => (v == null ? "—" : v.toFixed(3));
const TH = "py-2 px-3 font-medium";
const TD = "py-2 px-3 text-[#9aa4b6]";

export function MachiningOperationsTable({
  operations,
}: {
  operations: StudioOperation[];
}) {
  if (operations.length === 0) {
    return <p className="text-xs text-[#7d879a]">No operations.</p>;
  }
  return (
    <table className="w-full border-collapse text-xs">
      <thead>
        <tr className="text-left text-[#7d879a]">
          <th className={TH}>Operation</th>
          <th className={TH}>Target panel</th>
          <th className={TH}>Face</th>
          <th className={TH}>Diameter</th>
          <th className={TH}>Depth</th>
          <th className={TH}>Width</th>
          <th className={TH}>Length</th>
          <th className={TH}>Through</th>
          <th className={TH}>Qty</th>
        </tr>
      </thead>
      <tbody>
        {operations.map((op, i) => (
          <tr key={i} className="border-t border-[#1c2330]">
            <td className="px-3 py-2 text-[#d7dde9]">{op.type}</td>
            <td className={TD}>{op.targetRole}</td>
            <td className={TD}>{op.face ?? "—"}</td>
            <td className={TD}>{dim(op.diameter)}</td>
            <td className={TD}>{dim(op.depth)}</td>
            <td className={TD}>{dim(op.width)}</td>
            <td className={TD}>{dim(op.length)}</td>
            <td className={TD}>{op.through ? "yes" : "no"}</td>
            <td className="px-3 py-2 font-semibold text-[#d7dde9]">{op.qty}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
