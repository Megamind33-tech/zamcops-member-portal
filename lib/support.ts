export const MEMBER_SUPPORT_TOPICS = [
  "Membership",
  "Work registration",
  "Royalties & distributions",
  "Documents",
  "Account",
] as const;

export const SUPPORT_TOPICS = [...MEMBER_SUPPORT_TOPICS, "Password reset"] as const;

export type SupportTopic = (typeof SUPPORT_TOPICS)[number];

export type ThreadAuthor = "member" | "staff";

export interface ThreadMessage {
  author: ThreadAuthor;
  body: string;
  at: string;
}

export function parseThread(
  raw: unknown,
  fallback?: { message?: string; reply?: string; createdAt?: string; resolvedAt?: string },
): ThreadMessage[] {
  if (typeof raw === "string" && raw.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(raw) as ThreadMessage[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      /* fall through */
    }
  }
  const out: ThreadMessage[] = [];
  if (fallback?.message) {
    out.push({ author: "member", body: fallback.message, at: fallback.createdAt || new Date().toISOString() });
  }
  if (fallback?.reply) {
    out.push({
      author: "staff",
      body: fallback.reply,
      at: fallback.resolvedAt || fallback.createdAt || new Date().toISOString(),
    });
  }
  return out;
}

export function appendThread(existing: ThreadMessage[], author: ThreadAuthor, body: string): ThreadMessage[] {
  return [...existing, { author, body, at: new Date().toISOString() }];
}

export function serializeThread(messages: ThreadMessage[]): string {
  return JSON.stringify(messages);
}

export function threadOf(ticket: {
  thread?: unknown;
  message?: string;
  reply?: string;
  createdAt?: Date | string;
  resolvedAt?: Date | string | null;
}): ThreadMessage[] {
  const iso = (d?: Date | string | null) => (d instanceof Date ? d.toISOString() : d || undefined);
  return parseThread(ticket.thread, {
    message: ticket.message,
    reply: ticket.reply,
    createdAt: iso(ticket.createdAt),
    resolvedAt: iso(ticket.resolvedAt),
  });
}
