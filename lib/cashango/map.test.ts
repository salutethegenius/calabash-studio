import assert from "node:assert/strict";
import { test } from "node:test";
import {
  mapCngTransactionToRow,
  mapWebhookPayloadToRow,
  toCents,
  unixSecondsToIso,
} from "./map";
import type { CngTransaction } from "./types";

const sample: CngTransaction = {
  amount: 1.5,
  total: 1.46,
  fee: 0.04,
  tips: 0,
  transactionType: "Web Payment",
  processed: 1,
  owner: 2420000000,
  ownerEmail: "paylanes.qa+baf.admin@gmail.com",
  specialId: "JEI-S8b7Zt",
  webOrderNumber: "1001",
  cardType: "VISA",
  datetimestamp: 1786116922,
  dateProcessed: 1786116922,
};

test("toCents maps dollars to integer cents", () => {
  assert.equal(toCents(1.5), 150);
  assert.equal(toCents("1.46"), 146);
  assert.equal(toCents("45.00"), 4500);
  assert.equal(toCents(0.04), 4);
  assert.equal(toCents(null), null);
});

test("unixSecondsToIso converts CNG timestamps", () => {
  assert.equal(unixSecondsToIso(1786116922), "2026-08-07T15:35:22.000Z");
  assert.equal(unixSecondsToIso(0), null);
});

test("mapCngTransactionToRow maps enriched fields", () => {
  const row = mapCngTransactionToRow(sample, {
    linkId: "link-1",
    syncedAt: "2026-08-17T12:00:00.000Z",
  });

  assert.equal(row.link_id, "link-1");
  assert.equal(row.amount_cents, 150);
  assert.equal(row.fee_cents, 4);
  assert.equal(row.net_cents, 146);
  assert.equal(row.status, "successful");
  assert.equal(row.processed, true);
  assert.equal(row.cng_payment_id, "JEI-S8b7Zt");
  assert.equal(row.order_number, "1001");
  assert.equal(row.payer_email, "paylanes.qa+baf.admin@gmail.com");
  assert.equal(row.payer_phone, "2420000000");
  assert.equal(row.payment_method, "Web Payment");
  assert.equal(row.card_type, "VISA");
  assert.equal(row.cng_created_at, "2026-08-07T15:35:22.000Z");
  assert.equal(row.synced_at, "2026-08-17T12:00:00.000Z");
  assert.equal(row.customer_ref, "paylanes.qa+baf.admin@gmail.com");
});

test("mapCngTransactionToRow marks unprocessed as pending", () => {
  const row = mapCngTransactionToRow({ ...sample, processed: 0 });
  assert.equal(row.status, "pending");
  assert.equal(row.processed, false);
});

test("mapWebhookPayloadToRow writes a minimal fallback row", () => {
  const row = mapWebhookPayloadToRow(
    {
      ORDER_NUMBER: "abc__1",
      AMOUNT: "12.34",
      STATUS: "PAID",
      EMAIL: "a@b.com",
    },
    "link-2"
  );

  assert.equal(row.link_id, "link-2");
  assert.equal(row.order_number, "abc__1");
  assert.equal(row.amount_cents, 1234);
  assert.equal(row.status, "successful");
  assert.equal(row.fee_cents, null);
  assert.equal(row.net_cents, null);
  assert.equal(row.customer_ref, "a@b.com");
});
