import { NextResponse, type NextRequest } from "next/server";
import { jsonError, requireServerRole } from "@/lib/api-guards";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const { response } = await requireServerRole(["system_admin"]);
  if (response) return response;

  const body = await request.json();
  const sensorKind = body.sensorKind as "occupancy" | "noise";
  const supabase = createServiceRoleClient();

  if (sensorKind === "occupancy") {
    const { data, error } = await supabase
      .from("sensor")
      .insert({
        venue_id: Number(body.venue_id),
        sensor_type: body.sensor_type,
        door_label: body.door_label || null,
        install_date: body.install_date || new Date().toISOString().slice(0, 10),
        is_active: body.is_active ?? true
      })
      .select("*")
      .single();
    if (error) return jsonError(error.message);
    return NextResponse.json({ data }, { status: 201 });
  }

  if (sensorKind === "noise") {
    const { data, error } = await supabase
      .from("noise_sensor")
      .insert({
        venue_id: Number(body.venue_id),
        location_description: body.location_description || null,
        model: body.model || null,
        install_date: body.install_date || new Date().toISOString().slice(0, 10),
        is_active: body.is_active ?? true
      })
      .select("*")
      .single();
    if (error) return jsonError(error.message);
    return NextResponse.json({ data }, { status: 201 });
  }

  return jsonError("Invalid sensorKind.");
}
