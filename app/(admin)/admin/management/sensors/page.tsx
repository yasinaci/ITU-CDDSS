"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Plus, RefreshCcw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { AdminVenue } from "@/lib/types";
import { secondsAgo, toDateInputValue } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorState, PageSkeleton } from "@/components/ui/loading";
import { Select } from "@/components/ui/select";
import { Table, Td, Th } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";

type SensorTab = "occupancy" | "noise";

type Reading = {
  reading_time: string;
  transmit_status: string | null;
};

type OccSensorRow = {
  sensor_id: number;
  venue_id: number;
  sensor_type: string;
  door_label: string | null;
  install_date: string | null;
  is_active: boolean;
  venue?: { venue_name: string | null } | null;
  sensor_reading?: Reading[];
};

type NoiseSensorRow = {
  noise_sensor_id: number;
  venue_id: number;
  location_description: string | null;
  model: string | null;
  install_date: string | null;
  is_active: boolean;
  venue?: { venue_name: string | null } | null;
  noise_reading?: Reading[];
};

const latestReading = (readings?: Reading[]) =>
  [...(readings ?? [])].sort((a, b) => new Date(b.reading_time).getTime() - new Date(a.reading_time).getTime())[0] ?? null;

const isOnline = (reading?: Reading | null) =>
  Boolean(reading?.reading_time && Date.now() - new Date(reading.reading_time).getTime() < 5 * 60 * 1000);

export default function SensorManagementPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<SensorTab>("occupancy");
  const [venues, setVenues] = useState<AdminVenue[]>([]);
  const [occSensors, setOccSensors] = useState<OccSensorRow[]>([]);
  const [noiseSensors, setNoiseSensors] = useState<NoiseSensorRow[]>([]);
  const [occForm, setOccForm] = useState({ venue_id: "", sensor_type: "PIR", door_label: "", install_date: toDateInputValue(new Date()) });
  const [noiseForm, setNoiseForm] = useState({ venue_id: "", location_description: "", model: "", install_date: toDateInputValue(new Date()) });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    const [venueResult, occResult, noiseResult] = await Promise.all([
      supabase.from("venue").select("*").order("venue_name"),
      supabase.from("sensor").select("*, venue(venue_name), sensor_reading(reading_time, transmit_status)").order("sensor_id"),
      supabase.from("noise_sensor").select("*, venue(venue_name), noise_reading(reading_time, transmit_status)").order("noise_sensor_id")
    ]);

    const firstError = venueResult.error || occResult.error || noiseResult.error;
    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    const loadedVenues = (venueResult.data as AdminVenue[]) ?? [];
    setVenues(loadedVenues);
    setOccSensors((occResult.data as OccSensorRow[]) ?? []);
    setNoiseSensors((noiseResult.data as NoiseSensorRow[]) ?? []);
    setOccForm((current) => ({ ...current, venue_id: current.venue_id || loadedVenues[0]?.venue_id.toString() || "" }));
    setNoiseForm((current) => ({ ...current, venue_id: current.venue_id || loadedVenues[0]?.venue_id.toString() || "" }));
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const addOccupancySensor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const response = await fetch("/api/admin/sensors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sensorKind: "occupancy", ...occForm })
    });

    if (!response.ok) {
      const body = await response.json();
      toast({ title: "Sensor create failed", description: body.error, tone: "error" });
      return;
    }

    toast({ title: "Occupancy sensor added", tone: "success" });
    await fetchData();
  };

  const addNoiseSensor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const response = await fetch("/api/admin/sensors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sensorKind: "noise", ...noiseForm })
    });

    if (!response.ok) {
      const body = await response.json();
      toast({ title: "Noise sensor create failed", description: body.error, tone: "error" });
      return;
    }

    toast({ title: "Noise sensor added", tone: "success" });
    await fetchData();
  };

  const deactivate = async (sensorKind: SensorTab, id: number) => {
    const response = await fetch(`/api/admin/sensors/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sensorKind, is_active: false })
    });

    if (!response.ok) {
      const body = await response.json();
      toast({ title: "Sensor update failed", description: body.error, tone: "error" });
      return;
    }

    await fetchData();
  };

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={() => void fetchData()} />;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Sensor Management</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Manage occupancy and noise sensors.</p>
        </div>
        <Button variant="outline" onClick={() => void fetchData()}>
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "occupancy", label: "Occupancy" },
          { value: "noise", label: "Noise" }
        ]}
      />

      {tab === "occupancy" ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Add Occupancy Sensor</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid gap-3 md:grid-cols-5" onSubmit={addOccupancySensor}>
                <div className="space-y-1 md:col-span-2">
                  <Label htmlFor="occ-venue">Venue</Label>
                  <Select id="occ-venue" value={occForm.venue_id} onChange={(event) => setOccForm((current) => ({ ...current, venue_id: event.target.value }))}>
                    {venues.map((venue) => (
                      <option key={venue.venue_id} value={venue.venue_id}>
                        {venue.venue_name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sensor_type">Type</Label>
                  <Select id="sensor_type" value={occForm.sensor_type} onChange={(event) => setOccForm((current) => ({ ...current, sensor_type: event.target.value }))}>
                    <option value="PIR">PIR</option>
                    <option value="magnetic">Magnetic</option>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="door_label">Door</Label>
                  <Input id="door_label" value={occForm.door_label} onChange={(event) => setOccForm((current) => ({ ...current, door_label: event.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="occ_install">Install date</Label>
                  <Input id="occ_install" type="date" value={occForm.install_date} onChange={(event) => setOccForm((current) => ({ ...current, install_date: event.target.value }))} />
                </div>
                <Button className="md:col-span-5">
                  <Plus className="h-4 w-4" />
                  Add Sensor
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Occupancy Sensors</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <thead>
                  <tr>
                    <Th>ID</Th>
                    <Th>Venue</Th>
                    <Th>Type</Th>
                    <Th>Door</Th>
                    <Th>Health</Th>
                    <Th>Last Reading</Th>
                    <Th>Action</Th>
                  </tr>
                </thead>
                <tbody>
                  {occSensors.map((sensor) => {
                    const reading = latestReading(sensor.sensor_reading);
                    return (
                      <tr key={sensor.sensor_id}>
                        <Td>{sensor.sensor_id}</Td>
                        <Td>{sensor.venue?.venue_name ?? sensor.venue_id}</Td>
                        <Td>{sensor.sensor_type}</Td>
                        <Td>{sensor.door_label ?? "-"}</Td>
                        <Td>
                          <Badge tone={sensor.is_active && isOnline(reading) ? "success" : "danger"}>
                            {sensor.is_active && isOnline(reading) ? "Online" : "Offline"}
                          </Badge>
                        </Td>
                        <Td>{reading ? secondsAgo(reading.reading_time) : "-"}</Td>
                        <Td>
                          <Button size="sm" variant="danger" disabled={!sensor.is_active} onClick={() => void deactivate("occupancy", sensor.sensor_id)}>
                            Deactivate
                          </Button>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Add Noise Sensor</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid gap-3 md:grid-cols-5" onSubmit={addNoiseSensor}>
                <div className="space-y-1 md:col-span-2">
                  <Label htmlFor="noise-venue">Venue</Label>
                  <Select id="noise-venue" value={noiseForm.venue_id} onChange={(event) => setNoiseForm((current) => ({ ...current, venue_id: event.target.value }))}>
                    {venues.map((venue) => (
                      <option key={venue.venue_id} value={venue.venue_id}>
                        {venue.venue_name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="location_description">Location</Label>
                  <Input id="location_description" value={noiseForm.location_description} onChange={(event) => setNoiseForm((current) => ({ ...current, location_description: event.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="model">Model</Label>
                  <Input id="model" value={noiseForm.model} onChange={(event) => setNoiseForm((current) => ({ ...current, model: event.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="noise_install">Install date</Label>
                  <Input id="noise_install" type="date" value={noiseForm.install_date} onChange={(event) => setNoiseForm((current) => ({ ...current, install_date: event.target.value }))} />
                </div>
                <Button className="md:col-span-5">
                  <Plus className="h-4 w-4" />
                  Add Sensor
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Noise Sensors</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <thead>
                  <tr>
                    <Th>ID</Th>
                    <Th>Venue</Th>
                    <Th>Location</Th>
                    <Th>Model</Th>
                    <Th>Health</Th>
                    <Th>Last Reading</Th>
                    <Th>Action</Th>
                  </tr>
                </thead>
                <tbody>
                  {noiseSensors.map((sensor) => {
                    const reading = latestReading(sensor.noise_reading);
                    return (
                      <tr key={sensor.noise_sensor_id}>
                        <Td>{sensor.noise_sensor_id}</Td>
                        <Td>{sensor.venue?.venue_name ?? sensor.venue_id}</Td>
                        <Td>{sensor.location_description ?? "-"}</Td>
                        <Td>{sensor.model ?? "-"}</Td>
                        <Td>
                          <Badge tone={sensor.is_active && isOnline(reading) ? "success" : "danger"}>
                            {sensor.is_active && isOnline(reading) ? "Online" : "Offline"}
                          </Badge>
                        </Td>
                        <Td>{reading ? secondsAgo(reading.reading_time) : "-"}</Td>
                        <Td>
                          <Button size="sm" variant="danger" disabled={!sensor.is_active} onClick={() => void deactivate("noise", sensor.noise_sensor_id)}>
                            Deactivate
                          </Button>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
