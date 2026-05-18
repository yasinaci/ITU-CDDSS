"use client";

import Link from "next/link";
import L from "leaflet";
import { Marker, Popup } from "react-leaflet";
import { Heart, Navigation } from "lucide-react";
import type { VenueMapStatus } from "@/lib/types";
import { formatDb, formatPercent, getNoiseInfo, getOccupancyColor, getOccupancyLabel, venueTypeLabel } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type MapMode = "occupancy" | "noise" | "both";

const createMarkerIcon = (occupancyColor: string, noiseIcon: string) =>
  L.divIcon({
    className: "",
    html: `<div style="position:relative;width:36px;height:46px;">
      <svg viewBox="0 0 36 46" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 28 18 28S36 31.5 36 18C36 8.06 27.94 0 18 0z"
          fill="${occupancyColor}" stroke="#fff" stroke-width="2"/>
        <circle cx="18" cy="18" r="8" fill="white" opacity="0.9"/>
      </svg>
      <span style="position:absolute;top:-6px;right:-6px;font-size:14px;line-height:1;">${noiseIcon}</span>
    </div>`,
    iconSize: [36, 46],
    iconAnchor: [18, 46],
    popupAnchor: [0, -46]
  });

export const VenueMarker = ({
  venue,
  mode,
  isFavourite,
  onToggleFavourite
}: {
  venue: VenueMapStatus;
  mode: MapMode;
  isFavourite: boolean;
  onToggleFavourite: (venueId: number, isFavourite: boolean) => void;
}) => {
  const rate = Number(venue.occupancy_rate ?? 0);
  const db = Number(venue.avg_decibel ?? 0);
  const noise = getNoiseInfo(db);
  const markerColor = mode === "noise" ? noise.color : getOccupancyColor(rate);
  const icon = createMarkerIcon(markerColor, mode === "occupancy" ? "" : noise.icon);

  if (!venue.latitude || !venue.longitude) {
    return null;
  }

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${venue.latitude},${venue.longitude}`;

  return (
    <Marker position={[venue.latitude, venue.longitude]} icon={icon}>
      <Popup minWidth={260}>
        <div className="w-[260px] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-950">{venue.venue_name}</h3>
              <p className="mt-0.5 text-xs text-slate-500">{venueTypeLabel(venue.venue_type)}</p>
            </div>
            <button
              type="button"
              onClick={() => onToggleFavourite(venue.venue_id, isFavourite)}
              className="rounded-md p-1 text-slate-600 hover:bg-slate-100"
              aria-label={isFavourite ? "Remove favourite" : "Add favourite"}
            >
              <Heart className={isFavourite ? "h-5 w-5 fill-itu-red text-itu-red" : "h-5 w-5"} />
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-600">Occupancy</span>
                <span className="font-semibold text-slate-900">{formatPercent(rate)}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full" style={{ width: `${Math.min(100, rate)}%`, backgroundColor: getOccupancyColor(rate) }} />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {venue.current_count ?? 0}/{venue.max_capacity} · {getOccupancyLabel(rate)}
              </p>
            </div>

            <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-xs">
              <span className="font-medium text-slate-600">Noise</span>
              <span className="font-semibold" style={{ color: noise.color }}>
                {noise.icon} {formatDb(db)}
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link href={`/venue/${venue.venue_id}`} className="inline-flex h-9 items-center justify-center rounded-md bg-itu-navy px-3 text-xs font-medium text-white">
              View Details
            </Link>
            <Button type="button" size="sm" variant="outline" onClick={() => window.open(mapsUrl, "_blank", "noopener,noreferrer")}>
              <Navigation className="h-3.5 w-3.5" />
              Navigate
            </Button>
          </div>
        </div>
      </Popup>
    </Marker>
  );
};
