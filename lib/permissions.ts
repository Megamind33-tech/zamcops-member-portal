import { prisma } from "@/lib/db";
import permissions from "@/data/wipo/permissions.json";
import seedGroups from "@/data/wipo/security-groups.json";

// WIPO Connect's 44 permissions (code, name, description), copied from its
// Security Group window. `code` is what a group stores.
export const PERMISSIONS: { code: string; name: string; description: string }[] = permissions;

let seeded: Promise<void> | null = null;

// WIPO's three security groups (ADMIN, Licensing Department, Documentation
// officers) are created the first time groups are read.
export function ensureSecurityGroups(): Promise<void> {
  seeded ??= (async () => {
    if ((await prisma.adminGroup.count()) > 0) return;
    await prisma.adminGroup.createMany({ data: seedGroups.map((g) => ({ ...g })), skipDuplicates: true });
  })().catch((e) => {
    seeded = null;
    throw e;
  });
  return seeded;
}

// An account that belongs to no Security Group keeps full access, so the
// first account (created from ADMIN_EMAIL) can always set the groups up.
// Once an account is put in a group it gets exactly that group's permissions.
export async function hasPermission(adminId: string, code: string): Promise<boolean> {
  const a = await prisma.adminUser.findUnique({ where: { id: adminId }, select: { active: true, groups: { select: { permissions: true } } } });
  if (!a || !a.active) return false;
  if (a.groups.length === 0) return true;
  return a.groups.some((g) => (g.permissions as string[]).includes(code));
}
