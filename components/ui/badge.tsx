import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "default" | "success" | "warning" | "danger" | "info";
};

const toneClass = {
  default: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200",
  danger: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200"
};

export const Badge = ({ className, tone = "default", ...props }: BadgeProps) => (
  <span
    className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", toneClass[tone], className)}
    {...props}
  />
);
