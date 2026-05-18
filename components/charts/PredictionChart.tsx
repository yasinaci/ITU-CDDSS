"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toLocalTime } from "@/lib/utils";

export type PredictionPoint = {
  target_time: string;
  predicted_rate: number | null;
};

export const PredictionChart = ({ data }: { data: PredictionPoint[] }) => {
  if (!data.length) {
    return <div className="grid h-72 place-items-center rounded-md border border-dashed border-slate-300 text-sm text-slate-500 dark:border-slate-700">No predictions available</div>;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 12, right: 18, bottom: 8, left: 0 }}>
          <XAxis dataKey="target_time" tickFormatter={toLocalTime} tick={{ fontSize: 12 }} minTickGap={28} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} width={42} />
          <Tooltip
            labelFormatter={(value) => toLocalTime(String(value))}
            formatter={(value) => [`${Number(value).toFixed(1)}%`, "Predicted"]}
            contentStyle={{ borderRadius: 8, borderColor: "#dbe4ef" }}
          />
          <Line type="monotone" dataKey="predicted_rate" stroke="#e63946" strokeWidth={2.5} strokeDasharray="7 5" dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
