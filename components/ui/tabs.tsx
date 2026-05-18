"use client";

import { cn } from "@/lib/utils";

type TabsProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  items: Array<{ value: T; label: string }>;
  className?: string;
};

export const Tabs = <T extends string>({ value, onChange, items, className }: TabsProps<T>) => (
  <div className={cn("inline-flex rounded-md border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900", className)}>
    {items.map((item) => (
      <button
        key={item.value}
        type="button"
        onClick={() => onChange(item.value)}
        className={cn(
          "rounded px-3 py-1.5 text-sm font-medium transition",
          value === item.value
            ? "bg-itu-navy text-white"
            : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        )}
      >
        {item.label}
      </button>
    ))}
  </div>
);
