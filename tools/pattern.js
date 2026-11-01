/* Pattern analysis + walk-forward backtest. Exports model for tools/predict4.js.
   Time unit = half-year (M/Ja -> 0, Ju/S/Nov -> 1), so an even lag = same season, odd lag = opposite season. */
global.window = global; const fs = require('fs'), R = __dirname + '/../';
(0, eval)(fs.readFileSync(R + 'data/du.js', 'utf8')); (0, eval)(fs.readFileSync(R + 'data/mcq.js', 'utf8'));
const DU = CM.du, MCQ = CM.mcq;
function hy(c) { const m = String(c).replace(/\u2020/g, '').match(/^(\d{2})(Ja|M|Ju|S|Nov)/); if (!m) return null; return (2000 + +m[1]) * 2 + (m[2] === 'Ja' || m[2] === 'M' ? 0 : 1); }
const lab = h => Math.floor(h / 2) + (h % 2 ? 'Nov' : 'M');
const items = DU.concat(MCQ.filter(q => q.years && q.years.length));
items.forEach(q => { q.H = [...new Set((q.years || []).map(hy).filter(x => x))].sort((a, b) => a - b); });
const sessCount = {}; DU.forEach(q => q.H.forEach(h => sessCount[h] = (sessCount[h] || 0) + 1));
const SESS = Object.keys(sessCount).map(Number).filter(h => sessCount[h] >= 25).sort((a, b) => a - b);
const MAXL = 10;
const CNT = {}; DU.forEach(q => { CNT[q.topic] = (CNT[q.topic] || 0) + 1; });
const HOT = (t, T) => DU.filter(x => x.topic === t && x.H.some(h => h < T && T - h <= 4)).length; // questions of the topic asked in the last 2 years

// lift[L] = P(asked at T | asked at T-L) / P(asked at T), trained on targets < T
function lifts(T, topic) {
  const num = Array(MAXL + 1).fill(0), den = Array(MAXL + 1).fill(0), base = [];
  const pool = topic ? Object.values(TOPICS) : DU;
  SESS.filter(t => t < T && t >= 2010 * 2).forEach(t => {
    const set = x => x.H.includes(t); const p = pool.filter(set).length / pool.length; base.push(p);
    pool.forEach(x => { for (let L = 1; L <= MAXL; L++) if (x.H.includes(t - L)) { den[L]++; if (set(x)) num[L]++; } });
  });
  const b = base.reduce((a, c) => a + c, 0) / (base.length || 1) || 0.05;
  return num.map((n, L) => den[L] ? Math.max(0, (n / den[L]) / b) : 1);
}
const TOPICS = {}; DU.concat(MCQ).forEach(q => { const t = TOPICS[q.topic] = TOPICS[q.topic] || { topic: q.topic, H: new Set() }; (q.H || (q.H = [])); (q.years || []).map(hy).filter(x => x).forEach(h => t.H.add(h)); });
Object.values(TOPICS).forEach(t => t.H = [...t.H]);
const add = (x, T, lf) => x.H.filter(h => h < T && T - h <= MAXL).reduce((s, h) => s + Math.max(0, lf[T - h] - 1), 0);
const MODELS = {
  'Recency-weighted frequency (old method)': (q, T) => q.H.filter(h => h < T).reduce((s, h) => s + (h >= 4038 ? 1 + (h - 4038) * 0.1 : 0.2), 0),
  'Plain frequency': (q, T) => q.H.filter(h => h < T).length,
  'Lag-lift (learned from past sessions)': (q, T, c) => add(q, T, c.lq),
  'Lag-lift + topic rhythm': (q, T, c) => add(q, T, c.lq) + 1.5 * add(TOPICS[q.topic], T, c.lt),
  'Frequency + topic hotness (chosen)': (q, T) => q.H.filter(h => h < T).length + 0.15 * (HOT(q.topic, T)) / Math.sqrt(CNT[q.topic] || 1)
};
function ctx(T) { return { lq: lifts(T, false), lt: lifts(T, true) }; }
function model(name, T) { const c = ctx(T), f = MODELS[name]; return q => f(q, T, c); }
function backtest(N) {
  const res = {}; Object.keys(MODELS).forEach(m => res[m] = []);
  const targets = SESS.filter(t => t >= 2019 * 2 && t < 4053);
  targets.forEach(T => {
    const actual = DU.filter(q => q.H.includes(T)), c = ctx(T), n = Math.min(N, actual.length);
    Object.keys(MODELS).forEach(m => {
      const top = DU.map(q => [q, MODELS[m](q, T, c) + 1e-6 * q.n]).sort((a, b) => b[1] - a[1]).slice(0, N).filter(x => x[0].H.some(h => h < T));
      res[m].push(top.filter(x => x[0].H.includes(T)).length / N);
    });
    res._base = (res._base || []); res._base.push(actual.length / DU.length);
  });
  return { targets, res };
}
module.exports = { HOT, CNT, DU, MCQ, items, TOPICS, SESS, hy, lab, MODELS, model, ctx, lifts, backtest, add };
if (require.main === module) {
  const N = 40, { targets, res } = backtest(N), avg = a => a.reduce((x, y) => x + y, 0) / a.length;
  console.log('Targets:', targets.map(lab).join(' '));
  console.log('Random hit-rate (chance):', avg(res._base).toFixed(3));
  Object.keys(MODELS).forEach(m => console.log(m.padEnd(42), 'precision@' + N + ' mean', avg(res[m]).toFixed(3), '| last4', avg(res[m].slice(-4)).toFixed(3), '|', res[m].map(x => x.toFixed(2)).join(' ')));
  const lf = lifts(4053, false); console.log('Lag lift (half-years back -> x chance):', lf.slice(1).map((x, i) => (i + 1) + ':' + x.toFixed(2)).join(' '));
}
