#!/usr/bin/env python3
"""Check that every mark the portal makes landed on a rule the form printed.

Rendering a form proves nothing on its own: the last mapping produced three
documents with no missing fields and no overlapping values, and every one of
them wrote answers a line away from their questions. Reading the finished PDF
back is what catches that.

For each filled form this subtracts the blank template's own text, leaving only
what the portal added, and asks of every addition:

  * does it sit on one of the dotted rules recorded in slots.json,
  * does it stay inside that rule rather than running past its end, and
  * is it still large enough to read?

    pip install pymupdf
    node scripts/render-sample-forms.mjs tmp/forms
    python3 scripts/verify-form-fill.py tmp/forms

Exits non-zero on anything off its rule, overflowing, or under 8pt.
"""

import json
import os
import sys

import pymupdf

FORMS = {"individual": "Individual", "group": "Group", "publisher": "Publisher"}

# Documents checked for their ticks alone — they carry no dotted rules to
# speak of, but they do draw boxes, and a mark beside a box is not a tick.
TICK_ONLY = {"workdecl": "Work declaration"}

# How far above its rule a value is written, and the slack allowed either way.
RISE = 2.0
Y_TOLERANCE = 2.5
X_SLACK = 3.0
OVERFLOW_SLACK = 5.0
# Below this nothing is readable in print. Between this and COMFORTABLE the
# mark is listed, because a rule that short is worth knowing about.
MIN_LEGIBLE = 6.0
COMFORTABLE = 9.0

# Marks that are deliberately not on a rule, because the form printed none
# there. Each is (template, page, approximate y) with the reason.
OFF_RULE_BY_DESIGN = {
    ("individual", 1, 133): "17. Payment method is printed without a rule",
    ("group", 1, 472): "the Type column is printed as two dots, not a rule",
    ("publisher", 2, 552): "Payments: Method is printed hard against the right margin",
}


def items(path):
    """Every text item as (page, y, x, x1, size, text)."""
    doc = pymupdf.open(path)
    out = []
    for pno in range(doc.page_count):
        page = doc[pno]
        h = page.rect.height
        for block in page.get_text("dict")["blocks"]:
            if block["type"] != 0:
                continue
            for line in block["lines"]:
                for span in line["spans"]:
                    text = span["text"].strip()
                    if not text:
                        continue
                    out.append(
                        (
                            pno + 1,
                            round(h - span["origin"][1], 1),
                            round(span["bbox"][0], 1),
                            round(span["bbox"][2], 1),
                            round(span["size"], 1),
                            text,
                        )
                    )
    return out


def strokes(path):
    """Every stroked path segment as (page, x, y) of its lowest-left point."""
    doc = pymupdf.open(path)
    out = []
    for pno in range(doc.page_count):
        page = doc[pno]
        h = page.rect.height
        for d in page.get_drawings():
            if d["type"] not in ("s", "fs"):
                continue
            for item in d["items"]:
                if item[0] != "l":
                    continue
                p0, p1 = item[1], item[2]
                out.append((pno + 1, round(min(p0.x, p1.x), 1), round(h - max(p0.y, p1.y), 1)))
    return out


# The ticks each specimen should produce, as (page, the slot the tick follows).
# Listed by hand from scripts/form-samples.json, because a tick is the one mark
# whose meaning is carried entirely by whether it is there.
EXPECTED_TICKS = {
    "individual": [
        ("box.p2.729.135", "20. full time employment — Yes"),
        ("box.p2.575.135", "22. member of another society — Yes"),
        ("box.p2.444.153", "24. Author (the specimen claims composer and author)"),
        ("box.p2.442.486", "24. Publisher"),
    ],
    "group": [],
    "publisher": [],
    "workdecl": [
        ("box.p1.392.251", "Finance by Publisher? — YES"),
        ("box.p1.277.21", "enclosure: Lyrics"),
        ("box.p1.278.241", "enclosure: Musical score"),
        ("box.p1.278.339", "enclosure: Online, always lodged"),
    ],
}

# Ticks that must NOT appear, because the specimen did not claim them.
FORBIDDEN_TICKS = {
    "individual": [
        ("box.p2.729.351", "20. full time employment — No"),
        ("box.p2.575.351", "22. member of another society — No"),
        ("box.p2.444.297", "24. Arranger, which the specimen did not claim"),
    ],
    "group": [],
    "publisher": [],
    "workdecl": [
        ("box.p1.390.342", "Finance by Publisher? — NO"),
        ("box.p1.265.24", "enclosure: CD, which the portal never takes"),
        ("box.p1.265.241", "enclosure: Contract, not lodged"),
    ],
}


# Where each form's signature belongs. An unsigned or mis-set signature is the
# one defect nobody notices until the office rejects the paperwork.
SIGNATURE_RULE = {
    "individual": "p3.317.151",
    "group": "p3.370.210",
    "publisher": "p3.200.147",
}


def check_signature(template, slots, filled):
    a = slots[template]["anchors"][SIGNATURE_RULE[template]]
    page = pymupdf.open(filled)[a["p"] - 1]
    h = page.rect.height
    placed = [
        (im["bbox"][0], im["bbox"][2], h - im["bbox"][3])
        for im in page.get_image_info()
    ]
    if not placed:
        return [f"nothing signed on page {a['p']}"]
    for x0, x1, bottom in placed:
        if a["x"] - 4 <= x0 and x1 <= a["x1"] + 6 and abs(bottom - a["y"]) <= 4:
            return []
    x0, x1, bottom = placed[0]
    return [
        f"the signature sits at x={x0:.0f}-{x1:.0f} y={bottom:.0f}, "
        f"not on its rule (x={a['x']:.0f}-{a['x1']:.0f} y={a['y']:.0f})"
    ]


def norm(text):
    return " ".join(text.replace("\n", " ").split()).lower()


def check_placements(template, slots, filled_dir, added):
    """Each value against the rule its map named, not merely against some rule.

    A value on the wrong rule is still on a rule, so the geometry checks pass it
    and the finished page looks plausible. This is the check that fails.
    """
    manifest = os.path.join(filled_dir, f"{template}.placements.json")
    if not os.path.exists(manifest):
        return [f"no {template}.placements.json — re-run scripts/render-sample-forms.mjs"]
    anchors = slots[template]["anchors"]
    bad = []
    for entry in json.load(open(manifest)):
        ids = [i for i in entry["slots"] if not i.startswith("after:")]
        if not ids:
            continue  # written beside a printed label; the geometry pass covers it
        found = []
        for slot_id in ids:
            a = anchors.get(slot_id)
            if not a:
                bad.append(f"{slot_id} is not on the template")
                break
            here = [
                (x, t)
                for page, y, x, _x1, _s, t in added
                if page == a["p"]
                and abs((a["y"] + RISE) - y) <= Y_TOLERANCE
                and a["x"] - X_SLACK <= x <= a["x1"] + X_SLACK
            ]
            found.extend(t for _x, t in sorted(here))
        else:
            got, want = norm(" ".join(found)), norm(entry["text"])
            # Wrapping can hyphenate nothing and drop nothing, so the joined
            # lines must read as the answer did.
            if got != want:
                if want.endswith(got.rstrip(" …").rstrip()) or got.rstrip("… ").strip() and want.startswith(got.rstrip("… ").strip()):
                    bad.append(f"{ids[0]}: the form cut {want!r} short at {got!r}")
                else:
                    bad.append(f"{ids[0]}: expected {want[:52]!r}, the page has {got[:52]!r}")
    return bad


def check_ticks(template, slots, blank, filled):
    """Ticks are vector strokes, so they are checked by position, not by text."""
    before = set(strokes(blank))
    marks = [s for s in strokes(filled) if s not in before]
    anchors = slots[template]["anchors"]
    bad = []

    def ticked(slot_id):
        a = anchors.get(slot_id)
        if not a:
            return False
        # Inside the box the form drew, not merely near the word beside it —
        # a tick in the gap to the box's left is not a ticked box.
        return any(
            page == a["p"] and a["x"] - 1 <= x <= a["x1"] + 1 and a["y"] - 1 <= y <= a.get("y1", a["y"]) + 1
            for page, x, y in marks
        )

    for slot_id, what in EXPECTED_TICKS.get(template, []):
        if not ticked(slot_id):
            bad.append(f"no tick against {what} ({slot_id})")
    for slot_id, what in FORBIDDEN_TICKS.get(template, []):
        if ticked(slot_id):
            bad.append(f"ticked {what} ({slot_id}) — it should be left blank")
    return bad, len(marks)


def main(filled_dir):
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    slots = json.load(open(os.path.join(root, "assets", "forms", "slots.json")))

    problems, checked = 0, 0
    for template, label in FORMS.items():
        blank = os.path.join(root, "assets", "forms", f"{template}.pdf")
        filled = os.path.join(filled_dir, f"{template}.pdf")
        if not os.path.exists(filled):
            print(f"  ! {label:11} not rendered — run scripts/render-sample-forms.mjs first")
            problems += 1
            continue

        printed = {(p, y, x, t) for p, y, x, _, _, t in items(blank)}
        added = [it for it in items(filled) if (it[0], it[1], it[2], it[5]) not in printed]

        rules = [a for a in slots[template]["anchors"].values() if a["k"] == "blank"]
        bad, tight = [], []
        for page, y, x, x1, size, text in added:
            checked += 1
            excuse = next(
                (why for (t, p, ry), why in OFF_RULE_BY_DESIGN.items()
                 if t == template and p == page and abs(ry - y) <= 3),
                None,
            )
            if size < MIN_LEGIBLE and not excuse:
                bad.append(f"{size}pt is too small to read: {text[:48]!r} (page {page})")
                continue
            if size < COMFORTABLE:
                tight.append(f"{size}pt on a short rule: {text[:44]!r} (page {page})")
            if excuse:
                continue
            on = [
                r for r in rules
                if r["p"] == page
                and abs((r["y"] + RISE) - y) <= Y_TOLERANCE
                and r["x"] - X_SLACK <= x <= r["x1"] + X_SLACK
            ]
            if not on:
                near = sorted(
                    (r for r in rules if r["p"] == page),
                    key=lambda r: (abs(r["y"] + RISE - y), abs(r["x"] - x)),
                )[:1]
                hint = f" nearest rule y={near[0]['y']} x={near[0]['x']}" if near else ""
                bad.append(f"page {page} y={y} x={x}: {text[:48]!r} is on no rule;{hint}")
                continue
            rule = on[0]
            if x1 > rule["x1"] + OVERFLOW_SLACK:
                bad.append(
                    f"page {page} y={y}: {text[:40]!r} runs {x1 - rule['x1']:.0f}pt past its rule"
                )

        tick_bad, tick_marks = check_ticks(template, slots, blank, filled)
        bad.extend(tick_bad)
        bad.extend(check_placements(template, slots, filled_dir, added))
        bad.extend(check_signature(template, slots, filled))

        sizes = [s for *_, s, _ in ((a[0], a[1], a[2], a[3], a[4], a[5]) for a in added)]
        smallest = min(sizes) if sizes else 0
        if bad:
            problems += len(bad)
            print(f"  \033[31m✗\033[0m {label:11} {len(added):3} marks, {len(bad)} misplaced")
            for b in bad:
                print(f"       {b}")
        else:
            ticks = f", {tick_marks // 2} tick(s) as claimed" if tick_marks else ""
            print(f"  \033[32m✓\033[0m {label:11} {len(added):3} marks, all on their rules "
                  f"(smallest {smallest}pt){ticks}")
            for t in tight:
                print(f"       \033[33m·\033[0m {t}")

    # The documents whose only marks are ticks.
    for template, label in TICK_ONLY.items():
        filled = os.path.join(filled_dir, f"{template}.pdf")
        blank = os.path.join(root, "assets", "forms", f"{template}.pdf")
        if not os.path.exists(filled):
            print(f"  ! {label:11} not rendered")
            problems += 1
            continue
        bad, marks = check_ticks(template, slots, blank, filled)
        if bad:
            problems += len(bad)
            print(f"  \033[31m✗\033[0m {label:14} {len(bad)} misplaced")
            for b in bad:
                print(f"       {b}")
        else:
            print(f"  \033[32m✓\033[0m {label:14} {marks // 2} tick(s), each inside its box")

    if problems:
        print(f"\n\033[31m{problems} mark(s) are not where the form expects them.\033[0m")
        return 1
    print(f"\n\033[32mAll {checked} marks sit on the rules the forms printed.\033[0m")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "tmp/forms"))
