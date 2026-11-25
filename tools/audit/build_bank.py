#!/usr/bin/env python3
"""
Build the immutable question bank + Import Audit Report.

Inputs (never modified):
  packages/content/data/occurrences.json     verbatim extraction (tools/extract/extract_bank.py)
  packages/content/data/classification.json  auditor-curated metadata (criterion, confidence, overrides)
  packages/content/syllabus/itil5-foundation-syllabus-v5.0.json
  packages/content/translations/ar/*.json    Arabic overlay (keyed by hash of exact English text)

Outputs:
  packages/content/build/bank.json           consumed by both apps (via packages/core)
  packages/content/build/translations.ar.json
  packages/content/reports/import-audit.json machine-readable audit
  packages/content/reports/import-audit.md   human-readable summary
  packages/content/reports/translation-coverage.json

The English text, option order and answer key are copied byte-for-byte from occurrences.json.
Metadata produced here is clearly namespaced under `audit`.
"""
from __future__ import annotations

import difflib
import hashlib
import json
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONTENT = ROOT / "packages" / "content"

LEGACY_PATTERNS = [
    (r"\bservice value system\b", "ITIL 4 term 'service value system' (v5: ITIL Value System)"),
    (r"\bservice value chain\b", "ITIL 4 term 'service value chain'"),
    (r"\bdimensions? of service management\b", "ITIL 4 term 'dimensions of service management' (v5: product and service management)"),
    (r"\bdeliver and support\b", "ITIL 4 value chain activity 'Deliver and support'"),
    (r"\bdesign and transition\b", "ITIL 4 value chain activity 'Design and transition'"),
    (r"\bobtain/build\b", "ITIL 4 value chain activity 'Obtain/build'"),
    (r"\bITIL 4\b", "Explicit ITIL 4 reference"),
]
SPELLING_WATCH = ["eficien", "suficien", "Oficial", "dificult"]


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKC", s).lower()
    s = s.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    s = re.sub(r"[^a-z0-9 ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def h16(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()[:16]


def text_key(s: str) -> str:
    """Translation key: hash of the EXACT English string (no normalisation)."""
    return "t" + hashlib.sha256(s.encode("utf-8")).hexdigest()[:20]


def detect_style(stem: str, options: list[dict]) -> str:
    if "[ ? ]" in stem or re.search(r"missing word", stem, re.I):
        return "missing_words"
    if re.search(r"(^|\n)1[.)]\s", stem) and all(re.fullmatch(r"\d\s+and\s+\d", o["text"].strip()) for o in options):
        return "list"
    if re.match(r"^Which\b[^?]*\b(NOT|INCORRECT|EXCEPT|FALSE)\b", stem):
        return "negative"
    return "standard"


class UF:
    def __init__(self, n):
        self.p = list(range(n))

    def f(self, x):
        while self.p[x] != x:
            self.p[x] = self.p[self.p[x]]
            x = self.p[x]
        return x

    def u(self, a, b):
        a, b = self.f(a), self.f(b)
        if a != b:
            self.p[max(a, b)] = min(a, b)


def load_translations() -> dict:
    out = {}
    tdir = CONTENT / "translations" / "ar"
    if tdir.exists():
        for f in sorted(tdir.glob("*.json")):
            data = json.loads(f.read_text(encoding="utf-8"))
            for k, v in data.items():
                if k in out and out[k]["ar"] != v["ar"]:
                    raise SystemExit(f"Conflicting translation for {k} in {f.name}")
                out[k] = {**v, "file": f.name}
    return out


def main() -> int:
    occ_doc = json.loads((CONTENT / "data" / "occurrences.json").read_text(encoding="utf-8"))
    occ = occ_doc["occurrences"]
    cls = json.loads((CONTENT / "data" / "classification.json").read_text(encoding="utf-8"))
    syl = json.loads((CONTENT / "syllabus" / "itil5-foundation-syllabus-v5.0.json").read_text(encoding="utf-8"))
    crit = {c["id"]: c for c in syl["criteria"]}
    log = json.loads((CONTENT / "reports" / "extraction-log.json").read_text(encoding="utf-8"))
    tr = load_translations()

    assert len(occ) == len(cls), "classification must cover every occurrence"
    n = len(occ)

    # ---------- duplicate analysis ----------
    stem_groups: dict[str, list[int]] = defaultdict(list)
    for i, o in enumerate(occ):
        stem_groups[norm(o["englishQuestion"])].append(i)
    dup_detail = []
    auto_flags: dict[int, list[dict]] = defaultdict(list)
    for key, idxs in stem_groups.items():
        if len(idxs) < 2:
            continue
        base = occ[idxs[0]]

        def correct_text(o):
            return norm(next(x["text"] for x in o["englishOptions"] if x["label"] == o["sourceAnswerKey"]))

        members = []
        for i in idxs:
            o = occ[i]
            so = [norm(x["text"]) for x in o["englishOptions"]]
            sb = [norm(x["text"]) for x in base["englishOptions"]]
            if i == idxs[0]:
                rel = "reference"
            elif so == sb and correct_text(o) == correct_text(base) and o["sourceAnswerKey"] == base["sourceAnswerKey"]:
                rel = "identical"
            elif sorted(so) == sorted(sb):
                rel = "reordered_options_same_semantic_key" if correct_text(o) == correct_text(base) else "KEY_CONFLICT"
            else:
                rel = "different_options_same_correct_text" if correct_text(o) == correct_text(base) else "different_options_different_correct_text"
            members.append({"questionId": o["questionId"], "sourceOrdinal": o["sourceOrdinal"], "page": o["sourcePage"],
                            "printedQuestionNumber": o["printedQuestionNumber"], "sourceAnswerKey": o["sourceAnswerKey"],
                            "relationToReference": rel})
        if any(m["relationToReference"] == "KEY_CONFLICT" for m in members):
            for i in idxs:
                auto_flags[i].append({"code": "duplicate_key_conflict", "severity": "blocking"})
        dup_detail.append({"duplicateGroupId": "dg-" + h16(key), "normalizedStem": key, "size": len(idxs), "members": members})

    # near-duplicate clusters (exam exclusion only)
    uf = UF(n)
    for idxs in stem_groups.values():
        for i in idxs[1:]:
            uf.u(idxs[0], i)
    near_pairs = []
    normed = [norm(o["englishQuestion"]) for o in occ]
    correct_norm = [norm(next(x["text"] for x in o["englishOptions"] if x["label"] == o["sourceAnswerKey"])) for o in occ]
    for i in range(n):
        for j in range(i + 1, n):
            if normed[i] == normed[j]:
                continue
            r = difflib.SequenceMatcher(None, normed[i], normed[j]).ratio()
            if r >= 0.85 and difflib.SequenceMatcher(None, correct_norm[i], correct_norm[j]).ratio() >= 0.9:
                uf.u(i, j)
                near_pairs.append({"a": occ[i]["questionId"], "b": occ[j]["questionId"], "ratio": round(r, 3),
                                   "aPage": occ[i]["sourcePage"], "bPage": occ[j]["sourcePage"],
                                   "aStem": occ[i]["englishQuestion"][:120], "bStem": occ[j]["englishQuestion"][:120]})

    # ---------- per-occurrence audit ----------
    questions = []
    for i, o in enumerate(occ):
        c = cls[str(o["sourceOrdinal"])]
        reasons: list[dict] = []
        opts = o["englishOptions"]
        # extraction anomalies
        for a in o["extractionAnomalies"]:
            if a["code"] in ("option_count", "missing_key", "empty_stem"):
                reasons.append({"code": a["code"], "severity": "incomplete", "detail": a["detail"]})
            elif a["code"] == "editorial_artifact":
                reasons.append({"code": "editorial_artifact", "severity": "blocking", "detail": a["text"]})
            elif a["code"] == "possible_swallowed_question":
                reasons.append({"code": a["code"], "severity": "blocking", "detail": a["text"]})
            elif a["code"] == "no_source_explanation":
                reasons.append({"code": "no_source_explanation", "severity": "info", "detail": "The PDF has no explanation for this occurrence."})
            elif a["code"] == "option_shaped_line_in_explanation":
                reasons.append({"code": a["code"], "severity": "info", "detail": a["text"]})
        # duplicate option text
        texts = [norm(x["text"]) for x in opts]
        if len(set(texts)) != len(texts):
            auto_flags[i].append({"code": "duplicate_option_text", "severity": "blocking"})
        for f in auto_flags[i]:
            reasons.append({**f, "detail": "Detected automatically by build_bank.py"})
        # legacy terminology
        blob = o["englishQuestion"] + "\n" + "\n".join(x["text"] for x in opts)
        keyed = next((x["text"] for x in opts if x["label"] == o["sourceAnswerKey"]), "")
        for pat, why in LEGACY_PATTERNS:
            if re.search(pat, o["englishQuestion"] + "\n" + keyed, re.I):
                reasons.append({"code": "legacy_itil4_terminology", "severity": "blocking", "detail": why + " (in stem or keyed option)"})
            elif re.search(pat, blob, re.I):
                reasons.append({"code": "legacy_itil4_terminology_in_distractor", "severity": "warning",
                                "detail": why + " (only in an incorrect option; not blocking)"})
        # spelling preserved
        full = blob + "\n" + (o["sourceExplanation"] or "")
        for w in SPELLING_WATCH:
            if w in full:
                reasons.append({"code": "source_spelling_preserved", "severity": "info",
                                "detail": f"Source spelling containing '{w}' kept verbatim (visible on rendered page)."})
        # explanation names a different correct letter?
        if o["sourceExplanation"]:
            m = re.search(r"(?:correct answer|answer) is\s*\(?([A-D])\b|Option\s+([A-D])\s+is\s+correct", o["sourceExplanation"])
            if m:
                letter = m.group(1) or m.group(2)
                if letter != o["sourceAnswerKey"]:
                    reasons.append({"code": "explanation_key_mismatch", "severity": "blocking",
                                    "detail": f"Explanation names {letter}; source key is {o['sourceAnswerKey']}"})
            for mm in re.finditer(r"(?:^|\n)([A-D])\.\s+Incorrect", o["sourceExplanation"]):
                if mm.group(1) == o["sourceAnswerKey"]:
                    reasons.append({"code": "explanation_key_mismatch", "severity": "blocking",
                                    "detail": f"Explanation calls the keyed option {mm.group(1)} incorrect"})
        # curated overrides
        if c["statusOverride"]:
            reasons.append({"code": c["reasonCode"], "severity": "out_of_scope" if c["statusOverride"] == "out_of_scope" else "blocking",
                            "detail": c["note"]})
        if not c["criterion"] and not c["statusOverride"]:
            reasons.append({"code": "unclassified", "severity": "blocking", "detail": "No syllabus criterion assigned"})

        sev = {r["severity"] for r in reasons}
        if "incomplete" in sev:
            status = "incomplete"
        elif "out_of_scope" in sev:
            status = "out_of_scope"
        elif "blocking" in sev:
            status = "needs_review"
        else:
            status = "approved"
        # de-duplicate reasons
        seen = set()
        reasons = [r for r in reasons if not ((r["code"], r["detail"]) in seen or seen.add((r["code"], r["detail"])))]

        cr = crit.get(c["criterion"]) if c["criterion"] else None
        bloom = c["bloomOverride"] or (cr["bl"] if cr else None)
        stem_key = norm(o["englishQuestion"])
        q = {
            "questionId": o["questionId"],
            "sourceDocument": o["sourceDocument"],
            "sourceDocumentSha256": o["sourceDocumentSha256"],
            "sourcePage": o["sourcePage"],
            "sourcePagesSpanned": o["sourcePagesSpanned"],
            "sourceRegion": o["sourceRegion"],
            "sourceOrdinal": o["sourceOrdinal"],
            "printedQuestionNumber": o["printedQuestionNumber"],
            "englishQuestion": o["englishQuestion"],
            "englishOptions": [{"label": x["label"], "text": x["text"]} for x in opts],
            "sourceAnswerKey": o["sourceAnswerKey"],
            "sourceExplanation": o["sourceExplanation"],
            "sourceReferenceText": o["sourceReferenceText"],
            "editorialArtifacts": o["editorialArtifacts"],
            "i18n": {
                "question": text_key(o["englishQuestion"]),
                "options": {x["label"]: text_key(x["text"]) for x in opts},
                "explanation": text_key(o["sourceExplanation"]) if o["sourceExplanation"] else None,
            },
            "audit": {
                "derived": True,
                "questionStyle": detect_style(o["englishQuestion"], opts),
                "syllabusCategory": cr["category"] if cr else None,
                "syllabusCriterion": c["criterion"],
                "syllabusTopic": cr["topic"] if cr else None,
                "bloomLevel": bloom,
                "bloomSource": "override" if c["bloomOverride"] else ("criterion" if cr else None),
                "confidence": c["confidence"],
                "classificationNote": c["note"] or None,
                "contentStatus": status,
                "reviewReasons": reasons,
                "duplicateGroupId": "dg-" + h16(stem_key),
                "duplicateGroupSize": len(stem_groups[stem_key]),
                "exclusionGroupId": None,  # filled below
                "stemFingerprint": h16(stem_key),
            },
        }
        questions.append(q)

    roots = defaultdict(list)
    for i in range(n):
        roots[uf.f(i)].append(i)
    for r, idxs in roots.items():
        gid = "xg-" + h16(",".join(questions[i]["questionId"] for i in sorted(idxs)))
        for i in idxs:
            questions[i]["audit"]["exclusionGroupId"] = gid
            questions[i]["audit"]["exclusionGroupSize"] = len(idxs)

    # ---------- translations ----------
    needed: dict[str, dict] = {}
    for q in questions:
        refs = [("question", q["englishQuestion"], q["i18n"]["question"])]
        refs += [(f"option{x['label']}", x["text"], q["i18n"]["options"][x["label"]]) for x in q["englishOptions"]]
        if q["sourceExplanation"]:
            refs.append(("explanation", q["sourceExplanation"], q["i18n"]["explanation"]))
        for field, en, key in refs:
            needed.setdefault(key, {"en": en, "fields": set(), "statuses": set()})
            needed[key]["fields"].add(field)
            needed[key]["statuses"].add(q["audit"]["contentStatus"])
    bad_links = []
    out_tr = {}
    for key, v in needed.items():
        t = tr.get(key)
        if t is None:
            continue
        if t["en"] != v["en"]:
            bad_links.append({"key": key, "reason": "English text in translation file does not match bank text"})
            continue
        out_tr[key] = {"en": v["en"], "ar": t["ar"]}
    ui = {}
    ui_file = CONTENT / "translations" / "ui.ar.json"
    if ui_file.exists():
        ui = json.loads(ui_file.read_text(encoding="utf-8"))

    per_field = defaultdict(lambda: {"required": 0, "translated": 0})
    for q in questions:
        if q["audit"]["contentStatus"] != "approved":
            continue
        pairs = [("question", q["i18n"]["question"])] + [(f"option", q["i18n"]["options"][L]) for L in "ABCD"]
        if q["i18n"]["explanation"]:
            pairs.append(("explanation", q["i18n"]["explanation"]))
        complete = True
        for f, k in pairs:
            per_field[f]["required"] += 1
            if k in out_tr:
                per_field[f]["translated"] += 1
            else:
                complete = False
        q["audit"]["translationComplete"] = complete
    for q in questions:
        if q["audit"]["contentStatus"] != "approved":
            keys = [q["i18n"]["question"], *q["i18n"]["options"].values()] + ([q["i18n"]["explanation"]] if q["i18n"]["explanation"] else [])
            q["audit"]["translationComplete"] = all(k in out_tr for k in keys)
        q["audit"]["examEligible"] = (q["audit"]["contentStatus"] == "approved" and q["audit"]["syllabusCategory"] is not None
                                      and q["audit"]["bloomLevel"] in (1, 2) and q["audit"]["translationComplete"])

    # ---------- blueprint feasibility ----------
    cats = {c["id"]: c["questions"] for c in syl["categories"]}
    avail = defaultdict(lambda: defaultdict(set))
    for q in questions:
        if q["audit"]["examEligible"]:
            avail[q["audit"]["syllabusCategory"]][q["audit"]["bloomLevel"]].add(q["audit"]["exclusionGroupId"])
    cell = {c: {b: len(avail[c][b]) for b in (1, 2)} for c in cats}
    # exclusion groups could appear in both bloom cells; count unique per category too
    per_cat_unique = {c: len(avail[c][1] | avail[c][2]) for c in cats}
    bl1_target = syl["examSpec"]["bloomCounts"]["1"]
    lo = sum(max(0, cats[c] - cell[c][2]) for c in cats)
    hi = sum(min(cats[c], cell[c][1]) for c in cats)
    cat_ok = all(per_cat_unique[c] >= cats[c] for c in cats)
    feasible = cat_ok and lo <= bl1_target <= hi
    shortfalls = [{"category": c, "required": cats[c], "availableUniqueGroups": per_cat_unique[c]} for c in cats if per_cat_unique[c] < cats[c]]
    blueprint = {
        "categoryTargets": cats,
        "bloomTargets": syl["examSpec"]["bloomCounts"],
        "eligibleUniqueGroupsByCategoryAndBloom": cell,
        "eligibleUniqueGroupsByCategory": per_cat_unique,
        "bl1AchievableRange": [lo, hi],
        "fullyCompliantExamPossible": feasible,
        "categoryShortfalls": shortfalls,
        "notes": [
            "Counts are exclusion groups (duplicate and near-duplicate stems collapsed) so that no question repeats within an attempt.",
            "Category 6 (ITIL and AI) and other thin categories are reported so the owner can judge exam variety.",
        ],
    }

    # ---------- write ----------
    status_counts = Counter(q["audit"]["contentStatus"] for q in questions)
    reason_counts = Counter(r["code"] for q in questions for r in q["audit"]["reviewReasons"])
    bank_hash = h16(json.dumps([[q["questionId"], q["englishQuestion"], q["englishOptions"], q["sourceAnswerKey"], q["sourceExplanation"]] for q in questions], ensure_ascii=False))
    meta = {
        "schemaVersion": 1,
        "bankVersion": f"1.0.0+{bank_hash}",
        "bankContentHash": bank_hash,
        "sourceDocument": occ_doc["sourceDocument"],
        "sourceDocumentSha256": occ_doc["sourceDocumentSha256"],
        "syllabus": {"version": syl["version"], "published": syl["published"], "sha256": syl["retrievedSha256"]},
        "examSpec": syl["examSpec"],
        "categories": syl["categories"],
        "criteria": syl["criteria"],
        "notice": "Independent practice tool. Not affiliated with, endorsed by, or an official product of PeopleCert or AXELOS. ITIL® is a registered trademark of PeopleCert. Questions are reproduced verbatim from the owner-supplied PDF.",
    }
    bank = {**meta, "questionCount": len(questions), "questions": questions}
    (CONTENT / "build").mkdir(parents=True, exist_ok=True)
    (CONTENT / "build" / "bank.json").write_text(json.dumps(bank, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    (CONTENT / "build" / "translations.ar.json").write_text(json.dumps({"language": "ar", "bankVersion": meta["bankVersion"], "content": dict(sorted(out_tr.items())), "ui": ui}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    missing_tr = sorted([{"key": k, "en": v["en"], "fields": sorted(v["fields"]), "statuses": sorted(v["statuses"])} for k, v in needed.items() if k not in out_tr], key=lambda x: x["key"])
    coverage = {
        "bankVersion": meta["bankVersion"],
        "approvedPerField": {f: {**v, "percent": round(100 * v["translated"] / v["required"], 2) if v["required"] else 100.0} for f, v in per_field.items()},
        "approvedQuestionsFullyTranslated": sum(1 for q in questions if q["audit"]["contentStatus"] == "approved" and q["audit"]["translationComplete"]),
        "approvedQuestions": status_counts["approved"],
        "allOccurrencesFullyTranslated": sum(1 for q in questions if q["audit"]["translationComplete"]),
        "uniqueStringsNeeded": len(needed),
        "uniqueStringsTranslated": len(out_tr),
        "uiStrings": len(ui),
        "brokenTranslationLinks": bad_links,
        "missing": missing_tr,
    }
    (CONTENT / "reports" / "translation-coverage.json").write_text(json.dumps(coverage, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    pn = log["printedNumbers"]
    audit = {
        "reportType": "ImportAuditReport",
        **{k: meta[k] for k in ("bankVersion", "sourceDocument", "sourceDocumentSha256", "syllabus")},
        "extractor": occ_doc["extractor"],
        "confirmedCounts": {
            "pdfPages": occ_doc["pageCount"],
            "pagesWithQuestionContent": sorted({p for q in questions for p in q["sourcePagesSpanned"]}),
            "answerKeyLines": log["answerKeyLineCount"],
            "questionOccurrences": len(questions),
            "occurrencesWithFourOptions": sum(1 for q in questions if len(q["englishOptions"]) == 4),
            "occurrencesWithSourceExplanation": sum(1 for q in questions if q["sourceExplanation"]),
            "occurrencesWithoutSourceExplanation": sum(1 for q in questions if not q["sourceExplanation"]),
            "occurrencesWithRefCitation": sum(1 for q in questions if q["sourceReferenceText"]),
            "distinctNormalizedStems": len(stem_groups),
            "duplicateStemGroups": len(dup_detail),
            "occurrencesInDuplicateGroups": sum(g["size"] for g in dup_detail),
            "exclusionGroups": len(roots),
            "nearDuplicatePairs": len(near_pairs),
        },
        "statusCounts": dict(status_counts),
        "examEligibleOccurrences": sum(1 for q in questions if q["audit"]["examEligible"]),
        "reviewReasonCounts": dict(reason_counts),
        "printedNumberAnomalies": {"reusedLabels": pn["reused"], "missingNumbers": pn["missing"],
                                   "nonSequentialTransitions": pn["nonSequentialTransitions"]},
        "trailingPages": "Pages 72-76 contain no question text (page 76 shows only the number '41').",
        "crossExtractorCheck": log.get("crossExtractorCheck"),
        "duplicateGroups": sorted(dup_detail, key=lambda g: -g["size"]),
        "nearDuplicatePairs": near_pairs,
        "blueprint": blueprint,
        "quarantine": [
            {"questionId": q["questionId"], "page": q["sourcePage"], "printedQuestionNumber": q["printedQuestionNumber"],
             "status": q["audit"]["contentStatus"],
             "reasons": [r for r in q["audit"]["reviewReasons"] if r["severity"] not in ("info", "warning")]}
            for q in questions if q["audit"]["contentStatus"] != "approved"
        ],
        "noSourceExplanation": [{"questionId": q["questionId"], "page": q["sourcePage"], "printedQuestionNumber": q["printedQuestionNumber"]} for q in questions if not q["sourceExplanation"]],
        "classificationMethod": "Each occurrence was read by the auditor and mapped to one v5.0 assessment criterion. Bloom level defaults to the criterion's BL column; overrides are listed with a note. Classification is metadata only and never edits source text.",
        "duplicateMethod": "Stems normalised by NFKC, lower-casing, quote unification and removal of non-alphanumerics; identical normalised stems form a duplicate group. Near-duplicates (difflib ratio >= 0.85 AND correct-option text similarity >= 0.9) are merged into exclusion groups used only to prevent repeats within one exam.",
    }
    (CONTENT / "reports" / "import-audit.json").write_text(json.dumps(audit, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    write_md(audit, coverage, questions)

    # ---------- self-checks: automated detectors must agree with curated quarantine ----------
    by_ord = {q["sourceOrdinal"]: q for q in questions}
    for o, code in [(106, "duplicate_key_conflict"), (165, "duplicate_key_conflict"), (191, "duplicate_option_text"), (196, "editorial_artifact")]:
        codes = {r["code"] for r in by_ord[o]["audit"]["reviewReasons"] if "automatically" in r["detail"] or r["code"] == "editorial_artifact"}
        assert code in codes, f"automated detector missed {code} on ordinal {o}"
        assert by_ord[o]["audit"]["contentStatus"] != "approved"
    print(json.dumps({"status": dict(status_counts), "eligible": audit["examEligibleOccurrences"],
                      "dupGroups": len(dup_detail), "exclusionGroups": len(roots), "blueprintFeasible": feasible,
                      "cells": cell, "translated": f"{len(out_tr)}/{len(needed)}"}, indent=None))
    return 0


def write_md(a, cov, qs):
    c = a["confirmedCounts"]
    L = []
    L.append("# Import Audit Report — ITIL Foundation (Version 5) question bank\n")
    L.append(f"- Source: `{a['sourceDocument']}`  \n- SHA-256: `{a['sourceDocumentSha256']}`  \n- Bank version: `{a['bankVersion']}`  \n- Syllabus reference: v{a['syllabus']['version']} ({a['syllabus']['published']}), SHA-256 `{a['syllabus']['sha256']}`  \n- Extractor: {a['extractor']} (cross-checked with pdftotext)\n")
    L.append("## Confirmed counts\n")
    L.append("| Measure | Value |\n|---|---:|")
    for k, v in c.items():
        if isinstance(v, list):
            v = f"{v[0]}–{v[-1]} ({len(v)} pages)"
        L.append(f"| {k} | {v} |")
    L.append("\n## Content status\n")
    L.append("| Status | Occurrences |\n|---|---:|")
    for k, v in sorted(a["statusCounts"].items()):
        L.append(f"| {k} | {v} |")
    L.append(f"| **exam-eligible (approved + classified + translated)** | **{a['examEligibleOccurrences']}** |")
    L.append("\n## Printed-number anomalies\n")
    L.append(f"- Reused labels: {', '.join(f'{k} (ordinals {v})' for k, v in a['printedNumberAnomalies']['reusedLabels'].items())}")
    L.append(f"- Missing numbers: {a['printedNumberAnomalies']['missingNumbers']}")
    L.append(f"- {a['trailingPages']}")
    L.append("\n## Blueprint feasibility (unique exclusion groups among exam-eligible items)\n")
    b = a["blueprint"]
    L.append("| Category | Target | BL1 groups | BL2 groups | Unique groups |\n|---|---:|---:|---:|---:|")
    for cid, t in b["categoryTargets"].items():
        cell = b["eligibleUniqueGroupsByCategoryAndBloom"][cid]
        L.append(f"| {cid} | {t} | {cell[1]} | {cell[2]} | {b['eligibleUniqueGroupsByCategory'][cid]} |")
    L.append(f"\nBL1 achievable range across a 40-item exam: {b['bl1AchievableRange']} (target 16). **Fully compliant exam possible: {b['fullyCompliantExamPossible']}**\n")
    L.append("## Quarantined / not approved (never served in practice)\n")
    L.append("| Ordinal | Page | Printed # | Status | Reasons |\n|---:|---:|---:|---|---|")
    byid = {q["questionId"]: q for q in qs}
    for x in a["quarantine"]:
        q = byid[x["questionId"]]
        rs = "; ".join(f"{r['code']}: {r['detail'][:110]}" for r in x["reasons"])
        L.append(f"| {q['sourceOrdinal']} | {x['page']} | {x['printedQuestionNumber']} | {x['status']} | {rs} |")
    L.append("\n## Duplicate groups with differing options or keys\n")
    L.append("| Group | Members (ordinal/page/key/relation) |\n|---|---|")
    for g in a["duplicateGroups"]:
        rels = {m["relationToReference"] for m in g["members"]}
        if rels <= {"reference", "identical"}:
            continue
        L.append(f"| {g['normalizedStem'][:60]} | " + "; ".join(f"{m['sourceOrdinal']}/p{m['page']}/{m['sourceAnswerKey']}/{m['relationToReference']}" for m in g["members"]) + " |")
    L.append(f"\n{len([g for g in a['duplicateGroups']])} duplicate groups total; full membership in `import-audit.json`.\n")
    L.append("## Occurrences without a source explanation\n")
    L.append(", ".join(f"#{x['printedQuestionNumber']} (p{x['page']})" for x in a["noSourceExplanation"]))
    L.append("\n\n## Translation coverage (approved items)\n")
    L.append("| Field | Required | Translated | % |\n|---|---:|---:|---:|")
    for f, v in cov["approvedPerField"].items():
        L.append(f"| {f} | {v['required']} | {v['translated']} | {v['percent']} |")
    L.append(f"\nUnique English strings translated (all occurrences): {cov['uniqueStringsTranslated']}/{cov['uniqueStringsNeeded']}. UI strings: {cov['uiStrings']}.\n")
    L.append("## Method\n")
    L.append(f"- {a['classificationMethod']}\n- {a['duplicateMethod']}\n- Cross-extractor: {a['crossExtractorCheck']['method']} Pages differing: {a['crossExtractorCheck']['pagesDiffering'] or 'none'}.\n")
    (CONTENT / "reports" / "import-audit.md").write_text("\n".join(L) + "\n", encoding="utf-8")


if __name__ == "__main__":
    sys.exit(main())
