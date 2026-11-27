# Import Audit Report — ITIL Foundation (Version 5) question bank

- Source: `ITIL Foundation 11-05-26.pdf`  
- SHA-256: `1d11798cd8d91fe100ed32690a95388a5cafe588b1aea495c76b4cbaaadce9bf`  
- Bank version: `1.1.0+216726579ec3324b`  
- Syllabus reference: v5.0 (February 2026), SHA-256 `eecb65e0e03f92b2786e54141b1db535d4a20d7f51385be519143ef8a04eec37`  
- Extractor: pdfplumber 0.11.10 (cross-checked with pdftotext)

## Confirmed counts

| Measure | Value |
|---|---:|
| pdfPages | 76 |
| pagesWithQuestionContent | 1–71 (71 pages) |
| answerKeyLines | 302 |
| questionOccurrences | 336 |
| occurrencesWithFourOptions | 336 |
| occurrencesWithSourceExplanation | 278 |
| occurrencesWithoutSourceExplanation | 58 |
| occurrencesWithRefCitation | 82 |
| distinctNormalizedStems | 275 |
| duplicateStemGroups | 59 |
| occurrencesInDuplicateGroups | 120 |
| exclusionGroups | 270 |
| nearDuplicatePairs | 6 |

## Content status

| Status | Occurrences |
|---|---:|
| approved | 271 |
| duplicate | 51 |
| needs_review | 1 |
| out_of_scope | 13 |
| **exam-eligible (approved + classified + translated)** | **271** |

## Printed-number anomalies

- Reused labels: 103 (ordinals [103, 104]), 178 (ordinals [178, 179])
- Missing numbers: [171, 300]
- Pages 72-76 contain no question text (page 76 shows only the number '41').

## Blueprint feasibility (unique exclusion groups among exam-eligible items)

| Category | Target | BL1 groups | BL2 groups | Unique groups |
|---|---:|---:|---:|---:|
| 1 | 12 | 41 | 24 | 65 |
| 2 | 4 | 0 | 27 | 27 |
| 3 | 4 | 19 | 0 | 19 |
| 4 | 16 | 33 | 82 | 115 |
| 5 | 2 | 7 | 9 | 16 |
| 6 | 1 | 0 | 1 | 1 |
| 7 | 1 | 3 | 10 | 13 |

BL1 achievable range across a 40-item exam: [4, 35] (target 16). **Fully compliant exam possible: True**

## Quarantined / not approved (never served in practice)

| Ordinal | Page | Printed # | Status | Reasons |
|---:|---:|---:|---|---|
| 111 | 27 | 110 | out_of_scope | no_matching_v5_criterion: Definition of "change"; no v5 Foundation assessment criterion defines change (4.4.4 covers release and test). |
| 140 | 33 | 139 | out_of_scope | legacy_itil4_terminology: ITIL 4 term 'service value chain' (in stem or keyed option); legacy_itil4_terminology: ITIL 4 value chain activity 'Obtain/build' (in stem or keyed option); legacy_itil4_value_chain: Options use ITIL 4 service value chain activities (Engage, Obtain/build, Plan, Improve), not the v5 lifecycle  |
| 148 | 35 | 147 | out_of_scope | no_matching_v5_criterion: Definition of "change"; no v5 Foundation assessment criterion defines change (4.4.4 covers release and test). |
| 150 | 36 | 149 | out_of_scope | legacy_itil4_practice_detail: Purpose of the service configuration management practice (ITIL 4 practice detail; not a v5 Foundation criterio |
| 158 | 38 | 157 | out_of_scope | legacy_itil4_practice_detail: Purpose of the information security management practice (ITIL 4 practice detail). |
| 159 | 38 | 158 | out_of_scope | legacy_itil4_practice_detail: Incident management practice detail (ITIL 4). |
| 160 | 38 | 159 | out_of_scope | legacy_itil4_practice_detail: Problem management practice detail (ITIL 4). |
| 161 | 38 | 160 | out_of_scope | legacy_itil4_practice_detail: Problem management practice detail (ITIL 4). |
| 162 | 38 | 161 | out_of_scope | legacy_itil4_practice_detail: Service desk practice detail (ITIL 4). |
| 169 | 40 | 168 | out_of_scope | legacy_itil4_value_chain: Options use ITIL 4 value chain activities (Plan, Improve, Design and transition, Deliver and support). |
| 170 | 40 | 169 | out_of_scope | legacy_itil4_practice_detail: Purpose of the supplier management practice (ITIL 4 practice detail). |
| 171 | 40 | 170 | out_of_scope | legacy_itil4_practice_detail: Service desk practice detail (ITIL 4). |
| 172 | 40 | 172 | out_of_scope | legacy_itil4_practice_detail: Incident management practice detail (ITIL 4). |
| 212 | 49 | 211 | needs_review | possible_content_accuracy_dispute: Stem describes the ITIL VS as a "series of steps" (wording usually associated with value streams). Flagged for |

## Identical duplicates removed from the app (51)

Same question, same options in the same order and same answer key. One copy is kept; these copies are hidden from every practice mode but remain in the audit data.

| Removed (page / printed #) | Kept copy (page / printed #) | Byte-identical text | Status before |
|---|---|---|---|
| p42 / #179 | p1 / #3 | yes | approved |
| p44 / #190 | p2 / #5 | yes | approved |
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
| p34 / #143 | p23 / #95 | yes | approved |
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
| p39 / #164 | p26 / #105 | no (punctuation/quote/case only) | approved |
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
| which of the following dimension of product and service mana | 7/p2/D/reference; 275/p65/C/reordered_options_same_semantic_key |
| which dimension of product and service management addresses  | 8/p2/C/reference; 276/p65/C/reordered_options_same_semantic_key |
| why should organizations consider the interaction of itil gu | 14/p4/A/reference; 229/p53/A/different_options_same_correct_text |
| what is a digital product | 24/p6/C/reference; 181/p42/C/different_options_same_correct_text |
| what is the main purpose of the discover activity | 30/p8/C/reference; 238/p56/C/different_options_same_correct_text |
| which itil concept includes governance practices and continu | 39/p10/A/reference; 203/p47/A/different_options_same_correct_text |
| which of the following best describes an outcome in a servic | 114/p28/A/reference; 129/p31/A/different_options_same_correct_text |
| which best explains why an organization might choose to enga | 120/p29/D/reference; 177/p41/D/reordered_options_same_semantic_key |

59 duplicate groups total; full membership in `import-audit.json`.

## Occurrences without a source explanation

#32 (p8), #35 (p9), #37 (p9), #93 (p23), #119 (p29), #120 (p29), #153 (p37), #157 (p38), #158 (p38), #159 (p38), #160 (p38), #161 (p38), #164 (p39), #167 (p40), #168 (p40), #169 (p40), #170 (p40), #172 (p40), #173 (p40), #174 (p40), #175 (p41), #176 (p41), #177 (p41), #298 (p70), #1 (p1), #3 (p1), #5 (p2), #6 (p2), #7 (p2), #8 (p2), #9 (p2), #10 (p3), #11 (p3), #12 (p3), #13 (p3), #14 (p3), #15 (p4), #16 (p4), #17 (p4), #18 (p4), #19 (p5), #20 (p5), #21 (p5), #22 (p5), #23 (p5), #24 (p6), #25 (p6), #26 (p6), #27 (p6), #28 (p7), #29 (p7), #30 (p7), #31 (p7), #33 (p8), #34 (p8), #35 (p8), #37 (p9), #76 (p17)


## Translation coverage (approved items)

| Field | Required | Translated | % |
|---|---:|---:|---:|
| question | 271 | 271 | 100.0 |
| option | 1084 | 1084 | 100.0 |
| explanation | 226 | 226 | 100.0 |
| supplementaryExplanation | 45 | 45 | 100.0 |

Unique English strings translated (all occurrences): 1506/1506. UI strings: 82.

## Method

- Each occurrence was read by the auditor and mapped to one v5.0 assessment criterion. Bloom level defaults to the criterion's BL column; overrides are listed with a note. Classification is metadata only and never edits source text.
- Stems normalised by NFKC, lower-casing, quote unification and removal of non-alphanumerics; identical normalised stems form a duplicate group. Near-duplicates (difflib ratio >= 0.85 AND correct-option text similarity >= 0.9) are merged into exclusion groups used only to prevent repeats within one exam.
- Cross-extractor: Per-page character sequence equality between pdfplumber and pdftotext -raw, ignoring whitespace and hyphens. Pages differing: none.

