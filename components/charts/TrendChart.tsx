"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toLocalTime } from "@/lib/utils";

export type TrendPoint = {
  record_time: string;
  [key: string]: number | string | null;
};

export const TrendChart = ({
  data,
  dataKey,
  color,
  unit,
  yDomain
}: {
  data: TrendPoint[];
  dataKey: string;
  color: string;
  unit: string;
  yDomain?: [number, number];
}) => {
  if (!data.length) {
    return <div className="grid h-72 place-items-center rounded-md border border-dashed border-slate-300 text-sm text-slate-500 dark:border-slate-700">No readings in this period</div>;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 12, right: 18, bottom: 8, left: 0 }}>
          <XAxis dataKey="record_time" tickFormatter={toLocalTime} tick={{ fontSize: 12 }} minTickGap={28} />
          <YAxis domain={yDomain} tick={{ fontSize: 12 }} width={42} />
          <Tooltip
            labelFormatter={(value) => toLocalTime(String(value))}
            formatter={(value) => [`${Number(value).toFixed(1)} ${unit}`, ""]}
            contentStyle={{ borderRadius: 8, borderColor: "#dbe4ef" }}
          />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
