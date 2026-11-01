/* One-off + repeatable taxonomy pass: node tools/taxonomy.js
   - moves leftover "Other topics" MCQs and DU "Others" into their real topics
   - folds the loose Part 9 MCQ topics into Food & Nutrition
   - assigns a subtopic (q.sub) to every MCQ / DU question in topics that have subtopics
   - writes CM.subs (ordered subtopic list per "part|topic") to data/du.js
   Safe to re-run: it only fills empty subs and fixes topics. */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
global.window = global;
const duSrc = fs.readFileSync(path.join(root, 'data/du.js'), 'utf8');
const mqSrc = fs.readFileSync(path.join(root, 'data/mcq.js'), 'utf8');
(0, eval)(duSrc); (0, eval)(mqSrc);
const DU = CM.du, MCQ = CM.mcq;

const FN = 'Food & Nutrition', MCH = 'Maternal and Child Health', CD = 'Communicable Diseases', NCD = 'Non-Communicable Diseases', MIN = 'Mineral Deficiency (Iron + Iodine + Zinc)';
/* ordered subtopics per part|topic, each [name, regex]. First match wins, so specific rules come first. */
const RULES = {
  '5|Occupational Health': [['Agricultural Workers', /agricultur|farmer|pesticide|organophosph|rural worker/i], ['Prevention of Occupational Hazards', /prevent\w* of (occupational )?hazard|hazard.*prevent|protective (equipment|device)|\bPPE\b|engineering control/i]],
  '7|Arthropod Diseases and Control': [['Sand Fly & Louse Infestation', /sand ?fly|phlebotom|\blice\b|louse|pediculo/i], ['Fleas and Scabies', /\bflea|scabies|sarcopt|xenopsylla|\bmite|\btick/i], ['Mosquito', /mosquito|culex|aedes|anophel|larvicid|larva/i], ['House Fly', /house ?fly|\bfl(y|ies)\b|musca/i]],
  '8|Maternal and Child Health': [['MMR & IMR', /maternal mortality|\bMMR\b|\bIMR\b|infant mortality|neonatal mortality|perinatal|child mortality|under.?5 mortality|under.?five|maternal death|stillbirth/i], ['Postnatal Care', /postnatal|post-natal|puerper|\bPNC\b|after delivery/i], ['Ante Natal Care (ANC)', /antenatal|ante-natal|ante natal|\bANC\b|prenatal|tetanus toxoid|\bTT\b|booking/i], ['High Risk Pregnancy', /high.?risk|risk (pregnan|mother)|grand multi|elderly primi|teenage pregnan/i], ['Breast Feeding and Weaning', /breast|lactat|weaning|colostrum|exclusive|newborn|neonat|apgar|complementary feed/i], ['Growth & Development', /growth|development|milestone|birth weight|low birth|\bLBW\b|small for date|child health card|anthropometr|growth chart/i], ['Pregnancy', /pregnan|danger sign|gravid|trimester/i]],
  '9|Food & Nutrition': [['Vitamin A', /vit(amin)?[- ]?a\b|blindness|xerophth|night.?blind|retinol|bitot/i], ['Vitamin D', /vit(amin)?[- ]?d\b|rickets|osteomalac|calciferol/i], ['Thiamine Deficiency', /thiamine|beriberi|vitamin b1\b/i], ['Vitamins', /vitamin|pellagra|scurvy|niacin|riboflavin|folate|folic/i], [MIN, /\biron\b|iodine|goit|zinc|anaemi|anemi|cretin|mineral/i], ['Malnutrition & PEM', /malnutrition|\bPEM\b|kwashiorkor|marasmus|protein.?energy|stunt|wasting|underweight|MUAC/i], ['Lathyrism & Food Adulteration', /lathyr|adulter|khesari/i], ['Milk Borne Diseases', /\bmilk\b|pasteur/i], ['Food Poisoning', /food poison|botul|salmonell|staphylococc|enterotoxin/i]],
  '11|Communicable Diseases': [['COVID-19', /covid|corona ?virus|sars/i], ['Bird Flu', /avian|bird flu|H5N1|influenza/i], ['STIs, HIV & AIDS', /\bHIV\b|\bAIDS\b|\bST[ID]s?\b|syphilis|gonorrh|sexually transmitted/i], ['Chickenpox (Varicella-Zoster)', /varicella|chickenpox|chicken pox|zoster/i], ['Measles & Mumps', /measles|mumps|rubella|\bMR\b|\bMMR vaccine/i], ['Diphtheria & Pertussis', /diphtheria|pertussis|whooping|\bDPT\b/i], ['ARI / Pneumonia', /\bARI\b|pneumonia|acute respiratory|\bIMCI\b/i], ['Tuberculosis', /tubercul|\bTB\b|\bDOTS\b|\bBCG\b|mantoux|sputum/i], ['Leprosy', /lepr|hansen|multi.?bacillary|paucibacillary/i], ['Poliomyelitis', /polio|\bAFP\b|\bOPV\b|\bIPV\b/i], ['Hepatitis', /hepatitis|\bHBV\b|HBsAg|\bHAV\b/i], ['Diarrhoeal Diseases', /diarrh|cholera|\bORS\b|\bORT\b|dysentery|rotavirus|dehydration/i], ['Helminthic Diseases', /helminth|hookworm|ascari|roundworm|tapeworm|\bworm/i], ['Enteric Fever (Typhoid)', /typhoid|enteric fever|widal/i], ['Dengue Fever', /dengue/i], ['Malaria & Filariasis', /malaria|filaria|plasmodium/i], ['Kala-Azar', /kala.?azar|leishman|\bPKDL\b/i], ['Tetanus & Anthrax', /tetanus|anthrax/i], ['Plague', /plague|yersinia/i], ['Rabies', /rabies|rabid|dog bite|anti.?rabies|animal bite/i]],
  '11|Non-Communicable Diseases': [['Rheumatic Fever', /rheumatic/i], ['Hypertension', /hypertens|blood pressure|antihypertens|rule of halves/i], ['Diabetes Mellitus', /diabet|insulin|hyperglyc|glucose/i], ['IHD & CHD', /ischemi|ischaemi|coronary|\bIHD\b|\bCHD\b|angina|myocardial/i], ['Cancer', /cancer|carcinoma|tumou?r|oncolog|pap smear|mammograph/i], ['Geriatric Health Problems', /geriatr|elderly|old age|ageing|aging|senior citizen/i]]
};
const SUBORDER = {};
Object.keys(RULES).forEach(k => {
  /* display order = syllabus order already used by DU: keep order in which DU shows them, with General first */
  const seen = [];
  DU.forEach(q => { if (q.part + '|' + q.topic === k && q.sub && seen.indexOf(q.sub) < 0) seen.push(q.sub); });
  RULES[k].forEach(r => { if (seen.indexOf(r[0]) < 0) seen.push(r[0]); });
  SUBORDER[k] = seen;
});
SUBORDER['11|Communicable Diseases'] = ['General'].concat(SUBORDER['11|Communicable Diseases'].filter(s => s !== 'General'));

const text = q => (q.stem ? q.stem + ' ' + q.opts.map(o => o.t).join(' ') : q.q.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&'));
const stemOf = q => (q.stem ? q.stem : q.q.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&'));
function pickSub(q, key) {
  const rules = RULES[key]; if (!rules) return '';
  const s = stemOf(q), a = text(q);
  for (const r of rules) if (r[1].test(s)) return r[0];       // the question itself wins
  /* options only count when one subtopic is clearly the theme: matched by 3+ options and by no other subtopic */
  const opts = q.opts ? q.opts.map(o => o.t) : [a], hits = rules.map(r => [r[0], opts.filter(t => r[1].test(t)).length]).filter(h => h[1] >= 3);
  return hits.length === 1 ? hits[0][0] : '';
}

/* ---- 1. topic repair for MCQs ---- */
const TOPIC_BY_REF = [
  [10, /^basic principles/i, 'Basic Principles of Epidemiology'], [10, /^infectious disease epi/i, 'Infectious Disease Epidemiology'], [10, /^disasters/i, 'Disasters'], [10, /^accidents/i, 'Accidents'],
  [11, /^non-communicable/i, NCD], [11, /^(hypertension|rheumatic)/i, NCD], [11, /^health administration/i, 'Health Administration'], [11, /^(communicable|measles|diarrhoeal|stis|rabies|dengue|tuberculosis)/i, CD],
  [8, /^demography/i, 'Demography & Fertility'], [8, /^(breast|mmr|anc|growth|postnatal|maternal)/i, MCH],
  [9, /^(vitamin|thiamine)/i, FN]
];
const P9 = { 'Vitamins': 'Vitamins', 'Mineral Deficiency': MIN, 'Malnutrition & PEM': 'Malnutrition & PEM', 'Food Poisoning': 'Food Poisoning' };
let moved = 0, unresolved = [];
MCQ.forEach(q => {
  if (q.part === 9 && P9[q.topic]) { const old = P9[q.topic]; q.topic = FN; q.sub = pickSub(q, '9|' + FN) || old; return; }
  if (!/^Other topics/.test(q.topic)) return;
  const m = q.ref.match(/WQ Part (\d+) › ([^|]+)/); let name = m ? m[2].trim() : '';
  let hit = TOPIC_BY_REF.filter(t => t[0] === q.part && t[1].test(name))[0];
  if (hit) { q.topic = hit[2]; moved++; return; }
  /* "case-based" and similar: classify from the text */
  const guess = { 8: [['Demography & Fertility', /demograph|fertility|population|birth rate|cu-?t|contracepti/i], [MCH, /./]], 9: [[FN, /./]], 10: [['Basic Principles of Epidemiology', /./]], 11: [[NCD, /hypertens|diabet|cancer|stroke|rheumatic|coronary/i], [CD, /./]] }[q.part];
  const g = guess && guess.filter(x => x[1].test(text(q)))[0];
  if (g) { q.topic = g[0]; moved++; } else unresolved.push(q.id);
});

/* ---- 2. DU leftovers in 'Others' ---- */
const RELOC = { 'DU.757': [10, 'Disasters'], 'DU.758': [1, 'Introduction to Community Medicine'], 'DU.759': [5, 'Occupational Health'], 'DU.760': [11, CD], 'DU.761': [8, 'Demography & Fertility'], 'DU.762': [8, MCH], 'DU.763': [5, 'Occupational Health'], 'DU.764': [1, 'Disease Prevention, Control and Eradication'], 'DU.765': [11, NCD] };
DU.forEach(q => { const r = RELOC[q.id]; if (r && q.topic === 'Others') { q.part = r[0]; q.topic = r[1]; } });

/* ---- 3. subtopics ---- */
let subbed = 0;
MCQ.concat(DU).forEach(q => {
  const key = q.part + '|' + q.topic; if (!RULES[key]) return;
  if (!q.sub) { q.sub = pickSub(q, key); if (q.sub) subbed++; }
  if (!q.sub && key === '11|Communicable Diseases' && q.id.indexOf('DU.') === 0 && /communicable|infectious|emerging|control measures/i.test(stemOf(q))) q.sub = 'General';
});
/* an MCQ topic that no longer has a sub in an unrelated rule set keeps '' (shown as "General") */
MCQ.forEach(q => { if (q.sub === undefined) q.sub = ''; });

/* ---- write back ---- */
const duLines = duSrc.split('\n');
const out = duLines[0] + '\n' + 'CM.du=' + JSON.stringify(DU) + ';\nCM.subs=' + JSON.stringify(SUBORDER) + ';\n';
fs.writeFileSync(path.join(root, 'data/du.js'), out);
fs.writeFileSync(path.join(root, 'data/mcq.js'), 'window.CM=window.CM||{};CM.mcq=' + JSON.stringify(MCQ) + ';\n');

/* ---- report ---- */
console.log('MCQ topics repaired:', moved, '| unresolved:', unresolved.join(',') || 'none', '| subs assigned:', subbed);
console.log('Other-topic buckets left:', MCQ.filter(q => /^Other/.test(q.topic)).length, '| DU Others left:', DU.filter(q => q.topic === 'Others').length);
Object.keys(SUBORDER).forEach(k => { console.log('\n' + k); SUBORDER[k].forEach(s => { const d = DU.filter(q => q.part + '|' + q.topic === k && q.sub === s).length, m = MCQ.filter(q => q.part + '|' + q.topic === k && q.sub === s).length; console.log('  ' + s.padEnd(42), 'DU', String(d).padStart(3), 'MCQ', String(m).padStart(3)); });
  const gd = DU.filter(q => q.part + '|' + q.topic === k && !q.sub).length, gm = MCQ.filter(q => q.part + '|' + q.topic === k && !q.sub).length; console.log('  (general / unsorted)'.padEnd(44), 'DU', String(gd).padStart(3), 'MCQ', String(gm).padStart(3)); });
