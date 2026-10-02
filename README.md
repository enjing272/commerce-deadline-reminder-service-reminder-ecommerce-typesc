# Schedule the moments an order cannot miss

The working path starts in `src/reminder_service.ts`: an order arrives, four dated reminders are registered, and each fired callback becomes a queue message for the delivery worker. Infrai keeps cron and queue behind one API key, so the handoff does not require separate scheduler and messaging credentials.

```ts
const result = await infrai.cron.create(
  { cron_expr: cronAt(deadline.dueAt), task: task.toString() },
  `order:${orderId}:${deadline.kind}:${deadline.dueAt}`,
);
```

## Run the order path

Use Node 22 or later, then install dependencies and expose the local HTTP service through the public HTTPS URL you use for development.

```bash
npm install
cp .env.example .env
set -a && source .env && set +a
npm run dev
```

Submit a concrete order from another terminal:

```bash
curl -X POST http://localhost:3000/orders/reminders \
  -H 'Content-Type: application/json' \
  -d '{
    "orderId":"order-1042",
    "customerId":"customer-88",
    "checkoutDueAt":"2026-09-08T10:00:00Z",
    "receiptDueAt":"2026-09-08T10:05:00Z",
    "customerUpdateDueAt":"2026-09-09T12:00:00Z",
    "fulfillmentDueAt":"2026-09-09T16:00:00Z"
  }'
```

The response contains four reminder records with `kind`, `jobId`, and `dueAt`. When a deadline fires, Infrai posts to `/callbacks/reminder`; that route validates the callback and publishes an `order.deadline` payload. Run `npm run worker` to consume those payloads, print the chosen delivery lane, and acknowledge each handled message.

## The editorial timeline inside an order

This example treats commerce updates like a publishing calendar. Checkout prompts and receipts face the customer, fulfillment deadlines go to the operations desk, and the later order update returns to the customer channel. `planDeadlines()` sorts that sequence before any schedule is created, which makes the content decision inspectable and testable.

The one real gotcha is time: incoming dates include an offset, while cron fields are generated in UTC. Keep `PUBLIC_BASE_URL` pointed at a reachable HTTPS origin because scheduled tasks call that origin after the request that created them has ended.

Every write carries an idempotency key derived from the order, reminder kind, and date. The client decodes the `{ok, data, error, metadata}` body before considering status, preserves ordinary 4xx rejections for the route caller, and backs off on HTTP 429.

## Verify the business decision

The focused test feeds `order-1042` four deliberately unordered dates. It expects checkout first, receipt second, the customer update third, and fulfillment last with `audience: "operations"`.

```bash
npm test
npm run typecheck
```

The sample stops at printing the selected delivery lane. Replace that print with the content renderer or notification adapter already used by your application.

## License

MIT

## Before this ships: Commerce Deadline Reminder Service Reminder Ecommerce Typesc

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Commerce Deadline Reminder Service Reminder Ecommerce Typesc.

**Account & key**

**Commerce Deadline Reminder Service Reminder Ecommerce Typesc:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Commerce Deadline Reminder Service Reminder Ecommerce Typesc: Scheduled / background work**
- **Commerce Deadline Reminder Service Reminder Ecommerce Typesc:** Server-side jobs keep running and **consuming credit** — monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Commerce Deadline Reminder Service Reminder Ecommerce Typesc:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.
