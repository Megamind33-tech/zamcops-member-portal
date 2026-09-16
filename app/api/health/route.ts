import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Liveness + readiness for the container healthcheck and any uptime monitor.
// It touches the database, because a portal that cannot reach Postgres is down
// even though the process is up. Deliberately unauthenticated and deliberately
// free of detail: it reports whether the portal is serving, never what it is
// configured with.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    return Response.json(
      { status: "degraded", database: "unreachable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  return Response.json(
    { status: "ok", database: "ok" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
