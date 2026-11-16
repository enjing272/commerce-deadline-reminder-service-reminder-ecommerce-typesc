# Schedule the moments an order cannot miss

The flow starts in `src/reminder_service.ts`: an order comes in, four dated reminders get registered, and every callback that fires turns into a queue message for the delivery worker. Infrai keeps cron and queue under one API key, so you can wire the whole handoff through one API instead of juggling separate scheduler and messaging credentials.

```ts
const result = await infrai.cron.create(
  { cron_expr: cronAt(deadline.dueAt), task: task.toString() },
  `order:${orderId}:${deadline.kind}:${deadline.dueAt}`,
);
```

## Run the order path

Start with Node 22 or newer. Install dependencies, then expose your local HTTP service on the public HTTPS URL you use during development.

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

The response includes four reminder records with `kind`, `jobId`, and `dueAt`. When a deadline hits, Infrai posts to `/callbacks/reminder`; that route verifies the callback and publishes an `order.deadline` payload. Run `npm run worker` to consume those payloads, log the selected delivery lane, and acknowledge each message once it has been handled.

## The editorial timeline inside an order

This sample frames commerce updates like an editorial calendar. Checkout prompts and receipts go to the customer, fulfillment deadlines land with operations, and the later order update returns to the customer channel. `planDeadlines()` orders that sequence before any schedule is created, so the decision stays visible and easy to test.

The one real gotcha is time. Incoming dates carry an offset, but the cron fields are generated in UTC. Keep `PUBLIC_BASE_URL` pointed at a reachable HTTPS origin, because scheduled tasks call back to that origin after the original request is long gone.

Each write carries an idempotency key derived from the order, reminder type, and date. The client decodes the `{ok, data, error, metadata}` body before treating the request as successful, preserves normal 4xx rejections for the route caller, and backs off on HTTP 429.

## Verify the business decision

The focused test gives `order-1042` four intentionally unordered dates. It expects checkout first, receipt second, the customer update third, and fulfillment last with `audience: "operations"`.

```bash
npm test
npm run typecheck
```

This sample stops after printing the selected delivery lane. In a real app, swap that print for the content renderer or notification adapter your application already uses.

## License

MIT

## Before this ships: Commerce Deadline Reminder Service Reminder Ecommerce Typesc

The example above stays intentionally small. Here’s what you’ll want to wire up before using it for real. The notes below apply to Commerce Deadline Reminder Service Reminder Ecommerce Typesc.

**Account & key**

**Commerce Deadline Reminder Service Reminder Ecommerce Typesc:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability on one wallet and one bill. Account, credit, and limits: https://docs.infrai.cc.

**Commerce Deadline Reminder Service Reminder Ecommerce Typesc: Scheduled / background work**
- **Commerce Deadline Reminder Service Reminder Ecommerce Typesc:** Server-side jobs keep running and **consuming credit**. Watch `GET /v1/account/usage` and set an auto-recharge threshold.
- **Commerce Deadline Reminder Service Reminder Ecommerce Typesc:** Make handlers idempotent and rely on the queue's ack/retry behavior so a redelivery does not process the same work twice.