#!/usr/bin/env python3
"""Generate a LOCAL side-by-side audit page: each occurrence's rendered PDF region beside the
extracted English text, key, status and review reasons. Output goes to packages/content/reports/pages/
(gitignored: page renders include the source PDF's personal watermark).
Usage: python3 -I tools/audit/side_by_side.py "source/ITIL Foundation 11-05-26.pdf"
"""
import html, json, subprocess, sys
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "packages/content/reports/pages"
DPI = 80
pdf = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "source/ITIL Foundation 11-05-26.pdf"
bank = json.loads((ROOT / "packages/content/build/bank.json").read_text())
OUT.mkdir(parents=True, exist_ok=True)
subprocess.run(["pdftoppm", "-r", str(DPI), "-png", "-f", "1", "-l", "71", str(pdf), str(OUT / "page")], check=True)
pages = {int(p.stem.split("-")[1]): p for p in OUT.glob("page-*.png")}
scale = DPI / 72
rows = []
for q in bank["questions"]:
    crops = []
    for r in q["sourceRegion"]:
        im = Image.open(pages[r["page"]])
        x0, y0, x1, y1 = r["bbox"]
        box = (max(0, int((x0 - 6) * scale)), max(0, int((y0 - 4) * scale)), min(im.width, int((x1 + 6) * scale)), min(im.height, int((y1 + 4) * scale)))
        name = f"crop-{q['sourceOrdinal']:03d}-p{r['page']}.png"
        im.crop(box).save(OUT / name)
        crops.append(f'<img src="{name}" alt="page {r["page"]} region">')
    a = q["audit"]
    opts = "".join(f"<li><b>{o['label']}</b> {html.escape(o['text'])}</li>" for o in q["englishOptions"])
    reasons = "<br>".join(html.escape(f"{x['severity']}: {x['code']} — {x['detail']}") for x in a["reviewReasons"])
    rows.append(f"""<tr class="{a['contentStatus']}"><td>{q['sourceOrdinal']}<br>p{q['sourcePage']}<br>#{q['printedQuestionNumber']}</td>
<td>{''.join(crops)}</td><td><p>{html.escape(q['englishQuestion'])}</p><ol type="A">{opts}</ol><p>Key: <b>{q['sourceAnswerKey']}</b></p>
<p class="ex">{html.escape(q['sourceExplanation'] or '(no source explanation)')}</p></td>
<td><b>{a['contentStatus']}</b><br>{a['syllabusCriterion'] or '—'} · BL{a['bloomLevel'] or '—'} · {a['confidence']}<br><small>{reasons}</small></td></tr>""")
(OUT / "side-by-side.html").write_text(f"""<!doctype html><meta charset="utf-8"><title>Side-by-side source audit</title>
<style>body{{font:14px system-ui;margin:16px}}table{{border-collapse:collapse;width:100%}}td{{border:1px solid #ccc;vertical-align:top;padding:6px}}
img{{max-width:520px;display:block;margin-bottom:4px;border:1px solid #ddd}}tr.needs_review{{background:#fff4d6}}tr.out_of_scope{{background:#eee}}.ex{{color:#555}}</style>
<h1>Side-by-side source audit — {len(rows)} occurrences</h1><p>Source SHA-256 {bank['sourceDocumentSha256']} · bank {bank['bankVersion']}</p>
<table><tr><th>Ordinal / page / printed #</th><th>PDF region (rendered)</th><th>Extracted (verbatim)</th><th>Audit</th></tr>{''.join(rows)}</table>""")
print(f"wrote {OUT/'side-by-side.html'} with {len(rows)} rows")
