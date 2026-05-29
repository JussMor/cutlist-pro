import { AlertTriangle } from "lucide-react";

/** Disclaimer stamp pinned to the corner of the cutlist view. */
export function NoGuaranteeStamp() {
  return (
    <div className="pointer-events-none fixed bottom-6 left-6 z-10 flex -rotate-12 select-none flex-col items-center rounded-md border-2 border-[#f4b450] bg-[#07090d]/60 px-3 py-1.5 text-[#f4b450] opacity-80">
      <AlertTriangle className="size-5" />
      <span className="mt-0.5 text-[10px] font-bold tracking-[0.2em]">
        NO GUARANTEE
      </span>
    </div>
  );
}
