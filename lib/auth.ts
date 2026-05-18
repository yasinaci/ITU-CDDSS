import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AppUser } from "@/lib/types";
export { isAdminRole, roleHome } from "@/lib/routing";

export const getProfileByEmail = async (email: string) => {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("app_user")
    .select("*, person!inner(first_name,last_name,email)")
    .eq("person.email", email)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as AppUser | null;
};

export const getCurrentProfile = async () => {
  const supabase = createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { user: null, profile: null };
  }

  const profile = await getProfileByEmail(user.email);
  return { user, profile };
};
