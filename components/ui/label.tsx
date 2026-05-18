import * as React from "react";
import { cn } from "@/lib/utils";

export const Label = ({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={cn("text-sm font-medium text-slate-700 dark:text-slate-200", className)} {...props} />
);
