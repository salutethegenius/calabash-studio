import { NextResponse } from "next/server";
import { CngApiError } from "@/lib/cashango/api";
import { defaultDateRange, syncCngTransactions } from "@/lib/cashango/sync";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const range = defaultDateRange(7);
    const summary = await syncCngTransactions({ ...range, fallbackDays: 7 });
    return NextResponse.json(summary);
  } catch (err) {
    const status = err instanceof CngApiError ? (err.status ?? 502) : 500;
    return NextResponse.json(
      {
        message: err instanceof Error ? err.message : "Cron sync failed",
      },
      { status: status >= 400 && status < 600 ? status : 502 }
    );
  }
}
