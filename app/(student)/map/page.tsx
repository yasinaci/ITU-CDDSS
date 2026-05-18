"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { AppUser, VenueMapStatus } from "@/lib/types";
import { secondsAgo, venueTypeLabel } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ErrorState, PageSkeleton } from "@/components/ui/loading";
import { Select } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import type { MapMode } from "@/components/map/VenueMarker";

const CampusMap = dynamic(() => import("@/components/map/CampusMap"), {
  ssr: false,
  loading: () => <div className="skeleton h-full min-h-[480px] rounded-lg" />
});

type VenueTypeFilter = "all" | "library" | "cafeteria" | "cafe";

export default function MapPage() {
  const { toast } = useToast();
  const [venues, setVenues] = useState<VenueMapStatus[]>([]);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [favouriteIds, setFavouriteIds] = useState<Set<number>>(new Set());
  const [mode, setMode] = useState<MapMode>("both");
  const [venueType, setVenueType] = useState<VenueTypeFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
  const [, setTick] = useState(0);

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
    setError(null);
    const { data, error: venueError } = await supabase.from("v_venue_map_status").select("*").order("venue_name");

    if (venueError) {
      setError(venueError.message);
      return;
    }

    setVenues((data as VenueMapStatus[]) ?? []);
    setLastFetchedAt(new Date());
  }, []);

  const fetchFavourites = useCallback(async (userId: number) => {
    const { data, error: favouriteError } = await supabase.from("user_favorite_venue").select("venue_id").eq("user_id", userId);
    if (favouriteError) {
      toast({ title: "Could not load favourites", description: favouriteError.message, tone: "error" });
      return;
    }
    setFavouriteIds(new Set((data ?? []).map((item) => Number(item.venue_id))));
  }, [toast]);

  const refresh = useCallback(async () => {
    const loadedProfile = profile ?? (await fetchProfile());
    await fetchVenues();
    if (loadedProfile?.user_id) {
      await fetchFavourites(loadedProfile.user_id);
    }
    setLoading(false);
  }, [fetchFavourites, fetchProfile, fetchVenues, profile]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void fetchVenues();
    }, 60000);
    return () => window.clearInterval(interval);
  }, [fetchVenues]);

  useEffect(() => {
    const interval = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("map-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "occupancy_record" }, () => {
        void fetchVenues();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "noise_record" }, () => {
        void fetchVenues();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchVenues]);

  const visibleVenues = useMemo(() => {
    return venues.filter((venue) => venueType === "all" || venue.venue_type === venueType);
  }, [venues, venueType]);

  const toggleFavourite = async (venueId: number, isFavourite: boolean) => {
    if (!profile?.user_id) {
      toast({ title: "Profile is still loading", description: "Try again in a moment.", tone: "error" });
      return;
    }

    const previous = new Set(favouriteIds);
    const next = new Set(favouriteIds);
    if (isFavourite) next.delete(venueId);
    else next.add(venueId);
    setFavouriteIds(next);

    const result = isFavourite
      ? await supabase.from("user_favorite_venue").delete().eq("user_id", profile.user_id).eq("venue_id", venueId)
      : await supabase.from("user_favorite_venue").insert({ user_id: profile.user_id, venue_id: venueId });

    if (result.error) {
      setFavouriteIds(previous);
      toast({ title: "Favourite update failed", description: result.error.message, tone: "error" });
    }
  };

  if (loading) {
    return <PageSkeleton />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void refresh()} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Campus Map</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Live occupancy and noise status across ITU Ayazaga campus.
          </p>
        </div>
        <Button variant="outline" onClick={() => void refresh()}>
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-center md:justify-between">
        <Tabs
          value={mode}
          onChange={setMode}
          items={[
            { value: "occupancy", label: "Occupancy" },
            { value: "noise", label: "Noise" },
            { value: "both", label: "Both" }
          ]}
        />
        <div className="w-full md:w-56">
          <Select value={venueType} onChange={(event) => setVenueType(event.target.value as VenueTypeFilter)} aria-label="Filter venue type">
            <option value="all">All venues</option>
            <option value="library">{venueTypeLabel("library")}</option>
            <option value="cafeteria">{venueTypeLabel("cafeteria")}</option>
            <option value="cafe">Cafe</option>
          </Select>
        </div>
      </div>

      <div className="relative h-[calc(100vh-260px)] min-h-[520px] overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900">
        <CampusMap venues={visibleVenues} mode={mode} favouriteIds={favouriteIds} onToggleFavourite={toggleFavourite} />
        <div className="absolute bottom-3 right-3 z-[500] rounded-md bg-white/95 px-3 py-2 text-xs font-medium text-slate-700 shadow-soft dark:bg-slate-950/95 dark:text-slate-200">
          Last updated: {lastFetchedAt ? secondsAgo(lastFetchedAt.toISOString()) : "never"}
        </div>
      </div>
    </div>
  );
}
