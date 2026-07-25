import { NextResponse } from "next/server";

// Temporary route to verify Sentry is capturing server errors.
// Remove this route once an error is confirmed in Sentry.
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ message: "Not allowed" }, { status: 403 });
  }

  throw new Error("Sentry test error from Calabash API — delete this route");
}
