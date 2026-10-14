import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

/** Stripe is optional: without a key, clients pay offline and operators record payments. */
export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  client ??= new Stripe(key);
  return client;
}
