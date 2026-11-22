#!/usr/bin/env python3
"""
Source-faithful extractor for `ITIL Foundation 11-05-26.pdf`.

Rules enforced here (see docs/SOURCE_FIDELITY.md):
  * Words and punctuation are copied exactly as pdfplumber reads them from the PDF.
  * The ONLY normalisation is joining PDF line wraps. Every join is logged in the
    per-occurrence `extractionAudit.joins` trail so it can be verified.
  * A line ending in a hyphen is joined WITHOUT a space and the hyphen is KEPT
    (pdftotext, by contrast, silently deletes such hyphens - so it is only used
    as an independent cross-check, never as the primary text source).
  * Nothing is inferred, corrected, or filled in. Anything unexpected is recorded
    as an anomaly; downstream audit decides whether the record is quarantined.

Outputs (all deterministic, sorted, UTF-8):
  packages/content/source/pages.json        per-page line snapshot with bboxes
  packages/content/data/occurrences.json    all question occurrences, verbatim
  packages/content/reports/extraction-log.json  dropped header/footer lines, anomalies

Usage:  python3 -I tools/extract/extract_bank.py "source/ITIL Foundation 11-05-26.pdf"
"""
from __future__ import annotations

import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parents[2]
CONTENT = ROOT / "packages" / "content"

Q_RE = re.compile(r"^(\d{1,3})(?:\s*([.)])\s*|\s+(?=[A-Z\"“‘'])|(?=[A-Z][a-z])|(?=$))(.*)$")
# A numbered line is accepted as a NEW question only if its printed number is plausible
# relative to the previous accepted question (same number = reused label, or +1..+MAX_JUMP).
# Numbered list lines inside explanations ("1.", "5.") therefore cannot start a question.
MAX_JUMP = 3
OPT_RE = re.compile(r"^([A-D])\s*([.)])\s?(.*)$")
KEY_RE = re.compile(r"^(?:Correct\s+)?Answer\s*:\s*([A-D])\s*$", re.IGNORECASE)
EXPL_RE = re.compile(r"^Explanation\s*:\s*(.*)$", re.IGNORECASE)
EDITORIAL_RE = re.compile(r"^Add\s+answer\s*:", re.IGNORECASE)
REF_RE = re.compile(r"\bRef\.?\s*((?:\d+(?:\.\d+)*)(?:\s*(?:,|and|&)\s*\d+(?:\.\d+)*)*)\s*$")
# A new line inside a stem/explanation that should keep its own line (layout only).
BREAK_BEFORE_RE = re.compile(r"^(?:[•→\-–]\s|\d\.\s|\d\)\s|Option\s+[A-D]\b)")


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def page_lines(pdf) -> list[dict]:
    """Return every page with its text lines and bounding boxes (PDF points, top-left origin)."""
    pages = []
    for pi, page in enumerate(pdf.pages, start=1):
        lines = []
        for li, ln in enumerate(page.extract_text_lines(layout=False, strip=True, return_chars=False)):
            lines.append({
                "i": li,
                "text": ln["text"],
                "bbox": [round(ln["x0"], 1), round(ln["top"], 1), round(ln["x1"], 1), round(ln["bottom"], 1)],
            })
        pages.append({"page": pi, "width": float(page.width), "height": float(page.height), "lines": lines})
    return pages


def is_header(line: dict, idx: int) -> bool:
    return idx == 0 and line["text"].strip() == "QUESTIONS" and line["bbox"][1] < 90


def is_footer(line: dict, idx: int, n: int, page_h: float) -> bool:
    return idx == n - 1 and re.fullmatch(r"\d{1,3}", line["text"].strip() or "x") is not None and line["bbox"][1] > page_h - 90


def join_lines(parts: list[dict], kind: str, audit: list[dict]) -> str:
    """Join wrapped lines. Logs every join. Never alters characters inside a line."""
    out = ""
    for k, p in enumerate(parts):
        t = p["text"].strip()
        if k == 0:
            out = t
            continue
        prev = parts[k - 1]
        if BREAK_BEFORE_RE.match(t):
            sep, how = "\n", "newline_before_list_or_bullet"
        elif out.endswith("-") and not out.endswith(" -") and t[:1].isalnum():
            sep, how = "", "hyphen_wrap_kept_hyphen_no_space"
        else:
            sep, how = " ", "space"
        audit.append({
            "field": kind,
            "join": how,
            "from": {"page": prev["page"], "line": prev["i"]},
            "to": {"page": p["page"], "line": p["i"]},
        })
        out = out + sep + t
    return out


def extract(pdf_path: Path) -> None:
    digest = sha256(pdf_path)
    with pdfplumber.open(str(pdf_path)) as pdf:
        pages = page_lines(pdf)

    log = {"droppedLayoutLines": [], "anomalies": [], "unassignedLines": []}
    stream: list[dict] = []
    for pg in pages:
        n = len(pg["lines"])
        for idx, ln in enumerate(pg["lines"]):
            rec = {"page": pg["page"], "i": ln["i"], "text": ln["text"], "bbox": ln["bbox"]}
            if is_header(ln, idx):
                log["droppedLayoutLines"].append({**rec, "reason": "running_header"})
                continue
            if n == 1 and re.fullmatch(r"\d{1,3}", ln["text"].strip()):
                log["droppedLayoutLines"].append({**rec, "reason": "stray_page_number_on_otherwise_blank_page"})
                continue
            if is_footer(ln, idx, n, pg["height"]):
                log["droppedLayoutLines"].append({**rec, "reason": "page_number_footer"})
                continue
            if not ln["text"].strip():
                continue
            stream.append(rec)

    occurrences: list[dict] = []
    cur: dict | None = None
    state = "seek"
    last_n: int | None = None

    def finish():
        nonlocal cur
        if cur is not None:
            occurrences.append(cur)
        cur = None

    for ln in stream:
        t = ln["text"].strip()
        qm = Q_RE.match(t)
        plausible = qm is not None and (last_n is None or last_n <= int(qm.group(1)) <= last_n + MAX_JUMP)
        if qm and plausible and state in ("seek", "key", "expl"):
            last_n = int(qm.group(1))
            finish()
            cur = {
                "printedQuestionNumber": int(qm.group(1)),
                "numberStyle": qm.group(2) or "none",
                "_stem": [{**ln, "text": qm.group(3)}] if qm.group(3).strip() else [],
                "_opts": {},
                "_optLetters": [],
                "_key": None,
                "_keyLine": None,
                "_expl": None,
                "_explLabelLine": None,
                "_editorial": [],
                "_between": [],
                "_lines": [ln],
            }
            state = "stem"
            continue
        if cur is None:
            log["unassignedLines"].append(ln)
            continue
        cur["_lines"].append(ln)
        km = KEY_RE.match(t)
        if state in ("stem", "options"):
            om = OPT_RE.match(t)
            expected = "ABCD"[len(cur["_optLetters"])] if len(cur["_optLetters"]) < 4 else None
            if om and expected and om.group(1) == expected and (state == "options" or expected == "A"):
                cur["_optLetters"].append(expected)
                cur["_opts"][expected] = {"style": om.group(2), "parts": [{**ln, "text": om.group(3)}]}
                state = "options"
                continue
            if km and state == "options":
                cur["_key"] = km.group(1).upper()
                cur["_keyLine"] = ln
                state = "key"
                continue
            if EDITORIAL_RE.match(t):
                cur["_editorial"].append(ln)
                continue
            if state == "stem":
                cur["_stem"].append(ln)
            else:
                cur["_opts"][cur["_optLetters"][-1]]["parts"].append(ln)
            continue
        if state == "key":
            em = EXPL_RE.match(t)
            if em:
                cur["_expl"] = [{**ln, "text": em.group(1)}] if em.group(1).strip() else []
                cur["_explLabelLine"] = ln
                state = "expl"
                continue
            cur["_between"].append(ln)
            continue
        if state == "expl":
            cur["_expl"].append(ln)
            continue
    finish()

    # Build final records
    out = []
    for ordinal, c in enumerate(occurrences, start=1):
        joins: list[dict] = []
        anomalies: list[dict] = []
        stem = join_lines(c["_stem"], "englishQuestion", joins) if c["_stem"] else ""
        options = []
        for L in "ABCD":
            if L in c["_opts"]:
                options.append({
                    "label": L,
                    "text": join_lines(c["_opts"][L]["parts"], f"option{L}", joins),
                    "labelStyle": c["_opts"][L]["style"],
                })
        expl = None
        if c["_expl"] is not None:
            expl = join_lines(c["_expl"], "sourceExplanation", joins) if c["_expl"] else ""
        ref = None
        if expl:
            m = REF_RE.search(expl)
            if m:
                ref = "Ref " + m.group(1)
        if len(options) != 4:
            anomalies.append({"code": "option_count", "detail": f"{len(options)} options parsed"})
        if c["_key"] is None:
            anomalies.append({"code": "missing_key", "detail": "No answer key line parsed"})
        if not stem:
            anomalies.append({"code": "empty_stem", "detail": "No stem text parsed"})
        if c["_expl"] is None:
            anomalies.append({"code": "no_source_explanation", "detail": "No 'Explanation:' label follows the answer key"})
        elif expl == "":
            anomalies.append({"code": "empty_source_explanation", "detail": "Explanation label present but no text"})
        for e in c["_editorial"]:
            anomalies.append({
                "code": "editorial_artifact",
                "detail": "Line that is neither stem nor option text found inside the question block; preserved separately and NOT inserted into stem/options.",
                "text": e["text"], "page": e["page"], "line": e["i"],
            })
        for b in c["_between"]:
            anomalies.append({
                "code": "unlabelled_text_after_key",
                "detail": "Text between answer key and next question/explanation with no 'Explanation:' label.",
                "text": b["text"], "page": b["page"], "line": b["i"],
            })
        for ln in (c["_expl"] or []) + c["_between"]:
            tt = ln["text"].strip()
            if KEY_RE.match(tt):
                anomalies.append({"code": "possible_swallowed_question",
                                  "detail": "An answer-key line appears after this occurrence's key; a question may have been merged.",
                                  "text": ln["text"], "page": ln["page"], "line": ln["i"]})
            elif OPT_RE.match(tt):
                anomalies.append({"code": "option_shaped_line_in_explanation",
                                  "detail": "Explanation contains a line that starts like an option label (kept verbatim as explanation text).",
                                  "text": ln["text"], "page": ln["page"], "line": ln["i"]})
        lines = c["_lines"]
        pages_spanned = sorted({ln["page"] for ln in lines})
        out.append({
            "questionId": f"itilf5-{digest[:12]}-o{ordinal:03d}",
            "sourceDocument": pdf_path.name,
            "sourceDocumentSha256": digest,
            "sourceOrdinal": ordinal,
            "sourcePage": lines[0]["page"],
            "sourcePagesSpanned": pages_spanned,
            "sourceRegion": [{"page": p, "firstLine": min(l["i"] for l in lines if l["page"] == p),
                               "lastLine": max(l["i"] for l in lines if l["page"] == p),
                               "bbox": [min(l["bbox"][0] for l in lines if l["page"] == p),
                                        min(l["bbox"][1] for l in lines if l["page"] == p),
                                        max(l["bbox"][2] for l in lines if l["page"] == p),
                                        max(l["bbox"][3] for l in lines if l["page"] == p)]}
                              for p in pages_spanned],
            "printedQuestionNumber": c["printedQuestionNumber"],
            "printedNumberStyle": c["numberStyle"],
            "englishQuestion": stem,
            "englishOptions": options,
            "sourceAnswerKey": c["_key"],
            "sourceAnswerKeyLine": c["_keyLine"]["text"] if c["_keyLine"] else None,
            "sourceExplanation": expl if expl else None,
            "sourceReferenceText": ref,
            "editorialArtifacts": [e["text"] for e in c["_editorial"]],
            "extractionAnomalies": anomalies,
            "extractionAudit": {"joins": joins, "lineCount": len(lines)},
        })

    key_lines_in_stream = sum(1 for ln in stream if KEY_RE.match(ln["text"].strip()))
    keyed = sum(1 for o in out if o["sourceAnswerKey"])
    log["answerKeyLineCount"] = key_lines_in_stream
    if key_lines_in_stream != keyed:
        log["anomalies"].append({"code": "key_count_mismatch", "detail": f"{key_lines_in_stream} key lines vs {keyed} keyed occurrences"})

    # Sequence anomalies on printed numbers (informational; never used as keys)
    nums = [o["printedQuestionNumber"] for o in out]
    seen: dict[int, list[int]] = {}
    for o in out:
        seen.setdefault(o["printedQuestionNumber"], []).append(o["sourceOrdinal"])
    reused = {n: v for n, v in seen.items() if len(v) > 1}
    missing = [n for n in range(1, max(nums) + 1) if n not in seen]
    out_of_order = []
    for a, b in zip(out, out[1:]):
        if b["printedQuestionNumber"] != a["printedQuestionNumber"] + 1:
            out_of_order.append({"afterOrdinal": a["sourceOrdinal"], "from": a["printedQuestionNumber"],
                                 "to": b["printedQuestionNumber"], "page": b["sourcePage"]})
    log["printedNumbers"] = {
        "reused": {str(k): v for k, v in sorted(reused.items())},
        "missing": missing,
        "nonSequentialTransitions": out_of_order,
    }

    # Independent cross-check with pdftotext (different text engine).
    try:
        raw = subprocess.run(["pdftotext", "-raw", str(pdf_path), "-"], capture_output=True, text=True, check=True).stdout
        log["pdftotextVersion"] = subprocess.run(["pdftotext", "-v"], capture_output=True, text=True).stderr.splitlines()[0]
    except Exception as exc:  # pragma: no cover
        raw = None
        log["pdftotextVersion"] = f"unavailable: {exc}"
    if raw is not None:
        ptt_pages = raw.split("\f")
        diffs = []
        for pg in pages:
            a = "".join(l["text"] for l in pg["lines"])
            b = ptt_pages[pg["page"] - 1] if pg["page"] - 1 < len(ptt_pages) else ""
            # compare ignoring whitespace and hyphens (pdftotext deletes wrap hyphens)
            na = re.sub(r"[\s\-]", "", a)
            nb = re.sub(r"[\s\-]", "", b)
            if na != nb:
                diffs.append({"page": pg["page"], "plumberChars": len(na), "pdftotextChars": len(nb)})
        log["crossExtractorCheck"] = {
            "method": "Per-page character sequence equality between pdfplumber and pdftotext -raw, ignoring whitespace and hyphens.",
            "pagesCompared": len(pages),
            "pagesDiffering": diffs,
        }

    (CONTENT / "source").mkdir(parents=True, exist_ok=True)
    meta = {"sourceDocument": pdf_path.name, "sourceDocumentSha256": digest, "pageCount": len(pages),
            "extractor": f"pdfplumber {pdfplumber.__version__}"}
    write_json(CONTENT / "source" / "pages.json", {**meta, "pages": pages})
    write_json(CONTENT / "data" / "occurrences.json", {**meta, "occurrenceCount": len(out), "occurrences": out})
    write_json(CONTENT / "reports" / "extraction-log.json", {**meta, **log})
    print(f"sha256={digest} pages={len(pages)} occurrences={len(out)} "
          f"reused={list(reused)} missing={missing} unassigned={len(log['unassignedLines'])} "
          f"crossExtractorDiffPages={[d['page'] for d in log.get('crossExtractorCheck', {}).get('pagesDiffering', [])]}")


def write_json(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


if __name__ == "__main__":
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "source" / "ITIL Foundation 11-05-26.pdf"
    extract(src.resolve())
