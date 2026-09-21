#!/usr/bin/env python3
"""Record the exact geometry of every fill-in rule on the society's forms.

The forms in assets/forms/ are the office's own documents; the portal writes on
them rather than redrawing them.  Each has to know where a value goes, and the
only trustworthy source for that is the PDF itself: every dotted rule is a run
of real '.' glyphs with real coordinates, and every printed label sits at a
measured x.

This dumps both into assets/forms/slots.json so the runtime never has to guess.
An earlier version estimated a label's end from its character count, which put
values on the wrong rule whenever dots and letters shared a line -- the reason
this exists.

Dev-time only, and rarely: run it when a template is re-exported.

    pip install pymupdf && python3 scripts/map-form-slots.py

Slot ids are p<page>.<y>.<x> with page 1-based, matching lib/formOverlay.ts.
They move when a template is re-exported, which is deliberate: the ids in
lib/officialForms/ then stop resolving and `npm run check:forms` says so,
rather than the forms quietly filling in the wrong places.
"""

import json
import os
import sys

import pymupdf

TEMPLATES = ["individual", "group", "publisher", "deed", "admission", "workdecl"]

# Glyphs the forms use to draw a rule someone is meant to write on.
DOT = set(".…·_")

MIN_DOTS = 3  # fewer than this is punctuation, not a rule

# A tick box. The forms draw these two different ways — the membership forms as
# a closed path of four or five line segments, the work declaration as a
# rectangle primitive — and at two quite different sizes: 27x18pt on one,
# 8x5pt on the other. Both are found here, because a mark placed relative to
# the printed word beside a box lands next to the answer rather than in it,
# whichever way that box was drawn.
BOX_MIN_W, BOX_MAX_W = 6, 60
BOX_MIN_H, BOX_MAX_H = 4, 34


def boxes_on(page):
    out = []
    h = page.rect.height
    for d in page.get_drawings():
        r = d["rect"]
        if not (BOX_MIN_W <= r.width <= BOX_MAX_W and BOX_MIN_H <= r.height <= BOX_MAX_H):
            continue
        kinds = [it[0] for it in d["items"]]
        # A rectangle primitive, or four/five segments tracing one.
        if not (kinds == ["re"] or (set(kinds) == {"l"} and len(kinds) in (4, 5))):
            continue
        out.append(
            {
                "k": "box",
                "p": page.number + 1,
                "x": round(r.x0, 1),
                "x1": round(r.x1, 1),
                # The baseline a tick drawn in this box should sit on, and the
                # room it has, so the caller can centre a mark in it.
                "y": round(h - r.y1, 1),
                "y1": round(h - r.y0, 1),
                "s": round(r.height, 1),
            }
        )
    return out


def lines_of(page):
    out = []
    for block in page.get_text("rawdict")["blocks"]:
        if block["type"] != 0:
            continue
        for line in block["lines"]:
            chars = []
            for span in line["spans"]:
                for ch in span["chars"]:
                    chars.append(
                        {
                            "c": ch["c"],
                            "x0": ch["bbox"][0],
                            "x1": ch["bbox"][2],
                            "y": ch["origin"][1],
                            "s": span["size"],
                        }
                    )
            if chars:
                out.append(chars)
    out.sort(key=lambda cs: (-round(cs[0]["y"]), cs[0]["x0"]))
    return out


def rules_in(chars):
    """Index ranges of the maximal dot-leader runs in one line."""
    spans, i = [], 0
    while i < len(chars):
        if chars[i]["c"] in DOT:
            j = i
            while j < len(chars) and (
                chars[j]["c"] in DOT
                or (chars[j]["c"] == " " and j + 1 < len(chars) and chars[j + 1]["c"] in DOT)
            ):
                j += 1
            if sum(1 for k in range(i, j) if chars[k]["c"] in DOT) >= MIN_DOTS:
                spans.append((i, j))
            i = j
        else:
            i += 1
    return spans


def clean(s):
    return " ".join(s.replace("\xa0", " ").split())


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out = {}
    for name in TEMPLATES:
        doc = pymupdf.open(os.path.join(root, "assets", "forms", f"{name}.pdf"))
        anchors, sizes = {}, []
        for pno in range(doc.page_count):
            page = doc[pno]
            h = page.rect.height
            sizes.append([round(page.rect.width, 1), round(h, 1)])

            for chars in lines_of(page):
                text = "".join(c["c"] for c in chars)
                spans = rules_in(chars)

                # Split the line into alternating label / rule pieces so each
                # rule knows the words on either side of it. That context is
                # what `npm run check:forms` asserts against, so a re-export
                # that shifts the page cannot silently redirect a value.
                pieces, prev = [], 0
                for i, j in spans:
                    if i > prev:
                        pieces.append(("t", prev, i))
                    pieces.append(("b", i, j))
                    prev = j
                if prev < len(chars):
                    pieces.append(("t", prev, len(chars)))

                for n, (kind, i, j) in enumerate(pieces):
                    seg = chars[i:j]
                    body = clean("".join(c["c"] for c in seg))
                    if kind == "t" and not body:
                        continue
                    left = next(
                        (clean("".join(c["c"] for c in chars[a:b])) for k, a, b in reversed(pieces[:n]) if k == "t"),
                        "",
                    )
                    right = next(
                        (clean("".join(c["c"] for c in chars[a:b])) for k, a, b in pieces[n + 1 :] if k == "t"),
                        "",
                    )
                    x0, x1, y = seg[0]["x0"], seg[-1]["x1"], round(h - seg[0]["y"], 1)
                    rec = {
                        "k": "blank" if kind == "b" else "text",
                        "p": pno + 1,
                        "x": round(x0, 1),
                        "x1": round(x1, 1),
                        "y": y,
                        "s": round(seg[0]["s"], 1),
                    }
                    if kind == "b":
                        rec["left"], rec["right"] = left, right
                    else:
                        rec["text"] = body
                    anchors[f"p{pno + 1}.{round(y)}.{round(x0)}"] = rec

            for box in boxes_on(page):
                anchors[f"box.p{box['p']}.{round(box['y'])}.{round(box['x'])}"] = box

        out[name] = {"pages": sizes, "anchors": anchors}
        kinds = {}
        for a in out[name]["anchors"].values():
            kinds[a["k"]] = kinds.get(a["k"], 0) + 1
        print(f"{name:11} {doc.page_count} pages  {len(anchors):4} anchors  "
              f"{kinds.get('blank', 0):3} rules  {kinds.get('box', 0):3} boxes")

    dest = os.path.join(root, "assets", "forms", "slots.json")
    with open(dest, "w") as fh:
        json.dump(out, fh, indent=1, sort_keys=True)
        fh.write("\n")
    print("wrote", os.path.relpath(dest, root), os.path.getsize(dest), "bytes")


if __name__ == "__main__":
    sys.exit(main())
