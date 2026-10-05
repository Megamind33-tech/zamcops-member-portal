import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { json, bad } from "@/lib/server";
import { logAudit } from "@/lib/audit";
import { normaliseIswc, normaliseIsrc, parseJson, pickCodes, type Ident } from "@/lib/registryWork";

export const runtime = "nodejs";

// One work from the register in full: titles, identifiers, dates, the ownership
// view with every right-holder's share, what it was allocated in distributions,
// and the edit history.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const { id } = await params;
  const w = await prisma.registryWork.findUnique({ where: { id } });
  if (!w) return bad("Work not found.", 404);

  const [shares, lines, history, statuses] = await Promise.all([
    prisma.workShare.findMany({
      where: { workId: id },
      orderBy: [{ territoryFormula: "asc" }, { rightType: "asc" }, { roleCode: "asc" }],
      include: { rightHolder: { select: { id: true, displayName: true, ipiNumber: true, memberId: true } } },
    }),
    prisma.distributionLine.findMany({
      where: { workId: id },
      include: {
        distribution: { select: { id: true, periodLabel: true, code: true, status: true } },
        rightHolder: { select: { id: true, displayName: true } },
      },
      orderBy: { distribution: { createdAt: "desc" } },
      take: 300,
    }),
    prisma.auditLog.findMany({ where: { targetType: "RegistryWork", targetId: id }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.registryWork.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  return json({
    work: {
      ...w,
      alternativeTitles: parseJson<string[]>(w.alternativeTitles, []),
      identifiers: parseJson<Ident[]>(w.identifiers, []),
      dates: parseJson<{ code: string; value: string; territory: string }[]>(w.dates, []),
      extra: parseJson<Record<string, string>>(w.extra, {}),
    },
    shares,
    lines,
    history,
    statuses: statuses.map((s) => s.status).filter(Boolean).sort(),
  });
}

// Edit the work's own details. Ownership shares are edited through /shares.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return bad("Not authorized.", 401);

  const { id } = await params;
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") return bad("Invalid request body.");

  const cur = await prisma.registryWork.findUnique({ where: { id } });
  if (!cur) return bad("Work not found.", 404);

  const data: Record<string, unknown> = {};
  const changed: string[] = [];
  const str = (k: string, max: number) => (typeof b[k] === "string" ? String(b[k]).trim().slice(0, max) : undefined);

  const title = str("title", 300);
  if (title !== undefined) {
    if (!title) return bad("A work needs a title.");
    if (title !== cur.title) { data.title = title; changed.push("title"); }
  }
  for (const [k, max] of [["status", 40], ["genre", 80], ["notes", 2000], ["registeredAt", 10]] as const) {
    const v = str(k, max);
    if (v !== undefined && v !== (cur as Record<string, unknown>)[k]) { data[k] = v; changed.push(k); }
  }
  if (typeof b.domestic === "boolean" && b.domestic !== cur.domestic) { data.domestic = b.domestic; changed.push("domestic"); }

  if (Array.isArray(b.alternativeTitles)) {
    const alts = [...new Set((b.alternativeTitles as unknown[]).map((t) => String(t).trim().slice(0, 300)).filter(Boolean))];
    if (JSON.stringify(alts) !== cur.alternativeTitles) { data.alternativeTitles = JSON.stringify(alts); changed.push("other titles"); }
  }

  if (Array.isArray(b.identifiers)) {
    const out: Ident[] = [];
    for (const raw of b.identifiers as Partial<Ident>[]) {
      const code = String(raw.code ?? "").trim().toUpperCase().slice(0, 30);
      let value = String(raw.value ?? "").trim().slice(0, 60);
      if (!code || !value) continue;
      if (code === "ISWC") {
        const n = normaliseIswc(value);
        if (!n) return bad(`"${value}" is not a valid ISWC. It looks like T-123.456.789-0.`);
        value = n;
      }
      if (code === "ISRC") {
        const n = normaliseIsrc(value);
        if (!n) return bad(`"${value}" is not a valid ISRC. It is 12 characters, like ZMABC2400001.`);
        value = n;
      }
      if (out.some((o) => o.code === code && o.value === value)) return bad(`${code} ${value} is listed twice.`);
      out.push({ code, label: String(raw.label ?? code).slice(0, 60), value });
    }
    if (JSON.stringify(out) !== cur.identifiers) {
      data.identifiers = JSON.stringify(out);
      Object.assign(data, pickCodes(out));
      changed.push("identifiers");
    }
  }

  if (!changed.length) return json({ ok: true, changed: [] });
  data.editedAt = new Date();
  await prisma.registryWork.update({ where: { id }, data });
  await logAudit(session.sub, "registry.work.edit", { targetType: "RegistryWork", targetId: id, summary: `${cur.title}: changed ${changed.join(", ")}` });
  return json({ ok: true, changed });
}
