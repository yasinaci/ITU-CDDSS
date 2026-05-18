"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Plus, RefreshCcw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { AdminVenue } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorState, PageSkeleton } from "@/components/ui/loading";
import { Select } from "@/components/ui/select";
import { Table, Td, Th } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";

const initialForm = {
  venue_name: "",
  venue_type: "library",
  max_capacity: 100,
  campus_area: "Ayazaga",
  alert_threshold: 75,
  noise_alert_threshold_db: 75,
  latitude: 41.1054,
  longitude: 29.0239
};

export default function VenueManagementPage() {
  const { toast } = useToast();
  const [venues, setVenues] = useState<AdminVenue[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVenues = useCallback(async () => {
    setError(null);
    const { data, error: venueError } = await supabase.from("venue").select("*").order("venue_name");
    if (venueError) {
      setError(venueError.message);
      setLoading(false);
      return;
    }
    setVenues((data as AdminVenue[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchVenues();
  }, [fetchVenues]);

  const addVenue = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const response = await fetch("/api/admin/venues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, is_active: true })
    });

    if (!response.ok) {
      const body = await response.json();
      toast({ title: "Venue create failed", description: body.error, tone: "error" });
      return;
    }

    toast({ title: "Venue added", tone: "success" });
    setForm(initialForm);
    await fetchVenues();
  };

  const deactivate = async (venueId: number) => {
    const response = await fetch(`/api/admin/venues/${venueId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: false })
    });

    if (!response.ok) {
      const body = await response.json();
      toast({ title: "Venue update failed", description: body.error, tone: "error" });
      return;
    }

    await fetchVenues();
  };

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={() => void fetchVenues()} />;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Venue Management</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Create and deactivate campus venues.</p>
        </div>
        <Button variant="outline" onClick={() => void fetchVenues()}>
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Venue</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-4" onSubmit={addVenue}>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="venue_name">Name</Label>
              <Input id="venue_name" value={form.venue_name} onChange={(event) => setForm((current) => ({ ...current, venue_name: event.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="venue_type">Type</Label>
              <Select id="venue_type" value={form.venue_type} onChange={(event) => setForm((current) => ({ ...current, venue_type: event.target.value }))}>
                <option value="library">Library</option>
                <option value="cafeteria">Cafeteria</option>
                <option value="cafe">Cafe</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="max_capacity">Capacity</Label>
              <Input id="max_capacity" type="number" min={1} value={form.max_capacity} onChange={(event) => setForm((current) => ({ ...current, max_capacity: Number(event.target.value) }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="campus_area">Campus area</Label>
              <Input id="campus_area" value={form.campus_area} onChange={(event) => setForm((current) => ({ ...current, campus_area: event.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lat">Latitude</Label>
              <Input id="lat" type="number" step="0.00001" value={form.latitude} onChange={(event) => setForm((current) => ({ ...current, latitude: Number(event.target.value) }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lng">Longitude</Label>
              <Input id="lng" type="number" step="0.00001" value={form.longitude} onChange={(event) => setForm((current) => ({ ...current, longitude: Number(event.target.value) }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="alert_threshold">Occupancy alert %</Label>
              <Input id="alert_threshold" type="number" value={form.alert_threshold} onChange={(event) => setForm((current) => ({ ...current, alert_threshold: Number(event.target.value) }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="noise_alert_threshold_db">Noise alert dB</Label>
              <Input id="noise_alert_threshold_db" type="number" value={form.noise_alert_threshold_db} onChange={(event) => setForm((current) => ({ ...current, noise_alert_threshold_db: Number(event.target.value) }))} />
            </div>
            <Button className="md:col-span-4">
              <Plus className="h-4 w-4" />
              Add Venue
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Venues</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <thead>
              <tr>
                <Th>ID</Th>
                <Th>Name</Th>
                <Th>Type</Th>
                <Th>Capacity</Th>
                <Th>Area</Th>
                <Th>Status</Th>
                <Th>Action</Th>
              </tr>
            </thead>
            <tbody>
              {venues.map((venue) => (
                <tr key={venue.venue_id}>
                  <Td>{venue.venue_id}</Td>
                  <Td>{venue.venue_name}</Td>
                  <Td>{venue.venue_type}</Td>
                  <Td>{venue.max_capacity}</Td>
                  <Td>{venue.campus_area ?? "-"}</Td>
                  <Td>
                    <Badge tone={venue.is_active ? "success" : "danger"}>{venue.is_active ? "Active" : "Inactive"}</Badge>
                  </Td>
                  <Td>
                    <Button size="sm" variant="danger" disabled={!venue.is_active} onClick={() => void deactivate(venue.venue_id)}>
                      Deactivate
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
