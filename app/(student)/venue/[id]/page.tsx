"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Heart, Navigation, RefreshCcw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { AppUser, VenueMapStatus } from "@/lib/types";
import { formatDb, formatPercent, getNoiseInfo, getOccupancyColor, getOccupancyLabel, toLocalTime } from "@/lib/utils";
import { PredictionChart, type PredictionPoint } from "@/components/charts/PredictionChart";
import { TrendChart, type TrendPoint } from "@/components/charts/TrendChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState, PageSkeleton } from "@/components/ui/loading";
import { useToast } from "@/components/ui/toast";

type Params = {
  params: {
    id: string;
  };
};

type FavouriteRow = {
  favorite_id: number;
};

export default function VenueDetailPage({ params }: Params) {
  const venueId = Number(params.id);
  const { toast } = useToast();
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [venue, setVenue] = useState<VenueMapStatus | null>(null);
  const [occTrend, setOccTrend] = useState<TrendPoint[]>([]);
  const [noiseTrend, setNoiseTrend] = useState<TrendPoint[]>([]);
  const [predictions, setPredictions] = useState<PredictionPoint[]>([]);
  const [favourite, setFavourite] = useState<FavouriteRow | null>(null);
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

  const fetchVenue = useCallback(async () => {
    setError(null);
    const currentProfile = profile ?? (await fetchProfile());
    const dayAgo = new Date(Date.now() - 86400000).toISOString();
    const now = new Date().toISOString();
    const sixHours = new Date(Date.now() + 21600000).toISOString();

    const [venueResult, occResult, noiseResult, predictionResult, favouriteResult] = await Promise.all([
      supabase.from("v_venue_map_status").select("*").eq("venue_id", venueId).single(),
      supabase
        .from("occupancy_record")
        .select("record_time, occupancy_rate")
        .eq("venue_id", venueId)
        .gte("record_time", dayAgo)
        .order("record_time", { ascending: true }),
      supabase
        .from("noise_record")
        .select("record_time, avg_decibel, noise_level")
        .eq("venue_id", venueId)
        .gte("record_time", dayAgo)
        .order("record_time", { ascending: true }),
      supabase
        .from("occupancy_prediction")
        .select("target_time, predicted_rate")
        .eq("venue_id", venueId)
        .gte("target_time", now)
        .lte("target_time", sixHours)
        .order("target_time", { ascending: true }),
      currentProfile?.user_id
        ? supabase
            .from("user_favorite_venue")
            .select("favorite_id")
            .eq("user_id", currentProfile.user_id)
            .eq("venue_id", venueId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null })
    ]);

    const firstError = venueResult.error || occResult.error || noiseResult.error || predictionResult.error || favouriteResult.error;
    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    setVenue(venueResult.data as VenueMapStatus);
    setOccTrend((occResult.data as TrendPoint[]) ?? []);
    setNoiseTrend((noiseResult.data as TrendPoint[]) ?? []);
    setPredictions((predictionResult.data as PredictionPoint[]) ?? []);
    setFavourite((favouriteResult.data as FavouriteRow | null) ?? null);
    setLoading(false);
  }, [fetchProfile, profile, venueId]);

  useEffect(() => {
    void fetchVenue();
  }, [fetchVenue]);

  useEffect(() => {
    const channel = supabase
      .channel(`venue-${venueId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "occupancy_record", filter: `venue_id=eq.${venueId}` }, () => {
        void fetchVenue();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "noise_record", filter: `venue_id=eq.${venueId}` }, () => {
        void fetchVenue();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchVenue, venueId]);

  const currentRate = Number(venue?.occupancy_rate ?? 0);
  const currentDb = Number(venue?.avg_decibel ?? 0);
  const noise = getNoiseInfo(currentDb);

  const mapsUrl = useMemo(() => {
    if (!venue?.latitude || !venue.longitude) return null;
    return `https://www.google.com/maps/dir/?api=1&destination=${venue.latitude},${venue.longitude}`;
  }, [venue]);

  const toggleFavourite = async () => {
    if (!profile?.user_id || !venue) return;

    const previous = favourite;
    setFavourite(favourite ? null : { favorite_id: -1 });

    const result = favourite
      ? await supabase.from("user_favorite_venue").delete().eq("favorite_id", favourite.favorite_id)
      : await supabase.from("user_favorite_venue").insert({ user_id: profile.user_id, venue_id: venue.venue_id }).select("favorite_id").single();

    if (result.error) {
      setFavourite(previous);
      toast({ title: "Favourite update failed", description: result.error.message, tone: "error" });
      return;
    }

    if (!favourite && result.data) {
      setFavourite(result.data as FavouriteRow);
    }
  };

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={() => void fetchVenue()} />;
  if (!venue) return <ErrorState message="Venue was not found." onRetry={() => void fetchVenue()} />;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">{venue.venue_name}</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Last venue update: {venue.record_time ? toLocalTime(venue.record_time) : "-"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={toggleFavourite}>
            <Heart className={favourite ? "h-4 w-4 fill-itu-red text-itu-red" : "h-4 w-4"} />
            {favourite ? "Favourited" : "Favourite"}
          </Button>
          {mapsUrl ? (
            <Button type="button" onClick={() => window.open(mapsUrl, "_blank", "noopener,noreferrer")}>
              <Navigation className="h-4 w-4" />
              Navigate
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => void fetchVenue()}>
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-l-4" style={{ borderLeftColor: getOccupancyColor(currentRate) }}>
          <CardHeader>
            <CardTitle>Occupancy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-semibold">{formatPercent(currentRate)}</span>
              <span className="pb-1 text-sm text-slate-500">
                {venue.current_count ?? 0}/{venue.max_capacity}
              </span>
            </div>
            <Badge className="mt-4" tone={currentRate <= 40 ? "success" : currentRate <= 75 ? "warning" : "danger"}>
              {getOccupancyLabel(currentRate)}
            </Badge>
          </CardContent>
        </Card>
        <Card className="border-l-4" style={{ borderLeftColor: noise.color }}>
          <CardHeader>
            <CardTitle>Noise</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-semibold">{formatDb(currentDb)}</span>
            </div>
            <Badge className="mt-4" tone={noise.level === "quiet" ? "info" : noise.level === "moderate" ? "default" : "danger"}>
              {noise.icon} {noise.label}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>24h Occupancy Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart data={occTrend} dataKey="occupancy_rate" color="#1a3c5e" unit="%" yDomain={[0, 100]} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>24h Noise Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart data={noiseTrend} dataKey="avg_decibel" color="#f97316" unit="dB" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Next 6h Prediction</CardTitle>
          </CardHeader>
          <CardContent>
            <PredictionChart data={predictions} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
