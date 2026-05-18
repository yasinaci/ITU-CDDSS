import * as React from "react";
import { cn } from "@/lib/utils";

export const Table = ({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) => (
  <div className="w-full overflow-x-auto">
    <table className={cn("w-full min-w-[720px] text-left text-sm", className)} {...props} />
  </div>
);

export const Th = ({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th className={cn("border-b border-slate-200 px-3 py-3 font-semibold text-slate-600 dark:border-slate-800 dark:text-slate-300", className)} {...props} />
);

export const Td = ({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn("border-b border-slate-100 px-3 py-3 align-middle dark:border-slate-800", className)} {...props} />
);
