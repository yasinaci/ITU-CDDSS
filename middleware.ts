import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { UserRole } from "@/lib/types";

const protectedRoutes = ["/map", "/venue", "/recommendations", "/favourites", "/profile", "/notifications"];
const adminRoutes = ["/admin/dashboard", "/admin/reports"];
const systemAdminRoutes = ["/admin/management"];

const isRouteMatch = (pathname: string, routes: string[]) =>
  routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        }
      }
    }
  );

  const pathname = request.nextUrl.pathname;
  const needsAuth =
    isRouteMatch(pathname, protectedRoutes) ||
    isRouteMatch(pathname, adminRoutes) ||
    isRouteMatch(pathname, systemAdminRoutes);

  if (!needsAuth) {
    return response;
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user?.email) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  const { data: profile } = await supabase
    .from("app_user")
    .select("user_id,user_type,is_active,person!inner(email)")
    .eq("person.email", user.email)
    .maybeSingle();

  const role = profile?.user_type as UserRole | undefined;

  if (!profile?.is_active) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("error", "inactive");
    return NextResponse.redirect(redirectUrl);
  }

  if (isRouteMatch(pathname, systemAdminRoutes) && role !== "system_admin") {
    return NextResponse.redirect(new URL("/map", request.url));
  }

  if (isRouteMatch(pathname, adminRoutes) && role !== "venue_admin" && role !== "system_admin") {
    return NextResponse.redirect(new URL("/map", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|leaflet|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
};
