#!/usr/bin/env python3
"""Put the society's current e-mail address on the forms' letterheads.

The three application forms were printed when the society was reachable at
zamnet, and that mailbox no longer receives anything. Every form the portal
issues carries the letterhead, so an applicant writing back writes into a void.

Painting over it at render time was not enough. Whited-out text stays in the
PDF's text layer, where a search, a copy-paste or an automated reader still
finds it — the same failure that once left a previous member's name inside
documents issued to everybody else. So the address is redacted out of the
template and the current one drawn in its place.

    pip install pymupdf && python3 scripts/fix-form-letterhead.py

Safe to re-run: a template that already carries the new address is left alone.
Re-run scripts/map-form-slots.py afterwards, because redaction moves nothing but
the text this replaces.
"""

import os
import shutil
import sys
import tempfile

import pymupdf

OLD = "zamcops@zamnet.zm"
NEW = "zamcops1@gmail.com"
TEMPLATES = ["individual", "group", "publisher", "deed", "admission", "workdecl"]


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    changed = 0
    for name in TEMPLATES:
        path = os.path.join(root, "assets", "forms", f"{name}.pdf")
        doc = pymupdf.open(path)
        hits = 0
        for page in doc:
            boxes = page.search_for(OLD)
            if not boxes:
                continue
            # The baseline of the words being replaced, so the new address sits
            # on the same line as the rest of the letterhead rather than near it.
            baselines = [
                (span["origin"][0], span["origin"][1], span["size"])
                for block in page.get_text("dict")["blocks"]
                if block["type"] == 0
                for line in block["lines"]
                for span in line["spans"]
                if OLD in span["text"]
            ]
            for box in boxes:
                page.add_redact_annot(box)
                hits += 1
            # Erase first, then write: redaction removes the text outright,
            # which is the whole point of doing this to the template rather than
            # painting over it on the way out.
            page.apply_redactions()
            for box in boxes:
                # As large as fits the space the old address occupied, since the
                # words after it on the line cannot move.
                size = 11.0
                while size > 6.0 and pymupdf.get_text_length(NEW, "helv", size) > box.width:
                    size -= 0.25
                y = next((b[1] for b in baselines if abs(b[0] - box.x0) < 2), box.y1 - 2)
                page.insert_text((box.x0, y), NEW, fontname="helv", fontsize=size)

        if hits:
            # PyMuPDF will not rewrite a file it still has open, so the cleaned
            # copy is written beside it and moved into place.
            tmp = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False).name
            doc.save(tmp, garbage=3, deflate=True)
            doc.close()
            shutil.move(tmp, path)
            changed += 1
            print(f"  {name:11} {hits} letterhead address replaced")
        else:
            print(f"  {name:11} nothing to change")
            doc.close()

    print(f"\n{changed} template(s) updated. Re-run `npm run map:forms`, then `npm run check:forms`.")


if __name__ == "__main__":
    sys.exit(main())
