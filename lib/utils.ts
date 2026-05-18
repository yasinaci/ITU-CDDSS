export const ITU_NAVY = "#1a3c5e";
export const ITU_RED = "#e63946";

export const getOccupancyColor = (rate: number): string => {
  if (rate <= 40) return "#22c55e";
  if (rate <= 75) return "#eab308";
  return "#ef4444";
};

export const getOccupancyLabel = (rate: number): string => {
  if (rate <= 40) return "Low";
  if (rate <= 75) return "Moderate";
  return "High";
};

export const getNoiseInfo = (db: number) => {
  if (db < 45) return { label: "Quiet", color: "#3b82f6", icon: "🔇", level: "quiet" };
  if (db < 60) return { label: "Moderate", color: "#a855f7", icon: "🔉", level: "moderate" };
  if (db < 75) return { label: "Loud", color: "#f97316", icon: "🔊", level: "loud" };
  return { label: "Very Loud", color: "#dc2626", icon: "⚠️🔊", level: "very_loud" };
};

export const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

export const formatPercent = (value?: number | null) =>
  `${Math.round(Number(value ?? 0))}%`;

export const formatDb = (value?: number | null) =>
  `${Number(value ?? 0).toFixed(1)} dB(A)`;

export const secondsAgo = (iso?: string | null) => {
  if (!iso) return "never";
  const delta = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (delta < 60) return `${delta}s ago`;
  const minutes = Math.floor(delta / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
};

export const toLocalTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-";

export const toDateInputValue = (date: Date) => date.toISOString().slice(0, 10);

export const venueTypeLabel = (type?: string | null) => {
  if (type === "library") return "Library";
  if (type === "cafeteria") return "Cafeteria";
  if (type === "cafe") return "Cafe";
  return "Venue";
};

export const venueTypeIcon = (type?: string | null) => {
  if (type === "library") return "📚";
  if (type === "cafeteria") return "🍽️";
  if (type === "cafe") return "☕";
  return "📍";
};
