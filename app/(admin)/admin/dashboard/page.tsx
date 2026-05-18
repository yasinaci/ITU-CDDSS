"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, RefreshCcw, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { AdminVenue, AppUser, CapacityAlert, VenueMapStatus } from "@/lib/types";
import { formatDb, formatPercent, getNoiseInfo, getOccupancyColor, secondsAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorState, PageSkeleton } from "@/components/ui/loading";
import { Select } from "@/components/ui/select";
import { Table, Td, Th } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";

type Reading = {
  reading_time: string;
  transmit_status: string | null;
};

type OccSensor = {
  sensor_id: number;
  sensor_type: string;
  door_label: string | null;
  is_active: boolean;
  sensor_reading?: Reading[];
};

type NoiseSensor = {
  noise_sensor_id: number;
  location_description: string | null;
  model: string | null;
  is_active: boolean;
  noise_reading?: Reading[];
};

const latestReading = (readings?: Reading[]) =>
  [...(readings ?? [])].sort((a, b) => new Date(b.reading_time).getTime() - new Date(a.reading_time).getTime())[0] ?? null;

const isOnline = (reading?: Reading | null) => {
  if (!reading?.reading_time) return false;
  return Date.now() - new Date(reading.reading_time).getTime() < 5 * 60 * 1000;
};

export default function AdminDashboardPage() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [venues, setVenues] = useState<AdminVenue[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<number | null>(null);
  const [metrics, setMetrics] = useState<VenueMapStatus | null>(null);
  const [alerts, setAlerts] = useState<CapacityAlert[]>([]);
  const [occSensors, setOccSensors] = useState<OccSensor[]>([]);
  const [noiseSensors, setNoiseSensors] = useState<NoiseSensor[]>([]);
  const [thresholds, setThresholds] = useState({ alert_threshold: 75, noise_alert_threshold_db: 75 });
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

  const resolveVenueId = useCallback((loadedProfile: AppUser | null, loadedVenues: AdminVenue[]) => {
    if (!loadedVenues.length) return null;
    if (loadedProfile?.user_type === "system_admin") return loadedVenues[0].venue_id;

    const email = loadedProfile?.person?.email?.toLowerCase() ?? "";
    if (email.includes("kutuphane")) {
      const mustafaInan = loadedVenues.find((venue) => venue.venue_name.toLocaleLowerCase("tr-TR").includes("mustafa"));
      if (mustafaInan) return mustafaInan.venue_id;
    }

    return loadedVenues[0].venue_id;
  }, []);

  const fetchShell = useCallback(async () => {
    const loadedProfile = profile ?? (await fetchProfile());
    const { data, error: venueError } = await supabase.from("venue").select("*").order("venue_name");
    if (venueError) {
      setError(venueError.message);
      setLoading(false);
      return;
    }

    const loadedVenues = (data as AdminVenue[]) ?? [];
    setVenues(loadedVenues);
    if (!selectedVenueId) {
      const resolved = resolveVenueId(loadedProfile, loadedVenues);
      setSelectedVenueId(resolved);
    }
  }, [fetchProfile, profile, resolveVenueId, selectedVenueId]);

  const fetchVenueData = useCallback(async (venueId: number) => {
    setError(null);
    const [metricsResult, alertsResult, occSensorsResult, noiseSensorsResult] = await Promise.all([
      supabase.from("v_venue_map_status").select("*").eq("venue_id", venueId).single(),
      supabase.from("capacity_alert").select("*").eq("venue_id", venueId).order("triggered_at", { ascending: false }).limit(10),
      supabase.from("sensor").select("*, sensor_reading(reading_time, transmit_status)").eq("venue_id", venueId),
      supabase.from("noise_sensor").select("*, noise_reading(reading_time, transmit_status)").eq("venue_id", venueId)
    ]);

    const firstError = metricsResult.error || alertsResult.error || occSensorsResult.error || noiseSensorsResult.error;
    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    setMetrics(metricsResult.data as VenueMapStatus);
    setAlerts((alertsResult.data as CapacityAlert[]) ?? []);
    setOccSensors((occSensorsResult.data as OccSensor[]) ?? []);
    setNoiseSensors((noiseSensorsResult.data as NoiseSensor[]) ?? []);

    const selectedVenue = venues.find((venue) => venue.venue_id === venueId);
    if (selectedVenue) {
      setThresholds({
        alert_threshold: Number(selectedVenue.alert_threshold ?? 75),
        noise_alert_threshold_db: Number(selectedVenue.noise_alert_threshold_db ?? 75)
      });
    }

    setLoading(false);
  }, [venues]);

  useEffect(() => {
    void fetchShell();
  }, [fetchShell]);

  useEffect(() => {
    if (selectedVenueId) void fetchVenueData(selectedVenueId);
  }, [fetchVenueData, selectedVenueId]);

  useEffect(() => {
    if (!selectedVenueId) return;
    const channel = supabase
      .channel(`admin-dashboard-${selectedVenueId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "capacity_alert", filter: `venue_id=eq.${selectedVenueId}` }, () => {
        void fetchVenueData(selectedVenueId);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "occupancy_record", filter: `venue_id=eq.${selectedVenueId}` }, () => {
        void fetchVenueData(selectedVenueId);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "noise_record", filter: `venue_id=eq.${selectedVenueId}` }, () => {
        void fetchVenueData(selectedVenueId);
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchVenueData, selectedVenueId]);

  const selectedVenue = useMemo(() => venues.find((venue) => venue.venue_id === selectedVenueId), [selectedVenueId, venues]);

  const updateAlert = async (alertId: number, alert_status: "acknowledged" | "resolved") => {
    const response = await fetch(`/api/admin/alerts/${alertId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alert_status })
    });

    if (!response.ok) {
      const body = await response.json();
      toast({ title: "Alert update failed", description: body.error, tone: "error" });
      return;
    }

    if (selectedVenueId) await fetchVenueData(selectedVenueId);
  };

  const saveThresholds = async () => {
    if (!selectedVenueId) return;
    const response = await fetch(`/api/admin/venue/${selectedVenueId}/thresholds`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(thresholds)
    });

    if (!response.ok) {
      const body = await response.json();
      toast({ title: "Threshold update failed", description: body.error, tone: "error" });
      return;
    }

    toast({ title: "Thresholds saved", tone: "success" });
    await fetchShell();
  };

  const exportCsv = () => {
    const rows = [
      ["venue", "current_count", "occupancy_rate", "avg_decibel", "alert_id", "alert_status", "triggered_at"],
      ...alerts.map((alert) => [
        selectedVenue?.venue_name ?? "",
        metrics?.current_count ?? "",
        metrics?.occupancy_rate ?? "",
        metrics?.avg_decibel ?? "",
        alert.alert_id,
        alert.alert_status,
        alert.triggered_at
      ])
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `itu-cddss-${selectedVenueId}-dashboard.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={() => selectedVenueId && void fetchVenueData(selectedVenueId)} />;

  const occupancyRate = Number(metrics?.occupancy_rate ?? 0);
  const noise = getNoiseInfo(Number(metrics?.avg_decibel ?? 0));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Live operational view for venue administrators.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select
            value={selectedVenueId?.toString() ?? ""}
            onChange={(event) => setSelectedVenueId(Number(event.target.value))}
            disabled={profile?.user_type !== "system_admin"}
            className="min-w-64"
          >
            {venues.map((venue) => (
              <option key={venue.venue_id} value={venue.venue_id}>
                {venue.venue_name}
              </option>
            ))}
          </Select>
          <Button variant="outline" onClick={() => selectedVenueId && void fetchVenueData(selectedVenueId)}>
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportCsv}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4" style={{ borderLeftColor: getOccupancyColor(occupancyRate) }}>
          <CardHeader>
            <CardTitle>Occupancy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatPercent(occupancyRate)}</p>
            <p className="mt-1 text-sm text-slate-500">
              {metrics?.current_count ?? 0}/{metrics?.max_capacity ?? selectedVenue?.max_capacity ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4" style={{ borderLeftColor: noise.color }}>
          <CardHeader>
            <CardTitle>Noise</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatDb(metrics?.avg_decibel)}</p>
            <p className="mt-1 text-sm" style={{ color: noise.color }}>
              {noise.icon} {noise.label}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Thresholds</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="occ-threshold">Occupancy %</Label>
                <Input
                  id="occ-threshold"
                  type="number"
                  min={1}
                  max={100}
                  value={thresholds.alert_threshold}
                  onChange={(event) => setThresholds((current) => ({ ...current, alert_threshold: Number(event.target.value) }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="noise-threshold">Noise dB</Label>
                <Input
                  id="noise-threshold"
                  type="number"
                  min={1}
                  value={thresholds.noise_alert_threshold_db}
                  onChange={(event) => setThresholds((current) => ({ ...current, noise_alert_threshold_db: Number(event.target.value) }))}
                />
              </div>
            </div>
            <Button className="w-full" onClick={saveThresholds}>
              <Save className="h-4 w-4" />
              Save
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <thead>
              <tr>
                <Th>Triggered</Th>
                <Th>Type</Th>
                <Th>Rate</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr key={alert.alert_id}>
                  <Td>{secondsAgo(alert.triggered_at)}</Td>
                  <Td>{alert.alert_type ?? "capacity"}</Td>
                  <Td>{formatPercent(alert.occupancy_rate)}</Td>
                  <Td>
                    <Badge tone={alert.alert_status === "resolved" ? "success" : alert.alert_status === "acknowledged" ? "warning" : "danger"}>
                      {alert.alert_status}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => void updateAlert(alert.alert_id, "acknowledged")}>
                        Acknowledge
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => void updateAlert(alert.alert_id, "resolved")}>
                        Resolve
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          {!alerts.length ? <p className="py-6 text-sm text-slate-500">No recent alerts.</p> : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Occupancy Sensor Health</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <thead>
                <tr>
                  <Th>ID</Th>
                  <Th>Type</Th>
                  <Th>Door</Th>
                  <Th>Status</Th>
                  <Th>Last Reading</Th>
                </tr>
              </thead>
              <tbody>
                {occSensors.map((sensor) => {
                  const reading = latestReading(sensor.sensor_reading);
                  return (
                    <tr key={sensor.sensor_id}>
                      <Td>{sensor.sensor_id}</Td>
                      <Td>{sensor.sensor_type}</Td>
                      <Td>{sensor.door_label ?? "-"}</Td>
                      <Td>
                        <Badge tone={sensor.is_active && isOnline(reading) ? "success" : "danger"}>
                          {sensor.is_active && isOnline(reading) ? "Online" : "Offline"}
                        </Badge>
                      </Td>
                      <Td>{reading ? secondsAgo(reading.reading_time) : "-"}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Noise Sensor Health</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <thead>
                <tr>
                  <Th>ID</Th>
                  <Th>Location</Th>
                  <Th>Model</Th>
                  <Th>Status</Th>
                  <Th>Last Reading</Th>
                </tr>
              </thead>
              <tbody>
                {noiseSensors.map((sensor) => {
                  const reading = latestReading(sensor.noise_reading);
                  return (
                    <tr key={sensor.noise_sensor_id}>
                      <Td>{sensor.noise_sensor_id}</Td>
                      <Td>{sensor.location_description ?? "-"}</Td>
                      <Td>{sensor.model ?? "-"}</Td>
                      <Td>
                        <Badge tone={sensor.is_active && isOnline(reading) ? "success" : "danger"}>
                          {sensor.is_active && isOnline(reading) ? "Online" : "Offline"}
                        </Badge>
                      </Td>
                      <Td>{reading ? secondsAgo(reading.reading_time) : "-"}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
