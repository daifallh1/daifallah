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
    for o in occ:
        o["sourceKind"] = "pdf"
        o["_cls"] = cls[str(o["sourceOrdinal"])]

    # ---------- pre-correction self-check: automated detectors fire on the ORIGINAL source text ----------
    by_ord0 = {o["sourceOrdinal"]: o for o in occ}
    a0, b0 = by_ord0[106], by_ord0[165]
    assert norm(a0["englishQuestion"]) == norm(b0["englishQuestion"]) and a0["sourceAnswerKey"] != b0["sourceAnswerKey"], "key-conflict detector baseline"
    t191 = [norm(x["text"]) for x in by_ord0[191]["englishOptions"]]
    assert len(set(t191)) < 4, "duplicate-option detector baseline"
    assert by_ord0[196]["editorialArtifacts"], "editorial-artifact detector baseline"

    # ---------- second source: dump questions selected for import ----------
    dump_doc = json.loads((CONTENT / "data" / "dump-occurrences.json").read_text(encoding="utf-8"))
    dump_cls = json.loads((CONTENT / "data" / "dump-classification.json").read_text(encoding="utf-8"))["questions"]
    dump_sha12 = dump_doc["sourceDocumentSha256"][:12]
    for d in dump_doc["questions"]:
        c = dump_cls.get(str(d["dumpNumber"]))
        if not c or not c.get("import"):
            continue
        occ.append({
            "questionId": f"itilf5-{dump_sha12}-o{d['dumpNumber']:03d}",
            "sourceDocument": dump_doc["sourceDocument"],
            "sourceDocumentSha256": dump_doc["sourceDocumentSha256"],
            "sourcePage": d["sourcePage"],
            "sourcePagesSpanned": d["sourcePagesSpanned"],
            "sourceRegion": [{"page": d["sourcePage"], "firstLine": 0, "lastLine": 0, "bbox": d["bbox"]}],
            "sourceOrdinal": d["dumpNumber"],
            "printedQuestionNumber": d["dumpNumber"],
            "englishQuestion": d["englishQuestion"],
            "englishOptions": d["englishOptions"],
            "sourceAnswerKey": d["sourceAnswerKey"],
            "sourceExplanation": None,
            "sourceReferenceText": None,
            "editorialArtifacts": [],
            "extractionAnomalies": [{"code": "no_source_explanation"}],
            "sourceKind": "dump",
            "_cls": {"criterion": c["criterion"], "confidence": c["confidence"], "bloomOverride": c["bloomOverride"],
                     "statusOverride": None, "reasonCode": None, "note": c.get("note") or ""},
        })

    # ---------- owner-approved corrections (checked against the Official Book) ----------
    corr_doc = json.loads((CONTENT / "data" / "corrections.json").read_text(encoding="utf-8"))
    applied_corrections = []
    for cr_ in corr_doc["corrections"]:
        tgt = next((o for o in occ if o["sourceKind"] == cr_["source"] and o["sourceOrdinal"] == cr_["ordinal"]), None)
        assert tgt is not None, f"correction target missing: {cr_['source']} #{cr_['ordinal']}"
        assert tgt["printedQuestionNumber"] == cr_["printed"], f"printed number mismatch for {cr_}"
        orig = {}
        if cr_.get("answerKey"):
            assert cr_["answerKey"] != tgt["sourceAnswerKey"]
            orig["sourceAnswerKey"] = tgt["sourceAnswerKey"]
            tgt["sourceAnswerKey"] = cr_["answerKey"]
        if cr_.get("options"):
            orig["englishOptions"] = [dict(x) for x in tgt["englishOptions"]]
            tgt["englishOptions"] = [{"label": x["label"], "text": cr_["options"].get(x["label"], x["text"])} for x in tgt["englishOptions"]]
        if cr_.get("replace"):
            hit = False
            for a, b in cr_["replace"]:
                if a in tgt["englishQuestion"]:
                    orig.setdefault("englishQuestion", tgt["englishQuestion"])
                    tgt["englishQuestion"] = tgt["englishQuestion"].replace(a, b); hit = True
                if any(a in x["text"] for x in tgt["englishOptions"]):
                    orig.setdefault("englishOptions", [dict(x) for x in tgt["englishOptions"]])
                    tgt["englishOptions"] = [{"label": x["label"], "text": x["text"].replace(a, b)} for x in tgt["englishOptions"]]; hit = True
                if tgt["sourceExplanation"] and a in tgt["sourceExplanation"]:
                    orig.setdefault("sourceExplanation", tgt["sourceExplanation"])
                    tgt["sourceExplanation"] = tgt["sourceExplanation"].replace(a, b)
            assert hit, f"replacement text not found in {cr_}"
        if cr_.get("removeEditorialArtifacts"):
            orig["editorialArtifacts"] = tgt["editorialArtifacts"]
            tgt["editorialArtifacts"] = []
            tgt["extractionAnomalies"] = [x for x in tgt["extractionAnomalies"] if x["code"] != "editorial_artifact"]
        if cr_.get("dropExplanation") and tgt["sourceExplanation"]:
            orig.setdefault("sourceExplanation", tgt["sourceExplanation"])
            tgt["sourceExplanation"] = None
            tgt["sourceReferenceText"] = None
        tgt["correction"] = {"label": "معدّل", "labelEn": "Corrected", "bookReference": cr_["bookReference"],
                             "summary": cr_["summary"], "summaryAr": cr_["summaryAr"], "original": orig}
        applied_corrections.append({"questionId": tgt["questionId"], "source": cr_["source"], "printedQuestionNumber": cr_["printed"],
                                    "bookReference": cr_["bookReference"], "summary": cr_["summary"], "changedFields": sorted(orig)})

    supp_file = CONTENT / "data" / "supplementary-explanations.json"
    supp = json.loads(supp_file.read_text(encoding="utf-8"))["explanations"] if supp_file.exists() else {}

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
        c = o["_cls"]
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
                reasons.append({"code": "no_source_explanation", "severity": "info", "detail": "The source has no explanation for this occurrence."})
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

        if o.get("correction"):
            reasons.append({"code": "owner_correction", "severity": "info",
                            "detail": f"Corrected against the Official Book {o['correction']['bookReference']}: {o['correction']['summary']}"})
        cr = crit.get(c["criterion"]) if c["criterion"] else None
        bloom = c["bloomOverride"] or (cr["bl"] if cr else None)
        stem_key = norm(o["englishQuestion"])
        sx = supp.get(o["questionId"])
        if sx and o["sourceExplanation"]:
            raise SystemExit(f"supplementary explanation given for {o['questionId']}, which has a source explanation")
        q = {
            "questionId": o["questionId"],
            "sourceKind": o["sourceKind"],
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
            "correction": o.get("correction"),
            "supplementaryExplanation": ({"text": sx["text"], "bookReference": sx["bookReference"], "author": "ai",
                                          "note": "AI-written from the ITIL Foundation Version 5 Official Book; not part of the source."} if sx else None),
            "i18n": {
                "question": text_key(o["englishQuestion"]),
                "options": {x["label"]: text_key(x["text"]) for x in opts},
                "explanation": text_key(o["sourceExplanation"]) if o["sourceExplanation"] else None,
                "supplementaryExplanation": text_key(sx["text"]) if sx else None,
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
                "legacy": status == "out_of_scope",
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

    # ---------- remove identical duplicates (owner request, 2026-11-25) ----------
    # Identical = same normalised stem, same options in the same order, same source key.
    # One copy is kept (the first approved occurrence, else the first); the others get status
    # "duplicate" and are never served. They stay in the audit data with their page references.
    for q in questions:
        q["audit"]["duplicateOf"] = None
    clusters: dict[tuple, list[int]] = defaultdict(list)
    for i, q in enumerate(questions):
        sig = (norm(q["englishQuestion"]), tuple(norm(o["text"]) for o in q["englishOptions"]), q["sourceAnswerKey"])
        clusters[sig].append(i)
    removed_dups = []
    for idxs in clusters.values():
        if len(idxs) < 2:
            continue
        keep = next((i for i in idxs if questions[i]["audit"]["contentStatus"] == "approved"), idxs[0])
        kq = questions[keep]
        for i in idxs:
            if i == keep:
                continue
            q = questions[i]
            prev = q["audit"]["contentStatus"]
            byte_identical = (q["englishQuestion"] == kq["englishQuestion"]
                              and [o["text"] for o in q["englishOptions"]] == [o["text"] for o in kq["englishOptions"]])
            q["audit"]["contentStatus"] = "duplicate"
            q["audit"]["duplicateOf"] = kq["questionId"]
            q["audit"]["legacy"] = False
            q["audit"]["reviewReasons"].append({
                "code": "identical_duplicate_removed", "severity": "info",
                "detail": f"Identical to {kq['questionId']} (p.{kq['sourcePage']}, printed #{kq['printedQuestionNumber']}); "
                          f"hidden from all practice modes at the owner's request. Status before removal: {prev}."})
            removed_dups.append({"questionId": q["questionId"], "page": q["sourcePage"], "printedQuestionNumber": q["printedQuestionNumber"],
                                 "keptQuestionId": kq["questionId"], "keptPage": kq["sourcePage"],
                                 "keptPrintedQuestionNumber": kq["printedQuestionNumber"], "statusBeforeRemoval": prev,
                                 "byteIdenticalText": byte_identical})

    # ---------- translations ----------
    needed: dict[str, dict] = {}
    for q in questions:
        refs = [("question", q["englishQuestion"], q["i18n"]["question"])]
        refs += [(f"option{x['label']}", x["text"], q["i18n"]["options"][x["label"]]) for x in q["englishOptions"]]
        if q["sourceExplanation"]:
            refs.append(("explanation", q["sourceExplanation"], q["i18n"]["explanation"]))
        if q["supplementaryExplanation"]:
            refs.append(("supplementaryExplanation", q["supplementaryExplanation"]["text"], q["i18n"]["supplementaryExplanation"]))
        for field, en, key in refs:
            needed.setdefault(key, {"en": en, "fields": set(), "statuses": set()})
            needed[key]["fields"].add(field)
            needed[key]["statuses"].add(q["audit"]["contentStatus"])
    bad_links = []
    out_tr = {}
    term_file = CONTENT / "translations" / "terminology.ar.json"
    term_rules = json.loads(term_file.read_text(encoding="utf-8"))["rules"] if term_file.exists() else []
    term_counts = Counter()
    for key, v in needed.items():
        t = tr.get(key)
        if t is None:
            continue
        if t["en"] != v["en"]:
            bad_links.append({"key": key, "reason": "English text in translation file does not match bank text"})
            continue
        ar = t["ar"]
        for rule in term_rules:
            if rule["from"] in ar and (not rule.get("enPattern") or re.search(rule["enPattern"], v["en"])):
                term_counts[f"{rule['from']} -> {rule['to']}"] += ar.count(rule["from"])
                ar = ar.replace(rule["from"], rule["to"])
        out_tr[key] = {"en": v["en"], "ar": ar}
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
        if q["i18n"]["supplementaryExplanation"]:
            pairs.append(("supplementaryExplanation", q["i18n"]["supplementaryExplanation"]))
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
            keys = [q["i18n"]["question"], *q["i18n"]["options"].values()] + [k for k in (q["i18n"]["explanation"], q["i18n"]["supplementaryExplanation"]) if k]
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
    bank_hash = h16(json.dumps([[q["questionId"], q["englishQuestion"], q["englishOptions"], q["sourceAnswerKey"], q["sourceExplanation"],
                                 (q["supplementaryExplanation"] or {}).get("text"), q["audit"]["contentStatus"]] for q in questions], ensure_ascii=False))
    fixed_exams = build_fixed_exams(questions, cats)
    meta = {
        "schemaVersion": 1,
        "bankVersion": f"1.1.0+{bank_hash}",
        "bankContentHash": bank_hash,
        "sourceDocument": occ_doc["sourceDocument"],
        "sourceDocumentSha256": occ_doc["sourceDocumentSha256"],
        "syllabus": {"version": syl["version"], "published": syl["published"], "sha256": syl["retrievedSha256"]},
        "examSpec": syl["examSpec"],
        "categories": syl["categories"],
        "criteria": syl["criteria"],
        "notice": "Independent practice tool. Not affiliated with, endorsed by, or an official product of PeopleCert or AXELOS. ITIL® is a registered trademark of PeopleCert. Questions are reproduced verbatim from the owner-supplied PDFs; owner-approved corrections are labelled 'معدّل' and keep the original text.",
        "sources": [
            {"kind": "pdf", "document": occ_doc["sourceDocument"], "sha256": occ_doc["sourceDocumentSha256"]},
            {"kind": "dump", "document": dump_doc["sourceDocument"], "sha256": dump_doc["sourceDocumentSha256"]},
        ],
    }
    bank = {**meta, "fixedExams": fixed_exams, "questionCount": len(questions), "questions": questions}
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
        "terminologyAlignment": {"source": "translations/terminology.ar.json (instructor course notes)", "replacements": dict(sorted(term_counts.items()))},
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
            for q in questions if q["audit"]["contentStatus"] not in ("approved", "duplicate")
        ],
        "removedIdenticalDuplicates": removed_dups,
        "corrections": applied_corrections,
        "dumpImport": dump_import_report(dump_doc, dump_cls, questions),
        "fixedExams": [{k: v for k, v in e.items() if k != "questionIds"} | {"categoryCounts": e["categoryCounts"], "bloomCounts": e["bloomCounts"]} for e in fixed_exams],
        "supplementaryExplanations": sum(1 for q in questions if q["supplementaryExplanation"]),
        "noSourceExplanation": [{"questionId": q["questionId"], "page": q["sourcePage"], "printedQuestionNumber": q["printedQuestionNumber"]} for q in questions if not q["sourceExplanation"]],
        "classificationMethod": "Each occurrence was read by the auditor and mapped to one v5.0 assessment criterion. Bloom level defaults to the criterion's BL column; overrides are listed with a note. Classification is metadata only and never edits source text.",
        "duplicateMethod": "Stems normalised by NFKC, lower-casing, quote unification and removal of non-alphanumerics; identical normalised stems form a duplicate group. Near-duplicates (difflib ratio >= 0.85 AND correct-option text similarity >= 0.9) are merged into exclusion groups used only to prevent repeats within one exam.",
    }
    (CONTENT / "reports" / "import-audit.json").write_text(json.dumps(audit, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    write_md(audit, coverage, questions)

    # ---------- self-checks: automated detectors must agree with curated quarantine ----------
    # The detector baselines were asserted on the original text above; every flagged item must now carry an
    # owner correction (or have been confirmed), and nothing still blocked may be served.
    by_ord = {q["sourceOrdinal"]: q for q in questions if q["sourceKind"] == "pdf"}
    for o in (165, 191, 196):
        assert by_ord[o]["correction"], f"ordinal {o} was flagged by a detector but has no correction record"
    assert by_ord[212]["audit"]["contentStatus"] == "needs_review", "printed #211 must stay quarantined"
    for q in questions:
        if q["audit"]["contentStatus"] == "approved":
            assert not [r for r in q["audit"]["reviewReasons"] if r["severity"] in ("blocking", "incomplete", "out_of_scope")]
    seen_fixed = [i for e in fixed_exams for i in e["questionIds"]]
    assert len(seen_fixed) == len(set(seen_fixed)), "fixed exams overlap"
    print(json.dumps({"status": dict(status_counts), "eligible": audit["examEligibleOccurrences"],
                      "dupGroups": len(dup_detail), "exclusionGroups": len(roots), "blueprintFeasible": feasible,
                      "cells": cell, "translated": f"{len(out_tr)}/{len(needed)}",
                      "fixedExams": [len(e["questionIds"]) for e in fixed_exams], "corrections": len(applied_corrections),
                      "supplementary": audit["supplementaryExplanations"],
                      "missingExplanation": sum(1 for q in questions if q["audit"]["contentStatus"] == "approved" and not q["sourceExplanation"] and not q["supplementaryExplanation"])}, indent=None))
    return 0


def build_fixed_exams(questions: list[dict], cat_targets: dict) -> list[dict]:
    """Six fixed exams that together cover every distinct exam-eligible question exactly once.

    One question per exclusion group (near-duplicate variants stay out), sorted by category, Bloom level
    and source position, then dealt across the six exams in a serpentine order so each exam gets a
    balanced category/Bloom mix. Exam sizes differ by at most one question. Pass mark = 65% rounded up.
    """
    reps: dict[str, dict] = {}
    for q in questions:
        a = q["audit"]
        if not a["examEligible"]:
            continue
        g = a["exclusionGroupId"]
        cur = reps.get(g)
        key = (0 if q["sourceKind"] == "pdf" else 1, q["sourceOrdinal"])
        if cur is None or key < (0 if cur["sourceKind"] == "pdf" else 1, cur["sourceOrdinal"]):
            reps[g] = q
    pool = sorted(reps.values(), key=lambda q: (q["audit"]["syllabusCategory"], q["audit"]["bloomLevel"],
                                                 0 if q["sourceKind"] == "pdf" else 1, q["sourceOrdinal"]))
    k = 6
    buckets: list[list[dict]] = [[] for _ in range(k)]
    size_cap = [len(pool) // k + (1 if i < len(pool) % k else 0) for i in range(k)]
    cat_n = [Counter() for _ in range(k)]
    cell_n = [Counter() for _ in range(k)]
    # Greedy balancing: each question goes to the exam with the fewest questions of its category,
    # then of its (category, Bloom) cell, then the fewest questions overall, never above the size cap.
    for q in pool:
        c, b = q["audit"]["syllabusCategory"], q["audit"]["bloomLevel"]
        choices = [i for i in range(k) if len(buckets[i]) < size_cap[i]]
        i = min(choices, key=lambda i: (cat_n[i][c], cell_n[i][(c, b)], len(buckets[i]), i))
        buckets[i].append(q)
        cat_n[i][c] += 1
        cell_n[i][(c, b)] += 1
    out = []
    for i, b in enumerate(buckets, start=1):
        rng = __import__("random").Random(1000 + i)
        ids = [q["questionId"] for q in b]
        rng.shuffle(ids)
        n = len(ids)
        out.append({
            "examId": f"fixed-{i}",
            "title": f"Exam {i}",
            "questionIds": ids,
            "durationMinutes": 60,
            "passMark": -(-65 * n // 100),
            "passPercent": 65,
            "categoryCounts": dict(sorted(Counter(q["audit"]["syllabusCategory"] for q in b).items())),
            "bloomCounts": dict(sorted(Counter(q["audit"]["bloomLevel"] for q in b).items())),
        })
    return out


def dump_import_report(dump_doc: dict, dump_cls: dict, questions: list[dict]) -> list[dict]:
    pdf_qs = [q for q in questions if q["sourceKind"] == "pdf"]
    rows = []
    for d in dump_doc["questions"]:
        stem = norm(d["englishQuestion"])
        best = max(pdf_qs, key=lambda q: difflib.SequenceMatcher(None, stem, norm(q["englishQuestion"])).ratio())
        ratio = difflib.SequenceMatcher(None, stem, norm(best["englishQuestion"])).ratio()
        imported = bool(dump_cls.get(str(d["dumpNumber"]), {}).get("import"))
        rows.append({"dumpNumber": d["dumpNumber"], "page": d["sourcePage"], "imported": imported,
                     "closestPdfQuestion": best["questionId"], "closestPdfPrintedNumber": best["printedQuestionNumber"],
                     "stemSimilarity": round(ratio, 3),
                     "decision": "imported as a new question" if imported else "not imported: same or near-same question already in the bank"})
    return rows


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
    L.append(f"\n## Identical duplicates removed from the app ({len(a['removedIdenticalDuplicates'])})\n")
    L.append("Same question, same options in the same order and same answer key. One copy is kept; these copies are hidden from every practice mode but remain in the audit data.\n")
    L.append("| Removed (page / printed #) | Kept copy (page / printed #) | Byte-identical text | Status before |\n|---|---|---|---|")
    for d in a["removedIdenticalDuplicates"]:
        L.append(f"| p{d['page']} / #{d['printedQuestionNumber']} | p{d['keptPage']} / #{d['keptPrintedQuestionNumber']} | {'yes' if d['byteIdenticalText'] else 'no (punctuation/quote/case only)'} | {d['statusBeforeRemoval']} |")
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
