import { NextResponse, type NextRequest } from "next/server";
import { jsonError, requireServerRole } from "@/lib/api-guards";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { AlertStatus } from "@/lib/types";

const allowedStatuses: AlertStatus[] = ["sent", "acknowledged", "resolved"];

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { response } = await requireServerRole(["venue_admin", "system_admin"]);
  if (response) return response;

  const body = (await request.json()) as { alert_status?: AlertStatus };
  if (!body.alert_status || !allowedStatuses.includes(body.alert_status)) {
    return jsonError("Invalid alert_status.");
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("capacity_alert")
    .update({ alert_status: body.alert_status })
    .eq("alert_id", Number(params.id))
    .select("*")
    .single();

  if (error) return jsonError(error.message);
  return NextResponse.json({ data });
}
