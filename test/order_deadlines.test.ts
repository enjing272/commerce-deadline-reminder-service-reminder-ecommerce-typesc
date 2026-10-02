import assert from "node:assert/strict";
import test from "node:test";
import { OrderRequest, planDeadlines } from "../src/order_deadlines.js";

test("orders reminders chronologically and routes fulfillment to operations", () => {
  const order = OrderRequest.parse({
    orderId: "order-1042",
    customerId: "customer-88",
    checkoutDueAt: "2026-09-08T10:00:00Z",
    fulfillmentDueAt: "2026-09-09T16:00:00Z",
    receiptDueAt: "2026-09-08T10:05:00Z",
    customerUpdateDueAt: "2026-09-09T12:00:00Z",
  });

  assert.deepEqual(planDeadlines(order), [
    { kind: "checkout", dueAt: "2026-09-08T10:00:00Z", audience: "customer" },
    { kind: "receipt", dueAt: "2026-09-08T10:05:00Z", audience: "customer" },
    { kind: "customer-update", dueAt: "2026-09-09T12:00:00Z", audience: "customer" },
    { kind: "fulfillment", dueAt: "2026-09-09T16:00:00Z", audience: "operations" },
  ]);
});
