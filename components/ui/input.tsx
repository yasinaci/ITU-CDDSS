import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-itu-navy focus:ring-2 focus:ring-itu-navy/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
