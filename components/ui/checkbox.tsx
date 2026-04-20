"use client";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer inline-flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-md border border-[#2f3850] bg-transparent data-disabled:cursor-not-allowed data-disabled:opacity-50",
      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#f4b450]/30 focus-visible:border-[#f4b450]",
      "data-state-checked:border-[#f4b450] data-state-checked:bg-[#f4b450]/10",
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center">
      <Check className="size-3 text-[#f4b450]" strokeWidth={3} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
