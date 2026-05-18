import { NextResponse, type NextRequest } from "next/server";
import { jsonError, requireServerRole } from "@/lib/api-guards";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { response } = await requireServerRole(["venue_admin", "system_admin"]);
  if (response) return response;

  const body = (await request.json()) as {
    alert_threshold?: number;
    noise_alert_threshold_db?: number;
  };

  const alert_threshold = Number(body.alert_threshold);
  const noise_alert_threshold_db = Number(body.noise_alert_threshold_db);

  if (!Number.isFinite(alert_threshold) || !Number.isFinite(noise_alert_threshold_db)) {
    return jsonError("Both thresholds must be numbers.");
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("venue")
    .update({ alert_threshold, noise_alert_threshold_db })
    .eq("venue_id", Number(params.id))
    .select("*")
    .single();

  if (error) return jsonError(error.message);
  return NextResponse.json({ data });
}
