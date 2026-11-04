/* Written-exam group layout (A-D) of the new curriculum, taken from the DU Third Professional papers of Nov 2025 and May 2026.
   Four groups of 17.5 marks each: SAQ Q1-4 (answer any three, 3.5 each) + SEQ Q5 (compulsory, 7). MCQ (MTF 10 + SBA 10) covers all topics.
   This file re-arranges the question banks at load time: every item keeps its id (so progress, notes and handwritten marks are untouched),
   but its `part` becomes one of the 16 curriculum chapters below (1-16, A1..D3) and `G` its group. The original part is kept in `p0`.
   Loaded after data/du.js and data/mcq.js, before the app. Edit TOPICS to move a topic between chapters. */
(function () {
  var CM = window.CM = window.CM || {};
  /* Group layout of the NEW curriculum as actually set in the DU Third Professional papers of Nov 2025 and May 2026 (the 2021 operational-manual
     table that was used before did not match these papers). Rule: where the two papers disagree, May 2026 (latest) wins; topics not yet asked
     sit with their nearest asked neighbour. `ev` records where each chapter's questions appeared (paper, group, question no.). */
  var GROUPS = {
    A: { name: 'Group A', basis: 'Concept of health & disease, health care & PHC, behavioural science, MCH, immunity & immunization' },
    B: { name: 'Group B', basis: 'Epidemiology, research & biostatistics, family planning, nutrition, health management' },
    C: { name: 'Group C', basis: 'Environment, occupational & school health, communication & health education, international health, entomology, disasters' },
    D: { name: 'Group D', basis: 'Demography, communicable diseases, non-communicable diseases' }
  };
  /* chapter: code, group, title, bank topics (teaching order), evidence */
  var CH = [
    ['A1', 'A', 'Public Health, Community Medicine, Health & Disease', ['Introduction to Community Medicine', 'Public Health', 'Concept of Health', 'Determinants of Health', 'Health Indicators & MDGs', 'Concept of Disease', 'Disease Prevention, Control and Eradication', 'Community Diagnosis and Treatment'], 'May 2026 A1, A2 · Nov 2025 A1 · (integrity: Nov 2025 D3)'],
    ['A2', 'A', 'Health Care, PHC & National Health Programmes', ['Health Care of the Community', 'PHC', 'Bhore Committee', 'National Health Situations & Programmes'], 'Nov 2025 A1'],
    ['A3', 'A', 'Behavioural Science', ['Behavioral Science', 'Learning and Personality', 'Mental Health', 'I.Q.', 'Family and Leadership'], 'May 2026 A3'],
    ['A4', 'A', 'Maternal & Child Health', ['Maternal and Child Health'], 'May 2026 A5 · Nov 2025 A4 · (perinatal mortality: May 2026 D1)'],
    ['A5', 'A', 'Immunity, Immunization & Disinfection', ['Immunity & Immune Response', 'Herd Immunity', 'Vaccine, Immunization & NID', 'Sterilization & Disinfection'], 'May 2026 A4 · (Nov 2025 D1, B5)'],
    ['B1', 'B', 'Principles of Epidemiology', ['Basic Principles of Epidemiology', 'Infectious Disease Epidemiology'], 'May 2026 B1, B5 · Nov 2025 B2 · (Nov 2025 D2)'],
    ['B2', 'B', 'Research Methodology & Biostatistics', ['Research', 'Biostatistics and Data', 'Sample and Sampling', 'Central Tendency & Measures of Dispersion'], 'May 2026 B2 · Nov 2025 B4 · (Nov 2025 A5)'],
    ['B3', 'B', 'Family Planning & Contraception', ['Family Planning', 'Contraceptive Methods'], 'May 2026 B3 · Nov 2025 B1'],
    ['B4', 'B', 'Public Health Nutrition', ['Food & Nutrition'], 'May 2026 B4 · (Nov 2025 C1)'],
    ['B5', 'B', 'Health Administration & Management', ['Health Administration'], 'Nov 2025 B3'],
    ['C1', 'C', 'Environment & Health', ['Environmental Health (General)', 'Water & Arsenicosis', 'Air Pollution', 'Ventilation & Noise', 'Radiation', 'Green House Effect', 'Housing', 'Disposal of Wastes & Excreta'], 'May 2026 C1, C3 · (Nov 2025 A2)'],
    ['C2', 'C', 'Occupational Health', ['Occupational Health'], 'May 2026 C2 · (Nov 2025 A3)'],
    ['C3', 'C', 'School Health Service', ['School Health'], 'May 2026 C1 · (Nov 2025 A3)'],
    ['C4', 'C', 'Health Communication & Health Education', ['Communication', 'Health Education'], 'May 2026 C1 · (Nov 2025 A3)'],
    ['C5', 'C', 'International Health', ['International Health'], 'May 2026 C4'],
    ['C6', 'C', 'Medical Entomology', ['Arthropod Diseases and Control'], 'Nov 2025 C2 · (Nov 2025 A4)'],
    ['C7', 'C', 'Accidents & Disaster Management', ['Disasters', 'Accidents'], 'Nov 2025 C3'],
    ['D1', 'D', 'Demography', ['Demography & Fertility'], 'May 2026 D1 · Nov 2025 D3'],
    ['D2', 'D', 'Communicable Diseases', ['Communicable Diseases'], 'May 2026 D2, D3, D4 · Nov 2025 D4 · (May 2026 C5, Nov 2025 C4)'],
    ['D3', 'D', 'Non-Communicable Diseases', ['Non-Communicable Diseases'], 'May 2026 D4, D5 · Nov 2025 D2, D5 · (Nov 2025 C5)']
  ];
  /* how stable each chapter's group has been across the two new-curriculum papers:
     fixed = same group whenever asked (both papers, or the one paper that asked it); lean = mostly this group, sometimes `alt`; flex = no reliable group (`alt` = groups seen) */
  var STAB = { A1: ['fixed'], A2: ['fixed'], A3: ['fixed'], A4: ['lean', 'D'], A5: ['flex', 'ABD'], B1: ['lean', 'D'], B2: ['lean', 'A'], B3: ['fixed'], B4: ['flex', 'BC'],
    B5: ['fixed'], C1: ['flex', 'AC'], C2: ['flex', 'AC'], C3: ['flex', 'AC'], C4: ['flex', 'AC'], C5: ['fixed'], C6: ['flex', 'AC'], C7: ['fixed'], D1: ['fixed'], D2: ['lean', 'C'], D3: ['lean', 'C'] };
  /* previous layout (v59, "groups2021") so saved filters and scroll positions can be carried over */
  var PREV = { groups2021: [['Introduction to Community Medicine', 'Public Health', 'Concept of Health', 'Determinants of Health', 'Health Indicators & MDGs', 'Concept of Disease', 'Disease Prevention, Control and Eradication', 'Community Diagnosis and Treatment'],
    ['Health Care of the Community', 'PHC', 'Bhore Committee', 'National Health Situations & Programmes', 'International Health'], ['Behavioral Science', 'Learning and Personality', 'Mental Health', 'I.Q.', 'Family and Leadership'],
    ['Arthropod Diseases and Control'], ['Basic Principles of Epidemiology', 'Infectious Disease Epidemiology'], ['Research', 'Biostatistics and Data', 'Sample and Sampling', 'Central Tendency & Measures of Dispersion'],
    ['Food & Nutrition'], ['Environmental Health (General)', 'Water & Arsenicosis', 'Air Pollution', 'Ventilation & Noise', 'Radiation', 'Green House Effect', 'Housing', 'Disposal of Wastes & Excreta'],
    ['Health Administration'], ['Demography & Fertility', 'Maternal and Child Health', 'Family Planning', 'Contraceptive Methods'], ['School Health'], ['Occupational Health'], ['Accidents', 'Disasters'],
    ['Communication', 'Health Education'], ['Immunity & Immune Response', 'Herd Immunity', 'Vaccine, Immunization & NID', 'Sterilization & Disinfection'], ['Communicable Diseases', 'Non-Communicable Diseases']] };
  var MDG = /\bMDGs?\b|\bSDGs?\b|millennium development|sustainable development/i;
  var T = {}, rank = {}, parts = {}, chapters = [];
  CH.forEach(function (c, i) {
    var n = i + 1;
    parts[n] = c[2].replace(/\*$/, '');
    chapters.push({ n: n, code: c[0], g: c[1], title: c[2].replace(/\*$/, ''), extra: /\*$/.test(c[2]), ev: c[4] || '', st: (STAB[c[0]] || ['fixed'])[0], alt: (STAB[c[0]] || [])[1] || '', topics: c[3].map(function (t) { return t.replace(/\*$/, ''); }) });
    c[3].forEach(function (t, j) { t = t.replace(/\*$/, ''); T[t] = n; rank[t] = j; });
  });
  function chapterOf(q) {
    if (q.topic === 'Health Indicators & MDGs' && MDG.test(String(q.q || q.stem || ''))) return 2;
    return T[q.topic] || null;
  }
  var ok = true;
  function remap(list) {
    (list || []).forEach(function (q, i) {
      if (q.p0 == null) q.p0 = q.part;
      var n = chapterOf(q); if (!n) { ok = false; n = 1; }
      q.part = n; q.G = chapters[n - 1].g; q._ix = i;
    });
    (list || []).sort(function (a, b) { return a.part - b.part || (rank[a.topic] - rank[b.topic]) || a._ix - b._ix; });
  }
  /* old chapter number -> new chapter numbers, per previous layout (used by the app to migrate saved filters / positions) */
  var moves = {};
  Object.keys(PREV).forEach(function (L) { moves[L] = {}; PREV[L].forEach(function (tops, i) { var m = []; tops.forEach(function (t) { if (T[t] && m.indexOf(T[t]) < 0) m.push(T[t]); }); if (tops.indexOf('Health Indicators & MDGs') >= 0 && m.indexOf(2) < 0) m.push(2); moves[L][i + 1] = m; }); });
  if (CM.layout !== 'groups2026') {
    var subs = {};
    Object.keys(CM.subs || {}).forEach(function (k) { var t = k.slice(k.indexOf('|') + 1); if (T[t]) subs[T[t] + '|' + t] = CM.subs[k]; });
    remap(CM.du); remap(CM.mcq);
    CM.subs = subs; CM.parts = parts; CM.chapters = chapters; CM.groups = GROUPS; CM.layoutMoves = moves; CM.layout = 'groups2026';
    if (!ok && window.console) console.warn('groups.js: some topics are not mapped to a chapter');
  }
})();
