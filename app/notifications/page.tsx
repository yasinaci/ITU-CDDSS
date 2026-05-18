"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { AppUser } from "@/lib/types";
import { toLocalTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorState, PageSkeleton } from "@/components/ui/loading";
import { useToast } from "@/components/ui/toast";

type NotificationRow = {
  notification_id: number;
  user_id: number;
  venue_id: number | null;
  message: string;
  notif_type: string;
  sent_at: string;
  is_read: boolean;
  read_at: string | null;
  venue?: {
    venue_name: string | null;
  } | null;
};

export default function NotificationsPage() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
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

  const fetchNotifications = useCallback(async () => {
    setError(null);
    const currentProfile = profile ?? (await fetchProfile());
    if (!currentProfile?.user_id) {
      setLoading(false);
      return;
    }

    const { data, error: notificationError } = await supabase
      .from("notification")
      .select("*, venue(venue_name)")
      .eq("user_id", currentProfile.user_id)
      .order("sent_at", { ascending: false })
      .limit(50);

    if (notificationError) {
      setError(notificationError.message);
      setLoading(false);
      return;
    }

    setNotifications((data as NotificationRow[]) ?? []);
    setLoading(false);
  }, [fetchProfile, profile]);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!profile?.user_id) return;
    const channel = supabase
      .channel(`notif-${profile.user_id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notification",
          filter: `user_id=eq.${profile.user_id}`
        },
        () => {
          toast({ title: "New notification", description: "A new campus alert arrived.", tone: "success" });
          void fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchNotifications, profile?.user_id, toast]);

  const markAllRead = async () => {
    if (!profile?.user_id) return;
    const { error: readError } = await supabase
      .from("notification")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", profile.user_id)
      .eq("is_read", false);

    if (readError) {
      toast({ title: "Could not mark notifications", description: readError.message, tone: "error" });
      return;
    }

    setNotifications((current) => current.map((item) => ({ ...item, is_read: true, read_at: new Date().toISOString() })));
  };

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={() => void fetchNotifications()} />;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Notifications</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Latest alerts and recommendations for your account.</p>
        </div>
        <Button variant="outline" onClick={markAllRead}>
          <CheckCheck className="h-4 w-4" />
          Mark all read
        </Button>
      </div>

      <div className="space-y-3">
        {notifications.map((item) => (
          <Card key={item.notification_id} className={item.is_read ? "opacity-75" : ""}>
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={item.is_read ? "default" : "danger"}>{item.is_read ? "Read" : "New"}</Badge>
                    <Badge>{item.notif_type}</Badge>
                    {item.venue?.venue_name ? <span className="text-sm text-slate-500">{item.venue.venue_name}</span> : null}
                  </div>
                  <p className="mt-3 text-sm">{item.message}</p>
                </div>
                <span className="text-xs text-slate-500">{toLocalTime(item.sent_at)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {!notifications.length ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-8 text-sm text-slate-500 dark:border-slate-700">No notifications yet.</div>
        ) : null}
      </div>
    </div>
  );
}
