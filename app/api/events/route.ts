import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { getServiceSupabase } from "@/lib/supabase/server";
import { parseNassauDateTimeLocal } from "@/lib/time";

const createSchema = z.object({
  label: z.string().min(1).max(200),
  amount: z.number().int().positive().min(1).max(100000000),
  salesEndAt: z.string().min(1),
  capacity: z.number().int().positive().max(100000).optional().nullable(),
});

function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.BETTER_AUTH_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("payment_links")
    .select("*")
    .eq("kind", "event")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { message: "Failed to load events" },
      { status: 500 }
    );
  }

  const base = appBaseUrl();
  return NextResponse.json({
    events: (data ?? []).map((row) => ({
      ...row,
      url: `${base}/event/${row.link_token}`,
    })),
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid input", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const salesEnd = parseNassauDateTimeLocal(parsed.data.salesEndAt);
  if (!salesEnd) {
    return NextResponse.json(
      { message: "Sales end must be a valid date and time" },
      { status: 400 }
    );
  }
  if (salesEnd.getTime() <= Date.now()) {
    return NextResponse.json(
      { message: "Sales end must be in the future" },
      { status: 400 }
    );
  }

  const linkToken = nanoid(16);
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("payment_links")
    .insert({
      label: parsed.data.label.trim(),
      amount_cents: parsed.data.amount,
      status: "pending",
      kind: "event",
      link_token: linkToken,
      sales_end_at: salesEnd.toISOString(),
      capacity: parsed.data.capacity ?? null,
      sold_count: 0,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { message: "Failed to create event" },
      { status: 500 }
    );
  }

  const url = `${appBaseUrl()}/event/${linkToken}`;
  return NextResponse.json({ ...data, url }, { status: 201 });
}
