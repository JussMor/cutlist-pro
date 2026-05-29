"use client";

import { cn } from "@/lib/utils";
import { useStudioStore, type StudioTab } from "@/store/studioStore";

export function StudioTabs() {
  const tab = useStudioStore((s) => s.activeTab);
  const setTab = useStudioStore((s) => s.setActiveTab);

  const items: { id: StudioTab; label: string }[] = [
    { id: "design", label: "Design" },
    { id: "cutlist", label: "Cutlist" },
  ];

  return (
    <div className="flex items-center gap-1 rounded-full bg-[#11151d] p-1">
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          onClick={() => setTab(it.id)}
          className={cn(
            "rounded-full px-4 py-1.5 text-sm transition",
            tab === it.id
              ? "bg-[#e8eaee] font-medium text-[#0b0e14]"
              : "text-[#9aa4b6] hover:text-[#d7dde9]",
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
