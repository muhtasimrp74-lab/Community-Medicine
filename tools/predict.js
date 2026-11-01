/* Builds data/predict.js : 3 prediction papers for the 3rd Prof written exam.
   Run: node tools/predict.js   (reads data/du.js + data/mcq.js)
   Method: recency-weighted frequency of each bank question/topic (sessions 2019 onward weigh most),
   topic diversity inside every group, no question repeated across the three papers. */
global.window = global; const fs = require('fs'), R = __dirname + '/../';
(0, eval)(fs.readFileSync(R + 'data/du.js', 'utf8')); (0, eval)(fs.readFileSync(R + 'data/mcq.js', 'utf8'));
const DU = CM.du, MCQ = CM.mcq;
const strip = h => String(h).replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const GM = {
  A: ['Introduction to Community Medicine', 'Public Health', 'Concept of Health', 'Determinants of Health', 'Health Indicators & MDGs', 'Health Care of the Community', 'PHC', 'Bhore Committee', 'Concept of Disease', 'Disease Prevention, Control and Eradication', 'Community Diagnosis and Treatment', 'Behavioral Science', 'Learning and Personality', 'Mental Health', 'I.Q.', 'Family and Leadership', 'Arthropod Diseases and Control', 'National Health Situations & Programmes', 'International Health'],
  B: ['Biostatistics and Data', 'Research', 'Sample and Sampling', 'Central Tendency & Measures of Dispersion', 'Basic Principles of Epidemiology', 'Infectious Disease Epidemiology', 'Food & Nutrition', 'Vitamins', 'Mineral Deficiency', 'Malnutrition & PEM', 'Food Poisoning', 'Environmental Health (General)', 'Water & Arsenicosis', 'Air Pollution', 'Ventilation & Noise', 'Radiation', 'Green House Effect', 'Housing', 'Disposal of Wastes & Excreta'],
  C: ['Health Administration', 'Maternal and Child Health', 'Family Planning', 'Contraceptive Methods', 'Demography & Fertility', 'School Health', 'Occupational Health', 'Accidents', 'Disasters'],
  D: ['Communication', 'Health Education', 'Immunity & Immune Response', 'Herd Immunity', 'Vaccine, Immunization & NID', 'Sterilization & Disinfection', 'Communicable Diseases', 'Non-Communicable Diseases']
};
const TG = {}; for (const g in GM) GM[g].forEach(t => TG[t] = g);
const PG = { 1: 'A', 2: 'B', 3: 'D', 4: 'B', 5: 'C', 6: 'A', 7: 'A', 8: 'C', 9: 'B', 10: 'B', 11: 'D' };
const grp = q => TG[q.topic] || PG[q.part];
const SES = { Ja: 1, M: 2, Ju: 3, S: 4, Nov: 5 };
function yp(c) { c = String(c).replace(/\u2020/g, ''); let m = c.match(/^(\d{2})(Ja|M|Ju|S|Nov)/); if (m) return { y: 2000 + +m[1], k: (2000 + +m[1]) * 10 + SES[m[2]], c: '20' + c }; m = c.match(/^(\d{2})/); return { y: m ? 2000 + +m[1] : 0, k: m ? (2000 + +m[1]) * 10 : 0, c: m ? '20' + c : '' }; }
function stat(q) {
  const ps = (q.years || []).map(yp), last = ps.reduce((a, p) => p.k > a.k ? p : a, { k: 0, c: '' });
  q.tot = ps.length; q.n19 = ps.filter(p => p.y >= 2019).length; q.last = last.k; q.lastc = last.c;
  q.score = ps.reduce((s, p) => s + (p.y >= 2019 ? 1 + (p.y - 2019) * 0.35 : p.y >= 2013 ? 0.35 : 0.15), 0); q.g = grp(q);
}
DU.forEach(stat); MCQ.forEach(stat);
const norm = q => strip(q.q || q.stem).toLowerCase().replace(/[^a-z ]/g, '').slice(0, 50);
const why = q => q.tot ? 'Asked ' + q.tot + '\u00d7 \u00b7 ' + q.n19 + ' since 2019 \u00b7 last ' + (q.lastc || 'n/a') : 'New MCQ (untested)';
const tier = q => q.score >= 6 ? 'High' : q.score >= 3 ? 'Medium' : 'Watch';
// topic weights inside each group
const TW = {}; DU.forEach(q => { TW[q.topic] = (TW[q.topic] || 0) + q.score; });
const used = new Set(), seen = new Set();
const take = q => { used.add(q.id); seen.add(norm(q)); };
const free = q => !used.has(q.id) && !seen.has(norm(q));
// ---------- SAQ
const saqPool = g => DU.filter(q => q.g === g && !q.kind && strip(q.q).length > 25 && strip(q.q).length < 300);
function pickSaq(g, paper) {
  const pool = saqPool(g).filter(free);
  const topics = [...new Set(pool.map(q => q.topic))].sort((a, b) => TW[b] - TW[a]);
  let order = topics.slice(); const rot = paper - 1;
  if (rot) order = order.slice(rot).concat(order.slice(0, rot));
  const h = topics.find(t => TW[t] > 100); // dominant topic (Communicable Diseases) is asked twice per group paper
  if (h) { order = order.filter(t => t !== h); const i = (paper - 1) % 2; order.splice(i, 0, h); order.splice(i + 2, 0, h); }
  const out = [];
  const best = (t) => { const c = pool.filter(q => q.topic === t && free(q) && !out.includes(q)); if (paper === 3) c.sort((a, b) => (b.tot >= 3 && b.last <= 20252 ? 100 : 0) + b.tot - ((a.tot >= 3 && a.last <= 20252 ? 100 : 0) + a.tot)); else c.sort((a, b) => b.score - a.score); return c[0]; };
  for (const t of order) { if (out.length >= 4) break; const q = best(t); if (q) { out.push(q); take(q); } }
  return out.map(q => ({ id: q.id, why: why(q), tier: paper === 3 && q.tot >= 3 && q.last <= 20252 ? 'Overdue' : tier(q) }));
}
// ---------- SEQ (scenario) questions
const NEW = {
  A3: { q: '<p>A Union Health &amp; Family Welfare Centre in a rural upazila has a shortage of doctors, essential drugs and equipment, so most patients go straight to a district hospital. [2+2.5+2.5]</p><p>a) Define Universal Health Coverage and mention its three dimensions. (2)<br>b) Name the components (elements) of Primary Health Care as outlined at Alma-Ata. (2.5)<br>c) Suggest measures to move Bangladesh towards UHC through strengthened primary care. (2.5)</p>', why: 'New scenario \u00b7 UHC and PHC reform are live topics (Health Sector Reform Commission, SDG 3.8)' },
  D2: { q: '<p>In February a 6-year-old boy from a village in Naogaon developed high fever, headache and altered consciousness, and died within three days. The family had been drinking raw date-palm sap. [2+3+2]</p><p>a) What is the probable disease and how is it transmitted? (2)<br>b) Describe the preventive measures at community level. (3)<br>c) What actions should the health team take to respond to this outbreak? (2)</p>', why: 'New scenario \u00b7 Nipah is a recurrent seasonal outbreak in Bangladesh' }
};
const seqPool = g => DU.filter(q => q.g === g && q.kind === 'Case-based').sort((a, b) => (TW[b.topic] + b.score) - (TW[a.topic] + a.score));
function pickSeq(g, paper) {
  if (NEW[g + paper]) return { custom: NEW[g + paper] };
  const p = seqPool(g).filter(free); const q = p[0]; take(q);
  return { id: q.id, why: 'Scenario-type \u00b7 topic asked ' + DU.filter(x => x.topic === q.topic).reduce((s, x) => s + x.tot, 0) + '\u00d7 overall', tier: tier(q) };
}
// ---------- MCQ
const SPLIT = { 1: { A: 3, B: 3, C: 2, D: 2 }, 2: { A: 2, B: 3, C: 2, D: 3 }, 3: { A: 3, B: 2, C: 3, D: 2 } };
function pickMcq(kind, paper) {
  const out = [];
  for (const g of 'ABCD') {
    const cand = MCQ.filter(q => q.kind === kind && q.g === g && free(q) && !(q.opts || []).some(o => !o.t)).sort((a, b) => (TW[b.topic] || 0) / 10 + b.score - ((TW[a.topic] || 0) / 10 + a.score));
    const tc = {}; let n = 0;
    for (const q of cand) { if (n >= SPLIT[paper][g]) break; if ((tc[q.topic] || 0) >= 1 + (paper > 1 ? 0 : 1) && cand.length > 12) continue; tc[q.topic] = (tc[q.topic] || 0) + 1; out.push(q.id); take(q); n++; }
  }
  return out;
}
const TITLES = [
  ['Paper 1', 'The Banker', 'Highest-probability questions: the top topics of every group, ranked by recency-weighted frequency (2019\u20132026 sessions weigh most).'],
  ['Paper 2', 'The Rotation', 'The next layer: second-ranked topics and different angles on the big chapters, so a different mix from Paper 1 is covered.'],
  ['Paper 3', 'Overdue & Trend', 'Questions that were asked often but have not appeared in the last two sessions, plus new scenario items built from current news and programme changes.']
];
const papers = [1, 2, 3].map(n => {
  const P = { no: n, name: TITLES[n - 1][0], title: TITLES[n - 1][1], blurb: TITLES[n - 1][2], mtf: pickMcq('TF', n), sba: pickMcq('SBA', n), groups: {} };
  for (const g of 'ABCD') { P.groups[g] = { saq: pickSaq(g, n), seq: pickSeq(g, n) }; }
  return P;
});
// new trend SAQs placed into Paper 3 (replace the lowest-ranked SAQ of the group)
const TREND = {
  C: { q: '<p>Discuss the rising trend of caesarean section in Bangladesh and its public health implications.</p>', why: 'New \u00b7 BDHS 2022 / maternal-health trend question' },
  D: { q: '<p>Discuss the rationale for introducing typhoid conjugate vaccine into the national EPI of Bangladesh.</p>', why: 'New \u00b7 TCV campaign and routine EPI introduction (2025\u201326)' }
};
for (const g in TREND) { const s = papers[2].groups[g].saq; s[s.length - 1] = { custom: TREND[g], tier: 'New' }; }
const out = { built: new Date().toISOString().slice(0, 10), papers };
fs.writeFileSync(R + 'data/predict.js', 'window.CM=window.CM||{};CM.predict=' + JSON.stringify(out) + ';\n');
const ids = new Set(); let dup = 0;
papers.forEach(p => { [].concat(p.mtf, p.sba).forEach(i => { if (ids.has(i)) dup++; ids.add(i); }); for (const g in p.groups) { p.groups[g].saq.forEach(s => { if (s.id) { if (ids.has(s.id)) dup++; ids.add(s.id); } }); const s = p.groups[g].seq; if (s.id) { if (ids.has(s.id)) dup++; ids.add(s.id); } } });
papers.forEach(p => console.log(p.name, 'MTF', p.mtf.length, 'SBA', p.sba.length, Object.entries(p.groups).map(([g, v]) => g + ':' + v.saq.length + '+' + (v.seq.id || 'new')).join(' ')));
console.log('items', ids.size, 'duplicates', dup);
