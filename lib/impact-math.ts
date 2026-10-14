// Pure calculation for the public impact stats (kept separate for testing).

export type BookedEvent = { guestCount: number | null; quoteTotal: number };

/**
 * Average savings per event versus hosting out of state: the benchmark cost per
 * guest × guests, minus what the family actually pays SFSI. Returns null when
 * there's no benchmark or no qualifying events, so the stat can be hidden.
 */
export function averageSavings(events: BookedEvent[], outOfStateCostPerGuest: number | null) {
  if (!outOfStateCostPerGuest) return null;
  const eligible = events.filter((e) => e.guestCount && e.guestCount > 0 && e.quoteTotal > 0);
  if (eligible.length === 0) return null;
  const total = eligible.reduce((sum, e) => sum + (outOfStateCostPerGuest * e.guestCount! - e.quoteTotal), 0);
  return Math.max(0, Math.round(total / eligible.length));
}
