/* Paper 4 : "Pattern Model". Run: node tools/predict4.js  (runs predict.js for papers 1-3, then adds Paper 4 + analysis).
   Scores every bank item for the next session (2026 Nov) with the best walk-forward-tested model in tools/pattern.js. */
const base = require('./predict.js'), PT = require('./pattern.js'), fs = require('fs'), R = __dirname + '/../';
const { strip, grp, papers, out } = base, { DU, MCQ, MODELS, HOT, TOPICS } = PT;
const byId = {}; DU.forEach(q => byId[q.id] = q); MCQ.forEach(q => q.H = q.H || []);
const T = 4053, M = 'Frequency + topic hotness (chosen)', f = MODELS[M];
const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
// ---- 1. backtest evidence
const N = 40, bt = PT.backtest(N), names = Object.keys(MODELS);
const rows = names.map(n => ({ name: n, mean: +avg(bt.res[n]).toFixed(3), last4: +avg(bt.res[n].slice(-4)).toFixed(3) }));
const chance = +avg(bt.res._base).toFixed(3);
const gaps = {}; DU.forEach(q => { for (let i = 1; i < q.H.length; i++) if (q.H[i] >= 4038) { const d = q.H[i] - q.H[i - 1]; gaps[d] = (gaps[d] || 0) + 1; } });
const sameSeason = [2, 4, 6, 8].reduce((s, d) => s + (gaps[d] || 0), 0), oppSeason = [1, 3, 5, 7].reduce((s, d) => s + (gaps[d] || 0), 0);
let a = 0, b = 0, c = 0, d = 0; PT.SESS.filter(t => t >= 4038).forEach(t => DU.forEach(q => { const prev = q.H.includes(t - 1) || q.H.includes(t - 2), was = q.H.filter(h => h < t - 2).length >= 3; if (prev) { a++; if (q.H.includes(t)) b++; } else if (was) { c++; if (q.H.includes(t)) d++; } }));
// ---- 2. group share of recent sessions (decides how the 20 MCQs and topic emphasis are split)
const recent = PT.SESS.slice(-6), share = { A: 0, B: 0, C: 0, D: 0 };
DU.forEach(q => { const k = q.H.filter(h => recent.includes(h)).length; if (k) share[grp(q)] += k; });
const tot = Object.values(share).reduce((x, y) => x + y, 0);
let split = {}, left = 10; 'ABCD'.split('').forEach(g => { split[g] = Math.floor(share[g] / tot * 10); left -= split[g]; });
'ABCD'.split('').sort((x, y) => (share[y] / tot * 10 % 1) - (share[x] / tot * 10 % 1)).slice(0, left).forEach(g => split[g]++);
// ---- 3. build Paper 4
const inPapers = id => papers.filter(p => [].concat(p.mtf, p.sba).includes(id) || Object.values(p.groups).some(v => v.seq.id === id || v.saq.some(s => s.id === id))).map(p => p.no);
const score = q => f(q, T) + 1e-6 * (1000 - q.n);
const usedSeq = new Set(papers.flatMap(p => Object.values(p.groups).map(v => v.seq.id).filter(Boolean)));
const NEWSEQ = { A: { q: '<p>During the monsoon, many residents of a slum in Dhaka present with fever, headache and body ache. The team finds water collected in discarded tyres, flower pots and water tanks around the houses. [2+3+2]</p><p>a) Name the vector responsible and describe its life cycle. (2)<br>b) Describe the measures of vector control for this vector, with examples of source reduction. (3)<br>c) What is the role of the community in preventing such outbreaks? (2)</p>', why: 'New scenario \u00b7 Arthropods is the hottest Group A topic in recent sessions' } };
const P4 = { no: 4, name: 'Paper 4', title: 'The Pattern Model', blurb: 'Built only from the backtested statistical model: every question is scored for the next session (2026 Nov) by past frequency plus how hot its topic has been in the last two years.', mtf: [], sba: [], groups: {}, model: M };
const usedM = new Set(papers.flatMap(p => [].concat(p.mtf, p.sba)));
['TF', 'SBA'].forEach(kind => 'ABCD'.split('').forEach(g => {
  const cand = MCQ.filter(q => q.kind === kind && grp(q) === g && !usedM.has(q.id) && !(q.opts || []).some(o => !o.t)).sort((x, y) => score(y) - score(x));
  const tc = {}; let n = 0;
  for (const q of cand) { if (n >= split[g]) break; if ((tc[q.topic] || 0) >= 2) continue; tc[q.topic] = (tc[q.topic] || 0) + 1; (kind === 'TF' ? P4.mtf : P4.sba).push(q.id); usedM.add(q.id); n++; }
}));
'ABCD'.split('').forEach(g => {
  const pool = base.saqPool(g).map(q => byId[q.id]).sort((x, y) => score(y) - score(x)), tc = {}, saq = [], seen = new Set();
  for (const q of pool) { if (saq.length >= 4) break; const cap = TOPICS[q.topic] && HOT(q.topic, T) > 25 ? 2 : 1; if ((tc[q.topic] || 0) >= cap || seen.has(base.norm(q))) continue; tc[q.topic] = (tc[q.topic] || 0) + 1; seen.add(base.norm(q)); const o = inPapers(q.id); saq.push({ id: q.id, tier: score(q) >= 12 ? 'High' : score(q) >= 7 ? 'Medium' : 'Watch', why: 'Asked ' + q.H.length + '\u00d7 \u00b7 topic hot: ' + HOT(q.topic, T) + ' Qs in last 2 yrs \u00b7 model score ' + score(q).toFixed(1) + (o.length ? ' \u00b7 also in Paper ' + o.join(',') : '') }); }
  let seq;
  if (NEWSEQ[g]) seq = { custom: NEWSEQ[g] };
  else { const q = DU.filter(x => grp(x) === g && x.kind === 'Case-based' && !usedSeq.has(x.id)).sort((x, y) => score(y) - score(x))[0]; usedSeq.add(q.id); seq = { id: q.id, tier: 'Medium', why: 'Scenario \u00b7 topic ' + q.topic + ' hot: ' + HOT(q.topic, T) + ' Qs in last 2 yrs' }; }
  P4.groups[g] = { saq, seq };
});
out.papers = papers.filter(p => p.no !== 4).concat(P4);
const lf = PT.lifts(T, false).slice(1); out.analysis = { lagMin: +Math.min(...lf).toFixed(1), lagMax: +Math.max(...lf).toFixed(1), sessions: PT.SESS.filter(t => t >= 4038).map(PT.lab), n: N, chance, rows, sameSeason, oppSeason, repeatRecent: +(b / a).toFixed(3), repeatFreq: +(d / c).toFixed(3), split, share };
fs.writeFileSync(R + 'data/predict.js', 'window.CM=window.CM||{};CM.predict=' + JSON.stringify(out) + ';\n');
const ov = P4.groups.A.saq.concat(P4.groups.B.saq, P4.groups.C.saq, P4.groups.D.saq).filter(s => s.why.includes('also in')).length;
console.log('split', JSON.stringify(split), 'MTF', P4.mtf.length, 'SBA', P4.sba.length, 'SAQ overlap with P1-3:', ov + '/16');
console.log(JSON.stringify(out.analysis));
