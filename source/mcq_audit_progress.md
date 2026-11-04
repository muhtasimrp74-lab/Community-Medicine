# MCQ audit progress (Matrix 18th ed. PDF, July 2026)

Source PDF: Matrix 3rd Prof 18th Ed (July 2026), MCQ of Community Medicine pp.188–208 (21 scanned pages).
Paper codes: 26M p188–189 · 25Nov p189–191 · 25M p191–192 · 24Nov p192–194 · 24M p194–195 · 23Nov p195–196 · 23M p197–198 · 22Nov-A p198–199 (first Nov 2022) · 22Nov-B p199–201 (second Nov 2022) · 22M p201–202 · 21M p202–204 · 20M&Nov p204–205 · 20Ju p205–206 (no keys printed) · 19Nov p207–208.
Every site paper code already carries 20 questions, so no PDF question is missing outright; work is fixing keys, merges and years.

Rules in force: conflict:true = PDF key (or one paper) disagrees with Park/current guidance; option keeps the correct key. Years with † are removed once the key has been read on this PDF. Statements chosen for merged TF items = most-asked across papers. Negative stems whose printed key is the positive key are merged into the positive item.

Status
- PDF pages read: all 21 (pp.188–208).
- PDF pass applied: 26M, 25Nov, 25M (batch 1); 24Nov, 24M, 23Nov (batch 2); 23M, 22Nov-A, 22Nov-B (batch 3); 22M, 21M, 20M&Nov, 20Ju, 19Nov (batch 4). PDF pass COMPLETE: all 182 DU items now carry PDF refs, no † years left, every DU TF option keyed (20Ju and blank PDF keys supplied per Park and marked "key not given").
- New-item audit: parts 1–5 done (batch 5); parts 6–9 done (batch 6); parts 10–11 done (batch 7). New-item audit COMPLETE (batch 5; M.320 from part 8 also fixed). Rule: TF "New" items that repeat a DU TF item are deleted; SBA versions kept if sound.
- Final duplicate sweep done (batch 8), incl. BCS review (no "all/none of the above" left).
- AUDIT COMPLETE.
- EXPLANATIONS (new task): every option gets an "e" field (why true/false, why right/wrong); shown in reading mode, and in practice after Check (js/app.js, css/app.css .ex). COMPLETE: all 477 items, every option explained. When adding or editing an MCQ, give each option an "e" too (Bank.explain). Kept by design: an SBA and a TF on the same fact (different formats). Possible follow-ups: web-verify remaining time-sensitive New items (EPI cold-chain temperatures, MDT durations) and add New items to thin topics.

## Change log

### Badges simplified (cache v63)
- "Asked once" merged into "Fixed" (badge: Fixed in X). Three tags now: Fixed (green), Mostly X · also Y (amber), Flexible (red, dashed). Tags added beside topic headings inside chapters, MCQ hub chapter list, progress rows and home chapter cards (home card label now shows code + group instead of "Part n").

### Group-stability badges (cache v62)
- data/groups.js STAB per chapter: fixed (A1, B3, D1), leaning (A4, B1, B2, D2, D3), asked once (A2, A3, B5, C5, C7), flexible (A5, B4, C1, C2, C3, C4, C6). Shown on chapter banners, chapter page header and Questions group headers, with a legend on the Chapters page. Update STAB when new papers arrive.

### Groups re-derived from the DU new-curriculum papers Nov 2025 + May 2026 (cache v61)
- data/groups.js layout "groups2026": 20 chapters. A: A1 Health & disease, A2 Health care/PHC/national programmes, A3 Behavioural science, A4 MCH, A5 Immunity/immunization/disinfection. B: B1 Epidemiology, B2 Research & biostatistics, B3 Family planning, B4 Nutrition, B5 Health administration. C: C1 Environment, C2 Occupational, C3 School health, C4 Communication & HE, C5 International health, C6 Entomology, C7 Accidents & disasters. D: D1 Demography, D2 Communicable diseases, D3 NCD.
- Rule: May 2026 decides when the papers disagree (immunity A vs D; nutrition B vs C; water/communication/school/occupational C vs A). Each chapter shows its evidence ("Asked: ...").
- Device data: read/flags/notes/MCQ results/sessions and ink are keyed by question id and untouched. Saved filters (S.fx) and scroll positions (cmb:view) from layout "groups2021" are migrated via CM.layoutMoves (old chapter -> new chapters), not wiped. Verified in a browser with a simulated old device.
- Not changed: data/predict.js still uses its own (older) group split.

### NMC suggested problem-based questions (cache v60)
- 21 NMC questions added to data/du.js directly as kind "Case-based", college tag "NMC (Suggested Qn)": DU.766–DU.784 (Q7 and Q11 are the same question → one item DU.772); Q10 (missing IUCD thread) merged into DU.481 (MuMC), with its wording and a "what will you do" answer appended. Question wording kept (typos fixed); answers expanded. Corrections flagged in-answer: Q2(a) is marasmic kwashiorkor (key said kwashiorkor); Q20 WHO 2018: drinking milk of a rabid animal needs no PEP; Q21 sunken eyes + slow pinch = some dehydration (Plan B), severe → Plan C.
- data/du.js now holds manual additions: do NOT run tools/build_banks.py (it would drop them).
- College chips: colours never showed (.tg.col overrode .c-*); fixed with .tg.col.c-* rules. NMC = pink. Case-based pill now orange.

### Chapters re-arranged by 2021 curriculum exam groups A–D (cache v59)
- data/groups.js (loaded after du.js/mcq.js) maps every bank topic to one of 16 chapters: A1–A4, B1–B4, C1–C5, D1–D3, sets q.G (group) and keeps the old part in q.p0. Data files and ids are unchanged, so progress, notes and handwritten marks are unaffected. International Health → A2 and Accidents & Disasters → C5 (not named in the table; same placement as data/predict.js). MDG/SDG items of "Health Indicators & MDGs" → A2 (DU.32, DU.33, M.17–M.19).
- Chapters page grouped by Group A–D with marks and official topic list; Questions/MCQ lists show group dividers; Group filter added everywhere; one-time reset of saved filters and chapter scroll positions (old part numbers).

### Resume where you left (cache v58)
- Each bottom tab remembers its last page; each page remembers scroll, open questions/groups and MCQs loaded (localStorage cmb:view, separate from progress). Survives tab switches, back/forward and Chrome reloading a discarded tab. Tapping the current tab goes to its start page, or to the top if already there. Links with filters (e.g. Read MCQs for a topic) open fresh at the top.

### Fix — marks from closed answers piled onto question cards (cache v57)
- The v56 fallback drew strokes whose text was hidden (collapsed answer) at the nearest visible spot. Now marks in hidden/collapsed content are simply not drawn until the answer is opened again; the fallback only moves marks within the same visible block (edited text). Tested: mark on open answer → collapse (0 px drawn) → reopen (mark back in place).

### UI — filters and annotation safety (cache v56)
- Shared filter component (js/app.js FX) now drives Questions, every Chapter page, MCQ Reading mode and Custom practice: sticky search, Filters button with count, quick chips, removable active chips, grouped panel (Syllabus / Exam history / College papers or Question / My progress) with live counts, sort options. Filter choices are remembered per page (S.fx).
- Chapter pages: topic chips (or subtopic chips for single-topic parts) as quick filters, plus a Practise/Read MCQs bar for the chosen topic.
- MCQ filters: part, topic, type, source, disputed key, asked in last 2/5 years, times asked, DU paper, progress; search covers options and explanations.
- Annotations: ink.js treats the new .rd.f/.rd.x classes as state classes (keeps old anchors), never drops a stroke whose text anchor moved (falls back to the nearest block, then the card start), and moves marks from the 72 retired MCQ ids to the item that replaced them (originals kept as old:<id> in storage and backups). M.90 (deleted, no replacement) keeps its marks in storage/backups only.

### Explanations 4 — parts 10–11 (cache v54)
All 477 MCQs now have per-option explanations.
- Explanations: parts 10-11 (all items) explanations added for every option; all 477 items now explained

### Explanations 3 — parts 8–9 (cache v53)
Option-level explanations added for all part 8–9 items.
- Explanations: parts 8-9 (all items) explanations added for every option

### Explanations 2 — parts 2–7 (cache v52)
Option-level explanations added for all part 2–7 items.
- Explanations: parts 2-7 (all items) explanations added for every option

### Explanations 1 — part 1 (cache v51)
Option-level explanations added for all part 1 items; app shows them.
- Explanations: part 1 (all 97 items): explanations added for every option

### Batch 8 — duplicate sweep, BCS review, refill thinned topics (cache v50)
Retired 9; added M.547–M.550. Audit complete.
- M.523: deleted (same fact as DU M.421 (functions of management), same topic)
- M.190: deleted (same fact as DU M.180 (water-borne diseases))
- M.451: deleted (same fact as DU M.370 (natural disasters))
- M.265: deleted (same item as BCS M.270 (live attenuated vaccine))
- M.462: deleted (same fact as M.485 (major manifestation of RF), negative stem)
- M.36: deleted (same fact as BCS M.38 (Alma-Ata 1978))
- M.267: deleted (same fact as BCS M.273 (measles vaccine at 9 months))
- M.252: deleted (same fact as BCS M.249 (housefly and diarrhoea))
- M.90: deleted (vague; more than one defensible answer (cognitive vs social theory))
- M.11: distractor Gender removed (gender is also a social determinant)
- M.91: "All of the above" removed; stem rewritten
- M.92: "None" option replaced
- M.170: "None" option replaced
- M.271: "None" option replaced
- M.294: "None" option replaced; answer worded precisely
- M.295: answer worded precisely
- M.204: stem specified (health-care waste)
- M.470: stem made precise (infectious cause)
- M.532: option made precise (28 days)
- M.273: ref (kept over duplicate M.267)
- M.2: checked (BCS), Park ref added
- M.3: checked (BCS), Park ref added
- M.4: checked (BCS), Park ref added
- M.17: checked (BCS), Park ref added
- M.18: checked (BCS), Park ref added
- M.19: checked (BCS), Park ref added
- M.37: checked (BCS), Park ref added
- M.38: checked (BCS), Park ref added
- M.39: checked (BCS), Park ref added
- M.40: checked (BCS), Park ref added
- M.57: checked (BCS), Park ref added
- M.89: checked (BCS), Park ref added
- M.93: checked (BCS), Park ref added
- M.158: checked (BCS), Park ref added
- M.159: checked (BCS), Park ref added
- M.160: checked (BCS), Park ref added
- M.171: checked (BCS), Park ref added
- M.184: checked (BCS), Park ref added
- M.185: checked (BCS), Park ref added
- M.216: checked (BCS), Park ref added
- M.249: checked (BCS), Park ref added
- M.257: checked (BCS), Park ref added
- M.259: checked (BCS), Park ref added
- M.269: checked (BCS), Park ref added
- M.270: checked (BCS), Park ref added
- M.272: checked (BCS), Park ref added
- M.274: checked (BCS), Park ref added
- M.275: checked (BCS), Park ref added
- M.276: checked (BCS), Park ref added
- M.326: checked (BCS), Park ref added
- M.530: checked (BCS), Park ref added
- M.531: checked (BCS), Park ref added
- M.533: checked (BCS), Park ref added
- M.431: checked (BCS), Park ref added
- M.432: checked (BCS), Park ref added
- M.433: checked (BCS), Park ref added
- M.434: checked (BCS), Park ref added
- M.469: checked (BCS), Park ref added
- M.547: added (topic thinned by duplicate deletions)
- M.548: added (topic thinned by duplicate deletions)
- M.549: added (topic thinned by duplicate deletions)
- M.550: added (topic thinned by duplicate deletions)

### Batch 7 — New items, parts 10–11 (cache v49)
Last New id checked: M.523. Retired 16 duplicates.
- M.452: deleted (duplicate of M.384)
- M.453: deleted (duplicate of M.386)
- M.454: deleted (duplicate of M.387)
- M.455: deleted (duplicate of M.379)
- M.464: deleted (duplicate of M.480 (same fact, negative stem))
- M.501: deleted (duplicate of M.394)
- M.502: deleted (duplicate of M.407)
- M.503: deleted (duplicate of M.406)
- M.504: deleted (duplicate of M.396)
- M.505: deleted (duplicate of M.395)
- M.506: deleted (duplicate of M.403)
- M.507: deleted (duplicate of M.400)
- M.508: deleted (duplicate of M.415)
- M.509: deleted (duplicate of M.416)
- M.510: deleted (duplicate of M.420)
- M.511: deleted (duplicate of M.421; keyed monitoring F against the DU key)
- M.424: old distractors chickenpox and hepatitis E are also vertically transmissible; rebuilt
- M.440: distractor rubella removed (also direct, two defensible answers)
- M.486: distractor monitoring removed (DU 23Nov keys it T)
- M.458: "is descriptive" replaced (Park classes cross-sectional studies as analytical too)
- M.514: "PB needs clofazimine = F" was wrong under WHO 2018 uniform 3-drug MDT; statement replaced
- checked: no content change, Park ref added: M.422, M.423, M.425, M.426, M.427, M.428, M.429, M.430, M.435, M.436, M.437, M.438, M.439, M.441, M.442, M.443, M.444, M.445, M.446, M.447, M.448, M.449, M.450, M.451, M.456, M.457, M.459, M.460, M.461, M.462, M.463, M.465, M.466, M.467, M.468, M.471, M.472, M.473, M.474, M.475, M.476, M.477, M.478, M.479, M.480, M.481, M.482, M.483, M.484, M.485, M.487, M.488, M.489, M.490, M.491, M.492, M.493, M.494, M.495, M.496, M.497, M.498, M.499, M.500, M.512, M.513, M.515, M.516, M.517, M.518, M.519, M.520, M.521, M.522, M.523

### Batch 6 — New items, parts 6–9 (cache v48)
Last New id checked: M.546. Retired 15 duplicates.
- M.230: deleted (duplicate of M.35)
- M.283: deleted (duplicate of M.261)
- M.284: deleted (duplicate of M.263)
- M.285: deleted (duplicate of M.262)
- M.299: deleted (duplicate of M.286)
- M.300: deleted (duplicate of M.287)
- M.318: deleted (duplicate of M.304; keyed 750 ml/day T against DU key and Park)
- M.319: deleted (duplicate of M.302)
- M.321: deleted (duplicate of M.310)
- M.238: answer USAID replaced by DANIDA (USAID dismantled 2025)
- M.268: stem wording ("vaccination prevalence" -> coverage)
- M.315: key 750 ml contradicted DU key and Park; options rebuilt
- M.526: moved to topic Contraceptive Methods; ref
- M.529: stem rewritten (referred to "the written question")
- checked: no content change, Park ref added: M.229, M.237, M.239, M.240, M.241, M.242, M.243, M.250, M.251, M.252, M.253, M.254, M.258, M.265, M.266, M.267, M.277, M.278, M.279, M.280, M.281, M.282, M.291, M.292, M.293, M.296, M.297, M.298, M.313, M.314, M.316, M.317, M.325, M.327, M.328, M.329, M.330, M.331, M.332, M.524, M.525, M.527, M.528, M.534, M.535, M.536, M.537, M.538, M.539, M.540, M.541; no content change, Park ref added: M.336, M.337, M.338, M.339, M.345, M.346, M.347, M.353, M.354, M.355, M.357, M.360, M.362, M.363, M.366, M.543, M.544, M.545, M.546
- M.348: deleted (duplicate of M.341)
- M.349: deleted (duplicate of M.340)
- M.356: deleted (duplicate of M.350)
- M.364: deleted (duplicate of M.359; keyed monkey face T (a marasmus sign))
- M.367: deleted (duplicate of M.365)
- M.542: deleted (duplicate of M.347)
- M.361: key was monkey face (a marasmus sign); options rebuilt, answer oedema

### Batch 5 — New items, parts 1–5 (cache v47)
Last New id checked: M.226. Retired 25 duplicates (see deleted lines).
- M.24: deleted (duplicate of M.12)
- M.25: deleted (duplicate of M.13)
- M.26: deleted (duplicate of M.16; also keyed bed turnover ratio T (utilization rate))
- M.44: deleted (duplicate of M.32; only 4 options)
- M.45: deleted (duplicate of M.34)
- M.62: deleted (duplicate of M.47)
- M.63: deleted (duplicate of M.49)
- M.64: deleted (duplicate of M.51)
- M.65: deleted (duplicate of M.48; keyed defervescence F)
- M.77: deleted (duplicate of M.69)
- M.94: deleted (duplicate of M.88)
- M.99: deleted (duplicate of M.81)
- M.100: deleted (duplicate of M.86)
- M.107: deleted (duplicate of M.103; keyed dynamic T against all DU keys)
- M.108: deleted (duplicate of M.104)
- M.125: deleted (duplicate of M.123)
- M.135: deleted (duplicate of M.119)
- M.139: deleted (duplicate of M.136)
- M.161: deleted (duplicate of M.150)
- M.178: deleted (duplicate of M.176)
- M.181: deleted (duplicate of M.179)
- M.201: deleted (duplicate of M.198)
- M.209: deleted (duplicate of M.207)
- M.218: deleted (duplicate of M.214)
- M.219: deleted (duplicate of M.213)
- M.5: stem fixed: definition was adopted 1946, in force 1948; distractor 1946 added
- M.22: key was bed turnover ratio (a utilization rate); replaced by doctor-population ratio
- M.23: negative stem made positive; old options had two defensible answers (LE at birth is not in PQLI)
- M.60: defervescence removed from distractors (it is also a stage)
- M.132: fifth statement added (had only 4)
- M.320: fifth statement added (had only 4)
- M.147: moved from Central Tendency (part 2) to Basic Principles of Epidemiology (part 10); ref
- M.148: moved from Central Tendency (part 2) to Basic Principles of Epidemiology (part 10); ref
- M.205: composting distractor replaced (also a correct answer)
- checked: no content change, Park ref added: M.6, M.7, M.20, M.21, M.31, M.35, M.36, M.41, M.42, M.43, M.55, M.56, M.58, M.59, M.61, M.66, M.67, M.75, M.76, M.78, M.80, M.88, M.95, M.96, M.97, M.98, M.105, M.106, M.112, M.113, M.114, M.116, M.117, M.123, M.124, M.126, M.127, M.128, M.129, M.130, M.131, M.138, M.140, M.142, M.143, M.144, M.145, M.146, M.149, M.162, M.163, M.164, M.165, M.172, M.173, M.174, M.175, M.177, M.182, M.183, M.186, M.187, M.188, M.189, M.190, M.191, M.192, M.193, M.195, M.197, M.200, M.203, M.206, M.208, M.213, M.214, M.215, M.217, M.220, M.221, M.222, M.223, M.224, M.225, M.226

### Batch 4 — 22M, 21M, 20M&Nov, 20Ju, 19Nov (cache v46)
Last site item checked: M.324 (19Nov Q18). PDF pass complete. No retirements.
- M.256: keys fixed: clinical/subclinical infection T, conflict flagged
- M.1: ref
- M.323: rebuilt: duplicate rows removed, temperamental changes and repression restored; daggers removed
- M.408: ref
- M.401: cold sensation T, conflict flagged
- M.86: ref
- M.351: ref
- M.134: stem turned positive to match the printed key; dagger removed
- M.308: option text fixed; ref
- M.409: ref
- M.309: ref
- M.29: ref
- M.50: missing key supplied (latent cases T, PDF blank)
- M.310: ref
- M.137: ref
- M.378: wording; ref
- M.16: bed turnover flagged; option b typo
- M.51: wording; ref
- M.34: blank PDF key noted on d
- M.379: wording; ref
- M.247: missing key supplied (rat flea T)
- M.196: ref
- M.369: site key b was not the PDF key; flagged; chemicals key supplied
- M.395: ref
- M.380: ref
- M.389: German measles key fixed (T), conflict flagged; daggers removed
- M.352: sesame T, conflict flagged; dagger removed
- M.410: split garbled option into d/e (now 5 options); key supplied for d
- M.411: key supplied per Park (20Ju has no key in PDF)
- M.264: key supplied per Park (20Ju has no key in PDF)
- M.381: key supplied per Park (20Ju has no key in PDF)
- M.414: key supplied per Park (20Ju has no key in PDF)
- M.289: key supplied per Park (20Ju has no key in PDF)
- M.382: key supplied per Park (20Ju has no key in PDF)
- M.157: key supplied per Park (20Ju has no key in PDF)
- M.311: key supplied per Park (20Ju has no key in PDF)
- M.312: key supplied per Park (20Ju has no key in PDF)
- M.52: key supplied per Park (20Ju has no key in PDF)
- M.122: key supplied per Park (20Ju has no key in PDF)
- M.30: key supplied per Park (20Ju has no key in PDF)
- M.180: key supplied per Park (20Ju has no key in PDF)
- M.74: key supplied per Park (20Ju has no key in PDF)
- M.111: stem turned positive to match key; hypertension key fixed to PDF (T); dagger removed
- M.53: ref
- M.54: missing key supplied (pathogenicity T)
- M.420: ref
- M.248: missing key supplied (enteric fever T)
- M.324: wording; ref

### Batch 3 — 23M, 22Nov-A, 22Nov-B (cache v45)
Last site item checked: M.307 (22Nov-B Q20). Retired: M.10→M.9, M.155→M.154, M.405→M.403.
- M.376: morbidity indicator set T with conflict; options made self-contained; 19Nov year on d
- M.8: rebuilt: duplicate age/housing rows removed, poor nutrition and sex restored; all five keys set per Park and flagged
- M.377: stem clarified (PDF: "Cohort study means")
- M.10: deleted (merged into M.9)
- M.9: merged M.10 (19Nov "life style may be influenced by"); 23M negative stem turned positive; merged 19Nov item; emotion flagged
- M.103: rebuilt: duplicate dynamic rows removed (21M key is F, was misread T)
- M.228: typos; 19Nov year on FWA
- M.28: ref
- M.234: ref
- M.304: keys set to PDF (750 ml F); protein statement F with conflict
- M.194: ref
- M.235: dagger removed
- M.397: dagger removed
- M.212: ref
- M.322: wording; ref
- M.71: keys fixed: sanitation T (PDF), occupational protection F with conflict
- M.400: wording; ref
- M.155: deleted (merged into M.154)
- M.154: merged M.155 ("printed media includes", 22Nov-B and 22M); 22Nov-A stem/key mismatch resolved (keys were wrong on site); merged M.155
- M.121: keys a-d set per standard definition and flagged; dagger removed
- M.419: key fixed to PDF: low vegetable intake T; dagger removed
- M.85: ref
- M.405: deleted (merged into M.403)
- M.403: merged M.405 (22Nov-B "AIDS spreads by"); rebuilt: conflicting duplicate rows removed; negative stems turned positive; merged M.405
- M.72: 22Nov-B statements merged in
- M.49: ref
- M.246: 21M KFD key is F (flagged); trachoma 21M/22Nov-A T, 22M F flagged
- M.335: ref
- M.418: key fixed: weight loss T, conflict flagged; dagger removed
- M.255: dagger removed
- M.305: rebuilt: duplicate rows removed; IUGR restored; conflicts flagged
- M.359: key fixed to PDF: monkey face F; muscle wasting T with conflict
- M.236: board-meeting statement flagged (PDF T)
- M.73: ref
- M.169: ref
- M.104: ref
- M.306: dagger removed; wording
- M.343: ref
- M.404: wording; ref
- M.344: all keys F per ICMR-NIN 2020, flagged; dagger removed
- M.156: ref
- M.307: ref; 20M&Nov note

### Batch 2 — 24Nov, 24M, 23Nov (cache v44)
Last site item checked: M.417 (23Nov Q20). Retired: M.15→M.14.
- M.407: rebuilt: duplicate pancreatitis rows removed (24Nov key is T); conflicts flagged
- M.82: site key evaluation T was not the PDF key (F); both evaluation and reinforcement flagged against Park
- M.227: ref; 20Ju note
- M.176: rebuilt from 3 papers (old item mixed 24Nov statements with 3 years)
- M.341: ref
- M.47: 23Nov year on hepatitis B
- M.13: ref
- M.69: ref
- M.373: key fixed: decreased recovery rate T, conflict flagged
- M.385: key fixed: rubella T, conflict flagged; dagger removed
- M.374: wording; dagger removed
- M.102: ref
- M.211: ref
- M.33: keys fixed to PDF: community participation F, equitable distribution F
- M.83: dagger removed
- M.168: daggers removed
- M.120: typo; years
- M.386: ref
- M.416: 22M OCP key (F) flagged; multiparity 22M year
- M.263: ref
- M.15: deleted (merged into M.14)
- M.14: merged M.15 (22Nov-A "PQLI excludes"); rebuilt from 3 papers; LE at age one vs at birth separated
- M.202: key fixed to PDF: composting T
- M.375: 23M F statements replace all-true 24M ones
- M.388: rebuilt: duplicate age rows removed, sex added; 24M all-T key flagged
- M.152: key fixed: comprehension F, conflict flagged; dagger removed
- M.387: rebuilt: 24M gonorrhoea key is T (was misread F); conflict removed; syphilis restored
- M.334: starch (22M, 21M) replaces dextrose; 21M year added
- M.396: conflict flagged on drinks eagerly (PDF T)
- M.48: rebuilt from 2 papers; defervescence conflict flagged
- M.207: rebuilt: duplicate rheumatic fever rows merged into one flagged row; scabies restored
- M.302: ref
- M.365: ref
- M.70: stem clarified; dagger removed
- M.84: typo jealously; dagger removed
- M.153: ref
- M.233: ref incl. USAID 2025 note
- M.115: ref
- M.399: ref
- M.421: key fixed to PDF: monitoring T
- M.342: key fixed to PDF: xerophthalmia T; dagger removed
- M.402: key fixed to PDF: candidiasis F; fever 1 wk-1 mo flagged (major sign is >1 month)
- M.303: key fixed: elderly grand multipara T, conflict flagged
- M.287: dagger removed
- M.417: dagger removed

### Batch 1 — 26M, 25Nov, 25M (cache v43)
Last site id checked: SBA/TF of 25M (M.398). Retired: M.87→M.81, M.199→M.198, M.288/M.290→M.286.
- M.87: deleted (merged into M.81)
- M.81: merged M.87 (19Nov "primary motives exclude", keyed as include); rebuilt: duplicate "affection" rows removed, 22Nov-B misread fixed, years 26M/25M/23M/22Nov-B/19Nov
- M.244: stem grammar; ref
- M.167: rebuilt with most-asked statements; typo parsuation; years 26M/23Nov/20Ju
- M.12: "prevention rate" misprint corrected to prevalence rate; 24Nov year confirmed; daggers removed
- M.333: stem/option wording; ref
- M.32: 21M year on option e; conflict kept (papers disagree)
- M.370: rebuilt: duplicate epidemic/famine rows removed; 26M famine key is F (was misread T)
- M.199: deleted (merged into M.198)
- M.198: merged M.199 (19Nov "all are greenhouse gases except"); merged 19Nov "except" item; CFC conflict flagged (25M key F)
- M.261: years/option years checked; MR counted as measles
- M.415: rebuilt: duplicate fever rows removed; 25M fever key flagged
- M.133: checked vs PDF
- M.412: checked vs PDF
- M.390: checked vs PDF
- M.368: checked vs PDF
- M.358: checked vs PDF
- M.150: checked vs PDF
- M.393: checked vs PDF
- M.392: checked vs PDF
- M.413: checked vs PDF
- M.260: checked vs PDF
- M.79: stem/option grammar; ref
- M.288: deleted (merged into M.286)
- M.286: merged M.288 (23M "demographic process exclude", keyed as include); merged M.290 (19Nov "not demographic processes", keyed as include); rebuilt from 6 papers; morbidity/nuptiality conflicts flagged
- M.290: deleted (merged into M.286)
- M.340: daggers removed; keys confirmed
- M.46: rebuilt: duplicate calcium carbonate rows removed, uric acid restored; 25Nov key flagged
- M.394: 22M/21M added to diarrhoea; typo
- M.231: Malaysia (25M, 20M&Nov) replaces single-paper Maldives; spellings
- M.232: spelling; ref
- M.101: ref; 20Ju note
- M.110: ref
- M.383: checked vs PDF
- M.179: checked vs PDF
- M.136: checked vs PDF
- M.118: checked vs PDF
- M.68: checked vs PDF
- M.391: checked vs PDF
- M.166: checked vs PDF
- M.151: checked vs PDF
- M.119: checked vs PDF
- M.109: checked vs PDF
- M.384: typos (pick -> peak)
- M.245: wording; ref
- M.350: ref
- M.210: key fixed: red line F (blue line), conflict flagged
- M.371: typo field trail; ref
- M.372: PPV key fixed to T, conflict flagged; daggers removed
- M.27: rebuilt: duplicate multidisciplinary rows removed (both papers key F), "share common health goal" restored
- M.301: option e misprint corrected (optimal), key T, conflict flagged
- M.406: mumps (24M, 23Nov) replaces single-paper whooping cough; years confirmed
- M.141: 21M median added
- M.262: wording; ref
- M.398: daggers removed; ref
- M.413: ref verified (Bangladesh CBE programme)

RETIRED: M.10, M.15, M.24, M.25, M.26, M.36, M.44, M.45, M.62, M.63, M.64, M.65, M.77, M.87, M.90, M.94, M.99, M.100, M.107, M.108, M.125, M.135, M.139, M.155, M.161, M.178, M.181, M.190, M.199, M.201, M.209, M.218, M.219, M.230, M.252, M.265, M.267, M.283, M.284, M.285, M.288, M.290, M.299, M.300, M.318, M.319, M.321, M.348, M.349, M.356, M.364, M.367, M.405, M.451, M.452, M.453, M.454, M.455, M.462, M.464, M.501, M.502, M.503, M.504, M.505, M.506, M.507, M.508, M.509, M.510, M.511, M.523, M.542
