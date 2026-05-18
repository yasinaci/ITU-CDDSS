import type { UserRole } from "@/lib/types";

export const roleHome = (role?: UserRole | null) => {
  if (role === "system_admin") return "/admin/management/venues";
  if (role === "venue_admin") return "/admin/dashboard";
  return "/map";
};

export const isAdminRole = (role?: UserRole | null) =>
  role === "venue_admin" || role === "system_admin";
