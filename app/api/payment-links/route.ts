import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { getServiceSupabase } from "@/lib/supabase/server";
import { dollarsToCents } from "@/lib/utils";

const createSchema = z.object({
  label: z.string().min(1).max(200),
  amount: z.number().positive().min(1),
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
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const base = appBaseUrl();
  return NextResponse.json({
    links: (data ?? []).map((row) => ({
      ...row,
      url: `${base}/pay/${row.link_token}`,
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

  const amountCents = dollarsToCents(parsed.data.amount);
  const linkToken = nanoid(16);

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("payment_links")
    .insert({
      label: parsed.data.label.trim(),
      amount_cents: amountCents,
      status: "pending",
      link_token: linkToken,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const url = `${appBaseUrl()}/pay/${linkToken}`;
  return NextResponse.json({ ...data, url }, { status: 201 });
}
