import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AppUser, UserRole } from "@/lib/types";

export const jsonError = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

export const requireServerRole = async (allowed: UserRole[]) => {
  const supabase = createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { profile: null, response: jsonError("Authentication required.", 401) };
  }

  const { data, error } = await supabase
    .from("app_user")
    .select("*, person!inner(first_name,last_name,email)")
    .eq("person.email", user.email)
    .maybeSingle();

  const profile = data as AppUser | null;

  if (error || !profile) {
    return { profile: null, response: jsonError("App profile not found.", 403) };
  }

  if (!profile.is_active || !allowed.includes(profile.user_type)) {
    return { profile: null, response: jsonError("Insufficient permissions.", 403) };
  }

  return { profile, response: null };
};
