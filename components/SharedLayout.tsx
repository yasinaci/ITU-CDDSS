"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Bell,
  Building2,
  ChartNoAxesColumn,
  Heart,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  PieChart,
  Settings2,
  User,
  Users,
  X
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { AppUser } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const authPaths = ["/login", "/register"];

const studentLinks = [
  { href: "/map", label: "Map", icon: Map },
  { href: "/recommendations", label: "Recommendations", icon: ChartNoAxesColumn },
  { href: "/favourites", label: "Favourites", icon: Heart }
];

const adminLinks = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/reports", label: "Reports", icon: PieChart }
];

const systemLinks = [
  { href: "/admin/management/venues", label: "Venues", icon: Building2 },
  { href: "/admin/management/sensors", label: "Sensors", icon: Settings2 },
  { href: "/admin/management/users", label: "Users", icon: Users }
];

export const SharedLayout = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const isAuthPage = authPaths.some((path) => pathname.startsWith(path));

  const fetchProfile = useCallback(async () => {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user?.email) {
      setProfile(null);
      setUnread(0);
      return;
    }

    const { data } = await supabase
      .from("app_user")
      .select("*, person!inner(first_name,last_name,email)")
      .eq("person.email", user.email)
      .maybeSingle();

    setProfile((data as AppUser | null) ?? null);

    if (data?.user_id) {
      const { count } = await supabase
        .from("notification")
        .select("notification_id", { count: "exact", head: true })
        .eq("user_id", data.user_id)
        .eq("is_read", false);
      setUnread(count ?? 0);
    }
  }, []);

  useEffect(() => {
    if (!isAuthPage) {
      void fetchProfile();
    }
  }, [fetchProfile, isAuthPage, pathname]);

  useEffect(() => {
    if (!profile?.user_id) return;

    const channel = supabase
      .channel(`layout-notif-${profile.user_id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notification",
          filter: `user_id=eq.${profile.user_id}`
        },
        () => setUnread((count) => count + 1)
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [profile?.user_id]);

  const links = useMemo(() => {
    const role = profile?.user_type;
    return [
      ...studentLinks,
      ...(role === "venue_admin" || role === "system_admin" ? adminLinks : []),
      ...(role === "system_admin" ? systemLinks : [])
    ];
  }, [profile?.user_type]);

  const initials =
    `${profile?.person?.first_name?.[0] ?? ""}${profile?.person?.last_name?.[0] ?? ""}`.toUpperCase() || "IT";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  if (isAuthPage) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="flex h-16 items-center gap-3 px-4">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </Button>
          <Link href="/map" className="flex items-center gap-2 font-semibold">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-itu-navy text-sm text-white">ITU</span>
            <span>ITU CDDSS</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/notifications"
              className="relative grid h-10 w-10 place-items-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unread > 0 ? (
                <span className="absolute right-1 top-1 min-w-5 rounded-full bg-itu-red px-1 text-center text-[10px] font-bold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              ) : null}
            </Link>
            <Link href="/profile" className="grid h-10 w-10 place-items-center rounded-full bg-slate-200 text-sm font-semibold dark:bg-slate-800">
              {initials}
            </Link>
          </div>
        </div>
      </header>

      {open ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200 bg-white px-3 py-4 transition-transform dark:border-slate-800 dark:bg-slate-950 lg:top-16 lg:z-30 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="mb-4 flex items-center justify-between px-2 lg:hidden">
          <span className="font-semibold">Navigation</span>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close navigation">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="flex h-full flex-col gap-1">
          {links.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
                  active
                    ? "bg-itu-navy text-white"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          <div className="mt-auto space-y-1 border-t border-slate-200 pt-3 dark:border-slate-800">
            <Link
              href="/profile"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <User className="h-4 w-4" />
              Profile
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </nav>
      </aside>

      <main className="px-4 py-6 lg:ml-72 lg:px-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
};
