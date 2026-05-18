"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { VenueMapStatus } from "@/lib/types";
import { VenueStatusCard } from "@/components/VenueStatusCard";
import { Button } from "@/components/ui/button";
import { ErrorState, PageSkeleton } from "@/components/ui/loading";

export default function RecommendationsPage() {
  const [venues, setVenues] = useState<VenueMapStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVenues = useCallback(async () => {
    setError(null);
    const { data, error: venueError } = await supabase.from("v_venue_map_status").select("*");
    if (venueError) {
      setError(venueError.message);
      setLoading(false);
      return;
    }
    setVenues(((data as VenueMapStatus[]) ?? []).filter((venue) => venue.is_active !== false));
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchVenues();
    const interval = window.setInterval(() => void fetchVenues(), 60000);
    return () => window.clearInterval(interval);
  }, [fetchVenues]);

  const { quietest, leastFull } = useMemo(() => {
    return {
      quietest: [...venues].sort((a, b) => Number(a.avg_decibel ?? 0) - Number(b.avg_decibel ?? 0)),
      leastFull: [...venues].sort((a, b) => Number(a.occupancy_rate ?? 0) - Number(b.occupancy_rate ?? 0))
    };
  }, [venues]);

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={() => void fetchVenues()} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Recommendations</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Ranked by live density and noise readings.</p>
        </div>
        <Button variant="outline" onClick={() => void fetchVenues()}>
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Quietest Venues</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {quietest.map((venue, index) => (
            <VenueStatusCard key={`quiet-${venue.venue_id}`} venue={venue} rank={index + 1} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Least Full Venues</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {leastFull.map((venue, index) => (
            <VenueStatusCard key={`full-${venue.venue_id}`} venue={venue} rank={index + 1} />
          ))}
        </div>
      </section>
    </div>
  );
}
