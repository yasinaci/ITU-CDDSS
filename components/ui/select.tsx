import * as React from "react";
import { cn } from "@/lib/utils";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-itu-navy focus:ring-2 focus:ring-itu-navy/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white",
        className
      )}
      {...props}
    />
  )
);
Select.displayName = "Select";
