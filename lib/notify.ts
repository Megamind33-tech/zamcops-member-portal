import { prisma } from "@/lib/db";

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

async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from || !to) return;

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1a1d21">
      <div style="background:#1a1d21;padding:20px 24px;border-radius:12px 12px 0 0">
        <span style="color:#fff;font-size:18px;font-weight:bold">ZAMCOPS</span>
        <span style="color:#c8c8c8;font-size:12px;display:block;margin-top:2px">Zambian Music Copyright Protection Society</span>
      </div>
      <div style="height:4px;background:linear-gradient(90deg,#f26c21 0 28%,#e2342b 28% 52%,#c9ceda 52% 74%,#2ba45a 74% 100%)"></div>
      <div style="border:1px solid #e7e9ed;border-top:0;border-radius:0 0 12px 12px;padding:24px">
        <h2 style="margin:0 0 10px;font-size:17px">${escapeHtml(subject)}</h2>
        <p style="margin:0;font-size:14px;line-height:1.6;color:#3a4149">${escapeHtml(body)}</p>
        <p style="margin:20px 0 0;font-size:12px;color:#5a6470">
          Sign in to the member portal to view details. Manage how we contact you under Settings → Notification preferences.
        </p>
      </div>
    </div>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject: `ZAMCOPS — ${subject}`, html }),
  });
  if (!res.ok) console.error("[notify] email failed:", res.status, await res.text().catch(() => ""));
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

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Notify one member across all channels. Never throws — a provider outage must
// not fail the admin action that triggered the notice.
export async function notifyMember(memberId: string, input: NotifyInput): Promise<void> {
  const type = input.type ?? "info";
  await prisma.notification.create({
    data: { ownerId: memberId, title: input.title, body: input.body, type },
  });

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
      wantEmail ? sendEmail(member.email, input.title, input.body) : Promise.resolve(),
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
