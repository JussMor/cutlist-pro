"use client";

import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";

/** The round "+" affordance used to add columns and modules in the facade. */
export function AddAffordance({
  onClick,
  className,
  title,
}: {
  onClick: () => void;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "flex size-6 items-center justify-center rounded-full bg-[#f4b450] text-black shadow-md transition hover:brightness-110 active:translate-y-px",
        className,
      )}
    >
      <Plus className="size-4" />
    </button>
  );
}
