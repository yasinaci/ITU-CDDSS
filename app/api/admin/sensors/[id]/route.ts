import { NextResponse, type NextRequest } from "next/server";
import { jsonError, requireServerRole } from "@/lib/api-guards";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { response } = await requireServerRole(["system_admin"]);
  if (response) return response;

  const body = await request.json();
  const sensorKind = body.sensorKind as "occupancy" | "noise";
  const table = sensorKind === "noise" ? "noise_sensor" : sensorKind === "occupancy" ? "sensor" : null;
  const idColumn = sensorKind === "noise" ? "noise_sensor_id" : "sensor_id";

  if (!table) return jsonError("Invalid sensorKind.");

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from(table)
    .update({ is_active: body.is_active })
    .eq(idColumn, Number(params.id))
    .select("*")
    .single();

  if (error) return jsonError(error.message);
  return NextResponse.json({ data });
}
