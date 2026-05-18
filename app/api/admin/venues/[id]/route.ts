import { NextResponse, type NextRequest } from "next/server";
import { jsonError, requireServerRole } from "@/lib/api-guards";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { response } = await requireServerRole(["system_admin"]);
  if (response) return response;

  const body = await request.json();
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.from("venue").update(body).eq("venue_id", Number(params.id)).select("*").single();

  if (error) return jsonError(error.message);
  return NextResponse.json({ data });
}
