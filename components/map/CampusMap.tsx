"use client";

import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, TileLayer } from "react-leaflet";
import type { VenueMapStatus } from "@/lib/types";
import { VenueMarker, type MapMode } from "@/components/map/VenueMarker";

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  iconUrl: "/leaflet/marker-icon.png",
  shadowUrl: "/leaflet/marker-shadow.png"
});

const CENTER: [number, number] = [41.1054, 29.0239];
const ZOOM = 16;

export const CampusMap = ({
  venues,
  mode,
  favouriteIds,
  onToggleFavourite
}: {
  venues: VenueMapStatus[];
  mode: MapMode;
  favouriteIds: Set<number>;
  onToggleFavourite: (venueId: number, isFavourite: boolean) => void;
}) => {
  useEffect(() => {
    // Leaflet sometimes needs a tick after parent layout changes on mobile.
    window.dispatchEvent(new Event("resize"));
  }, [venues.length]);

  return (
    <MapContainer center={CENTER} zoom={ZOOM} minZoom={14} maxZoom={19} scrollWheelZoom className="z-0 rounded-lg">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {venues.map((venue) => (
        <VenueMarker
          key={venue.venue_id}
          venue={venue}
          mode={mode}
          isFavourite={favouriteIds.has(venue.venue_id)}
          onToggleFavourite={onToggleFavourite}
        />
      ))}
    </MapContainer>
  );
};

export default CampusMap;
