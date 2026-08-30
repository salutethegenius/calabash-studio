import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { getServiceSupabase } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ message: "Invalid event ID" }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("payment_links")
    .update({ sales_end_at: new Date().toISOString() })
    .eq("id", id)
    .eq("kind", "event")
    .select("id, sales_end_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { message: "Failed to close event sales" },
      { status: 500 }
    );
  }
  if (!data) {
    return NextResponse.json({ message: "Event not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, sales_end_at: data.sales_end_at });
}
