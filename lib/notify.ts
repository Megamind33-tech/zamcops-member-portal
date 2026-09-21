import { prisma } from "@/lib/db";
import { renderEmail, type EmailContent } from "@/lib/email";

// Central member-notification dispatcher. Every notice a member receives goes
// through here: it always writes the in-app notification, then — best effort —
// delivers it by email (Resend) and SMS (Africa's Talking), honouring the
// member's persisted preference toggles. Both providers are optional: with no
// API keys configured the external sends silently no-op, so local/dev
// environments behave exactly as before.
//
// Env vars:
//   RESEND_API_KEY  — Resend API key (email)
//   EMAIL_FROM      — verified sender, e.g. "ZAMCOPS <no-reply@zamcops.org.zm>"
//   AT_USERNAME     — Africa's Talking username ("sandbox" for testing)
//   AT_API_KEY      — Africa's Talking API key (SMS)
//   AT_SENDER_ID    — optional registered sender ID / shortcode

export type NotifyCategory = "general" | "royalty" | "security" | "marketing";

export interface NotifyInput {
  title: string;
  body: string;
  type?: "info" | "success" | "warning" | "action";
  category?: NotifyCategory; // default "general"
  sms?: string; // shorter text for SMS; falls back to body
  href?: string; // in-app path, e.g. /support
}

interface Prefs {
  email: boolean;
  sms: boolean;
  royalty: boolean;
  marketing: boolean;
}

const DEFAULT_PREFS: Prefs = { email: true, sms: true, royalty: true, marketing: false };

function parsePrefs(raw?: string | null): Prefs {
  try {
    return { ...DEFAULT_PREFS, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

// Zambian numbers: "097…" → "+26097…", "26097…" → "+26097…".
function normalizePhone(phone: string): string {
  const p = phone.replace(/[\s-]/g, "");
  if (p.startsWith("+")) return p;
  if (p.startsWith("260")) return `+${p}`;
  if (p.startsWith("0")) return `+260${p.slice(1)}`;
  return p;
}

// Transactional email (OTP codes, verification) — always sends when Resend is
// configured, regardless of the member's notification preferences. Falls back
// to Resend's shared onboarding sender until EMAIL_FROM is set to an address
// on a domain verified in the Resend dashboard.
export async function sendTransactionalEmail(to: string, content: EmailContent): Promise<void> {
  return sendEmail(to, content);
}

async function sendEmail(to: string, content: EmailContent): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "ZAMCOPS <onboarding@resend.dev>";
  if (!to) return;
  if (!key) {
    console.warn(`[notify] RESEND_API_KEY is not set — email "${content.subject}" to ${to} was skipped`);
    return;
  }
  if (!process.env.EMAIL_FROM) {
    console.warn(
      "[notify] EMAIL_FROM is not set — sending from Resend's shared onboarding sender, which only delivers to the Resend account owner's own inbox (test mode). Verify a domain in Resend and set EMAIL_FROM for real delivery.",
    );
  }

  const { html, text } = renderEmail(content);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    // Both parts: a client that prefers text, or a filter that distrusts
    // HTML-only mail, gets something properly written rather than nothing.
    body: JSON.stringify({ from, to, subject: content.subject, html, text }),
  });
  if (!res.ok) {
    console.error(`[notify] email to ${to} (from ${from}) failed:`, res.status, await res.text().catch(() => ""));
  }
}

async function sendSMS(phone: string, text: string): Promise<void> {
  const apiKey = process.env.AT_API_KEY;
  const username = process.env.AT_USERNAME;
  if (!apiKey || !username || !phone) return;

  const params = new URLSearchParams({
    username,
    to: normalizePhone(phone),
    message: `ZAMCOPS: ${text}`.slice(0, 320),
  });
  if (process.env.AT_SENDER_ID) params.set("from", process.env.AT_SENDER_ID);

  const res = await fetch("https://api.africastalking.com/version1/messaging", {
    method: "POST",
    headers: { apiKey, Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) console.error("[notify] sms failed:", res.status, await res.text().catch(() => ""));
}


// In-app deep links only — reject protocol-relative and off-site URLs.
export function safeNoticeHref(raw?: string): string {
  if (!raw) return "";
  const h = raw.trim();
  if (h.startsWith("/") && !h.startsWith("//") && !h.startsWith("/\\")) return h.slice(0, 240);
  return "";
}

// What the button should say, given what kind of notice this is.
function actionLabel(type: NotifyInput["type"]): string {
  return type === "action" ? "Take a look" : "View in the portal";
}

// Notify one member across all channels. Never throws — a provider outage must
// not fail the admin action that triggered the notice.
export async function notifyMember(memberId: string, input: NotifyInput): Promise<void> {
  const type = input.type ?? "info";
  const href = safeNoticeHref(input.href);
  try {
    await prisma.notification.create({
      data: href
        ? { ownerId: memberId, title: input.title, body: input.body, type, href }
        : { ownerId: memberId, title: input.title, body: input.body, type },
    });
  } catch (err) {
    // A missing href column (before prisma db push) must not fail the action
    // that triggered the notice — e.g. work registration.
    console.error("[notify] in-app write failed, retrying without href:", err);
    try {
      await prisma.notification.create({
        data: { ownerId: memberId, title: input.title, body: input.body, type },
      });
    } catch (err2) {
      console.error("[notify] in-app write failed:", err2);
    }
  }

  try {
    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) return;

    const prefs = parsePrefs(member.notificationPrefs);
    const category = input.category ?? "general";

    // Category gate: security notices always go out; royalty and marketing
    // respect their dedicated toggles; general only respects channel toggles.
    if (category === "royalty" && !prefs.royalty) return;
    if (category === "marketing" && !prefs.marketing) return;

    const wantEmail = category === "security" || prefs.email;
    const wantSms = category === "security" || prefs.sms;

    await Promise.all([
      wantEmail
        ? sendEmail(member.email, {
            subject: input.title,
            preheader: input.body.slice(0, 120),
            heading: input.title,
            greeting: member.fullName ? `Hello ${member.fullName.split(" ")[0]},` : undefined,
            paragraphs: [input.body],
            action: href
              ? { label: actionLabel(type), href }
              : { label: "Open the member portal", href: "/dashboard" },
            footnote:
              category === "security"
                ? "This is a security notice, so it is sent whatever your notification settings say."
                : "You can change which notices reach you under Settings → Notification preferences.",
          })
        : Promise.resolve(),
      wantSms ? sendSMS(member.phone, input.sms ?? `${input.title} — ${input.body}`) : Promise.resolve(),
    ]);
  } catch (err) {
    console.error("[notify] delivery error:", err);
  }
}

// Convenience for fan-out (e.g. publishing a distribution period).
export async function notifyMembers(memberIds: string[], input: NotifyInput): Promise<void> {
  await Promise.all(memberIds.map((id) => notifyMember(id, input)));
}
