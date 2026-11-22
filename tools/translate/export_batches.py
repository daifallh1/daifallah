#!/usr/bin/env python3
"""Export every bank string that still lacks an Arabic translation into numbered batches.

Each batch has a manifest (index -> translation key -> exact English). Translators write
`batch-NN.ar.tsv` lines of `index<TAB>arabic`. compile_translations.py re-links each line to
the exact English text through the manifest, so a translation can never attach to the wrong
string, and the English bank is never modified.
"""
import json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
C = ROOT / "packages/content"
bank = json.loads((C / "build/bank.json").read_text())
B = C / "translations/ar/batches"
done = set()
for m in B.glob("batch-*.manifest.json"):
    done |= {v["key"] for v in json.loads(m.read_text())["items"].values()}
size = int(sys.argv[1]) if len(sys.argv) > 1 else 170
seq, seen = [], set(done)
for q in bank["questions"]:
    refs = [("Q", q["englishQuestion"], q["i18n"]["question"])]
    refs += [(o["label"], o["text"], q["i18n"]["options"][o["label"]]) for o in q["englishOptions"]]
    if q["sourceExplanation"]:
        refs.append(("E", q["sourceExplanation"], q["i18n"]["explanation"]))
    for kind, en, key in refs:
        if key not in seen:
            seen.add(key); seq.append({"key": key, "en": en, "kind": kind, "ordinal": q["sourceOrdinal"]})
start = len(list(B.glob("batch-*.manifest.json"))) + 1
for bi in range(0, len(seq), size):
    n = start + bi // size
    items = {f"{i+1:03d}": it for i, it in enumerate(seq[bi:bi+size])}
    (B / f"batch-{n:02d}.manifest.json").write_text(json.dumps({"batch": n, "items": items}, ensure_ascii=False, indent=1) + "\n")
    print(f"batch-{n:02d}: {len(items)} strings")
