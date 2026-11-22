#!/usr/bin/env python3
"""Compile batch-NN.ar.tsv files into translations/ar/content.json.

Each TSV line is `index<TAB>arabic` (a literal "\\n" in the Arabic means a line break).
The manifest maps index -> key -> exact English. Validation:
  * every index must exist in the manifest, no duplicates
  * Arabic must be non-empty and contain Arabic script
  * line-break count must match the English (layout parity)
  * Latin acronyms/Ref section numbers present in English must survive (e.g. SLA, DevOps, 3.1.2)
Translations are AI-generated drafts (status 'ai_draft_unreviewed') until a human reviewer
changes the status in content.json via review tooling.
"""
import json, re, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
B = ROOT / "packages/content/translations/ar/batches"
OUT = ROOT / "packages/content/translations/ar/content.json"
ARABIC = re.compile(r"[؀-ۿ]")
errors, out = [], {}
prev = json.loads(OUT.read_text()) if OUT.exists() else {}
for man in sorted(B.glob("batch-*.manifest.json")):
    n = man.name.split(".")[0]
    tsv = B / f"{n}.ar.tsv"
    if not tsv.exists():
        continue
    items = json.loads(man.read_text())["items"]
    seen = set()
    for ln_no, line in enumerate(tsv.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        if "\t" not in line:
            errors.append(f"{tsv.name}:{ln_no}: missing TAB"); continue
        idx, ar = line.split("\t", 1)
        idx = idx.strip()
        if idx not in items:
            errors.append(f"{tsv.name}:{ln_no}: unknown index {idx}"); continue
        if idx in seen:
            errors.append(f"{tsv.name}:{ln_no}: duplicate index {idx}"); continue
        seen.add(idx)
        ar = ar.strip().replace("\\n", "\n")
        en = items[idx]["en"]
        if not ARABIC.search(ar):
            errors.append(f"{tsv.name}:{idx}: no Arabic script")
        if en.count("\n") != ar.count("\n"):
            errors.append(f"{tsv.name}:{idx}: line-break count differs (en {en.count(chr(10))}, ar {ar.count(chr(10))})")
        for tok in set(re.findall(r"\b(?:SLA|SLAs|CSF|DevOps|PRINCE2|ITIL|AI|SRE|VoIP|PESTLE|6C)\b|\d+\.\d+(?:\.\d+)*", en)):
            if tok not in ar:
                errors.append(f"{tsv.name}:{idx}: token '{tok}' from English missing in Arabic")
        key = items[idx]["key"]
        status = prev.get(key, {}).get("status", "ai_draft_unreviewed") if prev.get(key, {}).get("en") == en else "ai_draft_unreviewed"
        out[key] = {"en": en, "ar": ar, "batch": n, "status": status}
    missing = [i for i in items if i not in seen]
    if missing:
        errors.append(f"{tsv.name}: {len(missing)} untranslated indices, e.g. {missing[:8]}")
OUT.write_text(json.dumps(dict(sorted(out.items())), ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print(f"compiled {len(out)} translations; {len(errors)} problems")
for e in errors[:60]:
    print("  -", e)
sys.exit(1 if errors else 0)
