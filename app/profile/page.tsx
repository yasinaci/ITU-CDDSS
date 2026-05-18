"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { AppUser } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState, PageSkeleton } from "@/components/ui/loading";

export default function ProfilePage() {
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setError(null);
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user?.email) {
      setLoading(false);
      return;
    }

    const { data, error: profileError } = await supabase
      .from("app_user")
      .select("*, person!inner(first_name,last_name,email)")
      .eq("person.email", user.email)
      .maybeSingle();

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    setProfile((data as AppUser | null) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={() => void fetchProfile()} />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Profile</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Account details from person and app_user.</p>
      </div>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>
            {profile?.person?.first_name} {profile?.person?.last_name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs uppercase text-slate-500">Email</p>
            <p className="mt-1 text-sm font-medium">{profile?.person?.email}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">ITU student ID</p>
            <p className="mt-1 text-sm font-medium">{profile?.itu_student_id || "-"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>{profile?.user_type}</Badge>
            <Badge tone={profile?.is_active ? "success" : "danger"}>{profile?.is_active ? "Active" : "Inactive"}</Badge>
            <Badge tone={profile?.notif_enabled ? "info" : "default"}>{profile?.notif_enabled ? "Notifications on" : "Notifications off"}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
