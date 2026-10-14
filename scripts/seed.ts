/**
 * Seeds reference data (packages, venues, catalog) when those tables are empty,
 * and creates/promotes the admin account from ADMIN_EMAIL / ADMIN_PASSWORD.
 *
 *   npm run db:seed            reference data + admin
 *   npm run db:seed -- --demo  also adds sample staff and a demo family with an event
 *
 * Catalog prices are placeholders — review them in /admin/catalog before launch.
 */
import bcrypt from "bcryptjs";
import { count, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../lib/db/schema";

const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
const db = drizzle(sql, { schema });
const demo = process.argv.includes("--demo");
const $ = (dollars: number) => Math.round(dollars * 100);

async function isEmpty(table: typeof schema.packages | typeof schema.venues | typeof schema.catalogItems | typeof schema.staffMembers) {
  const [{ n }] = await db.select({ n: count() }).from(table);
  return n === 0;
}

async function main() {
  if (await isEmpty(schema.packages)) {
    await db.insert(schema.packages).values([
      {
        name: "Essentials",
        tagline: "Everything you need for a beautiful, simple simchah.",
        sortOrder: 1,
        features: ["4-hour space rental", "Basic décor", "Tables, chairs & linens", "Event coordinator"],
      },
      {
        name: "Classic",
        tagline: "Our most popular package for weddings and bar/bat mitzvahs.",
        sortOrder: 2,
        features: ["Everything in Essentials", "Extended hours", "Simple stage / chuppah", "Sound system", "Basic photography"],
      },
      {
        name: "Simchah+",
        tagline: "Full-service elegance, coordinated end to end.",
        sortOrder: 3,
        features: ["Everything in Classic", "Premium chuppah", "Band / DJ coordination", "Photo & video options", "On-site mashgiach (as applicable)"],
      },
    ]);
    console.log("Seeded packages");
  }

  if (await isEmpty(schema.venues)) {
    await db.insert(schema.venues).values([
      { name: "Shul Social Hall", neighborhood: "North Miami Beach", capacity: 250, shabbosFriendly: true, description: "Great for bar/bat mitzvahs and micro-weddings." },
      { name: "Community Center Ballroom", neighborhood: "Hollywood", capacity: 400, shabbosFriendly: true, description: "Spacious, easy parking, flexible décor rules." },
    ]);
    console.log("Seeded venues");
  }

  if (await isEmpty(schema.catalogItems)) {
    await db.insert(schema.catalogItems).values([
      { category: "equipment", name: "Round table (60\")", unit: "each", unitPrice: $(15), inventoryQty: 40 },
      { category: "equipment", name: "Chiavari chair", unit: "each", unitPrice: $(6), inventoryQty: 400 },
      { category: "equipment", name: "Table linen & napkins", unit: "per_guest", unitPrice: $(3) },
      { category: "equipment", name: "Chuppah (classic)", unit: "each", unitPrice: $(450), inventoryQty: 2 },
      { category: "equipment", name: "Mechitzah panels (set)", unit: "each", unitPrice: $(200), inventoryQty: 3 },
      { category: "equipment", name: "Sound system with wireless mics", unit: "flat", unitPrice: $(350), inventoryQty: 2 },
      { category: "equipment", name: "Stage / dance floor section", unit: "each", unitPrice: $(60), inventoryQty: 30 },
      { category: "equipment", name: "Hot boxes / warming equipment", unit: "each", unitPrice: $(40), inventoryQty: 10 },
      { category: "staffing", name: "Server / waiter", description: "5-hour shift", unit: "each", unitPrice: $(175) },
      { category: "staffing", name: "Bartender", description: "5-hour shift", unit: "each", unitPrice: $(225) },
      { category: "staffing", name: "Mashgiach", unit: "flat", unitPrice: $(300) },
      { category: "staffing", name: "Setup & breakdown crew", unit: "each", unitPrice: $(150) },
      { category: "staffing", name: "Day-of coordinator", unit: "flat", unitPrice: $(600) },
      { category: "service", name: "Photography", description: "4 hours, edited gallery", unit: "flat", unitPrice: $(1800) },
      { category: "service", name: "Videography", unit: "flat", unitPrice: $(2200) },
      { category: "service", name: "Band / DJ coordination", unit: "flat", unitPrice: $(2500) },
      { category: "service", name: "Valet parking", unit: "per_hour", unitPrice: $(120) },
      { category: "decor", name: "Centerpieces (florals)", unit: "each", unitPrice: $(85) },
      { category: "decor", name: "Chuppah florals", unit: "flat", unitPrice: $(900) },
      { category: "decor", name: "Uplighting package", unit: "flat", unitPrice: $(400) },
    ]);
    console.log("Seeded catalog (placeholder prices)");
  }

  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  if (adminEmail) {
    const existing = await db.query.users.findFirst({ where: eq(schema.users.email, adminEmail) });
    if (existing) {
      await db.update(schema.users).set({ role: "admin" }).where(eq(schema.users.id, existing.id));
      console.log(`Promoted ${adminEmail} to admin`);
    } else if (process.env.ADMIN_PASSWORD) {
      await db.insert(schema.users).values({
        email: adminEmail,
        name: process.env.ADMIN_NAME ?? "SFSI Admin",
        role: "admin",
        passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12),
      });
      console.log(`Created admin ${adminEmail}`);
    } else {
      console.log("Set ADMIN_PASSWORD to create the admin account (or register first, then re-run to promote).");
    }
  }

  if (demo) await seedDemo();
  await sql.end();
}

async function seedDemo() {
  if (await isEmpty(schema.staffMembers)) {
    await db.insert(schema.staffMembers).values([
      { name: "Demo Coordinator", primaryRole: "coordinator", phone: "305-555-0100", hourlyRate: $(45) },
      { name: "Demo Server A", primaryRole: "server", phone: "305-555-0101", hourlyRate: $(25) },
      { name: "Demo Server B", primaryRole: "server", phone: "305-555-0102", hourlyRate: $(25) },
      { name: "Demo Mashgiach", primaryRole: "mashgiach", phone: "305-555-0103", hourlyRate: $(40) },
      { name: "Demo Crew Lead", primaryRole: "setup_crew", phone: "305-555-0104", hourlyRate: $(28) },
    ]);
    console.log("Seeded demo staff");
  }
  const email = "family@example.com";
  if (!(await db.query.users.findFirst({ where: eq(schema.users.email, email) }))) {
    const [family] = await db
      .insert(schema.users)
      .values({ email, name: "Demo Family", passwordHash: await bcrypt.hash("demo-password", 12) })
      .returning();
    const venue = await db.query.venues.findFirst();
    const date = new Date();
    date.setMonth(date.getMonth() + 4);
    const [event] = await db
      .insert(schema.events)
      .values({
        ownerId: family.id,
        title: "Demo Bar Mitzvah",
        type: "bar_mitzvah",
        status: "submitted",
        submittedAt: new Date(),
        eventDate: date.toISOString().slice(0, 10),
        startTime: "18:00",
        endTime: "23:00",
        guestCount: 150,
        venueId: venue?.id,
      })
      .returning();
    const items = await db.query.catalogItems.findMany();
    const pick = (name: string) => items.find((i) => i.name.startsWith(name));
    await db.insert(schema.serviceRequests).values(
      [["Round table", 15], ["Chiavari", 150], ["Sound system", 1], ["Server", 8], ["Photography", 1]].map(([n, q]) => {
        const item = pick(n as string)!;
        return { eventId: event.id, catalogItemId: item.id, description: item.name, quantity: q as number };
      }),
    );
    await db.insert(schema.cateringRequests).values({
      eventId: event.id,
      mealType: "meat",
      serviceStyle: "plated",
      guestCount: 150,
      hechsher: "Glatt kosher",
      budgetPerGuest: $(65),
    });
    console.log(`Seeded demo family (${email} / demo-password) with a submitted event`);
  }
}

main().catch(async (err) => {
  console.error(err);
  await sql.end();
  process.exit(1);
});
