# Import Audit Report — ITIL Foundation (Version 5) question bank

- Source: `ITIL Foundation 11-05-26.pdf`  
- SHA-256: `1d11798cd8d91fe100ed32690a95388a5cafe588b1aea495c76b4cbaaadce9bf`  
- Bank version: `1.0.0+32721183c4e52e10`  
- Syllabus reference: v5.0 (February 2026), SHA-256 `eecb65e0e03f92b2786e54141b1db535d4a20d7f51385be519143ef8a04eec37`  
- Extractor: pdfplumber 0.11.10 (cross-checked with pdftotext)

## Confirmed counts

| Measure | Value |
|---|---:|
| pdfPages | 76 |
| pagesWithQuestionContent | 1–71 (71 pages) |
| answerKeyLines | 302 |
| questionOccurrences | 302 |
| occurrencesWithFourOptions | 302 |
| occurrencesWithSourceExplanation | 282 |
| occurrencesWithoutSourceExplanation | 20 |
| occurrencesWithRefCitation | 82 |
| distinctNormalizedStems | 242 |
| duplicateStemGroups | 58 |
| occurrencesInDuplicateGroups | 118 |
| exclusionGroups | 236 |
| nearDuplicatePairs | 7 |

## Content status

| Status | Occurrences |
|---|---:|
| approved | 229 |
| duplicate | 48 |
| needs_review | 12 |
| out_of_scope | 13 |
| **exam-eligible (approved + classified + translated)** | **229** |

## Printed-number anomalies

- Reused labels: 103 (ordinals [103, 104]), 178 (ordinals [178, 179])
- Missing numbers: [171, 300]
- Pages 72-76 contain no question text (page 76 shows only the number '41').

## Blueprint feasibility (unique exclusion groups among exam-eligible items)

| Category | Target | BL1 groups | BL2 groups | Unique groups |
|---|---:|---:|---:|---:|
| 1 | 12 | 33 | 20 | 53 |
| 2 | 4 | 0 | 22 | 22 |
| 3 | 4 | 16 | 0 | 16 |
| 4 | 16 | 29 | 66 | 95 |
| 5 | 2 | 6 | 8 | 14 |
| 6 | 1 | 0 | 1 | 1 |
| 7 | 1 | 3 | 10 | 13 |

BL1 achievable range across a 40-item exam: [4, 35] (target 16). **Fully compliant exam possible: True**

## Quarantined / not approved (never served in practice)

| Ordinal | Page | Printed # | Status | Reasons |
|---:|---:|---:|---|---|
| 58 | 14 | 58 | needs_review | legacy_itil4_terminology: ITIL 4 term 'service value system' (v5: ITIL Value System) (in stem or keyed option) |
| 106 | 26 | 105 | needs_review | duplicate_key_conflict: Detected automatically by build_bank.py; duplicate_key_conflict: Same stem and identical options appear at p.26 (key A) and p.39 (key C). Source keys conflict; neither is corr |
| 111 | 27 | 110 | out_of_scope | no_matching_v5_criterion: Definition of "change"; no v5 Foundation assessment criterion defines change (4.4.4 covers release and test). |
| 121 | 29 | 120 | needs_review | legacy_itil4_terminology: ITIL 4 term 'dimensions of service management' (v5: product and service management) (in stem or keyed option) |
| 140 | 33 | 139 | out_of_scope | legacy_itil4_terminology: ITIL 4 term 'service value chain' (in stem or keyed option); legacy_itil4_terminology: ITIL 4 value chain activity 'Obtain/build' (in stem or keyed option); legacy_itil4_value_chain: Options use ITIL 4 service value chain activities (Engage, Obtain/build, Plan, Improve), not the v5 lifecycle  |
| 144 | 34 | 143 | needs_review | legacy_itil4_terminology: ITIL 4 term 'service value system' (v5: ITIL Value System) (in stem or keyed option) |
| 148 | 35 | 147 | out_of_scope | no_matching_v5_criterion: Definition of "change"; no v5 Foundation assessment criterion defines change (4.4.4 covers release and test). |
| 150 | 36 | 149 | out_of_scope | legacy_itil4_practice_detail: Purpose of the service configuration management practice (ITIL 4 practice detail; not a v5 Foundation criterio |
| 151 | 36 | 150 | needs_review | possible_legacy_itil4_content: "Service relationship management" practice wording; no direct v5 assessment criterion. Owner to confirm scope. |
| 158 | 38 | 157 | out_of_scope | legacy_itil4_practice_detail: Purpose of the information security management practice (ITIL 4 practice detail). |
| 159 | 38 | 158 | out_of_scope | legacy_itil4_practice_detail: Incident management practice detail (ITIL 4). |
| 160 | 38 | 159 | out_of_scope | legacy_itil4_practice_detail: Problem management practice detail (ITIL 4). |
| 161 | 38 | 160 | out_of_scope | legacy_itil4_practice_detail: Problem management practice detail (ITIL 4). |
| 162 | 38 | 161 | out_of_scope | legacy_itil4_practice_detail: Service desk practice detail (ITIL 4). |
| 165 | 39 | 164 | needs_review | duplicate_key_conflict: Detected automatically by build_bank.py; duplicate_key_conflict: Same stem and identical options appear at p.26 (key A) and p.39 (key C). Source keys conflict; neither is corr |
| 169 | 40 | 168 | out_of_scope | legacy_itil4_value_chain: Options use ITIL 4 value chain activities (Plan, Improve, Design and transition, Deliver and support). |
| 170 | 40 | 169 | out_of_scope | legacy_itil4_practice_detail: Purpose of the supplier management practice (ITIL 4 practice detail). |
| 171 | 40 | 170 | out_of_scope | legacy_itil4_practice_detail: Service desk practice detail (ITIL 4). |
| 172 | 40 | 172 | out_of_scope | legacy_itil4_practice_detail: Incident management practice detail (ITIL 4). |
| 191 | 44 | 190 | needs_review | duplicate_option_text: Detected automatically by build_bank.py; duplicate_option_text: Options B and C are both "Warranty" in the source (verified on rendered page 44). Not four distinct options. |
| 195 | 45 | 194 | needs_review | truncated_option_text: Option C reads "Product Vend" in the source (verified on rendered page 45); appears truncated. Not completed. |
| 196 | 46 | 195 | needs_review | editorial_artifact: Add answer: D. The external partner providing technology.; editorial_artifact: Line "Add answer: D. The external partner providing technology." precedes option A (verified on rendered page  |
| 207 | 48 | 206 | needs_review | legacy_itil4_terminology: ITIL 4 term 'service value system' (v5: ITIL Value System) (in stem or keyed option); legacy_itil4_terminology: Uses ITIL 4 "Service Value System" inputs/outcome model (opportunity/demand -> value). |
| 208 | 49 | 207 | needs_review | legacy_itil4_terminology: ITIL 4 term 'service value system' (v5: ITIL Value System) (in stem or keyed option); legacy_itil4_terminology: Uses ITIL 4 "Service Value System" inputs/outcome model (opportunity/demand -> value). |
| 212 | 49 | 211 | needs_review | possible_content_accuracy_dispute: Stem describes the ITIL VS as a "series of steps" (wording usually associated with value streams). Flagged for |

## Identical duplicates removed from the app (48)

Same question, same options in the same order and same answer key. One copy is kept; these copies are hidden from every practice mode but remain in the audit data.

| Removed (page / printed #) | Kept copy (page / printed #) | Byte-identical text | Status before |
|---|---|---|---|
| p42 / #179 | p1 / #3 | yes | approved |
| p64 / #273 | p2 / #6 | yes | approved |
| p53 / #226 | p3 / #10 | yes | approved |
| p53 / #227 | p3 / #11 | yes | approved |
| p50 / #215 | p4 / #15 | yes | approved |
| p56 / #238 | p4 / #16 | no (punctuation/quote/case only) | approved |
| p41 / #178 | p5 / #17 | yes | approved |
| p58 / #249 | p5 / #18 | no (punctuation/quote/case only) | approved |
| p61 / #261 | p6 / #22 | yes | approved |
| p59 / #250 | p6 / #23 | yes | approved |
| p45 / #192 | p7 / #27 | yes | approved |
| p56 / #239 | p8 / #33 | yes | approved |
| p59 / #251 | p10 / #40 | yes | approved |
| p48 / #203 | p14 / #55 | yes | approved |
| p50 / #214 | p15 / #61 | yes | approved |
| p31 / #129 | p19 / #79 | yes | approved |
| p31 / #130 | p20 / #80 | yes | approved |
| p32 / #131 | p20 / #81 | yes | approved |
| p32 / #132 | p20 / #82 | no (punctuation/quote/case only) | approved |
| p32 / #133 | p20 / #83 | no (punctuation/quote/case only) | approved |
| p32 / #134 | p21 / #84 | yes | approved |
| p32 / #135 | p21 / #85 | yes | approved |
| p33 / #136 | p21 / #86 | yes | approved |
| p33 / #137 | p21 / #87 | yes | approved |
| p33 / #138 | p21 / #88 | yes | approved |
| p29 / #118 | p22 / #89 | yes | approved |
| p29 / #121 | p22 / #90 | yes | approved |
| p30 / #122 | p22 / #91 | yes | approved |
| p36 / #152 | p22 / #92 | yes | approved |
| p37 / #153 | p23 / #93 | yes | approved |
| p34 / #142 | p23 / #94 | yes | approved |
| p34 / #144 | p23 / #96 | yes | approved |
| p35 / #145 | p24 / #97 | no (punctuation/quote/case only) | approved |
| p35 / #146 | p24 / #98 | yes | approved |
| p37 / #154 | p24 / #99 | yes | approved |
| p37 / #155 | p24 / #100 | yes | approved |
| p37 / #156 | p24 / #101 | no (punctuation/quote/case only) | approved |
| p40 / #173 | p25 / #102 | yes | approved |
| p40 / #174 | p25 / #103 | yes | approved |
| p38 / #162 | p25 / #103 | yes | approved |
| p39 / #163 | p25 / #104 | yes | approved |
| p39 / #165 | p26 / #106 | yes | approved |
| p39 / #166 | p26 / #107 | yes | approved |
| p30 / #123 | p26 / #108 | yes | approved |
| p30 / #124 | p27 / #109 | yes | approved |
| p30 / #125 | p27 / #110 | yes | out_of_scope |
| p31 / #126 | p27 / #111 | yes | approved |
| p31 / #127 | p27 / #112 | yes | approved |

## Duplicate groups with differing options or keys

| Group | Members (ordinal/page/key/relation) |
|---|---|
| what is a product prototype | 105/p25/C/reference; 164/p39/C/identical; 242/p57/C/different_options_different_correct_text |
| what is a value stream | 108/p26/B/reference; 167/p39/B/identical; 253/p59/B/different_options_different_correct_text |
| a service provider commits to using recyclable components re | 5/p2/D/reference; 191/p44/D/different_options_same_correct_text |
| which of the following dimension of product and service mana | 7/p2/D/reference; 275/p65/C/reordered_options_same_semantic_key |
| which dimension of product and service management addresses  | 8/p2/C/reference; 276/p65/C/reordered_options_same_semantic_key |
| why should organizations consider the interaction of itil gu | 14/p4/A/reference; 229/p53/A/different_options_same_correct_text |
| what is a digital product | 24/p6/C/reference; 181/p42/C/different_options_same_correct_text |
| what is the main purpose of the discover activity | 30/p8/C/reference; 238/p56/C/different_options_same_correct_text |
| which itil concept includes governance practices and continu | 39/p10/A/reference; 203/p47/A/different_options_same_correct_text |
| an organization is planning to improve the existing service  | 106/p26/A/reference; 165/p39/C/KEY_CONFLICT |
| which of the following best describes an outcome in a servic | 114/p28/A/reference; 129/p31/A/different_options_same_correct_text |
| which best explains why an organization might choose to enga | 120/p29/D/reference; 177/p41/D/reordered_options_same_semantic_key |

58 duplicate groups total; full membership in `import-audit.json`.

## Occurrences without a source explanation

#32 (p8), #35 (p9), #37 (p9), #119 (p29), #120 (p29), #157 (p38), #158 (p38), #159 (p38), #160 (p38), #161 (p38), #167 (p40), #168 (p40), #169 (p40), #170 (p40), #172 (p40), #173 (p40), #174 (p40), #175 (p41), #176 (p41), #177 (p41)


## Translation coverage (approved items)

| Field | Required | Translated | % |
|---|---:|---:|---:|
| question | 229 | 229 | 100.0 |
| option | 916 | 916 | 100.0 |
| explanation | 221 | 221 | 100.0 |

Unique English strings translated (all occurrences): 1330/1330. UI strings: 82.

## Method

- Each occurrence was read by the auditor and mapped to one v5.0 assessment criterion. Bloom level defaults to the criterion's BL column; overrides are listed with a note. Classification is metadata only and never edits source text.
- Stems normalised by NFKC, lower-casing, quote unification and removal of non-alphanumerics; identical normalised stems form a duplicate group. Near-duplicates (difflib ratio >= 0.85 AND correct-option text similarity >= 0.9) are merged into exclusion groups used only to prevent repeats within one exam.
- Cross-extractor: Per-page character sequence equality between pdfplumber and pdftotext -raw, ignoring whitespace and hyphens. Pages differing: none.

