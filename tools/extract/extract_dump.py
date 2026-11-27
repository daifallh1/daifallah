#!/usr/bin/env python3
"""
Extract the owner-supplied second source "ITIL5_Exam_Dump_Questions_26-10_1.pdf" (77 questions,
correct option printed in green) into packages/content/data/dump-occurrences.json.

Usage:  python3 -I tools/extract/extract_dump.py /path/to/ITIL5_Exam_Dump_Questions_26-10_1.pdf

The PDF itself is NOT committed (course material). Text is copied verbatim, lines of one
paragraph are joined with a single space (wrap joins are logged). The answer key is the option
whose characters are drawn in the green colour RGB(0.129, 0.42, 0.208); every question must have
exactly one green option or the script aborts.
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "packages" / "content" / "data" / "dump-occurrences.json"
GREEN = (0.129, 0.42, 0.208)
EXPECTED_SHA = "92e44064df1872b074c1b56786afeb76a5c85e8f08fbb33718708f0e07d5a324"


def is_green(c) -> bool:
    return isinstance(c, (list, tuple)) and len(c) == 3 and all(abs(a - b) < 0.02 for a, b in zip(c, GREEN))


def main(path: str) -> int:
    raw = Path(path).read_bytes()
    sha = hashlib.sha256(raw).hexdigest()
    if sha != EXPECTED_SHA:
        raise SystemExit(f"Unexpected PDF (sha256 {sha}); expected {EXPECTED_SHA}")
    pdf = pdfplumber.open(path)
    qs: list[dict] = []
    cur = None
    part = None  # "stem" or option label
    joins = []
    for pno, page in enumerate(pdf.pages, start=1):
        for line in page.extract_text_lines(return_chars=True):
            text = line["text"].strip()
            if not text:
                continue
            chars = [c for c in line["chars"] if c["text"].strip()]
            green = sum(is_green(c.get("non_stroking_color")) for c in chars) / max(1, len(chars))
            m = re.fullmatch(r"Question\s+(\d+)", text)
            if m:
                cur = {"n": int(m.group(1)), "page": pno, "pages": {pno}, "stem": [], "opts": {}, "green": [],
                       "bbox": [line["x0"], line["top"], line["x1"], line["bottom"]]}
                qs.append(cur)
                part = "stem"
                continue
            if cur is None:
                continue  # title block
            cur["pages"].add(pno)
            if pno == cur["page"]:
                b = cur["bbox"]
                cur["bbox"] = [min(b[0], line["x0"]), b[1], max(b[2], line["x1"]), max(b[3], line["bottom"])]
            om = re.match(r"^([A-D])\.\s+(.*)$", text)
            if om and (part == "stem" or (part in "ABCD" and om.group(1) > part)):
                part = om.group(1)
                cur["opts"][part] = [om.group(2)]
                if green > 0.6:
                    cur["green"].append(part)
                continue
            if part == "stem":
                cur["stem"].append(text)
            else:
                joins.append({"question": cur["n"], "option": part, "continuation": text})
                cur["opts"][part].append(text)
    out = []
    for q in qs:
        if sorted(q["opts"]) != list("ABCD"):
            raise SystemExit(f"Question {q['n']}: options {sorted(q['opts'])}")
        if len(q["green"]) != 1:
            raise SystemExit(f"Question {q['n']}: green options {q['green']}")
        out.append({
            "dumpNumber": q["n"],
            "sourcePage": q["page"],
            "sourcePagesSpanned": sorted(q["pages"]),
            "bbox": [round(x, 2) for x in q["bbox"]],
            "englishQuestion": " ".join(q["stem"]),
            "englishOptions": [{"label": L, "text": " ".join(q["opts"][L])} for L in "ABCD"],
            "sourceAnswerKey": q["green"][0],
            "answerKeyMethod": "green text colour RGB(0.129, 0.42, 0.208)",
        })
    if [q["dumpNumber"] for q in out] != list(range(1, len(out) + 1)):
        raise SystemExit("question numbers are not 1..N")
    doc = {
        "sourceDocument": "ITIL5_Exam_Dump_Questions_26-10_1.pdf",
        "sourceDocumentSha256": sha,
        "pageCount": len(pdf.pages),
        "extractor": f"pdfplumber {pdfplumber.__version__}",
        "questionCount": len(out),
        "explanations": "none in source",
        "wrapJoins": joins,
        "questions": out,
    }
    OUT.write_text(json.dumps(doc, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(json.dumps({"questions": len(out), "wrapJoins": len(joins), "out": str(OUT.relative_to(ROOT))}))
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    sys.exit(main(sys.argv[1]))
