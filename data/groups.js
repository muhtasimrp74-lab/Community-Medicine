/* Curriculum 2021 written-exam layout (MBBS Community Medicine, section 2.10.3 "Topics distribution in different group of written exam").
   Four groups of 17.5 marks each: SAQ Q1-4 (answer any three, 3.5 each) + SEQ Q5 (compulsory, 7). MCQ (MTF 10 + SBA 10) covers all topics.
   This file re-arranges the question banks at load time: every item keeps its id (so progress, notes and handwritten marks are untouched),
   but its `part` becomes one of the 16 curriculum chapters below (1-16, A1..D3) and `G` its group. The original part is kept in `p0`.
   Loaded after data/du.js and data/mcq.js, before the app. Edit TOPICS to move a topic between chapters. */
(function () {
  var CM = window.CM = window.CM || {};
  var GROUPS = {
    A: { name: 'Group A', topics: ['Concept of Public Health, Community Medicine, Health and Disease', 'HFA, Primary Health Care, Universal Health Coverage and existing National Health Programmes, MDGs, SDG', 'Behavioural Science', 'Medical Entomology'] },
    B: { name: 'Group B', topics: ['Principles of Epidemiology', 'Research methodology and Biostatistics', 'Public Health Nutrition', 'Environment and Health'] },
    C: { name: 'Group C', topics: ['Public Health Administration and Management', 'MCH-FP and Demography', 'School Health Service', 'Occupational Health'] },
    D: { name: 'Group D', topics: ['Health Communication and Health Education', 'Immunity, Immunization and Disinfection', 'Epidemiology of CD and NCD'] }
  };
  /* chapter: code, group, title, the bank topics it holds (in teaching order). Topics marked * are not named in the curriculum table and are
     placed where the site's exam predictions already put them. */
  var CH = [
    ['A1', 'A', 'Public Health, Community Medicine, Health & Disease', ['Introduction to Community Medicine', 'Public Health', 'Concept of Health', 'Determinants of Health', 'Health Indicators & MDGs', 'Concept of Disease', 'Disease Prevention, Control and Eradication', 'Community Diagnosis and Treatment']],
    ['A2', 'A', 'HFA, PHC, UHC, National Programmes, MDGs & SDGs', ['Health Care of the Community', 'PHC', 'Bhore Committee', 'National Health Situations & Programmes', 'International Health*']],
    ['A3', 'A', 'Behavioural Science', ['Behavioral Science', 'Learning and Personality', 'Mental Health', 'I.Q.', 'Family and Leadership']],
    ['A4', 'A', 'Medical Entomology', ['Arthropod Diseases and Control']],
    ['B1', 'B', 'Principles of Epidemiology', ['Basic Principles of Epidemiology', 'Infectious Disease Epidemiology']],
    ['B2', 'B', 'Research Methodology & Biostatistics', ['Research', 'Biostatistics and Data', 'Sample and Sampling', 'Central Tendency & Measures of Dispersion']],
    ['B3', 'B', 'Public Health Nutrition', ['Food & Nutrition']],
    ['B4', 'B', 'Environment & Health', ['Environmental Health (General)', 'Water & Arsenicosis', 'Air Pollution', 'Ventilation & Noise', 'Radiation', 'Green House Effect', 'Housing', 'Disposal of Wastes & Excreta']],
    ['C1', 'C', 'Public Health Administration & Management', ['Health Administration']],
    ['C2', 'C', 'MCH-FP & Demography', ['Demography & Fertility', 'Maternal and Child Health', 'Family Planning', 'Contraceptive Methods']],
    ['C3', 'C', 'School Health Service', ['School Health']],
    ['C4', 'C', 'Occupational Health', ['Occupational Health']],
    ['C5', 'C', 'Accidents & Disaster Management*', ['Accidents', 'Disasters']],
    ['D1', 'D', 'Health Communication & Health Education', ['Communication', 'Health Education']],
    ['D2', 'D', 'Immunity, Immunization & Disinfection', ['Immunity & Immune Response', 'Herd Immunity', 'Vaccine, Immunization & NID', 'Sterilization & Disinfection']],
    ['D3', 'D', 'Epidemiology of CD & NCD', ['Communicable Diseases', 'Non-Communicable Diseases']]
  ];
  var MDG = /\bMDGs?\b|\bSDGs?\b|millennium development|sustainable development/i;
  var T = {}, rank = {}, parts = {}, chapters = [];
  CH.forEach(function (c, i) {
    var n = i + 1;
    parts[n] = c[2].replace(/\*$/, '');
    chapters.push({ n: n, code: c[0], g: c[1], title: c[2].replace(/\*$/, ''), extra: /\*$/.test(c[2]), topics: c[3].map(function (t) { return t.replace(/\*$/, ''); }) });
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
  if (CM.layout !== 'groups2021') {
    var subs = {};
    Object.keys(CM.subs || {}).forEach(function (k) { var t = k.slice(k.indexOf('|') + 1); if (T[t]) subs[T[t] + '|' + t] = CM.subs[k]; });
    remap(CM.du); remap(CM.mcq);
    CM.subs = subs; CM.parts = parts; CM.chapters = chapters; CM.groups = GROUPS; CM.layout = 'groups2021';
    if (!ok && window.console) console.warn('groups.js: some topics are not mapped to a chapter');
  }
})();
