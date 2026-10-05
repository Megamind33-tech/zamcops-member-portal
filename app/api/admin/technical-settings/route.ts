import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";
import { getSetting, putSetting, TECH_DEFAULTS, type TechnicalSettings } from "@/lib/settings";
import { seal, open } from "@/lib/secretBox";

export const runtime = "nodejs";

const CONNS = ["shared", "ipi", "iswc", "openIpn"] as const;
type Conn = (typeof CONNS)[number];

// Keys never leave the server: the page only learns whether one is stored.
function view(t: TechnicalSettings) {
  const c = (x: TechnicalSettings[Conn]) => ({ baseUrl: x.baseUrl, username: x.username, hasKey: !!x.secret });
  return { shared: c(t.shared), ipi: c(t.ipi), iswc: c(t.iswc), openIpn: c(t.openIpn), workValidation: t.workValidation };
}

const load = () => getSetting<TechnicalSettings>("technical", TECH_DEFAULTS as unknown as TechnicalSettings);

export async function GET() {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  if (!(await hasPermission(session.sub, "CONFIGURATION_ACCESS"))) return bad("You do not have the Configuration (Access) permission.", 403);
  return json(view(await load()));
}

// A host the console must not be pointed at: the server itself or its network.
function blockedHost(h: string): boolean {
  return /^(localhost|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$|.*\.internal$|.*\.local$)/i.test(h);
}

// PUT { conn, baseUrl, username, password? }  or  PUT { workValidation }
export async function PUT(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  if (!(await hasPermission(session.sub, "CONFIGURATION_MGMT"))) return bad("You do not have the Configuration (Management) permission.", 403);
  const b = await req.json().catch(() => null);
  if (!b) return bad("Invalid request.");
  const cur = await load();

  if (typeof b.workValidation === "string") {
    cur.workValidation = b.workValidation.slice(0, 2000);
    await putSetting("technical", cur);
    await logAudit(session.sub, "technical.updated", { targetType: "Technical Settings", summary: "Saved Work Validation formula" });
    return json(view(cur));
  }

  const conn = b.conn as Conn;
  if (!CONNS.includes(conn)) return bad("Unknown connection.");
  const baseUrl = String(b.baseUrl ?? "").trim();
  if (baseUrl) {
    let u: URL;
    try {
      u = new URL(baseUrl);
    } catch {
      return bad("Base URL is not a valid address.");
    }
    if (u.protocol !== "https:") return bad("Base URL must start with https://.");
  }
  cur[conn].baseUrl = baseUrl.slice(0, 500);
  cur[conn].username = String(b.username ?? "").trim().slice(0, 200);
  if (typeof b.password === "string" && b.password !== "") cur[conn].secret = seal(b.password);
  await putSetting("technical", cur);
  await logAudit(session.sub, "technical.updated", { targetType: "Technical Settings", targetId: conn, summary: `Saved connection settings (${conn})${b.password ? " — key changed" : ""}` });
  return json(view(cur));
}

// POST { conn } — "Test": asks the service at the Base URL for a response using the saved user name and key.
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);
  if (!(await hasPermission(session.sub, "CONFIGURATION_MGMT"))) return bad("You do not have the Configuration (Management) permission.", 403);
  const b = await req.json().catch(() => null);
  const conn = b?.conn as Conn;
  if (!CONNS.includes(conn)) return bad("Unknown connection.");
  const c = (await load())[conn];
  if (!c.baseUrl) return bad("Enter and save a Base URL first.");
  const u = new URL(c.baseUrl);
  if (u.protocol !== "https:" || blockedHost(u.hostname)) return bad("That address cannot be tested from here.");
  const key = c.secret ? open(c.secret) : "";
  try {
    const r = await fetch(u, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
      headers: key ? { Authorization: `Basic ${Buffer.from(`${c.username}:${key}`).toString("base64")}` } : {},
    });
    const ok = r.status < 400 || r.status === 404 || r.status === 405;
    const note = r.status === 401 || r.status === 403 ? "The service answered but did not accept the user name / key." : ok ? "The service answered." : `The service answered with an error (${r.status}).`;
    return json({ ok: r.status < 400, status: r.status, message: `${note} (HTTP ${r.status})` });
  } catch (e) {
    return json({ ok: false, status: 0, message: `Could not reach the service: ${e instanceof Error ? e.message : "request failed"}.` });
  }
}
