export type EventSalesState = "open" | "ended" | "sold_out";

export type EventSalesFields = {
  kind?: string | null;
  sales_end_at?: string | null;
  capacity?: number | null;
  sold_count?: number | null;
};

export function eventSalesState(
  event: EventSalesFields,
  now: Date = new Date()
): EventSalesState {
  if (event.sales_end_at) {
    const endMs = new Date(event.sales_end_at).getTime();
    if (!Number.isFinite(endMs) || now.getTime() >= endMs) {
      return "ended";
    }
  }
  const capacity = event.capacity;
  const sold = event.sold_count ?? 0;
  if (capacity != null && capacity > 0 && sold >= capacity) {
    return "sold_out";
  }
  return "open";
}

export function eventSalesClosed(event: EventSalesFields, now?: Date): boolean {
  return eventSalesState(event, now) !== "open";
}

export function eventSalesMessage(state: EventSalesState): string {
  if (state === "sold_out") return "This event is sold out.";
  if (state === "ended") return "Ticket sales have ended.";
  return "";
}
