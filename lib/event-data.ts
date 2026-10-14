import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

/** Everything needed to render an event page. */
export async function loadEventDetail(eventId: string) {
  return db.query.events.findFirst({
    where: eq(schema.events.id, eventId),
    with: {
      owner: { columns: { id: true, name: true, email: true, phone: true } },
      coordinator: { columns: { id: true, name: true, email: true, phone: true } },
      venue: true,
      package: true,
      serviceRequests: { with: { catalogItem: true }, orderBy: [asc(schema.serviceRequests.createdAt)] },
      cateringRequests: { orderBy: [asc(schema.cateringRequests.createdAt)] },
      quotes: { with: { lines: true }, orderBy: [desc(schema.quotes.number)] },
      paymentPlan: { with: { installments: { orderBy: [asc(schema.installments.sortOrder)] } } },
      staffAssignments: { with: { staffMember: true }, orderBy: [asc(schema.staffAssignments.createdAt)] },
      equipmentAllocations: { with: { catalogItem: true } },
      tasks: { with: { assignee: { columns: { id: true, name: true } } }, orderBy: [asc(schema.tasks.dueDate), asc(schema.tasks.createdAt)] },
      scheduleItems: { orderBy: [asc(schema.scheduleItems.createdAt)] },
      messages: {
        with: { author: { columns: { id: true, name: true, role: true } } },
        orderBy: [asc(schema.messages.createdAt)],
      },
      activity: { with: { actor: { columns: { name: true } } }, orderBy: [desc(schema.activity.createdAt)], limit: 50 },
    },
  });
}

export type EventDetail = NonNullable<Awaited<ReturnType<typeof loadEventDetail>>>;

export function paymentSummary(plan: EventDetail["paymentPlan"]) {
  if (!plan) return null;
  const today = new Date().toISOString().slice(0, 10);
  const paid = plan.installments.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const waived = plan.installments.filter((i) => i.status === "waived").reduce((s, i) => s + i.amount, 0);
  const pending = plan.installments.filter((i) => i.status === "pending");
  const overdue = pending.filter((i) => i.dueDate < today);
  const balance = pending.reduce((s, i) => s + i.amount, 0);
  return { paid, waived, balance, next: pending[0] ?? null, overdue };
}
