import { NextResponse, type NextRequest } from "next/server";
import { jsonError, requireServerRole } from "@/lib/api-guards";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const { response } = await requireServerRole(["system_admin"]);
  if (response) return response;

  const body = await request.json();
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.from("venue").insert(body).select("*").single();

  if (error) return jsonError(error.message);
  return NextResponse.json({ data }, { status: 201 });
}
