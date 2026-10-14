// Who to contact about an event: the family's portal account if linked,
// otherwise the contact an operator entered.

type ContactSource = {
  owner?: { name: string; email: string; phone: string | null } | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
};

export function eventContact(event: ContactSource) {
  return {
    name: event.owner?.name ?? event.contactName ?? null,
    email: event.owner?.email ?? event.contactEmail ?? null,
    phone: event.owner?.phone ?? event.contactPhone ?? null,
    hasAccount: Boolean(event.owner),
  };
}
