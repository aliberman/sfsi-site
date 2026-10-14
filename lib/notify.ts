import "server-only";

// Sends a transactional email through Resend when RESEND_API_KEY is configured;
// otherwise logs it, so the workflow runs end to end in development.
export async function sendEmail(to: string | string[], subject: string, text: string) {
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (recipients.length === 0) return;
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "SFSI <no-reply@floridasimchah.org>";
  if (!key) {
    console.info(`[email] to=${recipients.join(",")} subject="${subject}"\n${text}`);
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: recipients, subject, text }),
    });
    if (!res.ok) console.error(`[email] send failed: ${res.status} ${await res.text()}`);
  } catch (err) {
    console.error("[email] send failed", err);
  }
}

export function siteUrl(path = "") {
  const base = process.env.SITE_URL ?? process.env.URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${path}`;
}

/** Addresses that receive operator notifications (new submissions, accepted quotes, payments). */
export function operatorInbox() {
  return (process.env.OPERATOR_EMAILS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}
