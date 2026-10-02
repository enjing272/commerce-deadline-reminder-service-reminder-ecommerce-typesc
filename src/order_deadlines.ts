import { z } from "zod";

export const OrderRequest = z.object({
  orderId: z.string().min(1),
  customerId: z.string().min(1),
  checkoutDueAt: z.string().datetime({ offset: true }),
  fulfillmentDueAt: z.string().datetime({ offset: true }),
  receiptDueAt: z.string().datetime({ offset: true }),
  customerUpdateDueAt: z.string().datetime({ offset: true }),
});

export type OrderRequest = z.infer<typeof OrderRequest>;
export type ReminderKind = "checkout" | "fulfillment" | "receipt" | "customer-update";

export type Deadline = {
  kind: ReminderKind;
  dueAt: string;
  audience: "operations" | "customer";
};

export function planDeadlines(order: OrderRequest): Deadline[] {
  const deadlines: Deadline[] = [
    { kind: "checkout", dueAt: order.checkoutDueAt, audience: "customer" },
    { kind: "fulfillment", dueAt: order.fulfillmentDueAt, audience: "operations" },
    { kind: "receipt", dueAt: order.receiptDueAt, audience: "customer" },
    { kind: "customer-update", dueAt: order.customerUpdateDueAt, audience: "customer" },
  ];
  return deadlines.sort((left, right) => Date.parse(left.dueAt) - Date.parse(right.dueAt));
}

export function cronAt(isoDate: string): string {
  const date = new Date(isoDate);
  return `${date.getUTCMinutes()} ${date.getUTCHours()} ${date.getUTCDate()} ${date.getUTCMonth() + 1} *`;
}
