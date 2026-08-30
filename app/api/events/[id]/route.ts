import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { getServiceSupabase } from "@/lib/supabase/server";

export async function DELETE(
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
  const { data: event, error: lookupError } = await supabase
    .from("payment_links")
    .select("id, sold_count")
    .eq("id", id)
    .eq("kind", "event")
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json(
      { message: "Failed to delete event" },
      { status: 500 }
    );
  }
  if (!event) {
    return NextResponse.json({ message: "Event not found" }, { status: 404 });
  }
  if ((event.sold_count ?? 0) > 0) {
    return NextResponse.json(
      { message: "Cannot delete an event that already has ticket sales" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("payment_links")
    .delete()
    .eq("id", id)
    .eq("kind", "event");
  if (error) {
    return NextResponse.json(
      { message: "Failed to delete event" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
