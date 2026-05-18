"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { AppUser, VenueMapStatus } from "@/lib/types";
import { VenueStatusCard } from "@/components/VenueStatusCard";
import { ErrorState, PageSkeleton } from "@/components/ui/loading";

type FavouriteVenueRow = {
  favorite_id: number;
  venue_id: number;
};

export default function FavouritesPage() {
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [venues, setVenues] = useState<VenueMapStatus[]>([]);
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

  const fetchFavourites = useCallback(async () => {
    setError(null);
    const currentProfile = profile ?? (await fetchProfile());
    if (!currentProfile?.user_id) {
      setLoading(false);
      return;
    }

    const { data: favourites, error: favouriteError } = await supabase
      .from("user_favorite_venue")
      .select("favorite_id, venue_id")
      .eq("user_id", currentProfile.user_id);

    if (favouriteError) {
      setError(favouriteError.message);
      setLoading(false);
      return;
    }

    const favouriteRows = (favourites ?? []) as FavouriteVenueRow[];
    const ids = favouriteRows.map((item) => item.venue_id);
    if (!ids.length) {
      setVenues([]);
      setLoading(false);
      return;
    }

    const { data: statuses, error: statusError } = await supabase.from("v_venue_map_status").select("*").in("venue_id", ids);

    if (statusError) {
      setError(statusError.message);
      setLoading(false);
      return;
    }

    setVenues((statuses as VenueMapStatus[]) ?? []);
    setLoading(false);
  }, [fetchProfile, profile]);

  useEffect(() => {
    void fetchFavourites();
  }, [fetchFavourites]);

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={() => void fetchFavourites()} />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Favourites</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Your saved venues with current occupancy and noise status.</p>
      </div>
      {venues.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {venues.map((venue) => (
            <VenueStatusCard key={venue.venue_id} venue={venue} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 p-8 text-sm text-slate-500 dark:border-slate-700">No favourite venues yet.</div>
      )}
    </div>
  );
}
