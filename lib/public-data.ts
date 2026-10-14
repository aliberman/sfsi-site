import "server-only";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export function activePackages() {
  return db.query.packages.findMany({ where: eq(schema.packages.active, true), orderBy: [asc(schema.packages.sortOrder)] });
}

export function activeVenues() {
  return db.query.venues.findMany({ where: eq(schema.venues.active, true), orderBy: [asc(schema.venues.name)] });
}

export function activeVendors() {
  return db.query.vendors.findMany({ where: eq(schema.vendors.active, true), orderBy: [asc(schema.vendors.category), asc(schema.vendors.name)] });
}
