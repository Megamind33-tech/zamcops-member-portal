// Creates the 38 right-holder groups held on WIPO Connect (type PG: choirs,
// praise teams, bands) with their members, in the admin Groups screen.
//
//   node scripts/import-wipo-groups.mjs            # dry run — reports only
//   node scripts/import-wipo-groups.mjs --apply    # write to the database
//
// The list was read from WIPO Connect > Rights Owners > Group (Oct 2026).
//
// Safety:
//   * Dry run unless --apply is passed.
//   * Idempotent. A group is matched by its WIPO main id (stored in `code`,
//     e.g. 133-21814-N); one that already exists is left completely alone, so
//     staff edits are never overwritten and re-running creates nothing twice.
//   * Only ever inserts. No existing row is modified or deleted.
//   * A member is linked to a register right-holder only when exactly ONE
//     right-holder has the same set of name words ("TEMBO, MARK" matches
//     "MARK TEMBO"). A name that matches several people, or none, is added by
//     name only and listed in the report for staff to link by hand.

const GROUPS = [
  ["21560", "COVENANT VOICES CHOIR WINNERS CHAPELS INTERNAL -LUSAKA", ["SIMUTUNDA, TAZANA", "LUNGU, SAINT BWALYA", "LUBINDA, PRECIOUS LIMPO", "KASONDE, CHRISTOPHER"]],
  ["21593", "THE MIGHTY AMAZING GRACE PRAISE TEAM AFRICAN METHODIST JOHN LAINGH LUSAKA", ["MWEEMBA, MAJOR"]],
  ["21597", "LIBALA TEMPLE PRAISE TEAM", ["KABICHI, NICHOLAS"]],
  ["21631", "THE MIGHTY ZION CHURCH CHOIR", ["CHIBALE, FRANCIS"]],
  ["21632", "BUSOKOLOLO MAIN CHOIR", ["LONGA, JOHN - BUSOKOLOLO MAIN CHOIR"]],
  ["21677", "UCZ MOUNT CALVARY CHURCH CHOIR", ["MUTAMBO, SIMON"]],
  ["21681", "ST MARY'S SMALL CHRISTIAN COMMUNITY", ["TEMBO, RICHARD VINCENT", "CHIBESA, MPUNDU BERNARD", "SIMUSIALELA, GIFT"]],
  ["21687", "GENESIS CHOIR", ["PHIRI, MONICA", "MUSUKUMA, SYDEN", "CHIRWA, WILSON"]],
  ["21689", "WARNING TRUMPET CHURCH CHOIR", ["MWEEMBA, ANDREW"]],
  ["21694", "REVELATION CHURCH CHOIR", ["MUKUPA, JOSEPH", "LUNGU, ROBERT"]],
  ["21696", "THE MIGHTY AMAZING GRACE", ["MWEEMBA, MAJOR"]],
  ["21702", "THE BRIGHT MORNING STAR INTER CHOIR", ["SIAME, DOUBT", "SIMBEYA, DELUX", "MANDA, VINCENT", "MALISHAWA, CHARLES"]],
  ["21705", "AMBASSDORS OF CHRIST PRAISE TEAM -GARDEN COMPOUND", ["MWELWA, MOSES", "MWAPE, PETHIAS"]],
  ["21711", "GOD NEVER FAILS CHURCH CHOIR", ["CHIMA, MOSES", "CHANDA, MARTIN"]],
  ["21716", "GRACE ANGELS CHOIR", ["TEMBO, KINGSWELL"]],
  ["21718", "JOYOUS WORSHIPERS - BAULENI", ["MBOLOMA, WINFRIDAH"]],
  ["21737", "SHOWERS OF BLESSINGS PRAISE TEAM", ["MUNYENYEMBE, SILVIA", "MANDO, KUNDA", "KABAI, EMELDA", "CHANGA, MARGRET"]],
  ["21742", "JORDAN CHOIR-NGWERE SOUTH S.D.A", ["PHIRI, ALEX", "NKHOMA, SPLIANO", "NKHOMA, GIFT", "MUPESENI, SYDNEY"]],
  ["21764", "THE NEW RESURRECTION CHURCH CHOIR", ["NYANGA, DAVID"]],
  ["21765", "MOUNT HOREB CHOIR", ["CHAAMBWA, LOVEMORE"]],
  ["21774", "FRUITS OF LOVE PRAISE TEAM", ["ZANET, SIAME", "PHIRI, JOYCE"]],
  ["21778", "MADALISO WOMEN'S CHOIR", ["DAKA, VAST"]],
  ["21787", "HEAVENLY HARPS CHOIR", ["KASHIBA, JOSEPH HACHINTU"]],
  ["21797", "REJOICE CATHOLIC SINGERS", ["MWALE, LOVEMORE"]],
  ["21799", "BETHEL CHURCH CHOIR", ["MBULO, MORGAN MWELWA"]],
  ["21814", "DYNAMIC CHURCH CHOIR", ["TEMBO, MARK", "SILAVWE, BLESSING", "MALISHAWA, CHARLES"]],
  ["21824", "FORTRESS PRAISE TEAM", ["NAMFUKWE, RUTH DORICA", "MULENGA, VIBIAN", "MATANDA, FRANCIS BULE"]],
  ["21828", "MOUNT ZION SINGERS", ["CHIYESU, REUBEN"]],
  ["21832", "ST. KIZITO PASSOVER CHOIR", ["PHIRI, EVARISTO", "PHIRI, COSMAS ULANDA-ST KIZITO MEN'S CHOIR", "MWANZA, LAWRENCE", "CHILUFYA, MONICA"]],
  ["21844", "LIGHT CHOIR", ["AHISHAKIYE, NOAH"]],
  ["21860", "HOLY MELODIES CHURCH CHOIR", ["SIMBEYE, GILBERT MWAPE"]],
  ["21863", "NEW ANGELS CHURCH CHOIR", ["MWAMBA, DERRICK"]],
  ["21867", "ISRAEL CHOIR", ["SAKALA, NYONGANI"]],
  ["21879", "THE AMAZING GRACE CHOIR", ["DAKA, YASON"]],
  ["21881", "ST VERONICA MESSENGERS", ["ZULU, MICHAEL MUZENJE"]],
  ["21886", "THE RHEMA CHOIR", ["MUSABAKA, OLIVER", "KAMPONGE, GEORGE", "CHULABANTU, SYDEN STEVEN", "CHITALU, LOVENESS"]],
  ["21908", "MAKENI UNION CHURCH CHOIR", ["KOBILI, BRUCE"]],
  ["21913", "RIVER SIDE CHURCH CHOIR-BAULENI", ["TEMBO, CHIDONGO", "CHIWAYA, SAMSON"]],
];

const tokens = (s) =>
  s
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
const tokenKey = (s) => tokens(s).sort().join(" ");

async function main() {
  const apply = process.argv.includes("--apply");
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  try {
    const existing = new Set((await prisma.rightHolderGroup.findMany({ select: { code: true } })).map((g) => g.code));
    const cache = new Map();
    // Exact, unique name match on the register; otherwise null.
    const findHolder = async (base) => {
      const key = tokenKey(base);
      if (cache.has(key)) return cache.get(key);
      const words = tokens(base);
      const found = await prisma.rightHolder.findMany({
        where: { AND: words.map((w) => ({ displayName: { contains: w, mode: "insensitive" } })) },
        select: { id: true, displayName: true },
        take: 50,
      });
      const exact = found.filter((h) => tokenKey(h.displayName) === key);
      const hit = exact.length === 1 ? exact[0] : null;
      cache.set(key, { hit, matches: exact.length });
      return cache.get(key);
    };

    const report = { groups: 0, skipped: 0, members: 0, linked: 0, nameOnly: [] };

    for (const [id, name, people] of GROUPS) {
      const code = `133-${id}-N`;
      if (existing.has(code)) {
        report.skipped++;
        continue;
      }
      const members = [];
      for (const person of people) {
        const base = person.split(" - ")[0];
        const { hit, matches } = await findHolder(base.replace(",", " "));
        if (hit) {
          report.linked++;
          members.push({ rightHolderId: hit.id, displayName: "", role: "Member", sharePct: 0, notes: "" });
        } else {
          const [last, first] = base.split(",").map((s) => s.trim());
          report.nameOnly.push(`${person}  (${matches ? `${matches} people share this name` : "not on the register"})  — in ${name}`);
          members.push({ rightHolderId: null, displayName: first ? `${first} ${last}` : last, role: "Member", sharePct: 0, notes: "" });
        }
        report.members++;
      }
      report.groups++;
      if (apply) {
        await prisma.rightHolderGroup.create({
          data: {
            name,
            code,
            kind: "Group",
            description: "Imported from WIPO Connect",
            members: { create: members },
          },
        });
      }
    }

    console.log(apply ? "APPLIED" : "DRY RUN (nothing written — add --apply to write)");
    console.log(`  groups to create : ${report.groups}`);
    console.log(`  already present  : ${report.skipped}`);
    console.log(`  members          : ${report.members} (${report.linked} linked to a right-holder, ${report.nameOnly.length} by name only)`);
    if (report.nameOnly.length) {
      console.log("\nMembers added by name only — link these by hand in Admin > Groups:");
      for (const l of report.nameOnly) console.log("  - " + l);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
