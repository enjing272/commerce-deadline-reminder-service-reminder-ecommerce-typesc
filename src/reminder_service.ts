import express from "express";
import { z } from "zod";
import { infrai, InfraiError } from "./infrai_client.js";
import { cronAt, OrderRequest, planDeadlines } from "./order_deadlines.js";

const app = express();
app.use(express.json());

const FiredReminder = z.object({
  orderId: z.string().min(1),
  customerId: z.string().min(1),
  kind: z.enum(["checkout", "fulfillment", "receipt", "customer-update"]),
  audience: z.enum(["operations", "customer"]),
  dueAt: z.string().datetime({ offset: true }),
});

app.post("/orders/reminders", async (req, res) => {
  const parsed = OrderRequest.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid order deadlines", issues: parsed.error.issues });
    return;
  }

  try {
    const publicUrl = process.env.PUBLIC_BASE_URL;
    if (!publicUrl) throw new Error("Set PUBLIC_BASE_URL to this service's public origin");
    const jobs = await Promise.all(planDeadlines(parsed.data).map(async (deadline) => {
      const task = new URL("/callbacks/reminder", publicUrl);
      task.search = new URLSearchParams({
        orderId: parsed.data.orderId,
        customerId: parsed.data.customerId,
        kind: deadline.kind,
        audience: deadline.audience,
        dueAt: deadline.dueAt,
      }).toString();
      const result = await infrai.cron.create(
        { cron_expr: cronAt(deadline.dueAt), task: task.toString() },
        `order:${parsed.data.orderId}:${deadline.kind}:${deadline.dueAt}`,
      );
      return { kind: deadline.kind, jobId: result.job_id, dueAt: deadline.dueAt };
    }));
    res.status(201).json({ orderId: parsed.data.orderId, reminders: jobs });
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/callbacks/reminder", async (req, res) => {
  const parsed = FiredReminder.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid reminder callback", issues: parsed.error.issues });
    return;
  }

  try {
    await infrai.queue.publish(
      { queue: "order-deadlines", payload: { type: "order.deadline", ...parsed.data } },
      `fired:${parsed.data.orderId}:${parsed.data.kind}:${parsed.data.dueAt}`,
    );
    res.status(202).json({ queued: true, orderId: parsed.data.orderId, kind: parsed.data.kind });
  } catch (error) {
    sendError(res, error);
  }
});

function sendError(res: express.Response, error: unknown): void {
  if (error instanceof InfraiError) {
    const status = error.status >= 400 && error.status < 500 ? error.status : 502;
    res.status(status).json({ error: error.code, detail: error.detail });
    return;
  }
  console.error(error);
  res.status(500).json({ error: "Service error" });
}

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`Reminder service listening on http://localhost:${port}`));
