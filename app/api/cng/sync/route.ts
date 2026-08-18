import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { CngApiError } from "@/lib/cashango/api";
import { parseSyncDates, syncCngTransactions } from "@/lib/cashango/sync";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let fromDate: string | undefined;
  let toDate: string | undefined;
  try {
    const body = (await request.json()) as {
      fromDate?: string;
      toDate?: string;
    };
    fromDate = body.fromDate;
    toDate = body.toDate;
  } catch {
    // empty body is fine — defaults to last 30 days
  }

  try {
    const range = parseSyncDates(fromDate, toDate, 30);
    const summary = await syncCngTransactions({ ...range, fallbackDays: 30 });
    return NextResponse.json(summary);
  } catch (err) {
    const status = err instanceof CngApiError ? (err.status ?? 502) : 400;
    return NextResponse.json(
      {
        message: err instanceof Error ? err.message : "Sync failed",
      },
      { status: status >= 400 && status < 600 ? status : 502 }
    );
  }
}
