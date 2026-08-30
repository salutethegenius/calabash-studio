import assert from "node:assert/strict";
import { test } from "node:test";
import { eventSalesClosed, eventSalesState } from "./events";

const now = new Date("2026-08-29T16:00:00.000Z");

test("event is open before sales end with remaining capacity", () => {
  assert.equal(
    eventSalesState(
      {
        sales_end_at: "2026-08-30T04:00:00.000Z",
        capacity: 50,
        sold_count: 10,
      },
      now
    ),
    "open"
  );
});

test("event is ended at sales_end_at", () => {
  assert.equal(
    eventSalesState({ sales_end_at: "2026-08-29T16:00:00.000Z" }, now),
    "ended"
  );
  assert.equal(
    eventSalesClosed({ sales_end_at: "2026-08-29T15:59:00.000Z" }, now),
    true
  );
});

test("event is sold out when sold_count reaches capacity", () => {
  assert.equal(
    eventSalesState(
      {
        sales_end_at: "2026-09-01T00:00:00.000Z",
        capacity: 10,
        sold_count: 10,
      },
      now
    ),
    "sold_out"
  );
});

test("invalid sales_end_at is treated as ended", () => {
  assert.equal(
    eventSalesState({ sales_end_at: "not-a-date", capacity: 10, sold_count: 0 }, now),
    "ended"
  );
});

test("null capacity means unlimited", () => {
  assert.equal(
    eventSalesState(
      {
        sales_end_at: "2026-09-01T00:00:00.000Z",
        capacity: null,
        sold_count: 999,
      },
      now
    ),
    "open"
  );
});
