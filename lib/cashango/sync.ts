import { SETTINGS_KEYS } from "@/lib/db/schema";
import { getCngCredentials, upsertSettings } from "@/lib/settings";
import { getServiceSupabase } from "@/lib/supabase/server";
import { fetchCngTransactions, getCngApiAuth } from "./api";
import { mapCngTransactionToRow } from "./map";
import { settlePaidCheckout } from "./settle";
import { upsertTransactionRow } from "./upsert";

export type SyncSummary = {
  synced: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
  fromDate: string;
  toDate: string;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function defaultDateRange(days: number): { fromDate: string; toDate: string } {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - days);
  return { fromDate: isoDate(from), toDate: isoDate(to) };
}

export function parseSyncDates(
  fromDate?: string | null,
  toDate?: string | null,
  fallbackDays = 30
): { fromDate: string; toDate: string } {
  const fallback = defaultDateRange(fallbackDays);
  const from = fromDate?.trim() || fallback.fromDate;
  const to = toDate?.trim() || fallback.toDate;
  if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
    throw new Error("Dates must be YYYY-MM-DD");
  }
  if (from > to) {
    throw new Error("fromDate must be on or before toDate");
  }
  return { fromDate: from, toDate: to };
}

export async function syncCngTransactions(options?: {
  fromDate?: string;
  toDate?: string;
  fallbackDays?: number;
}): Promise<SyncSummary> {
  const { fromDate, toDate } = parseSyncDates(
    options?.fromDate,
    options?.toDate,
    options?.fallbackDays ?? 7
  );

  const credentials = await getCngCredentials();
  if (!credentials.merchantId || !credentials.apiKey) {
    throw new Error("Cash N' Go credentials are not configured");
  }

  const auth = await getCngApiAuth();
  const supabase = getServiceSupabase();
  const syncedAt = new Date().toISOString();

  const summary: SyncSummary = {
    synced: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    fromDate,
    toDate,
  };

  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const response = await fetchCngTransactions(auth, {
      page,
      limit: 50,
      fromDate,
      toDate,
      sortDir: "desc",
    });

    const rows = response.data ?? [];
    summary.synced += rows.length;

    const orderNumbers = [
      ...new Set(
        rows
          .map((tx) => tx.webOrderNumber)
          .filter((value): value is string => Boolean(value))
      ),
    ];

    const sessionByOrder = new Map<
      string,
      { id: string; link_id: string; status: string }
    >();
    if (orderNumbers.length > 0) {
      const { data: sessions, error: sessionError } = await supabase
        .from("checkout_sessions")
        .select("id, order_number, link_id, status")
        .in("order_number", orderNumbers);
      if (sessionError) throw sessionError;
      for (const session of sessions ?? []) {
        sessionByOrder.set(session.order_number, session);
      }
    }

    for (const tx of rows) {
      if (!tx.specialId && !tx.webOrderNumber) {
        summary.skipped += 1;
        continue;
      }

      const session = tx.webOrderNumber
        ? sessionByOrder.get(tx.webOrderNumber)
        : undefined;
      const row = mapCngTransactionToRow(tx, {
        linkId: session?.link_id ?? null,
        syncedAt,
      });

      try {
        const action = await upsertTransactionRow(supabase, row);
        if (action === "inserted") summary.inserted += 1;
        else summary.updated += 1;
        if (session && row.status === "successful") {
          await settlePaidCheckout(supabase, session);
          session.status = "completed";
        }
      } catch (err) {
        summary.errors.push(
          `${tx.specialId ?? tx.webOrderNumber ?? "unknown"}: ${
            err instanceof Error ? err.message : "upsert failed"
          }`
        );
      }
    }

    hasNextPage = Boolean(response.pagination?.hasNextPage);
    page += 1;
    if (page > 200) {
      summary.errors.push("Stopped after 200 pages to avoid an unbounded loop");
      break;
    }
  }

  if (summary.errors.length === 0) {
    await upsertSettings({
      [SETTINGS_KEYS.cngLastSyncAt]: syncedAt,
    });
  }

  return summary;
}
