import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCngApiUrl } from "./api";
import { CNG_API_PATHS } from "./endpoints";

const auth = {
  merchantId: "merchant-1",
  apiKey: "key+with/slash=",
  baseUrl: "https://paylanes.sprocket.solutions",
};

test("buildCngApiUrl always sets AUTH_ID and API_KEY as query params", () => {
  const url = buildCngApiUrl(auth, CNG_API_PATHS.transactions, {
    PAGE: 1,
    LIMIT: 50,
    FROM_DATE: "2026-08-01",
    TO_DATE: "2026-08-29",
  });

  assert.equal(url.searchParams.get("AUTH_ID"), "merchant-1");
  assert.equal(url.searchParams.get("API_KEY"), "key+with/slash=");
  assert.equal(url.searchParams.get("FROM_DATE"), "2026-08-01");
  assert.equal(url.searchParams.get("TO_DATE"), "2026-08-29");
  assert.equal(
    url.pathname,
    "/merchant/web-payment/transactions"
  );
});

test("buildCngApiUrl does not let extra params overwrite AUTH_ID or API_KEY", () => {
  const url = buildCngApiUrl(auth, CNG_API_PATHS.transactionInfo, {
    AUTH_ID: "spoofed",
    API_KEY: "spoofed",
    ORDER_NUMBER: "1001",
  });

  assert.equal(url.searchParams.get("AUTH_ID"), "merchant-1");
  assert.equal(url.searchParams.get("API_KEY"), "key+with/slash=");
  assert.equal(url.searchParams.get("ORDER_NUMBER"), "1001");
});
