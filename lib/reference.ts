import { prisma } from "@/lib/db";
import cmo from "@/data/wipo/cmo.json";
import territories from "@/data/wipo/territories.json";
import creationClasses from "@/data/wipo/creation-classes.json";
import identifiers from "@/data/wipo/identifiers.json";

// WIPO Connect "Operational" reference data. The tables are filled from the
// copies of WIPO's own lists in data/wipo/ the first time they are read.
export const REF_KINDS = ["cmo", "territories", "creation-classes", "identifiers"] as const;
export type RefKind = (typeof REF_KINDS)[number];

let seeded: Promise<void> | null = null;

export function ensureReference(): Promise<void> {
  seeded ??= (async () => {
    if ((await prisma.refCmo.count()) === 0) {
      await prisma.refCmo.createMany({ data: cmo.map((c) => ({ ...c })), skipDuplicates: true });
    }
    if ((await prisma.refTerritory.count()) === 0) {
      await prisma.refTerritory.createMany({
        data: territories.map((t) => ({ tisn: t.tisn, tisa: t.tisa, name: t.name, type: t.type, startDate: t.start, endDate: t.end })),
        skipDuplicates: true,
      });
    }
    if ((await prisma.refCreationClass.count()) === 0) {
      await prisma.refCreationClass.createMany({
        data: creationClasses.map((c) => ({
          code: c.code,
          name: c.name,
          description: c.description,
          shareBase: c.shareBase,
          identifiers: c.identifiers,
          additionalFields: c.additionalFields,
          roles: c.roles,
          domesticRoles: c.domesticRoles,
        })),
        skipDuplicates: true,
      });
    }
    if ((await prisma.refIdentifier.count()) === 0) {
      const classesFor = (code: string) => creationClasses.filter((c) => (c.identifiers as string[]).includes(code)).map((c) => c.code);
      await prisma.refIdentifier.createMany({
        data: identifiers.map((i) => ({ ...i, classes: classesFor(i.code) })),
        skipDuplicates: true,
      });
    }
  })().catch((e) => {
    seeded = null;
    throw e;
  });
  return seeded;
}

