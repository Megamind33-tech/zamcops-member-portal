// Imports the WIPO Connect register (right-holders with IPI numbers, addresses
// and contacts; works with their shares; distributions) into the portal.
//
//   npm run import:wipo -- --dir import-data/export           # dry run — reports only
//   npm run import:wipo -- --dir import-data/export --apply   # write to the database
//
// Input is the folder of .tsv files produced by the export queries run on the
// WIPO Connect server (mysql --batch output: tab-separated, header row, NULL
// for empty, \t \n \\ escaped). Nothing is read from WIPO Connect directly.
//
// Rules:
//   * Dry run unless --apply is passed. A dry run still reads the portal's
//     members (if DATABASE_URL is set) so the match report is real.
//   * WIPO Connect wins: where a matched member's IPI numbers, NRC, address,
//     province, district, date of birth, gender or next of kin differ, the WIPO
//     value is written — but only when WIPO has a value; an empty WIPO field
//     never blanks a portal one.
//   * Email and phone are the member's login identity. They are used to MATCH
//     and are never overwritten; differences are listed in the report.
//   * Right-holders with no portal account stay as RightHolder rows. No Member
//     (and so no login) is created for them.
//   * Imported distributions are created as Draft. A distribution that already
//     exists keeps its status, so re-running never un-publishes one.
//   * Re-runnable. RightHolder, name, address, contact, RegistryWork, WorkShare
//     and DistributionLine rows are only ever written by this script, so a run
//     replaces them wholesale (a register link set on RegistryWork.declarationId
//     is carried across). If a run is interrupted, run it again.
//   * Rows flagged deleted or dummy in WIPO Connect are skipped.
//
// The report (counts, conflicts) is written to tmp/wipo-import-report.json,
// which is git-ignored. It contains personal data; delete it when done.

import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function loadDotEnv(path = ".env") {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!m) continue;
    const [, k, raw] = m;
    if (process.env[k]) continue;
    process.env[k] = raw.replace(/^["']|["']$/g, "");
  }
}

// ── TSV ─────────────────────────────────────────────────────────────────────
const UNESCAPE = { t: "\t", n: "\n", r: "\r", "\\": "\\", 0: "\0" };
const unescape = (v) => (v === "NULL" ? "" : v.includes("\\") ? v.replace(/\\([tnr\\0])/g, (_, c) => UNESCAPE[c]) : v);

function readTsv(dir, name) {
  const path = join(dir, `${name}.tsv`);
  if (!existsSync(path)) return null;
  const lines = readFileSync(path, "utf8").split("\n");
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  if (!lines.length) return [];
  const head = lines[0].split("\t");
  return lines.slice(1).map((l) => {
    const cells = l.split("\t");
    const o = {};
    head.forEach((h, i) => (o[h] = unescape(cells[i] ?? "NULL")));
    return o;
  });
}

const need = (dir, name) => {
  const r = readTsv(dir, name);
  if (r === null) throw new Error(`missing ${name}.tsv in ${dir}`);
  return r;
};
const opt = (dir, name) => readTsv(dir, name) ?? [];

// ── helpers ─────────────────────────────────────────────────────────────────
const truthy = (v) => v === "1" || v === "true" || v === "TRUE";
const clean = (v) => (v ?? "").replace(/\s+/g, " ").trim();
const normNrc = (v) => clean(v).toUpperCase().replace(/[^A-Z0-9]/g, "");
const normEmail = (v) => clean(v).toLowerCase();
const normPhone = (v) => clean(v).replace(/\D/g, "").slice(-9); // 9 national digits: ignores +260 / 0 prefixes
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const group = (rows, key) => {
  const m = new Map();
  for (const r of rows) {
    const k = r[key];
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  }
  return m;
};
const chunks = (arr, n) => {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};
const uniq = (arr) => [...new Set(arr.filter(Boolean))];

// ── build the in-memory register ────────────────────────────────────────────
function build(dir) {
  const ips = need(dir, "ip").filter((r) => !truthy(r.deleted) && !truthy(r.dummy));
  const names = need(dir, "names").filter((r) => !truthy(r.deleted));
  const idents = opt(dir, "ip_identifiers");
  const addrs = opt(dir, "addresses");
  const conts = opt(dir, "contacts");
  const dyn = opt(dir, "ip_dynamic");

  const namesByIp = group(names, "fk_interested_party");
  const identsByIp = group(idents, "fk_interested_party");
  const addrsByIp = group(addrs, "fk_interested_party");
  const contsByIp = group(conts, "fk_interested_party");
  const dynByIp = group(dyn, "fk_interested_party");

  const isBase = (i) => /base|ipbn|ipi.?b/i.test(`${i.code} ${i.label}`);
  const isIpiName = (i) => /ipi|cae/i.test(`${i.code} ${i.label}`) && !isBase(i);

  const holders = [];
  const nameIdToHolder = new Map(); // WIPO id_name -> { holderId, nameRowId }
  for (const ip of ips) {
    const id = ip.id_interested_party;
    const ns = namesByIp.get(id) ?? [];
    const main = ns.find((n) => clean(n.ipi_name_nr)) ?? ns[0];
    const kind = /^l/i.test(ip.type) ? "Legal entity" : "Person";
    const first = clean(main?.first_name);
    const last = clean(main?.name);
    const displayName = kind === "Person" ? `${first} ${last}`.trim() : last || first;
    if (!displayName) continue; // nothing to identify them by

    const ids = (identsByIp.get(id) ?? []).map((i) => ({ code: i.code, label: i.label, value: clean(i.value) })).filter((i) => i.value);
    const ipiBase = ids.find(isBase)?.value ?? "";
    const ipiName = clean(main?.ipi_name_nr) || ns.map((n) => clean(n.ipi_name_nr)).find(Boolean) || ids.find(isIpiName)?.value || "";
    const d = Object.fromEntries((dynByIp.get(id) ?? []).map((r) => [r.field_code, clean(r.raw_value)]));

    const holder = {
      id: `rh_${id}`,
      wipoId: id,
      kind,
      displayName,
      firstName: first,
      lastName: last,
      ipiNumber: ipiName,
      ipiBaseNumber: ipiBase,
      identifiers: JSON.stringify(ids),
      nrc: d.ID_REGISTRY_NUMBER ?? "",
      sex: clean(ip.sex),
      birthDate: clean(ip.birth_date).slice(0, 10),
      deathDate: clean(ip.death_date).slice(0, 10),
      status: clean(ip.status),
      isAffiliated: truthy(ip.is_affiliated),
      affiliatedFrom: clean(ip.affiliation_start_date).slice(0, 10),
      region: d.REGION ?? "",
      nextOfKin: d.HEIR_REPRESENTATIVE ?? "",
      spouse: d.SPOUSE ?? "",
      matchedBy: "",
      memberId: null,
      names: ns.map((n) => ({
        id: `rn_${n.id_name}`,
        wipoNameId: n.id_name,
        rightHolderId: `rh_${id}`,
        name: clean(n.name),
        firstName: clean(n.first_name),
        nameType: clean(n.name_type),
        ipiNameNumber: clean(n.ipi_name_nr),
      })),
      addresses: (addrsByIp.get(id) ?? []).map((a, i) => ({
        id: `ra_${id}_${i}`,
        rightHolderId: `rh_${id}`,
        line1: clean(a.line_1),
        line2: clean(a.line_2),
        line3: clean(a.line_3),
        city: clean(a.city),
        province: clean(a.province),
        postcode: clean(a.postcode),
        country: clean(a.fk_country),
        addressType: clean(a.address_type),
      })),
      contacts: (contsByIp.get(id) ?? []).map((c, i) => ({
        id: `rc_${id}_${i}`,
        rightHolderId: `rh_${id}`,
        contactType: clean(c.contact_type),
        value: clean(c.value),
        email: clean(c.email) || (clean(c.value).includes("@") ? clean(c.value) : ""),
        phone: clean(c.phone_number),
        contactName: clean(c.contact_name),
        department: clean(c.department),
      })),
    };
    holders.push(holder);
    for (const n of holder.names) nameIdToHolder.set(n.wipoNameId, { holderId: holder.id, nameRowId: n.id });
  }
  const holderIds = new Set(holders.map((h) => h.id));

  // lookups
  const dynField = new Map(opt(dir, "lk_work_dynamic_field").map((r) => [r.id_work_dynamic_field ?? r.id, r.field_code ?? r.code ?? r.label]));
  const rightType = new Map(opt(dir, "lk_ipi_right_type").map((r) => [r.id_ipi_right_type ?? r.id, r.code ?? r.ui_name ?? r.id_ipi_right_type]));
  const rightTypeLabel = (id) => (id ? (rightType.get(id) ?? id) : "");

  // works
  const works = need(dir, "works").filter((r) => !truthy(r.deleted));
  const titlesByWork = group(opt(dir, "titles"), "fk_work");
  const widentsByWork = group(opt(dir, "work_identifiers"), "fk_work");
  const wdatesByWork = group(opt(dir, "work_dates"), "fk_work");
  const wdynByWork = group(opt(dir, "work_dynamic"), "fk_work");
  const registry = [];
  for (const w of works) {
    const id = w.id_work;
    const ts = titlesByWork.get(id) ?? [];
    const main = ts[0];
    const title = clean(main?.description);
    if (!title) continue;
    const ids = (widentsByWork.get(id) ?? []).map((i) => ({ code: i.code, label: i.label, value: clean(i.value) })).filter((i) => i.value);
    const dynRows = Object.fromEntries((wdynByWork.get(id) ?? []).map((r) => [dynField.get(r.fk_work_dynamic_field) ?? r.fk_work_dynamic_field, clean(r.raw_value)]));
    const { Genre_Wipocos: genre = "", ...extra } = dynRows;
    registry.push({
      id: `rw_${id}`,
      wipoId: id,
      title,
      alternativeTitles: JSON.stringify(uniq(ts.slice(1).map((t) => clean(t.description)).filter((t) => t !== title))),
      status: clean(w.status),
      registeredAt: clean(w.registration_date).slice(0, 10),
      domestic: truthy(w.domestic_work),
      iswc: ids.find((i) => /iswc/i.test(`${i.code} ${i.label}`))?.value ?? "",
      isrc: ids.find((i) => /isrc/i.test(`${i.code} ${i.label}`))?.value ?? "",
      identifiers: JSON.stringify(ids),
      genre,
      dates: JSON.stringify((wdatesByWork.get(id) ?? []).map((d) => ({ code: d.code, value: clean(d.date_value), territory: clean(d.territory) }))),
      extra: JSON.stringify(extra),
      notes: clean(w.notes),
    });
  }
  const workIds = new Set(registry.map((w) => w.id));

  // shares
  const shares = [];
  let sharesNoHolder = 0;
  for (const o of need(dir, "ownership")) {
    const workId = `rw_${o.fk_work}`;
    if (!workIds.has(workId)) continue;
    const link = nameIdToHolder.get(o.id_name);
    if (!link) sharesNoHolder++;
    shares.push({
      workId,
      rightHolderId: link?.holderId ?? null,
      nameId: link?.nameRowId ?? null,
      roleCode: clean(o.role_code),
      isPublisher: truthy(o.is_publisher),
      rightType: rightTypeLabel(o.fk_right_type),
      share: num(o.share_value),
      territoryFormula: clean(o.territory_formula),
      validFrom: clean(o.start_date).slice(0, 10),
      validTo: clean(o.end_date).slice(0, 10),
    });
  }

  // distributions
  const roleCode = new Map(opt(dir, "lk_roles").map((r) => [r.id_role, r.code]));
  const distributions = opt(dir, "distributions").map((d) => ({
    wipoId: d.id_distribution,
    code: clean(d.code),
    name: clean(d.name),
    status: clean(d.status),
    startDate: clean(d.start_date).slice(0, 10),
    endDate: clean(d.end_date).slice(0, 10),
    notes: clean(d.narrative),
  }));
  const lines = [];
  for (const l of opt(dir, "distribution_shares")) {
    const link = nameIdToHolder.get(l.fk_name);
    const workId = `rw_${l.fk_work}`;
    lines.push({
      distWipoId: l.fk_distribution,
      workId: workIds.has(workId) ? workId : null,
      rightHolderId: link?.holderId ?? null,
      roleCode: roleCode.get(l.fk_role) ?? clean(l.fk_role),
      rightType: rightTypeLabel(l.fk_right_type),
      amount: num(l.estimated_amount),
      total: num(l.sum_amount),
      weight: num(l.weight),
      adminFee: num(l.admin_fee_amount),
      reserved: num(l.reserved_amount),
      disputed: truthy(l.dispute),
    });
  }

  return { holders, holderIds, registry, shares, sharesNoHolder, distributions, lines };
}

// ── match to portal members ─────────────────────────────────────────────────
function matchMembers(holders, members) {
  const idx = { ipi: new Map(), nrc: new Map(), email: new Map(), phone: new Map() };
  const put = (m, k, member) => {
    if (!k) return;
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(member);
  };
  for (const m of members) {
    put(idx.ipi, clean(m.ipiNumber), m);
    put(idx.nrc, normNrc(m.nrcOrPassport), m);
    put(idx.email, normEmail(m.email), m);
    put(idx.phone, normPhone(m.phone), m);
  }
  const claimed = new Map(); // member.id -> holder.id
  const stats = { ipi: 0, nrc: 0, email: 0, phone: 0, ambiguous: 0, collisions: 0 };
  for (const h of holders) {
    const tries = [
      ["ipi", [clean(h.ipiNumber)]],
      ["nrc", [normNrc(h.nrc)]],
      ["email", h.contacts.map((c) => normEmail(c.email))],
      ["phone", h.contacts.map((c) => normPhone(c.phone || c.value))],
    ];
    for (const [how, keys] of tries) {
      const hits = uniq(keys.flatMap((k) => (k && idx[how].get(k)) || []).map((m) => m.id));
      if (hits.length === 0) continue;
      if (hits.length > 1) {
        stats.ambiguous++; // two members share the key — don't guess
        continue;
      }
      if (claimed.has(hits[0])) {
        stats.collisions++; // another holder already took this member
        break;
      }
      claimed.set(hits[0], h.id);
      h.memberId = hits[0];
      h.matchedBy = how;
      stats[how]++;
      break;
    }
  }
  return stats;
}

// WIPO value wins when present. Email and phone are never written.
function memberChanges(member, h) {
  const a = h.addresses[0];
  const addr = a ? uniq([a.line1, a.line2, a.line3, a.city]).join(", ") : "";
  const sex = /^m/i.test(h.sex) ? "Male" : /^f/i.test(h.sex) ? "Female" : "";
  const want = {
    ipiNumber: h.ipiNumber,
    ipiBaseNumber: h.ipiBaseNumber,
    wipoId: h.wipoId,
    nrcOrPassport: h.nrc,
    dateOfBirth: h.birthDate,
    gender: sex,
    address: addr,
    province: a?.province ?? "",
    district: h.region,
    nextOfKinName: h.nextOfKin,
  };
  const data = {};
  const conflicts = [];
  for (const [k, v] of Object.entries(want)) {
    if (!v) continue;
    const cur = clean(member[k]);
    if (cur === v) continue;
    data[k] = v;
    if (cur) conflicts.push({ field: k, portal: cur, wipo: v });
  }
  // login identity: report only
  const mails = h.contacts.map((c) => normEmail(c.email)).filter(Boolean);
  if (mails.length && !mails.includes(normEmail(member.email))) conflicts.push({ field: "email (not changed)", portal: member.email, wipo: mails[0] });
  const phones = h.contacts.map((c) => normPhone(c.phone || c.value)).filter((p) => p.length >= 9);
  if (phones.length && !phones.includes(normPhone(member.phone))) conflicts.push({ field: "phone (not changed)", portal: member.phone, wipo: phones[0] });
  return { data, conflicts };
}

// ── main ────────────────────────────────────────────────────────────────────
async function main() {
  loadDotEnv();
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const di = args.indexOf("--dir");
  const dir = di >= 0 ? args[di + 1] : "import-data/export";
  if (!existsSync(dir)) throw new Error(`folder not found: ${dir}`);

  console.log(`${apply ? "APPLY" : "DRY RUN"} — reading ${dir}`);
  const reg = build(dir);
  const { holders, registry, shares, distributions, lines } = reg;
  console.log(`  right-holders ${holders.length}  (names ${holders.reduce((n, h) => n + h.names.length, 0)}, addresses ${holders.reduce((n, h) => n + h.addresses.length, 0)}, contacts ${holders.reduce((n, h) => n + h.contacts.length, 0)})`);
  console.log(`  with IPI number ${holders.filter((h) => h.ipiNumber).length}, with IPI base ${holders.filter((h) => h.ipiBaseNumber).length}, with NRC ${holders.filter((h) => h.nrc).length}`);
  console.log(`  works ${registry.length}  shares ${shares.length} (without a right-holder: ${reg.sharesNoHolder})`);
  console.log(`  distributions ${distributions.length}  lines ${lines.length}`);
  // reduce, not Math.min(...array): spreading 260k values overflows the call stack
  const lo = shares.reduce((a, s) => Math.min(a, s.share), 0);
  const hi = shares.reduce((a, s) => Math.max(a, s.share), 0);
  console.log(`  share values: min ${lo}, max ${hi} (WIPO units kept as they are)`);
  const codes = {};
  for (const h of holders) for (const i of JSON.parse(h.identifiers)) codes[`${i.code}|${i.label}`] = (codes[`${i.code}|${i.label}`] ?? 0) + 1;
  console.log("  identifier types on right-holders:", JSON.stringify(codes));

  const report = { counts: { holders: holders.length, works: registry.length, shares: shares.length, distributions: distributions.length, lines: lines.length }, match: null, conflicts: [] };

  // members (optional in a dry run)
  let prisma = null;
  let members = [];
  if (process.env.DATABASE_URL) {
    const { PrismaClient } = await import("@prisma/client");
    prisma = new PrismaClient();
    members = await prisma.member.findMany();
    report.match = matchMembers(holders, members);
    const matched = holders.filter((h) => h.memberId);
    console.log(`  members in portal ${members.length}; matched ${matched.length} (by ipi ${report.match.ipi}, nrc ${report.match.nrc}, email ${report.match.email}, phone ${report.match.phone}); ambiguous ${report.match.ambiguous}, collisions ${report.match.collisions}`);
    console.log(`  unmatched members ${members.length - matched.length} · right-holders staying as records only ${holders.length - matched.length}`);
    // Name-only candidates for members the hard keys missed. Reported for staff
    // to confirm by hand; never linked automatically, since names coincide.
    const nameKey = (s) => clean(s).toUpperCase().replace(/[^A-Z ]/g, " ").split(/\s+/).filter(Boolean).sort().join(" ");
    const byName = group(holders.map((h) => ({ k: nameKey(h.displayName), id: h.wipoId, taken: !!h.memberId })), "k");
    const matchedIds = new Set(matched.map((h) => h.memberId));
    report.unmatchedMembers = members
      .filter((m) => !matchedIds.has(m.id))
      .map((m) => ({
        memberNumber: m.memberNumber,
        fullName: m.fullName,
        candidates: (byName.get(nameKey(m.fullName)) ?? []).filter((c) => !c.taken).map((c) => c.id),
      }));
    const withCand = report.unmatchedMembers.filter((u) => u.candidates.length).length;
    console.log(`  of the unmatched members, ${withCand} have a same-name right-holder to confirm by hand (see report)`);
  } else {
    console.log("  DATABASE_URL not set — member matching skipped");
  }

  const updates = [];
  for (const h of holders.filter((h) => h.memberId)) {
    const m = members.find((x) => x.id === h.memberId);
    const { data, conflicts } = memberChanges(m, h);
    updates.push({ id: m.id, data });
    if (conflicts.length) report.conflicts.push({ memberNumber: m.memberNumber, matchedBy: h.matchedBy, changes: conflicts });
  }
  console.log(`  member updates ${updates.filter((u) => Object.keys(u.data).length).length}; members with conflicting values ${report.conflicts.length}`);

  mkdirSync("tmp", { recursive: true });
  writeFileSync("tmp/wipo-import-report.json", JSON.stringify(report, null, 2));
  console.log("  report: tmp/wipo-import-report.json (contains personal data — delete when done)");

  if (!apply) {
    console.log("\nDry run only. Nothing was written. Re-run with --apply to import.");
    await prisma?.$disconnect();
    return;
  }
  if (!prisma) throw new Error("--apply needs DATABASE_URL");

  // ── write ────────────────────────────────────────────────────────────────
  const kept = new Map((await prisma.registryWork.findMany({ where: { declarationId: { not: null } }, select: { wipoId: true, declarationId: true } })).map((r) => [r.wipoId, r.declarationId]));

  console.log("\nReplacing previously imported register rows…");
  await prisma.distributionLine.deleteMany();
  await prisma.workShare.deleteMany();
  await prisma.registryWork.deleteMany();
  await prisma.rightHolder.deleteMany(); // cascades names, addresses, contacts

  const strip = ({ names, addresses, contacts, ...h }) => h;
  for (const c of chunks(holders.map(strip), 2000)) await prisma.rightHolder.createMany({ data: c });
  for (const c of chunks(holders.flatMap((h) => h.names), 5000)) await prisma.rightHolderName.createMany({ data: c });
  for (const c of chunks(holders.flatMap((h) => h.addresses), 5000)) await prisma.rightHolderAddress.createMany({ data: c });
  for (const c of chunks(holders.flatMap((h) => h.contacts), 5000)) await prisma.rightHolderContact.createMany({ data: c });
  console.log("  right-holders written");

  for (const c of chunks(registry.map((w) => ({ ...w, declarationId: kept.get(w.wipoId) ?? null })), 2000)) await prisma.registryWork.createMany({ data: c });
  console.log("  works written");
  for (const c of chunks(shares, 5000)) await prisma.workShare.createMany({ data: c });
  console.log("  shares written");

  const distId = new Map();
  for (const d of distributions) {
    const row = await prisma.distribution.upsert({
      where: { wipoId: d.wipoId },
      create: { wipoId: d.wipoId, periodLabel: d.name || d.code || `Run ${d.wipoId}`, status: "Draft", notes: d.notes, code: d.code, startDate: d.startDate, endDate: d.endDate },
      update: { code: d.code, startDate: d.startDate, endDate: d.endDate }, // status and period label stay as staff left them
    });
    distId.set(d.wipoId, row.id);
  }
  const lineRows = lines.filter((l) => distId.has(l.distWipoId)).map(({ distWipoId, ...l }) => ({ ...l, distributionId: distId.get(distWipoId) }));
  for (const c of chunks(lineRows, 5000)) await prisma.distributionLine.createMany({ data: c });
  console.log("  distributions written (new ones are Draft)");

  let n = 0;
  for (const u of updates) {
    if (!Object.keys(u.data).length) continue;
    await prisma.member.update({ where: { id: u.id }, data: u.data });
    n++;
  }
  // RightHolder.memberId was set in memory by the match; write the links
  for (const h of holders.filter((h) => h.memberId)) await prisma.rightHolder.update({ where: { id: h.id }, data: { memberId: h.memberId, matchedBy: h.matchedBy } });
  console.log(`  ${n} members updated, ${holders.filter((h) => h.memberId).length} linked`);

  await prisma.$disconnect();
  console.log("\nDone.");
}

main().catch((e) => {
  console.error(`\nFAILED: ${e.message}`);
  process.exit(1);
});
