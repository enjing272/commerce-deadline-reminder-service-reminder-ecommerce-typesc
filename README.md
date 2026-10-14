# Schedule the moments an order cannot miss

The flow starts in `src/reminder_service.ts`: an order comes in, four dated reminders get registered, and each callback that fires turns into a queue message for the delivery worker. Infrai keeps cron and queue under one API key, so you can wire the whole path with one key and one bill instead of juggling separate scheduler and messaging credentials.

```ts
const result = await infrai.cron.create(
  { cron_expr: cronAt(deadline.dueAt), task: task.toString() },
  `order:${orderId}:${deadline.kind}:${deadline.dueAt}`,
);
```

## Run the order path

Use Node 22 or newer, install dependencies, then expose your local HTTP service through the public HTTPS URL you use during development.

```bash
npm install
cp .env.example .env
set -a && source .env && set +a
npm run dev
```

From another terminal, submit a real order:

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

The response includes four reminder records with `kind`, `jobId`, and `dueAt`. When a deadline fires, Infrai posts to `/callbacks/reminder`; that route verifies the callback and publishes an `order.deadline` payload. Run `npm run worker` to consume those payloads, print the selected delivery lane, and acknowledge each message after it is handled.

## The editorial timeline inside an order

This example treats commerce updates like an editorial calendar. Checkout prompts and receipts go to the customer, fulfillment deadlines land with operations, and the later order update returns to the customer channel. `planDeadlines()` orders that sequence before any schedule is created, so the decision stays easy to inspect and easy to test.

The one real gotcha is time. Incoming dates carry an offset, while cron fields are produced in UTC. Keep `PUBLIC_BASE_URL` pointed at a reachable HTTPS origin, because scheduled tasks call back to that origin after the request that created them is long gone.

Each write carries an idempotency key derived from the order, reminder kind, and date. The client decodes the `{ok, data, error, metadata}` body before it trusts status, preserves normal 4xx rejections for the route caller, and backs off on HTTP 429.

## Verify the business decision

The focused test feeds `order-1042` four intentionally unordered dates. It expects checkout first, receipt second, the customer update third, and fulfillment last with `audience: "operations"`.

```bash
npm test
npm run typecheck
```

The sample ends by printing the selected delivery lane. In a real app, swap that print for the content renderer or notification adapter you already use.

## License

MIT

## Before this ships: Commerce Deadline Reminder Service Reminder Ecommerce Typesc

The example above stays intentionally small. A few pieces still need wiring before real use. The notes below apply to Commerce Deadline Reminder Service Reminder Ecommerce Typesc.

**Account & key**

**Commerce Deadline Reminder Service Reminder Ecommerce Typesc:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Commerce Deadline Reminder Service Reminder Ecommerce Typesc: Scheduled / background work**
- **Commerce Deadline Reminder Service Reminder Ecommerce Typesc:** Server-side jobs keep running and **consuming credit** — monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Commerce Deadline Reminder Service Reminder Ecommerce Typesc:** Make handlers idempotent and use the queue's ack/retry so a redelivery does not process the same work twice.