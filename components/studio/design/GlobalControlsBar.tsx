"use client";

import { useStudioStore } from "@/store/studioStore";

function Field({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="rounded-xl border border-[#1f2735] bg-[#0d1119] p-3">
      <div className="mb-1 text-[11px] uppercase tracking-wide text-[#7d879a]">
        {label}
      </div>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!Number.isNaN(v)) onChange(v);
        }}
        className="w-full bg-transparent text-2xl font-semibold text-[#f4b450] outline-none"
      />
    </div>
  );
}

export function GlobalControlsBar() {
  const g = useStudioStore((s) => s.doc.globals);
  const set = useStudioStore((s) => s.setGlobals);
  return (
    <div className="grid grid-cols-3 gap-3">
      <Field label="Depth (m)" value={g.depth} step={0.05} onChange={(v) => set({ depth: v })} />
      <Field label="Thickness (mm)" value={g.thickness} step={1} onChange={(v) => set({ thickness: v })} />
      <Field label="Overhang (mm)" value={g.overhang} step={1} onChange={(v) => set({ overhang: v })} />
    </div>
  );
}
