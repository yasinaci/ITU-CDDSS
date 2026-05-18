"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, Cell, Legend, Line, LineChart, Pie, PieChart as RePieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/lib/supabase";
import type { AdminVenue, AppUser } from "@/lib/types";
import { toDateInputValue, toLocalTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorState, PageSkeleton } from "@/components/ui/loading";
import { Select } from "@/components/ui/select";

type OccupancyRecord = {
  record_time: string;
  occupancy_rate: number | null;
  occupancy_level: string | null;
};

type NoiseRecord = {
  record_time: string;
  avg_decibel: number | null;
  noise_level: string | null;
};

const OCC_COLORS: Record<string, string> = {
  low: "#22c55e",
  moderate: "#eab308",
  high: "#ef4444"
};

const NOISE_COLORS: Record<string, string> = {
  quiet: "#3b82f6",
  moderate: "#a855f7",
  loud: "#f97316",
  very_loud: "#dc2626"
};

const distribution = (items: string[]) => {
  const counts = items.reduce<Record<string, number>>((acc, item) => {
    acc[item] = (acc[item] ?? 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
};

export default function ReportsPage() {
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [venues, setVenues] = useState<AdminVenue[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<number | null>(null);
  const [periodStart, setPeriodStart] = useState(toDateInputValue(new Date(Date.now() - 7 * 86400000)));
  const [periodEnd, setPeriodEnd] = useState(toDateInputValue(new Date()));
  const [occupancy, setOccupancy] = useState<OccupancyRecord[]>([]);
  const [noise, setNoise] = useState<NoiseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user?.email) return null;
    const { data } = await supabase
      .from("app_user")
      .select("*, person!inner(first_name,last_name,email)")
      .eq("person.email", user.email)
      .maybeSingle();
    setProfile((data as AppUser | null) ?? null);
    return (data as AppUser | null) ?? null;
  }, []);

  const fetchVenues = useCallback(async () => {
    const loadedProfile = profile ?? (await fetchProfile());
    const { data, error: venueError } = await supabase.from("venue").select("*").order("venue_name");
    if (venueError) {
      setError(venueError.message);
      setLoading(false);
      return;
    }
    const loadedVenues = (data as AdminVenue[]) ?? [];
    setVenues(loadedVenues);
    if (!selectedVenueId && loadedVenues.length) {
      const email = loadedProfile?.person?.email?.toLowerCase() ?? "";
      const preferred =
        loadedProfile?.user_type === "venue_admin" && email.includes("kutuphane")
          ? loadedVenues.find((venue) => venue.venue_name.toLocaleLowerCase("tr-TR").includes("mustafa"))
          : null;
      setSelectedVenueId((preferred ?? loadedVenues[0]).venue_id);
    }
  }, [fetchProfile, profile, selectedVenueId]);

  const fetchReport = useCallback(async () => {
    if (!selectedVenueId) return;
    setError(null);
    const start = new Date(`${periodStart}T00:00:00`).toISOString();
    const end = new Date(`${periodEnd}T23:59:59`).toISOString();

    const [occResult, noiseResult] = await Promise.all([
      supabase
        .from("occupancy_record")
        .select("record_time, occupancy_rate, occupancy_level")
        .eq("venue_id", selectedVenueId)
        .gte("record_time", start)
        .lte("record_time", end)
        .order("record_time", { ascending: true }),
      supabase
        .from("noise_record")
        .select("record_time, avg_decibel, noise_level")
        .eq("venue_id", selectedVenueId)
        .gte("record_time", start)
        .lte("record_time", end)
        .order("record_time", { ascending: true })
    ]);

    const firstError = occResult.error || noiseResult.error;
    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    setOccupancy((occResult.data as OccupancyRecord[]) ?? []);
    setNoise((noiseResult.data as NoiseRecord[]) ?? []);
    setLoading(false);
  }, [periodEnd, periodStart, selectedVenueId]);

  useEffect(() => {
    void fetchVenues();
  }, [fetchVenues]);

  useEffect(() => {
    void fetchReport();
  }, [fetchReport]);

  const dailyOccupancy = useMemo(() => {
    const grouped = occupancy.reduce<Record<string, { total: number; count: number }>>((acc, item) => {
      const key = item.record_time.slice(0, 10);
      acc[key] = acc[key] ?? { total: 0, count: 0 };
      acc[key].total += Number(item.occupancy_rate ?? 0);
      acc[key].count += 1;
      return acc;
    }, {});

    return Object.entries(grouped).map(([date, value]) => ({
      date,
      occupancy_rate: value.count ? value.total / value.count : 0
    }));
  }, [occupancy]);

  const occDistribution = useMemo(() => distribution(occupancy.map((item) => item.occupancy_level ?? "unknown")), [occupancy]);
  const noiseDistribution = useMemo(() => distribution(noise.map((item) => item.noise_level ?? "unknown")), [noise]);

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={() => void fetchReport()} />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Reports</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Historical occupancy and noise analytics.</p>
      </div>

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-[1.3fr_1fr_1fr_auto] md:items-end">
        <div className="space-y-1">
          <Label htmlFor="venue">Venue</Label>
          <Select
            id="venue"
            value={selectedVenueId?.toString() ?? ""}
            onChange={(event) => setSelectedVenueId(Number(event.target.value))}
            disabled={profile?.user_type !== "system_admin"}
          >
            {venues.map((venue) => (
              <option key={venue.venue_id} value={venue.venue_id}>
                {venue.venue_name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="start">Start</Label>
          <Input id="start" type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="end">End</Label>
          <Input id="end" type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} />
        </div>
        <Button onClick={() => void fetchReport()}>Run</Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Average Occupancy by Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer>
                <BarChart data={dailyOccupancy} margin={{ top: 12, right: 18, bottom: 8, left: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, "Occupancy"]} />
                  <Bar dataKey="occupancy_rate" fill="#1a3c5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Noise Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer>
                <LineChart data={noise} margin={{ top: 12, right: 18, bottom: 8, left: 0 }}>
                  <XAxis dataKey="record_time" tickFormatter={toLocalTime} tick={{ fontSize: 12 }} minTickGap={30} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip labelFormatter={(value) => toLocalTime(String(value))} formatter={(value) => [`${Number(value).toFixed(1)} dB`, "Noise"]} />
                  <Line dataKey="avg_decibel" stroke="#f97316" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Occupancy Level Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer>
                <RePieChart>
                  <Pie data={occDistribution} dataKey="value" nameKey="name" outerRadius={110} label>
                    {occDistribution.map((item) => (
                      <Cell key={item.name} fill={OCC_COLORS[item.name] ?? "#64748b"} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Noise Level Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer>
                <RePieChart>
                  <Pie data={noiseDistribution} dataKey="value" nameKey="name" outerRadius={110} label>
                    {noiseDistribution.map((item) => (
                      <Cell key={item.name} fill={NOISE_COLORS[item.name] ?? "#64748b"} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
