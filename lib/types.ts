export type UserRole = "student" | "staff" | "venue_admin" | "system_admin";

export type AppUser = {
  user_id: number;
  person_id: number;
  itu_student_id: string | null;
  user_type: UserRole;
  is_active: boolean;
  notif_enabled: boolean;
  person?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
};

export type VenueMapStatus = {
  venue_id: number;
  venue_name: string;
  venue_type: "library" | "cafeteria" | "cafe" | string;
  max_capacity: number;
  latitude: number | null;
  longitude: number | null;
  current_count: number | null;
  occupancy_rate: number | null;
  occupancy_level: "low" | "moderate" | "high" | string | null;
  is_anomaly: boolean | null;
  record_time: string | null;
  avg_decibel: number | null;
  max_decibel: number | null;
  noise_level: "quiet" | "moderate" | "loud" | "very_loud" | string | null;
  is_active?: boolean | null;
};

export type AlertStatus = "sent" | "acknowledged" | "resolved";

export type CapacityAlert = {
  alert_id: number;
  venue_id: number;
  triggered_at: string;
  occupancy_rate: number;
  alert_type: string | null;
  admin_user_id: number | null;
  alert_status: AlertStatus;
};

export type AdminVenue = {
  venue_id: number;
  venue_name: string;
  venue_type: string;
  max_capacity: number;
  campus_area: string | null;
  alert_threshold: number | null;
  noise_alert_threshold_db: number | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
};
