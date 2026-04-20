import { cn } from "@/lib/utils";
import * as React from "react";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-7 w-full rounded-lg border border-[#2f3850] bg-transparent px-2.5 text-xs text-[#d7dde9] outline-none placeholder:text-[#7d879a] transition-colors focus-visible:border-[#f4b450] focus-visible:ring-1 focus-visible:ring-[#f4b450]/30 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
