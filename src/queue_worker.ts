import { z } from "zod";
import { infrai } from "./infrai_client.js";

const ReminderMessage = z.object({
  type: z.literal("order.deadline"),
  orderId: z.string(),
  customerId: z.string(),
  kind: z.enum(["checkout", "fulfillment", "receipt", "customer-update"]),
  audience: z.enum(["operations", "customer"]),
  dueAt: z.string(),
});

async function run(): Promise<void> {
  const queue = "order-deadlines";
  const batch = await infrai.queue.consume({ queue, max_messages: 10, visibility_timeout: 30 });
  for (const message of batch.messages ?? []) {
    const reminder = ReminderMessage.parse(message.payload);
    console.log(JSON.stringify({
      delivery: reminder.audience === "customer" ? "customer-order-update" : "operations-desk",
      orderId: reminder.orderId,
      kind: reminder.kind,
      dueAt: reminder.dueAt,
    }));
    await infrai.queue.ack(
      { queue, message_id: message.message_id },
      `ack:${message.message_id}`,
    );
  }
}

run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
