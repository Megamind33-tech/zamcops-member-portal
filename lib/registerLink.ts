// Helpers for linking portal members to WIPO Connect register entries by hand.
//
// The import links on hard keys (IPI, NRC, email, phone). Artists who sign up
// under a stage name, or who are on the register under a pseudonym, are missed
// by those keys; staff link them here, with suggestions to start from.

import { prisma } from "@/lib/db";

const words = (s: string) =>
  new Set(
    s
      .toUpperCase()
      .replace(/[^A-Z ]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3),
  );

/** Portal members with no register entry yet whose name shares a word with this right-holder, best first. */
export async function suggestMembers(holder: { displayName: string; names: { name: string; firstName: string }[] }) {
  const hw = words([holder.displayName, ...holder.names.map((n) => `${n.firstName} ${n.name}`)].join(" "));
  const members = await prisma.member.findMany({
    where: { rightHolder: { is: null } },
    select: { id: true, memberNumber: true, fullName: true, stageName: true },
  });
  return members
    .map((m) => {
      let score = 0;
      for (const w of words(`${m.fullName} ${m.stageName}`)) if (hw.has(w)) score++;
      return { ...m, score };
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}
