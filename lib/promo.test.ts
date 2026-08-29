import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyPromo,
  isValidPromoPreview,
  parsePromoPercent,
  previewPromoAmount,
} from "./promo";

const config = { code: "SAP0726", percent: 10 };

test("applyPromo leaves amount unchanged when no code is entered", () => {
  const result = applyPromo(4500, "", config);
  assert.deepEqual(result, { ok: true, amountCents: 4500, applied: false });
});

test("applyPromo discounts a matching code", () => {
  const result = applyPromo(4500, "sap0726", config);
  assert.deepEqual(result, { ok: true, amountCents: 4050, applied: true });
});

test("applyPromo rejects unknown codes", () => {
  const result = applyPromo(4500, "NOPE", config);
  assert.equal(result.ok, false);
});

test("applyPromo rejects codes when promo is disabled", () => {
  const result = applyPromo(4500, "SAP0726", { code: "", percent: 10 });
  assert.equal(result.ok, false);
});

test("preview helpers follow the configured code and percent", () => {
  assert.equal(isValidPromoPreview("SAP0726", config), true);
  assert.equal(isValidPromoPreview("SAP0726", { code: "", percent: 10 }), false);
  assert.equal(previewPromoAmount(4500, "SAP0726", config), 4050);
});

test("parsePromoPercent rejects out-of-range values", () => {
  assert.equal(parsePromoPercent("10"), 10);
  assert.equal(parsePromoPercent("0"), 0);
  assert.equal(parsePromoPercent("100"), 0);
  assert.equal(parsePromoPercent("abc"), 0);
});
