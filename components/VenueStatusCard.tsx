"use client";

import Link from "next/link";
import { Navigation } from "lucide-react";
import type { VenueMapStatus } from "@/lib/types";
import { formatDb, formatPercent, getNoiseInfo, getOccupancyColor, getOccupancyLabel, venueTypeIcon, venueTypeLabel } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const VenueStatusCard = ({ venue, rank }: { venue: VenueMapStatus; rank?: number }) => {
  const rate = Number(venue.occupancy_rate ?? 0);
  const db = Number(venue.avg_decibel ?? 0);
  const noise = getNoiseInfo(db);
  const mapsUrl =
    venue.latitude && venue.longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${venue.latitude},${venue.longitude}`
      : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm">
              {rank ? <span className="text-slate-400">#{rank}</span> : null}
              <span>{venueTypeIcon(venue.venue_type)}</span>
              {venue.venue_name}
            </CardTitle>
            <p className="mt-1 text-xs text-slate-500">{venueTypeLabel(venue.venue_type)}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          <Badge tone={rate <= 40 ? "success" : rate <= 75 ? "warning" : "danger"} style={{ borderColor: getOccupancyColor(rate) }}>
            {formatPercent(rate)} · {getOccupancyLabel(rate)}
          </Badge>
          <Badge tone={noise.level === "quiet" ? "info" : noise.level === "moderate" ? "default" : "danger"}>
            {noise.icon} {formatDb(db)}
          </Badge>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/venue/${venue.venue_id}`} className="inline-flex h-9 items-center rounded-md bg-itu-navy px-3 text-sm font-medium text-white">
            View Details
          </Link>
          <Link href="/map" className="inline-flex h-9 items-center rounded-md border border-slate-300 px-3 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
            View on Map
          </Link>
          {mapsUrl ? (
            <Button type="button" size="sm" variant="outline" onClick={() => window.open(mapsUrl, "_blank", "noopener,noreferrer")}>
              <Navigation className="h-3.5 w-3.5" />
              Navigate
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};
