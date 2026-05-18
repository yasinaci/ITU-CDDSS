import { NextResponse, type NextRequest } from "next/server";
import { jsonError, requireServerRole } from "@/lib/api-guards";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/lib/types";

const allowedRoles: UserRole[] = ["student", "staff", "venue_admin", "system_admin"];

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { response } = await requireServerRole(["system_admin"]);
  if (response) return response;

  const body = (await request.json()) as {
    user_type?: UserRole;
    is_active?: boolean;
    notif_enabled?: boolean;
  };

  const update: Record<string, unknown> = {};
  if (body.user_type) {
    if (!allowedRoles.includes(body.user_type)) return jsonError("Invalid user_type.");
    update.user_type = body.user_type;
  }
  if (typeof body.is_active === "boolean") update.is_active = body.is_active;
  if (typeof body.notif_enabled === "boolean") update.notif_enabled = body.notif_enabled;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.from("app_user").update(update).eq("user_id", Number(params.id)).select("*").single();

  if (error) return jsonError(error.message);
  return NextResponse.json({ data });
}
