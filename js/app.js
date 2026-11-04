(function () {
  'use strict';
  var CMV = window.CMV, DU = CM.du, MCQ = CM.mcq, PARTS = CM.parts, KEY = 'cmb:v1';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var main = $('#main');
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var S;
  try { S = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { S = {}; }
  S.hist = S.hist || []; S.read = S.read || {}; S.flag = S.flag || {}; S.notes = S.notes || {}; S.mcq = S.mcq || {};
  var warned = false;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { if (!warned) { warned = true; alert('Your progress could not be saved in this browser.'); } } }
  var byId = {}; DU.forEach(function (q) { byId[q.id] = q; }); MCQ.forEach(function (q) { byId[q.id] = q; });
  var partIds = Object.keys(PARTS).map(Number).sort(function (a, b) { return a - b; });
  function dkey(d) { d = d || new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function bump(t) { S.act = S.act || {}; var k = dkey(), a = S.act[k] = S.act[k] || { r: 0, m: 0 }; a[t]++; }
  function pcode(n) { var c = CM.chapters && CM.chapters[n - 1]; return c ? c.code : 'P' + n; }
  function pgrp(n) { var c = CM.chapters && CM.chapters[n - 1]; return c ? c.g : ''; }
  function pname(n) { return pcode(n) + ' · ' + PARTS[n]; }
  var GRPS = ['A', 'B', 'C', 'D'], GMARK = '17.5 marks · SAQ Q1–4 (answer any three, 3.5 each) · SEQ Q5 (compulsory, 7)';
  function chOpts() { var o = []; GRPS.forEach(function (g) { var ns = partIds.filter(function (n) { return pgrp(n) === g; }); if (!ns.length) return; o.push({ h: 'Group ' + g }); ns.forEach(function (n) { o.push([n, pname(n)]); }); }); return o; }
  var nRead = function () { return DU.filter(function (q) { return S.read[q.id]; }).length; };
  var nDone = function () { return MCQ.filter(function (q) { return S.mcq[q.id]; }).length; };

  /* ------------------------------------------------------------ router */
  function dec(s) { try { return decodeURIComponent(s); } catch (e) { return s; } }
  function parse() {
    var h = location.hash.replace(/^#\/?/, ''), qs = {}, i = h.indexOf('?');
    if (i >= 0) { h.slice(i + 1).split('&').forEach(function (kv) { var p = kv.split('='); if (p[0]) qs[p[0]] = dec((p[1] || '').replace(/\+/g, ' ')); }); h = h.slice(0, i); }
    var parts = h.split('/').filter(Boolean).map(dec);
    return { r: parts[0] || 'home', id: parts[1], qs: qs };
  }
  function url(base, qs) {
    var a = Object.keys(qs).filter(function (k) { return qs[k]; }).map(function (k) { return k + '=' + encodeURIComponent(qs[k]); });
    return base + (a.length ? '?' + a.join('&') : '');
  }
  var shown = 30;
  function route(keep) {
    var r = parse();
    document.querySelectorAll('#bnav a').forEach(function (a) { var k = a.getAttribute('data-r'); a.classList.toggle('on', k === r.r || (r.r === 'q' && k === 'questions') || (r.r === 'chapter' && k === 'chapters') || (r.r === 'predict' && k === 'menu') || (r.r === 'firsts' && k === 'menu') || (['read','custom','run'].indexOf(r.r) >= 0 && k === 'mcqs')); });
    var fn = { home: home, progress: progress, questions: questions, q: single, chapters: chapters, chapter: chapter, answers: answers, mcqs: mcqs, custom: custom, read: reading, run: run, menu: menu, predict: predict, firsts: firsts }[r.r] || home;
    if (!keep) { vSnap(); shown = 30; }
    var y = window.scrollY; stopTimer();
    fn(r);
    var key = location.hash || '#/'; curKey = key; VIEW.t[tabOf(r.r)] = key;
    if (keep) window.scrollTo(0, y); else if (Object.keys(r.qs).length || !vRestore(key)) window.scrollTo(0, 0);
    vSave();
    document.title = 'Community Medicine — ' + ({ home: 'Dashboard', questions: 'Questions', q: 'Question', progress: 'Progress', chapters: 'Chapters', chapter: 'Chapter', answers: 'Answers', mcqs: 'MCQs', custom: 'Custom practice', read: 'Reading mode', run: 'MCQ session', menu: 'Menu', predict: 'Prediction for Prof', firsts: 'First-time questions' }[r.r] || 'DU Question Bank');
  }
  window.addEventListener('hashchange', function () { route(false); });

  /* ------------------------------------------------------------ remember where you were
     Each page (by its #hash) keeps its scroll position, open questions, open groups and how many MCQs were loaded, and each bottom tab
     remembers the last page you had open in it. Switching tabs, going back, or Chrome reloading a discarded tab returns you to the same spot.
     Tapping the tab you are already on goes to that tab's start page (or to the top if you are already there). Saved separately from progress. */
  var VKEY = 'cmb:view', VIEW; try { VIEW = JSON.parse(localStorage.getItem(VKEY) || '{}') || {}; } catch (e) { VIEW = {}; }
  if (!VIEW.p || typeof VIEW.p !== 'object') VIEW.p = {}; if (!VIEW.t || typeof VIEW.t !== 'object') VIEW.t = {};
  if (VIEW.v !== CM.layout) {
    var mvv = VIEW.v === 'g21' ? (CM.layoutMoves || {}).groups2021 : null, nvp = {};
    Object.keys(VIEW.p).forEach(function (k) { var m = /^#\/chapter\/(\d+)$/.exec(k); if (!m) { nvp[k] = VIEW.p[k]; return; } var t = mvv && mvv[+m[1]]; if (t && t.length === 1 && !nvp['#/chapter/' + t[0]]) nvp['#/chapter/' + t[0]] = VIEW.p[k]; });
    VIEW.p = nvp;
    var tc = /^#\/chapter\/(\d+)$/.exec(VIEW.t.chapters || ''), t2 = tc && mvv && mvv[+tc[1]]; if (tc) { if (t2 && t2.length) VIEW.t.chapters = '#/chapter/' + t2[0]; else delete VIEW.t.chapters; }
    VIEW.v = CM.layout;
  }
  var curKey = null, restoring = false, vt;
  function tabOf(r) { return { q: 'questions', chapter: 'chapters', predict: 'menu', firsts: 'menu', read: 'mcqs', custom: 'mcqs', run: 'mcqs' }[r] || r; }
  function vSave() {
    var ks = Object.keys(VIEW.p); if (ks.length > 40) ks.sort(function (a, b) { return VIEW.p[a].t - VIEW.p[b].t; }).slice(0, ks.length - 40).forEach(function (k) { delete VIEW.p[k]; });
    try { localStorage.setItem(VKEY, JSON.stringify(VIEW)); } catch (e) {}
  }
  function vSnap() {
    if (!curKey || restoring) return;
    var g = [].map.call(main.querySelectorAll('.grp'), function (x) { return x.tagName === 'DETAILS' ? x.open : x.classList.contains('open'); });
    var o = [].map.call(main.querySelectorAll('.qrow.open'), function (x) { return x.dataset.id; });
    VIEW.p[curKey] = { y: Math.round(window.scrollY), g: g, o: o, n: curKey.indexOf('#/read') === 0 ? shown : 0, t: Date.now() };
    vSave();
  }
  function vRestore(key) {
    var v = VIEW.p[key]; if (!v) return false;
    restoring = true;
    var gs = main.querySelectorAll('.grp');
    if (v.g && v.g.length === gs.length) [].forEach.call(gs, function (x, i) { if (x.tagName === 'DETAILS') x.open = !!v.g[i]; else x.classList.toggle('open', !!v.g[i]); });
    (v.o || []).forEach(function (id) { var r = main.querySelector('.qrow[data-id="' + String(id).replace(/["\\]/g, '') + '"]'); if (r) r.classList.add('open'); });
    var moved = false, stop = function () { moved = true; };
    window.addEventListener('touchstart', stop, { once: true, passive: true }); window.addEventListener('wheel', stop, { once: true, passive: true });
    var go = function () { if (!moved) window.scrollTo(0, v.y || 0); };
    go(); requestAnimationFrame(go); setTimeout(function () { go(); restoring = false; }, 300);
    return true;
  }
  window.addEventListener('scroll', function () { clearTimeout(vt); vt = setTimeout(vSnap, 300); }, { passive: true });
  document.addEventListener('visibilitychange', function () { if (document.hidden) vSnap(); });
  window.addEventListener('pagehide', vSnap);
  main.addEventListener('click', function () { setTimeout(vSnap, 60); });
  var bnav = document.getElementById('bnav');
  if (bnav) bnav.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-r]'); if (!a) return;
    var k = a.dataset.r, here = tabOf(parse().r), cur = location.hash || '#/', last = VIEW.t[k];
    if (k !== here) { if (last && last !== cur) { e.preventDefault(); location.hash = last; } }
    else if (a.getAttribute('href') === cur || (k === 'home' && (cur === '#/' || cur === '#'))) { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  });



  /* ------------------------------------------------------------ first-time questions per exam session */
  var SEAS = { Ja: 1, M: 2, Ju: 3, S: 4, Nov: 5 };
  function sk(c) { var m = String(c).replace(/\u2020/g, '').match(/^(\d{2})(Ja|M|Ju|S|Nov)/); return m ? { k: (2000 + +m[1]) * 10 + SEAS[m[2]], l: '20' + m[1] + m[2] } : null; }
  function firsts(r) {
    var FROM = 20171, part = +r.qs.part || 0, by = {}, tot = {};
    DU.forEach(function (q) {
      var ss = {}; (q.years || []).forEach(function (c) { var o = sk(c); if (o) ss[o.k] = o; });
      var ks = Object.keys(ss).map(Number).sort(function (a, b) { return a - b; });
      ks.forEach(function (k) { tot[k] = (tot[k] || 0) + 1; });
      if (ks.length && ks[0] >= FROM) { (by[ks[0]] = by[ks[0]] || []).push({ q: q, later: ks.slice(1).map(function (k) { return ss[k].l; }), l: ss[ks[0]].l }); }
    });
    var keys = Object.keys(tot).map(Number).filter(function (k) { return k >= FROM; }).sort(function (a, b) { return b - a; });
    var all = 0, allN = 0; keys.forEach(function (k) { all += (by[k] || []).length; allN += tot[k]; });
    var opts = '<option value="">All chapters</option>' + partIds.map(function (n) { return '<option value="' + n + '"' + (n === part ? ' selected' : '') + '>' + esc(pname(n)) + '</option>'; }).join('');
    var h = hero({ title: 'First-time questions', desc: 'Questions that appeared in the bank for the first time in each exam session, from 2017 onward.' }) + '<div class="wrap" style="padding-top:1rem">' +
      '<div class="card pbox"><div class="k">How to read this</div><div class="m">A question is \u201cfirst-time\u201d when its earliest exam-year tag in this bank is that session. Across ' + keys.length + ' sessions, ' + all + ' of ' + allN + ' question appearances (' + Math.round(all / allN * 100) + '%) were new. Questions with no exam-year tag (college scenarios) are not counted. Rewordings are merged, so a truly reworded old question is not shown as new.</div></div>' +
      '<div class="row"><select id="f-part" class="sel" aria-label="Filter by part">' + opts + '</select></div>';
    keys.forEach(function (k, i) {
      var l = by[k] || [], lab = (l[0] && l[0].l) || String(Object.keys(SEAS).length && ''), shown = l.filter(function (x) { return !part || x.q.part === part; });
      var code = (function () { var y = Math.floor(k / 10), s = k % 10, n = { 1: 'Ja', 2: 'M', 3: 'Ju', 4: 'S', 5: 'Nov' }[s]; return y + n; })();
      h += '<details class="fst"' + (i === 0 ? ' open' : '') + '><summary><b>' + code + '</b><span>' + l.length + ' first-time of ' + tot[k] + ' (' + Math.round(l.length / tot[k] * 100) + '%)</span></summary>' +
        (shown.length ? shown.sort(function (a, b) { return a.q.part - b.q.part || a.q.n - b.q.n; }).map(function (x) {
          var q = x.q; return '<div class="pq"><div class="ph"><b>' + esc(q.id) + '</b><span class="pm">' + esc(q.topic) + '</span>' + (q.stars ? '<span class="pt">\u2605' + q.stars + '</span>' : '') + '</div><div class="pb">' + q.q + '</div><div class="pw">' + (x.later.length ? 'Asked again in ' + x.later.map(esc).join(', ') : 'Not asked again yet') + ' \u00b7 <a href="#/q/' + esc(q.id) + '">open in bank</a></div></div>';
        }).join('') : '<p class="pm2" style="padding:.5rem 0">No first-time questions in this part for this session.</p>') + '</details>';
    });
    main.innerHTML = h + '</div>';
    $('#f-part').onchange = function () { location.hash = url('#/firsts', { part: this.value }); };
  }

  /* ------------------------------------------------------------ prediction papers */

  function analysisCard() {
    var a = CM.predict.analysis; if (!a) return '';
    return '<div class="card pbox"><div class="k">Pattern analysis \u00b7 backtest on ' + a.sessions.length + ' real sessions (' + a.sessions[0] + '\u2013' + a.sessions[a.sessions.length - 1] + ')</div><h3>What the past papers actually show</h3>' +
      '<div class="m">Each method ranked the whole bank using only earlier sessions, and its top ' + a.n + ' were checked against what was really asked. Chance would hit about ' + Math.round(a.chance * 100) + '%.</div>' +
      '<table class="pt4"><tr><th>Method</th><th>Hit rate</th><th>Last 4</th></tr>' + a.rows.map(function (r) { return '<tr><td>' + esc(r.name) + '</td><td>' + Math.round(r.mean * 1000) / 10 + '%</td><td>' + Math.round(r.last4 * 1000) / 10 + '%</td></tr>'; }).join('') + '</table>' +
      '<ul class="pl"><li>Every method is about 3\u00bd times better than chance, so past papers do predict future ones, but only moderately. Individual questions are hard to call; topics are safer.</li>' +
      '<li>The chosen model (frequency + how hot the topic has been in the last two years) scored best, but its edge over plain frequency is small with only ' + a.sessions.length + ' test sessions.</li>' +
      '<li>No March/November rhythm: the chance of a repeat is about ' + a.lagMin + '\u2013' + a.lagMax + '\u00d7 baseline at every gap from 1 to 10 half-years.</li>' +
      '<li>No \u201cjust asked\u201d effect: ' + Math.round(a.repeatRecent * 1000) / 10 + '% return chance for questions from the last two sessions vs ' + Math.round(a.repeatFreq * 1000) / 10 + '% for frequent ones that were not. Do not skip a question because it came last time.</li>' +
      '<li>Recent sessions drew questions from the four groups at about A ' + a.share.A + ' : B ' + a.share.B + ' : C ' + a.share.C + ' : D ' + a.share.D + ', which sets Paper 4\u2019s MCQ split (' + ['A', 'B', 'C', 'D'].map(function (g) { return g + a.split[g]; }).join(' ') + ').</li></ul></div>';
  }

  function predict(r) {
    var P = CM.predict, n = +r.id, GN = { A: 'Group A \u00b7 Community medicine, PHC, behavioural science, entomology', B: 'Group B \u00b7 Epidemiology, biostatistics, nutrition, environment', C: 'Group C \u00b7 Administration, MCH-FP, demography, school and occupational health', D: 'Group D \u00b7 Communication, immunity, immunization, CD and NCD' };
    var tabs = '<div class="ptabs"><a href="#/predict"' + (!n ? ' class="on"' : '') + '>Overview</a>' + P.papers.map(function (p) { return '<a href="#/predict/' + p.no + '"' + (n === p.no ? ' class="on"' : '') + '>' + p.name + '</a>'; }).join('') + '</div>';
    if (!n || !P.papers[n - 1]) {
      main.innerHTML = hero({ title: 'Prediction for Prof', desc: 'Four full written papers in this year\u2019s format, built from every exam session in the bank.' }) + '<div class="wrap" style="padding-top:1rem">' + tabs +
        '<div class="card pbox"><div class="k">This year\u2019s format</div><h3>90 written marks + 10 formative</h3><div class="m">MCQ 20 (10 MTF + 10 SBA). Four groups A\u2013D of 17.5 marks each: SAQ Q1\u20134 (answer any 3 \u00d7 3.5) + compulsory SEQ Q5 (7). Group A is examined by the convener, Group B by an internal, C and D by externals.</div></div>' +
        '<div class="card pbox"><div class="k">How it was built</div><h3>Method</h3><div class="m">Every DU question was scored by how often and how recently it was asked (2019\u20132026 sessions count most). Each group takes its heaviest topics first, one angle per topic (two for Communicable Diseases), and no question appears in more than one paper. SEQ slots use scenario-type questions. MCQs follow the same ranking. Paper 3 holds the \u201coverdue\u201d questions plus new scenarios from current events. Paper 4 is ranked only by a statistical model that was tested against past sessions (below).</div></div>' + analysisCard() + +
        '<div class="card pbox"><div class="k">Examiner watch-list (from news and programme changes)</div><div class="m"><ul class="pl"><li>Typhoid conjugate vaccine: nationwide campaign and routine EPI introduction, 2025\u201326.</li><li>Nipah (date-palm sap) and dengue: recurrent seasonal outbreaks in Bangladesh.</li><li>Health Sector Reform Commission: UHC, primary-care strengthening and budget share.</li><li>BDHS 2022 indicators: fertility, infant and under-5 mortality, caesarean rate, contraceptive use.</li></ul></div></div>' +
        '<div class="grid">' + P.papers.map(function (p) { return '<a class="card" href="#/predict/' + p.no + '"><div class="k">' + p.name + '</div><h3>' + esc(p.title) + '</h3><div class="m">' + esc(p.blurb) + '</div></a>'; }).join('') + '</div>' +
        '<p class="pnote">These are probability-based predictions from past patterns, not leaked papers. Use them to prioritise revision, and still read every chapter. Items marked New are AI-written scenarios; verify against Park or Matrix.</p></div>';
      return;
    }
    var p = P.papers[n - 1], key = false;
    function cl(t) { return esc(String(t).replace(/[\u2605\u2606]+\s*/g, '').trim()); }
    function mtf(id) { var q = byId[id]; return '<li><b>' + cl(q.stem) + '</b><ul class="po">' + q.opts.map(function (o) { return '<li>' + esc(o.l) + ') ' + cl(o.t) + ' <span class="pk">' + (o.k === 'T' ? 'T' : 'F') + '</span></li>'; }).join('') + '</ul></li>'; }
    function sba(id) { var q = byId[id]; return '<li><b>' + cl(q.stem) + '</b><ul class="po">' + q.opts.map(function (o) { return '<li' + (o.l === q.ans ? ' data-a="1"' : '') + '>' + esc(o.l) + ') ' + cl(o.t) + '</li>'; }).join('') + '</ul></li>'; }
    function item(x, label, marks) {
      var q = x.id ? byId[x.id] : null, html = q ? q.q : x.custom.q, w = x.id ? x.why : x.custom.why;
      return '<div class="pq"><div class="ph"><b>' + label + '</b><span class="pm">' + marks + '</span><span class="pt t-' + esc((x.tier || 'New')) + '">' + esc(x.tier || 'New') + '</span></div><div class="pb">' + html + '</div><div class="pw">' + esc(w) + (q ? ' \u00b7 <a href="#/q/' + esc(q.id) + '">open in bank</a>' : '') + '</div></div>';
    }
    var h = hero({ title: p.name + ' \u00b7 ' + p.title, desc: p.blurb }) + '<div class="wrap" style="padding-top:1rem">' + tabs +
      '<div class="row"><button class="btn ghost sm" id="p-key">Show MCQ key</button><button class="btn ghost sm" onclick="window.print()">Print</button></div>' +
      '<div class="psec"><h2>Section A \u00b7 MCQ (20 marks)</h2><p class="pm2">MTF: 10 stems \u00d7 5 statements, mark each True or False. SBA: choose the single best answer.</p><h3>MTF</h3><ol class="pml" id="p-mtf">' + p.mtf.map(mtf).join('') + '</ol><h3>SBA</h3><ol class="pml" start="11" id="p-sba">' + p.sba.map(sba).join('') + '</ol></div>';
    'ABCD'.split('').forEach(function (g) {
      var v = p.groups[g];
      h += '<div class="psec"><h2>' + esc(GN[g]) + ' \u00b7 17.5 marks</h2><p class="pm2">Answer any three of Q1\u20134 (3.5 each). Q5 is compulsory (7).</p>' + v.saq.map(function (x, i) { return item(x, 'Q' + (i + 1), '3.5'); }).join('') + item(v.seq, 'Q5', '7') + '</div>';
    });
    main.innerHTML = h + '<p class="pnote">Predictions are pattern-based. Items marked New are AI-written; verify answers with Park or Matrix.</p></div>';
    $('#p-key').onclick = function () { key = !key; main.classList.toggle('showkey', key); this.textContent = key ? 'Hide MCQ key' : 'Show MCQ key'; };
    main.classList.remove('showkey');
  }

  /* ------------------------------------------------------------ home */
  function home() {
    var rd = nRead(), md = nDone(), last = S.last && byId[S.last];
    var h = '<section class="hero vhome">' + CMV.art('heart') + '<p class="eyebrow">DU 3rd Prof MBBS · Matrix 18th Ed.</p><h1>Community Medicine for written and viva exams</h1>' +
      '<p>' + DU.length + ' merged DU and college questions and ' + MCQ.length + ' MCQs, sorted by topic with exam years and star ratings. Read, recall, practise.</p>' +
      '<a class="btn" href="#/questions">Explore questions</a></section>' +
      '<div class="stats"><span class="stat"><b>' + DU.length + '</b> questions</span><span class="stat"><b>' + MCQ.length + '</b> MCQs</span><span class="stat"><b>' + rd + '</b> read</span><span class="stat"><b>' + md + '</b> MCQs tried</span><span class="stat"><b>' + DU.filter(function (q) { return S.flag[q.id]; }).length + '</b> flagged</span></div>';
    if (last) h += '<a class="cont" href="#/q/' + esc(last.id) + '"><small>CONTINUE WHERE YOU STOPPED</small><div>' + esc(last.id) + ' · ' + esc(strip(last.q).slice(0, 110)) + '…</div></a>';
    h += '<div class="sec"><h2>Quick start</h2></div><div class="grid">' +
      '<a class="card" href="#/questions?stars=3">' + CMV.chip('star', 'sm').replace('vchip', 'vchip qi') + '<div class="k">Most asked</div><h3>★★★ questions</h3><div class="m">' + DU.filter(function (q) { return q.stars === 3; }).length + ' high-yield questions</div></a>' +
      '<a class="card" href="#/mcqs">' + CMV.chip('check', 'sm').replace('vchip', 'vchip qi') + '<div class="k">Practice</div><h3>MCQ practice</h3><div class="m">SBA and true/false with instant keys</div></a>' +
      '<a class="card" href="#/progress">' + CMV.chip('chart', 'sm').replace('vchip', 'vchip qi') + '<div class="k">Track</div><h3>Progress tracker</h3><div class="m">' + rd + ' read · ' + md + ' MCQs tried · streak, by part</div></a>' +
      '<a class="card" href="#/chapters">' + CMV.chip('book', 'sm').replace('vchip', 'vchip qi') + '<div class="k">Chapter-wise</div><h3>Chapters</h3><div class="m">Every part, topic by topic</div></a>' +
      '<a class="card" href="#/firsts">' + CMV.chip('search', 'sm').replace('vchip', 'vchip qi') + '<div class="k">Patterns</div><h3>First-time questions</h3><div class="m">What appeared for the first time in each exam since 2017</div></a>' +
      '<a class="card ppred" href="#/predict">' + CMV.chip('target', 'sm').replace('vchip', 'vchip qi') + '<div class="k">New · This year</div><h3>Prediction for Prof</h3><div class="m">4 full papers in the new MCQ + SAQ/SEQ format</div></a>' +
      '<a class="card" href="#/answers">' + CMV.chip('pen', 'sm').replace('vchip', 'vchip qi') + '<div class="k">Answers</div><h3>Model answers</h3><div class="m">' + DU.filter(function (q) { return q.a; }).length + ' added so far</div></a></div>';
    h += '<div class="sec"><h2>Browse by part</h2></div><div class="grid">' + partIds.map(function (n) {
      var qs = DU.filter(function (q) { return q.part === n; }), ms = MCQ.filter(function (q) { return q.part === n; });
      var d = qs.filter(function (q) { return S.read[q.id]; }).length;
      return '<a class="card vcard" style="--h:' + CMV.hue(n) + '" href="#/chapter/' + n + '">' + CMV.banner(n) + '<div class="k">Part ' + n + '</div><h3>' + esc(PARTS[n]) + '</h3><div class="m">' + qs.length + ' questions · ' + ms.length + ' MCQs</div><div class="bar"><i style="width:' + (qs.length ? Math.round(d / qs.length * 100) : 0) + '%"></i></div></a>';
    }).join('') + '</div>';
    h += '<div class="sec"><h2>Archive</h2></div><a class="card archive" href="second-term/"><div class="k">Separate site</div><h3>Second-term solved viva bank</h3><div class="m">80 fully solved viva questions (Environment, PHC, CD/NCD, MCH-FP, School and Occupational Health). Kept apart from this question bank.</div></a>';
    main.innerHTML = '<div class="wrap">' + h + '</div>';
  }
  function wrap(h, pad) { return '<div class="wrap"' + (pad ? ' style="padding-top:1rem"' : '') + '>' + h + '</div>'; }
  function hero(o) {
    var t = CMV.theme(o);
    return '<section class="phero' + (t ? ' vhero' : '') + '"' + (t ? ' style="--h:' + t.h + '"' : '') + '>' + (t ? CMV.art(t.icon) : '') + '<div class="wrap">' + (o.crumb ? '<p class="crumb">' + o.crumb + '</p>' : '') + '<h1>' + o.title + '</h1>' + (o.desc ? '<p class="d">' + o.desc + '</p>' : '') +
      (o.btns || '') + (o.pills ? '<div class="pills">' + o.pills.map(function (p) { return '<span>' + p + '</span>'; }).join('') + '</div>' : '') + '</div></section>';
  }
  function shuf(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function fmt(s) { s = Math.max(0, Math.round(s)); var m = Math.floor(s / 60); return m + ':' + ('0' + (s % 60)).slice(-2); }
  function stars(n) { return n ? '<span class="stars" title="' + n + ' of 3 stars">' + [1, 2, 3].map(function (i) { return i <= n ? '★' : '<i>★</i>'; }).join('') + '</span>' : ''; }
  function strip(h) { return String(h).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }
  function sel(name, label, opts, val) {
    return '<select data-f="' + name + '" aria-label="' + label + '"><option value="">' + label + '</option>' + opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(val) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>';
  }
  function partOpts(list) { return partIds.map(function (n) { return [n, pname(n) + ' (' + list.filter(function (q) { return q.part === n; }).length + ')']; }); }
  function topicsOf(list, part) {
    var seen = {}, out = [];
    list.forEach(function (q) { if ((!part || q.part == part) && !seen[q.topic]) { seen[q.topic] = 1; out.push(q.topic); } });
    return out;
  }
  function bindFilters(base) {
    var t;
    main.querySelectorAll('[data-f]').forEach(function (el) {
      function go() { var r = parse(), qs = r.qs; qs[el.getAttribute('data-f')] = el.value; if (el.getAttribute('data-f') === 'part') qs.topic = ''; focusQ = el.type === 'search'; location.hash = url(base, qs); }
      if (el.type === 'search') { el.addEventListener('input', function () { clearTimeout(t); t = setTimeout(go, 450); }); el.addEventListener('change', go); } else el.addEventListener('change', go);
    });
    if (focusQ) { focusQ = false; var s = main.querySelector('input[type=search]'); if (s) { s.focus(); var l = s.value.length; try { s.setSelectionRange(l, l); } catch (e) {} } }
  }
  var focusQ = false, panelOpen = false;
  function yearList() {
    var m = {}; DU.forEach(function (q) { q.years.forEach(function (y) { m[y] = 1; }); }); MCQ.forEach(function (q) { q.years.forEach(function (y) { m[y] = 1; }); });
    function key(y) { var n = parseInt(y, 10); return (n < 50 ? 2000 + n : 1900 + n) * 10 + ({ Ja: 1, M: 2, Ju: 3, S: 4, Nov: 5 }[y.replace(/^\d+/, '')] || 0); }
    return Object.keys(m).sort(function (a, b) { return key(b) - key(a); }).map(function (y) { return [y, y]; });
  }
  var YEARS = yearList();

  /* ------------------------------------------------------------ question rows (Patholozzee-style) */
  /* ---- exam tags: DU written years, session, college papers ---- */
  var SESN = { Ja: 'Jan', M: 'May', Ju: 'Jul', S: 'Sep', Nov: 'Nov' };
  function yparse(code) {
    code = String(code);
    var dag = code.indexOf('\u2020') >= 0, c = code.replace(/\u2020/g, ''), mark = dag ? ' \u2020' : '';
    var m = c.match(/^(\d{2})(Ja|M|Ju|S|Nov)(?:-([AB]))?$/);
    if (m) return { y: 2000 + +m[1], s: m[2], label: SESN[m[2]] + ' ' + (2000 + +m[1]) + (m[3] ? ' \u00b7 Paper ' + m[3] : '') + mark };
    var n = c.match(/^(\d{2})(.*)$/);
    if (n && n[2] === 'M&Nov') return { y: 2000 + +n[1], s: '', label: 'May & Nov 20' + n[1] + mark };
    return { y: n ? 2000 + +n[1] : 0, s: '', label: n ? '20' + n[1] + ' (' + n[2] + ')' + mark : code };
  }
  function ccol(q) {
    if (q._c) return q._c; var out = [];
    (q.colleges || '').split(';').forEach(function (s) {
      var m = s.trim().match(/^([A-Za-z]+)\s*\((.*)\)$/); if (!m) return;
      m[2].split(',').forEach(function (p) { var mm = p.trim().match(/^(.*?)\s+([A-Z]\d+)$/); out.push({ c: m[1], p: mm ? mm[1] : p.trim(), k: mm ? mm[2] : '' }); });
    });
    return (q._c = out);
  }
  /* ---- recency: exam years after 2018 get a warm colour, stronger the newer the year (levels 1-8) ---- */
  var REC0 = 2018, RECMAX = REC0 + 1;
  DU.concat(MCQ).forEach(function (q) { q.years.forEach(function (y) { var v = yparse(y).y; if (v > RECMAX) RECMAX = v; }); });
  function ylvl(y) { return y > REC0 ? Math.min(8, y - REC0) : 0; }
  function qyear(q) { if (q._ry === undefined) { var m = 0; q.years.forEach(function (y) { var v = yparse(y).y; if (v > m) m = v; }); q._ry = m; } return q._ry; }
  function qlvl(q) { return ylvl(qyear(q)); }
  function heatHtml(q) {
    var l = qlvl(q); if (!l) return '';
    return '<span class="heat" title="Most recently asked in ' + qyear(q) + '" aria-label="Recency ' + l + ' of 8, last asked ' + qyear(q) + '">' + [1, 2, 3, 4, 5, 6, 7, 8].map(function (i) { return '<i class="' + (i <= l ? 'on rc' + i : '') + '"></i>'; }).join('') + '</span>';
  }
  function recLegend() {
    var a = [], y; for (y = REC0 + 1; y <= RECMAX; y++) a.push('<span class="tg yr rc' + ylvl(y) + '">' + y + '</span>');
    return '<div class="reclegend"><b>Recently asked</b><span class="rcrow">' + a.join('') + '</span><small>Exam years after ' + REC0 + ': the deeper the colour, the more recent. Older years stay plain.</small></div>';
  }
  function tagsHtml(q, lab) {
    var h = '', c = ccol(q);
    if (q.years.length) h += '<div class="tagrow"><span class="tg du">' + (lab || 'DU Written') + '</span>' + q.years.map(function (y) { return '<span class="tg yr' + (ylvl(yparse(y).y) ? ' rc' + ylvl(yparse(y).y) : '') + '" title="Exam code ' + esc(y) + '">' + esc(yparse(y).label) + '</span>'; }).join('') + '</div>';
    if (c.length) h += '<div class="tagrow"><span class="tg lab">College</span>' + c.map(function (x) { return '<span class="tg col c-' + esc(x.c) + '"><b>' + esc(x.c) + '</b>' + esc(x.p) + (x.k ? '<i>' + esc(x.k) + '</i>' : '') + '</span>'; }).join('') + '</div>';
    if (!lab && !q.years.length && !c.length) h += '<div class="tagrow"><span class="tg lab">No exam tag</span></div>';
    return h;
  }
  var QSTAT = { unread: 'Not read', read: 'Read', flagged: 'Flagged', noted: 'Has my notes' };
  var FACETS = [
    ['stars', 'Importance', function (q) { return [q.stars]; }, function (v) { return v === 3 ? '★★★ High-yield' : v === 2 ? '★★ Often asked' : v === 1 ? '★ Repeated' : 'Unstarred'; }, [3, 2, 1, 0]],
    ['kind', 'Question type', function (q) { return [q.kind || 'Standard']; }, function (v) { return v; }, ['Standard', 'SEQ', 'Case-based']],
    ['yr', 'DU Written year', function (q) { return q.years.map(function (y) { return yparse(y).y; }); }, function (v) { return v; }, 'years'],
    ['rec', 'Recently asked', function (q) {
      var y = qyear(q), a = []; if (!q.years.length) return ['none']; if (y >= RECMAX - 1) a.push('new2'); if (y >= RECMAX - 4) a.push('new5'); if (y > REC0) a.push('post'); else a.push('old'); return a;
    }, function (v) { return { new2: 'Last 2 years (' + (RECMAX - 1) + '–' + RECMAX + ')', new5: 'Last 5 years (' + (RECMAX - 4) + '–' + RECMAX + ')', post: 'After ' + REC0, old: REC0 + ' or earlier', none: 'No exam year' }[v]; }, ['new2', 'new5', 'post', 'old', 'none']],
    ['ses', 'DU Written session', function (q) { return q.years.map(function (y) { return yparse(y).s; }).filter(Boolean); }, function (v) { return { Ja: 'January', M: 'May', Ju: 'July', S: 'September', Nov: 'November' }[v]; }, ['Ja', 'M', 'Ju', 'S', 'Nov']],
    ['col', 'Medical college paper', function (q) { return ccol(q).map(function (x) { return x.c; }); }, function (v) { return v; }, ['MMC', 'MuMC', 'ShSMC', 'SSMC', 'DMC', 'NMC']],
    ['paper', 'College exam', function (q) { return ccol(q).map(function (x) { return x.p; }); }, function (v) { return v; }, 'papers'],
    ['st', 'Your progress', function (q) { var a = []; a.push(S.read[q.id] ? 'read' : 'unread'); if (S.flag[q.id]) a.push('flagged'); if (S.notes[q.id]) a.push('noted'); return a; }, function (v) { return QSTAT[v]; }, ['unread', 'read', 'flagged', 'noted']],
    ['ans', 'Model answer', function (q) { return [q.a ? 'yes' : 'no']; }, function (v) { return v === 'yes' ? 'Answer added' : 'Answer not added yet'; }, ['yes', 'no']]
  ];
  FACETS.forEach(function (f) {
    if (f[4] === 'years') { var m = {}; DU.forEach(function (q) { q.years.forEach(function (y) { m[yparse(y).y] = 1; }); }); f[4] = Object.keys(m).map(Number).sort(function (a, b) { return b - a; }); }
    if (f[4] === 'papers') { var p = {}; DU.forEach(function (q) { ccol(q).forEach(function (x) { p[x.p] = 1; }); }); f[4] = Object.keys(p).sort(); }
  });
  function emptyQF() { var o = { txt: '', part: [], topic: [], sub: [], yfrom: 0, yto: 0, sort: 'syl' }; FACETS.forEach(function (f) { o[f[0]] = []; }); return o; }
  function fromQs(qs) {
    var f = emptyQF(); f.txt = qs.q || '';
    if (qs.part) f.part = [+qs.part]; if (qs.topic) f.topic = [qs.topic];
    if (qs.stars) for (var s = +qs.stars; s <= 3; s++) f.stars.push(s);
    if (qs.kind) f.kind = [qs.kind]; if (qs.status) f.st = [qs.status];
    return f;
  }
  function qMatch(q, f, skip) {
    if (skip !== 'part' && f.part.length && f.part.indexOf(q.part) < 0) return false;
    if (skip !== 'topic' && f.topic.length && f.topic.indexOf(q.topic) < 0) return false;
    for (var i = 0; i < FACETS.length; i++) {
      var k = FACETS[i][0]; if (k === skip || !f[k].length) continue;
      var vals = FACETS[i][2](q); if (!vals.some(function (v) { return f[k].indexOf(v) >= 0; })) return false;
    }
    if (skip !== 'sub' && f.sub.length && f.sub.indexOf(q.sub || '~') < 0) return false;
    if (f.yfrom || f.yto) { var inr = q.years.some(function (y) { var v = yparse(y).y; return (!f.yfrom || v >= f.yfrom) && (!f.yto || v <= f.yto); }); if (!inr) return false; }
    if (f.txt) {
      if (f._tx !== f.txt) { f._tx = f.txt; f._inc = []; f._exc = []; (f.txt.match(/-?"[^"]+"|\S+/g) || []).forEach(function (w) { var neg = w.charAt(0) === '-' && w.length > 1; if (neg) w = w.slice(1); w = w.replace(/"/g, '').toLowerCase().trim(); if (w) (neg ? f._exc : f._inc).push(w); }); }
      if (!q._h) q._h = (strip(q.q) + ' ' + q.topic + ' ' + (q.sub || '') + ' ' + q.colleges + ' ' + q.asked + ' ' + (q.note || '') + ' ' + q.years.map(function (y) { return yparse(y).label; }).join(' ')).toLowerCase();
      for (var j = 0; j < f._inc.length; j++) if (q._h.indexOf(f._inc[j]) < 0) return false;
      for (var x = 0; x < f._exc.length; x++) if (q._h.indexOf(f._exc[x]) >= 0) return false;
    }
    return true;
  }
  var QF = null;
  function nActive(f) { var n = f.part.length + f.topic.length + f.sub.length + (f.txt ? 1 : 0) + (f.yfrom || f.yto ? 1 : 0); FACETS.forEach(function (x) { n += f[x[0]].length; }); return n; }
  function ansHtml(q) { return q.a ? '<div class="qb">' + q.a + '</div>' : '<p class="empty">The model answer for this question has not been added yet.</p>'; }
  function qRow(q, open) {
    var meta = '';
    if (q.kind) meta += '<span class="tpill' + (q.kind === 'Case-based' ? ' cb' : '') + '">' + esc(q.kind) + '</span>';
    var lv = qlvl(q);
    return '<div class="qrow inkc' + (lv ? ' rc' + lv : '') + (S.read[q.id] ? ' read' : '') + (open ? ' open' : '') + '" data-id="' + q.id + '"><div class="qtop"><span class="qid">' + esc(q.id.replace('DU.', '')) + '</span><div class="qtx qb">' + q.q + '</div>' +
      '<div class="qside">' + stars(q.stars) + heatHtml(q) + '<a class="abtn" href="#/q/' + q.id + '">Answer</a></div></div>' + (meta ? '<div class="qmeta">' + meta + '</div>' : '') + tagsHtml(q) +
      '<div class="qexp"><div class="ansbox">' + ansHtml(q) + '</div>' + (q.asked ? '<p class="meta"><b>Also asked as:</b> ' + esc(q.asked) + '</p>' : '') + (q.note ? '<p class="meta"><b>Note:</b> ' + esc(q.note) + '</p>' : '') +
      '<div class="acts"><button data-a="read" aria-pressed="' + !!S.read[q.id] + '">' + (S.read[q.id] ? '✓ Read' : 'Mark read') + '</button><button data-a="flag" aria-pressed="' + !!S.flag[q.id] + '">⚑ Flag</button><button data-a="note">Notes' + (S.notes[q.id] ? ' •' : '') + '</button></div><div class="slot"></div></div></div>';
  }
  function subBlocks(n, t, its) {
    var seq = (CM.subs && CM.subs[n + '|' + t]) || [], by = {};
    if (!seq.length) return its.map(function (q) { return qRow(q); }).join('');
    its.forEach(function (q) { (by[q.sub || ''] = by[q.sub || ''] || []).push(q); });
    return seq.concat(['']).filter(function (k) { return by[k]; }).map(function (k) {
      return '<p class="sublbl">' + esc(k || 'Other in this topic') + ' <small>' + by[k].length + '</small></p>' + by[k].map(function (q) { return qRow(q); }).join('');
    }).join('');
  }
  function groupedRows(list, openAll) {
    var h = '';
    var lastG = '', multi = GRPS.filter(function (g) { return list.some(function (q) { return q.G === g; }); }).length > 1;
    partIds.forEach(function (n) {
      var items = list.filter(function (q) { return q.part === n; }); if (!items.length) return;
      if (multi && pgrp(n) !== lastG) { lastG = pgrp(n); h += '<p class="gdiv"><b>Group ' + lastG + '</b><span>' + GMARK + '</span></p>'; }
      var done = items.filter(function (q) { return S.read[q.id]; }).length, byT = {}, order = [];
      items.forEach(function (q) { if (!byT[q.topic]) { byT[q.topic] = []; order.push(q.topic); } byT[q.topic].push(q); });
      h += '<div class="grp' + (openAll ? ' open' : '') + '"><button type="button" data-a="grp">' + CMV.chip(n) + '<span class="tt">' + esc(PARTS[n]) + '<span class="ct">Group ' + pgrp(n) + ' · ' + pcode(n) + ' · ' + items.length + ' question' + (items.length === 1 ? '' : 's') + ' · ' + done + ' read</span></span><span class="chev">›</span></button><div class="body">' +
        order.map(function (t) { return '<p class="tlabel">' + CMV.ticon(t, n) + esc(t) + ' <small>' + byT[t].length + '</small></p>' + subBlocks(n, t, byT[t]); }).join('') + '</div></div>';
    });
    return h;
  }
  function progLine(n, tot, word) { return '<div class="progline"><span>' + n + ' of ' + tot + ' ' + word + '</span><div class="bar"><i style="width:' + (tot ? Math.round(n / tot * 100) : 0) + '%"></i></div></div>'; }

  main.addEventListener('click', function (e) {
    var g = e.target.closest('[data-a=grp]'); if (g) { g.parentNode.classList.toggle('open'); return; }
    var b = e.target.closest('.qrow button[data-a]'), row = e.target.closest('.qrow');
    if (b && row) {
      var q = byId[row.dataset.id], a = b.dataset.a, slot = $('.slot', row);
      if (a === 'read') { if (S.read[q.id]) delete S.read[q.id]; else { S.read[q.id] = 1; bump('r'); } S.last = q.id; save(); row.classList.toggle('read', !!S.read[q.id]); b.setAttribute('aria-pressed', !!S.read[q.id]); b.textContent = S.read[q.id] ? '✓ Read' : 'Mark read'; }
      if (a === 'flag') { if (S.flag[q.id]) delete S.flag[q.id]; else S.flag[q.id] = 1; save(); b.setAttribute('aria-pressed', !!S.flag[q.id]); }
      if (a === 'note') {
        if (slot.dataset.v === 'note') { slot.dataset.v = ''; slot.innerHTML = ''; return; }
        slot.dataset.v = 'note'; slot.innerHTML = '<div class="notes"><textarea placeholder="Your notes for ' + q.id + '">' + esc(S.notes[q.id] || '') + '</textarea></div>';
        var ta = $('textarea', slot); ta.focus();
        ta.addEventListener('input', function () { if (ta.value.trim()) S.notes[q.id] = ta.value; else delete S.notes[q.id]; save(); b.textContent = 'Notes' + (S.notes[q.id] ? ' •' : ''); });
      }
      return;
    }
    if (row && !e.target.closest('a,button,textarea,.slot,.qexp')) { row.classList.toggle('open'); S.last = row.dataset.id; save(); }
  });
  document.addEventListener('click', function (e) {
    var x = e.target.closest('[data-x]'); if (!x) return;
    var open = x.dataset.x === 'open'; main.querySelectorAll('.grp').forEach(function (gp) { gp.classList.toggle('open', open); });
  });


  /* ------------------------------------------------------------ progress tracker */
  function streaks() {
    var act = S.act || {}, cur = 0, best = 0, run = 0, d = new Date(), i;
    function on(x) { var a = act[dkey(x)]; return a && (a.r || a.m); }
    if (!on(d)) d.setDate(d.getDate() - 1);
    while (on(d)) { cur++; d.setDate(d.getDate() - 1); }
    Object.keys(act).sort().forEach(function (k, j, arr) {
      var a = act[k]; if (!(a.r || a.m)) return;
      var prev = j ? new Date(arr[j - 1] + 'T00:00:00') : null, now = new Date(k + 'T00:00:00');
      run = prev && Math.round((now - prev) / 864e5) === 1 && (act[arr[j - 1]].r || act[arr[j - 1]].m) ? run + 1 : 1; if (run > best) best = run;
    });
    return { cur: cur, best: best };
  }
  function ring(pct, label, sub, cls) {
    var r = 34, c = 2 * Math.PI * r, o = c * (1 - Math.min(100, pct) / 100);
    return '<div class="ringbox"><svg viewBox="0 0 80 80" width="84" height="84" role="img" aria-label="' + esc(label) + ' ' + pct + ' percent"><circle cx="40" cy="40" r="' + r + '" class="rbg"/><circle cx="40" cy="40" r="' + r + '" class="rfg ' + (cls || '') + '" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + o.toFixed(1) + '" transform="rotate(-90 40 40)"/><text x="40" y="46" text-anchor="middle" class="rt">' + pct + '%</text></svg><b>' + esc(label) + '</b><small>' + sub + '</small></div>';
  }
  function progress() {
    var nq = DU.length, rd = nRead(), nm = MCQ.length, md = nDone(), ok = MCQ.filter(function (q) { return S.mcq[q.id] && S.mcq[q.id].c; }).length, st = streaks(), act = S.act || {};
    var pc = function (a, b) { return b ? Math.max(a ? 1 : 0, Math.round(a / b * 100)) : 0; };
    var h = hero({ crumb: '<a href="#/">Home</a> › Progress', icon: 'chart', title: 'Progress', desc: 'Your reading, MCQ practice and daily streak, all in one place. Saved on this device.', pills: [st.cur + '-day streak', rd + ' read', md + ' MCQs tried'] });
    h += '<div class="wrap"><div class="rings">' + ring(pc(rd, nq), 'Questions read', rd + ' of ' + nq) + ring(pc(md, nm), 'MCQs tried', md + ' of ' + nm, 'b') + ring(pc(ok, md), 'MCQ accuracy', ok + ' of ' + md + ' right', 'c') + '</div>';
    var days = [], i, mx = 1; for (i = 13; i >= 0; i--) { var d = new Date(); d.setDate(d.getDate() - i); var a = act[dkey(d)] || { r: 0, m: 0 }; days.push({ d: d, r: a.r, m: a.m }); mx = Math.max(mx, a.r + a.m); }
    var week = days.slice(7).reduce(function (t, x) { return t + x.r + x.m; }, 0), today = days[13].r + days[13].m, goal = S.goal || 20;
    h += '<div class="mx-dash"><div class="card big"><p class="k">Streak</p><div class="big0">' + st.cur + '<small> day' + (st.cur === 1 ? '' : 's') + ' in a row</small></div><p class="m">Best: ' + st.best + ' day' + (st.best === 1 ? '' : 's') + '. Mark a question read or answer an MCQ each day to keep it.</p></div>' +
      '<div class="card big"><p class="k">Today · last 7 days</p><div class="big0">' + today + '<small> items · ' + week + ' this week</small></div><span class="mx-st g"><u class="r" style="width:' + Math.min(100, today / goal * 100) + '%"></u></span><p class="m">Daily goal ' + goal + ' (change it on the MCQs page).</p></div></div>';
    h += '<p class="h2s">Last 14 days</p><div class="panel"><div class="bars" role="img" aria-label="Activity over the last 14 days">' + days.map(function (x) {
      var tot = x.r + x.m; return '<div class="bcol" title="' + x.d.toDateString() + ': ' + x.r + ' read, ' + x.m + ' MCQs"><span class="bv">' + (tot || '') + '</span><div class="bstack"><i class="bm" style="height:' + (x.m / mx * 100) + '%"></i><i class="br" style="height:' + (x.r / mx * 100) + '%"></i></div><small>' + x.d.getDate() + '</small></div>';
    }).join('') + '</div><div class="dots"><span class="g"><i style="background:var(--accent)"></i>Questions read</span><span><i style="background:var(--ok)"></i>MCQs answered</span></div></div>';
    h += '<p class="h2s">By part</p>' + partIds.map(function (n) {
      var qs = DU.filter(function (q) { return q.part === n; }), ms = MCQ.filter(function (q) { return q.part === n; }), r = qs.filter(function (q) { return S.read[q.id]; }).length, t = ms.filter(function (q) { return S.mcq[q.id]; }).length, c = ms.filter(function (q) { return S.mcq[q.id] && S.mcq[q.id].c; }).length;
      return '<a class="prow" href="#/chapter/' + n + '"><div class="ph">' + CMV.chip(n, 'sm') + '<span class="pt">' + esc(PARTS[n]) + '</span><span class="pp">' + pc(r, qs.length) + '%</span></div><div class="bar"><i style="width:' + pc(r, qs.length) + '%"></i></div><small>' + r + '/' + qs.length + ' read · ' + t + '/' + ms.length + ' MCQs tried' + (t ? ' · ' + pc(c, t) + '% right' : '') + '</small></a>';
    }).join('');
    var tiers = [3, 2, 1].map(function (s) { var qs = DU.filter(function (q) { return q.stars === s; }), r = qs.filter(function (q) { return S.read[q.id]; }).length; return '<div class="prow"><div class="ph"><span class="pt">' + '★'.repeat(s) + (s === 3 ? ' High-yield' : s === 2 ? ' Often asked' : ' Repeated') + '</span><span class="pp">' + pc(r, qs.length) + '%</span></div><div class="bar"><i style="width:' + pc(r, qs.length) + '%"></i></div><small>' + r + ' of ' + qs.length + ' read</small></div>'; }).join('');
    h += '<p class="h2s">By importance</p>' + tiers;
    var tm = {}; MCQ.forEach(function (q) { var d = S.mcq[q.id]; if (!d) return; var t = tm[q.topic] = tm[q.topic] || { a: 0, c: 0, p: q.part }; t.a++; t.c += d.c; });
    var weak = Object.keys(tm).filter(function (k) { return tm[k].a >= 3 && tm[k].c / tm[k].a < .7; }).sort(function (a, b) { return tm[a].c / tm[a].a - tm[b].c / tm[b].a; }).slice(0, 6);
    h += '<p class="h2s">Weak topics</p>' + (weak.length ? '<div class="hist">' + weak.map(function (k) { return '<div><span>' + esc(k) + '<small>' + tm[k].c + ' of ' + tm[k].a + ' right</small></span><b>' + Math.round(tm[k].c / tm[k].a * 100) + '%</b></div>'; }).join('') + '</div>' : '<p class="about">Answer at least 3 MCQs in a topic and any topic under 70% shows up here.</p>');
    h += '<div class="tiles" style="margin-top:1rem"><a class="tile" href="#/questions?status=flagged"><b>' + DU.filter(function (q) { return S.flag[q.id]; }).length + ' flagged</b><span>Review flagged questions</span></a><a class="tile" href="#/questions?status=noted"><b>' + DU.filter(function (q) { return S.notes[q.id]; }).length + ' notes</b><span>Questions with your notes</span></a></div></div>';
    main.innerHTML = h;
  }
  /* ------------------------------------------------------------ shared filter panel (Questions, Chapter, MCQ reading, Custom practice)
     One component: sticky search + Filters button, quick chips, removable active chips, and a grouped panel whose chips show live counts.
     Filters only ever re-render the result list; cards keep their data-id, so handwritten notes on them are redrawn, never removed. */
  /* saved filters follow the chapter layout of data/groups.js: when the layout changes they are carried over (chapter numbers remapped), not wiped */
  (function () {
    var L = CM.layout || 'g', from = S.fxv === 'g21' ? (CM.layoutMoves || {}).groups2021 : null;
    if (!S.fx || typeof S.fx !== 'object') S.fx = {};
    if (S.fxv === L) return;
    if (!from) { if (S.fxv !== undefined) S.fx = {}; S.fxv = L; return; }
    var nf = {};
    Object.keys(S.fx).forEach(function (k) {
      var st = S.fx[k]; if (!st || typeof st !== 'object') return;
      if (st.f && st.f.part) { var np = []; st.f.part.forEach(function (o) { (from[o] || []).forEach(function (n) { if (np.indexOf(n) < 0) np.push(n); }); }); if (np.length) st.f.part = np; else delete st.f.part; }
      var m = /^ch(\d+)$/.exec(k);
      if (m) { (from[+m[1]] || []).forEach(function (n) { if (!nf['ch' + n]) nf['ch' + n] = JSON.parse(JSON.stringify(st)); }); return; }
      nf[k] = st;
    });
    S.fx = nf; S.fxv = L; save();
  })();
  function fxState(id) { var s = S.fx[id]; if (!s || typeof s !== 'object' || !s.f) s = S.fx[id] = { txt: '', f: {}, yfrom: 0, yto: 0, sort: '' }; return s; }
  function fxReset(st) { st.txt = ''; st.f = {}; st.yfrom = 0; st.yto = 0; }
  function fxClean(path) { try { history.replaceState(null, '', path); } catch (e) {} }
  function fxTok(t) { var o = { inc: [], exc: [] }; (String(t || '').match(/-?"[^"]+"|\S+/g) || []).forEach(function (w) { var neg = w.charAt(0) === '-' && w.length > 1; if (neg) w = w.slice(1); w = w.replace(/"/g, '').toLowerCase().trim(); if (w) (neg ? o.exc : o.inc).push(w); }); return o; }
  function fxMatch(c, q, st, skip, tk) {
    for (var i = 0; i < c.facets.length; i++) {
      var fc = c.facets[i], s = st.f[fc.k]; if (fc.k === skip || !s || !s.length) continue;
      if (!fc.get(q).some(function (x) { return s.indexOf(x) >= 0; })) return false;
    }
    if (c.range && skip !== 'range' && (st.yfrom || st.yto) && !c.range.get(q).some(function (v) { return (!st.yfrom || v >= st.yfrom) && (!st.yto || v <= st.yto); })) return false;
    if (tk && (tk.inc.length || tk.exc.length)) {
      var key = '_fx' + c.kind; if (q[key] === undefined) q[key] = c.text(q).toLowerCase();
      var h = q[key], j;
      for (j = 0; j < tk.inc.length; j++) if (h.indexOf(tk.inc[j]) < 0) return false;
      for (j = 0; j < tk.exc.length; j++) if (h.indexOf(tk.exc[j]) >= 0) return false;
    }
    return true;
  }
  function fxN(st) { var n = (st.txt ? 1 : 0) + (st.yfrom || st.yto ? 1 : 0); Object.keys(st.f).forEach(function (k) { n += (st.f[k] || []).length; }); return n; }
  function FX(c) {
    var st = c.st, open = !!c.startOpen, og = {}, tm, root = c.el, FB = {};
    c.facets.forEach(function (f) { FB[f.k] = f; });
    root.innerHTML = '<div class="fx"><div class="fx-bar"><label class="fx-q"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg><input type="search" placeholder="' + esc(c.ph) + '" aria-label="Search"><button type="button" class="x" data-fx="txt" aria-label="Clear search" hidden>✕</button></label>' +
      '<button type="button" class="fx-tog" aria-expanded="false" aria-controls="' + c.id + '-p"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/></svg>Filters<b></b></button></div>' +
      '<div class="chips fx-quick"></div><div class="fx-act"></div><div class="fx-panel" id="' + c.id + '-p" hidden></div>' +
      '<div class="fx-meta"><span class="count" aria-live="polite"></span><span class="fx-tools">' + (c.sorts ? '<span class="fx-sort" role="group" aria-label="Sort">' + c.sorts.map(function (s) { return '<button type="button" data-sort="' + s[0] + '">' + s[1] + '</button>'; }).join('') + '</span>' : '') + (c.tools || '') + '</span></div></div><div class="fx-list"></div>';
    var inp = $('.fx-q input', root), clr = $('.fx-q .x', root), tog = $('.fx-tog', root), panelEl = $('.fx-panel', root), listEl = $('.fx-list', root);
    inp.value = st.txt || '';
    function chip(k, v, label, n) { var s = st.f[k] || [], on = s.indexOf(v) >= 0; return '<button type="button" class="fchip' + (on ? ' on' : '') + (n === 0 && !on ? ' z' : '') + '" data-fq="' + k + '" data-v="' + esc(v) + '" aria-pressed="' + on + '">' + label + (n == null ? '' : '<em>' + n + '</em>') + '</button>'; }
    function prune() {
      var pool = c.pool();
      c.facets.forEach(function (fc) { if (!fc.dep || !st.f[fc.k]) return; var ok = fc.opts(st, pool).filter(function (it) { return it.h == null; }).map(function (it) { return it[0]; }); st.f[fc.k] = st.f[fc.k].filter(function (v) { return ok.indexOf(v) >= 0; }); if (!st.f[fc.k].length) delete st.f[fc.k]; });
    }
    function panel(pool, tk, total) {
      var h = '<div class="fx-grid">';
      c.groups.forEach(function (g, gi) {
        var body = '', nsel = 0;
        g.k.forEach(function (k) {
          if (k === 'range') {
            if (!c.range) return; var ys = c.range.vals(), yo = function (cur) { return '<option value="0">Any</option>' + ys.map(function (y) { return '<option value="' + y + '"' + (cur === y ? ' selected' : '') + '>' + y + '</option>'; }).join(''); };
            if (st.yfrom || st.yto) nsel++;
            body += '<div class="fx-f"><p class="fx-fl">' + esc(c.range.label) + '</p><div class="yrange"><label>From <select data-fr="yfrom">' + yo(st.yfrom) + '</select></label><label>To <select data-fr="yto">' + yo(st.yto) + '</select></label></div></div>'; return;
          }
          var fc = FB[k]; if (!fc) return; var items = fc.opts(st, pool), sel = st.f[k] || []; nsel += sel.length;
          if (!items.length) { var hint = fc.hint ? fc.hint(st) : ''; if (hint) body += '<div class="fx-f"><p class="fx-fl">' + esc(fc.l) + '</p><p class="fx-hint">' + esc(hint) + '</p></div>'; return; }
          var cnt = {}; pool.forEach(function (q) { if (fxMatch(c, q, st, k, tk)) fc.get(q).forEach(function (v) { cnt[v] = (cnt[v] || 0) + 1; }); });
          body += '<div class="fx-f"><p class="fx-fl">' + esc(fc.l) + (sel.length ? '<button type="button" class="lnk" data-fxclr="' + k + '">Clear</button>' : '') + '</p><div class="chips">' +
            items.map(function (it) { return it.h != null ? '<p class="fx-fh">' + esc(it.h) + '</p>' : chip(k, it[0], esc(it[1]), cnt[it[0]] || 0); }).join('') + '</div></div>';
        });
        if (!body) return;
        var isOpen = og[gi] != null ? og[gi] : (gi === 0 || nsel > 0);
        h += '<details class="fx-g" data-g="' + gi + '"' + (isOpen ? ' open' : '') + '><summary>' + esc(g.t) + (nsel ? '<em>' + nsel + '</em>' : '') + '</summary><div class="fx-gb">' + body + '</div></details>';
      });
      return h + '</div><div class="fx-foot"><span><b>' + total + '</b> ' + c.noun(total) + ' match</span><span><button type="button" class="lnk" data-fx="clear">Clear all</button><button type="button" class="sbtn" data-fx="close">Show results</button></span></div>';
    }
    function act() {
      var a = '';
      c.facets.forEach(function (fc) { (st.f[fc.k] || []).forEach(function (v) { a += '<button type="button" class="fchip" data-fq="' + fc.k + '" data-v="' + esc(v) + '" aria-label="Remove ' + esc(fc.l + ': ' + fc.lab(v)) + '"><i>' + esc(fc.s || fc.l) + '</i>' + esc(fc.lab(v)) + '<span aria-hidden="true">✕</span></button>'; }); });
      if (st.yfrom || st.yto) a += '<button type="button" class="fchip" data-fx="range"><i>Years</i>' + (st.yfrom || 'start') + '–' + (st.yto || 'now') + '<span aria-hidden="true">✕</span></button>';
      if (st.txt) a += '<button type="button" class="fchip" data-fx="txt"><i>Search</i>“' + esc(st.txt) + '”<span aria-hidden="true">✕</span></button>';
      return a ? a + '<button type="button" class="lnk" data-fx="clear">Clear all</button>' : '';
    }
    function paint() {
      var tk = fxTok(st.txt), pool = c.pool(), list = pool.filter(function (q) { return fxMatch(c, q, st, null, tk); }), n = fxN(st);
      if (c.sorts) {
        if (!c.sorts.some(function (s) { return s[0] === st.sort; })) st.sort = c.sorts[0][0];
        list = c.sort(list, st.sort);
        root.querySelectorAll('[data-sort]').forEach(function (b) { var on = b.dataset.sort === st.sort; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
      }
      $('.fx-quick', root).innerHTML = (typeof c.quick === 'function' ? c.quick(st) : c.quick || []).map(function (x) { return chip(x[0], x[1], esc(x[2])); }).join('');
      $('.fx-act', root).innerHTML = act();
      $('b', tog).textContent = n ? n : '';
      tog.classList.toggle('has', n > 0); tog.setAttribute('aria-expanded', open);
      clr.hidden = !st.txt;
      $('.count', root).innerHTML = '<b>' + list.length + '</b> ' + c.noun(list.length) + (n ? ' match' : '') + (n && pool.length !== list.length ? ' <span>of ' + pool.length + '</span>' : '');
      panelEl.innerHTML = open ? panel(pool, tk, list.length) : ''; panelEl.hidden = !open;
      listEl.innerHTML = c.list(list, n);
      if (c.after) c.after(list, listEl, n);
      save();
    }
    root.addEventListener('click', function (e) {
      var t = e.target.closest('[data-fq],[data-fx],[data-fxclr],[data-sort],.fx-tog'); if (!t || listEl.contains(t)) return;
      if (t.classList.contains('fx-tog')) { open = !open; paint(); return; }
      if (t.dataset.sort) { st.sort = t.dataset.sort; paint(); return; }
      if (t.dataset.fxclr) { delete st.f[t.dataset.fxclr]; prune(); paint(); return; }
      if (t.dataset.fq) {
        var k = t.dataset.fq, fc = FB[k], v = fc && fc.num ? +t.dataset.v : t.dataset.v, s = st.f[k] = st.f[k] || [], i = s.indexOf(v);
        if (i >= 0) s.splice(i, 1); else s.push(v); if (!s.length) delete st.f[k];
        prune(); paint(); return;
      }
      var a = t.dataset.fx;
      if (a === 'clear') { fxReset(st); inp.value = ''; }
      if (a === 'txt') { st.txt = ''; inp.value = ''; inp.focus(); }
      if (a === 'range') { st.yfrom = 0; st.yto = 0; }
      if (a === 'close') open = false;
      paint();
      if (a === 'close') window.scrollTo(0, Math.max(0, root.getBoundingClientRect().top + window.scrollY - 70));
    });
    root.addEventListener('change', function (e) { var r = e.target.closest('[data-fr]'); if (!r) return; st[r.dataset.fr] = +r.value; if (st.yfrom && st.yto && st.yfrom > st.yto) { var x = st.yfrom; st.yfrom = st.yto; st.yto = x; } paint(); });
    panelEl.addEventListener('toggle', function (e) { var d = e.target; if (d && d.dataset && d.dataset.g != null) og[d.dataset.g] = d.open; }, true);
    inp.addEventListener('input', function () { clearTimeout(tm); tm = setTimeout(function () { st.txt = inp.value.trim(); paint(); }, 250); });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Escape' && inp.value) { inp.value = ''; st.txt = ''; paint(); } });
    return { paint: paint, st: st };
  }

  /* ---- DU written-question filters (Questions page and each chapter) ---- */
  function qnoun(n) { return n === 1 ? 'question' : 'questions'; }
  var DUG = [{ t: 'Syllabus', k: ['G', 'part', 'topic', 'sub'] }, { t: 'Exam history', k: ['range', 'yr', 'rec', 'ses', 'stars', 'kind'] }, { t: 'College papers', k: ['col', 'paper'] }, { t: 'My progress', k: ['st', 'ans'] }];
  var DUQ = [['G', 'A', 'Group A'], ['G', 'B', 'Group B'], ['G', 'C', 'Group C'], ['G', 'D', 'Group D'], ['stars', 3, '★★★ High-yield'], ['rec', 'new5', 'Last 5 years'], ['st', 'unread', 'Not read'], ['st', 'flagged', 'Flagged'], ['kind', 'SEQ', 'SEQ'], ['kind', 'Case-based', 'Case-based']];
  var DUS = [['syl', 'By syllabus'], ['new', 'Newest first'], ['imp', 'Most important']];
  var DUR = { label: 'DU Written year range', vals: function () { return FACETS.filter(function (f) { return f[0] === 'yr'; })[0][4]; }, get: function (q) { return q.years.map(function (y) { return yparse(y).y; }); } };
  function duFacets(part) {
    var fs = [];
    if (!part) { fs.push({ k: 'G', l: 'Exam group', get: function (q) { return [q.G]; }, lab: function (v) { return 'Group ' + v; }, opts: function () { return GRPS.map(function (g) { return [g, 'Group ' + g]; }); } }); fs.push({ k: 'part', l: 'Chapter', num: 1, get: function (q) { return [q.part]; }, lab: function (v) { return pname(v); }, opts: chOpts }); }
    fs.push({ k: 'topic', l: 'Topic', dep: 1, get: function (q) { return [q.topic]; }, lab: function (v) { return v; }, hint: function () { return 'Choose a chapter to see its topics.'; },
      opts: function (st) { var ps = part ? [part] : (st.f.part || []), o = []; ps.forEach(function (n) { if (!part) o.push({ h: pname(n) }); topicsOf(DU, n).forEach(function (t) { o.push([t, t]); }); }); return o; } });
    fs.push({ k: 'sub', l: 'Subtopic', dep: 1, get: function (q) { return [q.sub || '~']; }, lab: function (v) { return v === '~' ? 'Other in topic' : v; }, hint: function (st) { return duTopics(st, part).length ? '' : 'Choose a topic to see its subtopics.'; },
      opts: function (st) { var o = []; duTopics(st, part).forEach(function (t) { var q0 = DU.filter(function (q) { return q.topic === t; })[0], seq = q0 && CM.subs && CM.subs[q0.part + '|' + t]; if (!seq || !seq.length) return; o.push({ h: t }); seq.forEach(function (sb) { o.push([sb, sb]); }); o.push(['~', 'Other in this topic']); }); return o; } });
    FACETS.forEach(function (f) { fs.push({ k: f[0], l: f[1], num: f[0] === 'stars' || f[0] === 'yr', get: f[2], lab: function (v) { return String(f[3](v)); }, opts: function () { return f[4].map(function (v) { return [v, String(f[3](v))]; }); } }); });
    return fs;
  }
  function duTopics(st, part) { var t = st.f.topic || []; if (t.length) return t; var all = part ? topicsOf(DU, part) : []; return all.length === 1 ? all : []; }
  function duText(q) { return strip(q.q) + ' ' + q.topic + ' ' + (q.sub || '') + ' ' + (q.colleges || '') + ' ' + (q.asked || '') + ' ' + (q.note || '') + ' ' + q.years.map(function (y) { return yparse(y).label; }).join(' '); }
  function duSort(list, s) {
    if (s === 'new') return list.slice().sort(function (a, b) { return qyear(b) - qyear(a) || b.stars - a.stars || a.n - b.n; });
    if (s === 'imp') return list.slice().sort(function (a, b) { return b.stars - a.stars || qyear(b) - qyear(a) || a.n - b.n; });
    return list;
  }
  function duList(list, grouped, openAll) {
    if (!list.length) return '<div class="empty-state"><h2>No questions match</h2><p>Remove a filter, or clear them all, to see more.</p></div>';
    return grouped ? groupedRows(list, openAll) : list.map(function (q) { return qRow(q); }).join('');
  }
  function seedDU(st, qs) {
    fxReset(st); st.txt = qs.q || '';
    if (qs.part) st.f.part = [+qs.part];
    if (qs.topic) { st.f.topic = [qs.topic]; if (!qs.part) { var q0 = DU.filter(function (q) { return q.topic === qs.topic; })[0]; if (q0) st.f.part = [q0.part]; } }
    if (qs.stars) { st.f.stars = []; for (var s = +qs.stars; s <= 3; s++) st.f.stars.push(s); }
    if (qs.kind) st.f.kind = [qs.kind]; if (qs.status) st.f.st = [qs.status];
  }
  var XTOOLS = '<span class="fx-x"><button class="lnk" data-x="open">Expand all</button><button class="lnk" data-x="close">Collapse all</button></span>';

  /* ------------------------------------------------------------ questions */
  function questions(r) {
    var st = fxState('q');
    if (Object.keys(r.qs).length) { seedDU(st, r.qs); fxClean('#/questions'); }
    main.innerHTML = hero({ crumb: '<a href="#/">Home</a> › Questions', icon: 'list', title: 'Questions', desc: 'Tap a question to read its answer right here, or tap Answer to open it on its own page.',
      btns: '<div class="btnrow"><button class="bigbtn fill" id="rnd">Random question</button><a class="bigbtn" href="#/chapters">Chapters</a></div>', pills: [DU.length + ' questions', 'DU Written years', 'College papers'] }) +
      '<div class="wrap" id="qpage">' + progLine(nRead(), DU.length, 'read') + recLegend() + '<div id="fxq"></div></div>';
    var cur = DU;
    FX({ id: 'q', kind: 'du', el: $('#fxq'), st: st, pool: function () { return DU; }, facets: duFacets(0), groups: DUG, range: DUR, text: duText, noun: qnoun,
      ph: 'Search: words, "exact phrase", -exclude', quick: DUQ, sorts: DUS, sort: duSort, tools: XTOOLS,
      list: function (list, n) { cur = list; return duList(list, st.sort === 'syl', n > 0 && list.length < 120); },
      after: function (list, el) { var x = $('.fx-x', $('#fxq')); if (x) x.hidden = st.sort !== 'syl' || !list.length; } }).paint();
    $('#rnd').onclick = function () { var l = cur.length ? cur : DU, q = l[Math.floor(Math.random() * l.length)]; location.hash = '#/q/' + q.id; };
  }
  function single(r) {
    var q = byId[r.id]; if (!q || q.id.indexOf('DU.') !== 0) { location.hash = '#/questions'; return; }
    S.last = q.id; save();
    var i = DU.indexOf(q), p = DU[i - 1], n = DU[i + 1];
    main.innerHTML = hero({ crumb: '<a href="#/">Home</a> › <a href="#/questions">Questions</a> › <a href="#/chapter/' + q.part + '">' + esc(pname(q.part)) + '</a>', title: 'Question ' + esc(q.id.replace('DU.', '')), desc: esc(q.topic) }) +
      wrap(qRow(q, true) + '<div class="pager">' + (p ? '<a class="btn ghost sm" href="#/q/' + p.id + '">← ' + p.id + '</a>' : '<span></span>') + (n ? '<a class="btn ghost sm" href="#/q/' + n.id + '">' + n.id + ' →</a>' : '') + '</div>', true);
  }

  /* ------------------------------------------------------------ chapters */
  function chapters() {
    var h = hero({ crumb: '<a href="#/">Home</a> › Chapters', icon: 'book', title: 'Chapters', desc: 'Arranged by the four written-exam groups as set in the DU new-curriculum papers (Nov 2025, May 2026). Each group is worth 17.5 marks: SAQ questions 1–4 (answer any three, 3.5 marks each) and SEQ question 5 (compulsory, 7 marks). MCQs (MTF 10 + SBA 10) come from every chapter.',
      btns: '<a class="bigbtn fill" href="#/questions">All questions</a>', pills: ['4 groups', partIds.length + ' chapters', DU.length + ' questions', MCQ.length + ' MCQs'] });
    var card = function (n) {
      var qs = DU.filter(function (q) { return q.part === n; }), ms = MCQ.filter(function (q) { return q.part === n; }), d = qs.filter(function (q) { return S.read[q.id]; }).length, tp = topicsOf(qs);
      return '<a class="pcard vcard" style="--h:' + CMV.hue(n) + '" href="#/chapter/' + n + '">' + CMV.banner(n) + '<span class="num">' + pcode(n) + '</span><h3>' + esc(PARTS[n]) + (CM.chapters[n - 1].extra ? ' <sup title="Not named in the curriculum table">*</sup>' : '') + '</h3><span class="prev">' + esc(tp.slice(0, 3).join(' · ') + (tp.length > 3 ? ' …' : '')) + '</span>' + (CM.chapters[n - 1].ev ? '<span class="ev">Asked: ' + esc(CM.chapters[n - 1].ev) + '</span>' : '') + '<span class="st">' + qs.length + ' questions · ' + ms.length + ' MCQs · ' + tp.length + ' topic' + (tp.length === 1 ? '' : 's') + ' · ' + d + ' read</span><div class="bar"><i style="width:' + (qs.length ? Math.round(d / qs.length * 100) : 0) + '%"></i></div></a>';
    };
    var body = GRPS.map(function (g) {
      var ns = partIds.filter(function (n) { return pgrp(n) === g; }), qs = DU.filter(function (q) { return q.G === g; }), d = qs.filter(function (q) { return S.read[q.id]; }).length, gi = CM.groups && CM.groups[g];
      return '<section class="gsec" id="group-' + g + '"><div class="ghead"><span class="gl">' + g + '</span><div class="gtx"><h2>Group ' + g + '</h2><p class="gm">' + GMARK + '</p>' +
        (gi ? '<p class="gtop">' + esc(gi.basis) + '</p>' : '') + '</div><span class="gst">' + qs.length + ' questions<br>' + d + ' read</span></div><div class="pgrid">' + ns.map(card).join('') + '</div></section>';
    }).join('');
    h += wrap('<nav class="gjump" aria-label="Jump to group">' + GRPS.map(function (g) { return '<a href="#/chapters" data-gj="' + g + '">Group ' + g + '</a>'; }).join('') + '</nav>' + body +
      '<p class="gnote">Groups follow the DU new-curriculum written papers of November 2025 and May 2026. Where the two papers put a topic in different groups, May 2026 (the latest) decides; topics not yet asked sit with their nearest neighbour. "Asked" on each chapter shows paper, group and question number; brackets mean it also appeared in another group.</p>');
    main.innerHTML = h;
    main.querySelectorAll('[data-gj]').forEach(function (a) { a.onclick = function (e) { e.preventDefault(); var t = document.getElementById('group-' + a.dataset.gj); if (t) window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 70, behavior: 'smooth' }); }; });
  }
  function chapter(r) {
    var n = +r.id; if (!PARTS[n]) { location.hash = '#/chapters'; return; }
    var list = DU.filter(function (q) { return q.part === n; }), tp = topicsOf(list), ms = MCQ.filter(function (q) { return q.part === n; }), mt = topicsOf(ms);
    var st = fxState('ch' + n);
    if (r.qs.topic || r.qs.q) { fxReset(st); if (r.qs.topic) st.f.topic = [r.qs.topic]; st.txt = r.qs.q || ''; fxClean('#/chapter/' + n); }
    var h = hero({ crumb: '<a href="#/">Home</a> › <a href="#/chapters">Chapters</a> › ' + pcode(n) + ' (Group ' + pgrp(n) + ')', part: n, title: esc(PARTS[n]), desc: list.length + ' questions across ' + tp.length + ' topic' + (tp.length === 1 ? '' : 's') + ', ' + ms.length + ' MCQs.',
      btns: '<div class="btnrow"><button class="bigbtn fill" data-go="practice">Practise MCQs</button><a class="bigbtn" href="#/read?part=' + n + '">Read MCQs</a></div>' });
    h += '<div class="wrap">' + progLine(list.filter(function (q) { return S.read[q.id]; }).length, list.length, 'read') + recLegend() + '<div id="fxc"></div>' +
      '<div class="pager">' + (n > 1 ? '<a class="btn ghost sm" href="#/chapter/' + (n - 1) + '">← ' + pcode(n - 1) + '</a>' : '<span></span>') + (PARTS[n + 1] ? '<a class="btn ghost sm" href="#/chapter/' + (n + 1) + '">' + pcode(n + 1) + ' →</a>' : '') + '</div></div>';
    main.innerHTML = h;
    FX({ id: 'ch' + n, kind: 'du', el: $('#fxc'), st: st, pool: function () { return list; }, facets: duFacets(n), groups: DUG, range: DUR, text: duText, noun: qnoun,
      ph: 'Search in ' + PARTS[n], quick: function (st) { var q = tp.length > 1 ? tp.map(function (t) { return ['topic', t, t]; }) : [], ts = duTopics(st, n); if (ts.length === 1) { var seq = (CM.subs && CM.subs[n + '|' + ts[0]]) || []; q = q.concat(seq.map(function (sb) { return ['sub', sb, sb]; })); } return q; }, sorts: DUS, sort: duSort, tools: XTOOLS,
      list: function (l) {
        var tt = duTopics(st, n), one = tt.length === 1 ? tt[0] : '', link = one && mt.indexOf(one) >= 0 ? '<div class="fx-mcq"><span>MCQs on <b>' + esc(one) + '</b></span><span><button class="sbtn" data-go="tmcq">Practise</button><a class="sbtn" href="' + url('#/read', { part: n, topic: one }) + '">Read</a></span></div>' : '';
        return link + duList(l, st.sort === 'syl', true);
      },
      after: function (l, el) { var x = $('.fx-x', $('#fxc')); if (x) x.hidden = st.sort !== 'syl' || !l.length; var b = $('[data-go=tmcq]', el); if (b) b.onclick = function () { var t1 = duTopics(st, n)[0]; startFrom({ part: [n], topic: [t1] }, { scope: t1 }); }; } }).paint();
    $('[data-go=practice]').onclick = function () { startFrom({ part: [n] }, { scope: pname(n) }); };
  }


  /* ------------------------------------------------------------ answers */
  function answers(r) {
    var qs = r.qs, have = DU.filter(function (q) { return q.a && (!qs.part || q.part == qs.part); }), tot = DU.filter(function (q) { return q.a; }).length;
    var h = hero({ crumb: '<a href="#/">Home</a> › Answers', icon: 'pen', title: 'Answers', desc: 'Model answers for the DU question bank. ' + tot + ' of ' + DU.length + ' added so far.' });
    if (!tot) h += wrap('<div class="panel empty-state"><h2>Answers are on their way</h2><p>No model answers have been added yet. They will appear here by part, and under each question\'s answer.</p><p>To add answers, put them in <code>source/du_answers.md</code> as <code>## DU.12</code> followed by the answer, then run <code>python3 tools/build_banks.py</code>.</p><a class="btn" href="#/questions">Go to questions</a></div>', true);
    else h += wrap('<div class="panel filters">' + sel('part', 'All parts', partOpts(DU), qs.part) + '</div>' + (have.length ? groupedRows(have, !!qs.part) : '<div class="empty-state"><h2>No answers in this part yet</h2><p>Pick another part or clear the filter.</p></div>'), true);
    main.innerHTML = h; bindFilters('#/answers');
  }

  /* ------------------------------------------------------------ MCQ core */
  var anskey = function (q) { return q.kind === 'SBA' ? !!q.ans : q.opts.some(function (o) { return o.k; }); };
  var scorable = function (q) { return q.kind === 'SBA' ? !!q.ans : q.opts.some(function (o) { return o.k && !o.conflict; }); };
  function filteredM(f) {
    var tk = (f.txt || '').toLowerCase().split(/\s+/).filter(Boolean);
    return MCQ.filter(function (q) {
      if (f.part && f.part.length && f.part.indexOf(q.part) < 0) return false;
      if (f.topic && f.topic.length && f.topic.indexOf(q.topic) < 0) return false;
      if (f.kind && f.kind.length && f.kind.indexOf(q.kind) < 0) return false;
      if (f.src && f.src.length && f.src.indexOf(q.src) < 0) return false;
      if (f.year && q.years.indexOf(f.year) < 0) return false;
      if (f.st && f.st.length) {
        var d = S.mcq[q.id], ok = f.st.some(function (s) { return s === 'todo' ? !d : s === 'wrong' ? (d && !d.c) : s === 'right' ? (d && d.c) : s === 'flagged' ? S.flag[q.id] : false; });
        if (!ok) return false;
      }
      if (tk.length) { var t = (q.stem + ' ' + q.topic + ' ' + q.opts.map(function (o) { return o.t; }).join(' ')).toLowerCase(); for (var i = 0; i < tk.length; i++) if (t.indexOf(tk[i]) < 0) return false; }
      return true;
    });
  }
  function qsToF(qs) { return { part: qs.part ? [+qs.part] : [], topic: qs.topic ? [qs.topic] : [], kind: qs.kind ? [qs.kind] : [], src: qs.src ? [qs.src] : [], year: qs.year || '', st: qs.status ? [qs.status] : [], txt: qs.q || '' }; }
  function scoreOf(q, p) {
    p = p || {};
    if (q.kind === 'SBA') return p.sba ? p.sba === q.ans : null;
    var sc = q.opts.filter(function (o) { return o.k && !o.conflict; }), tried = sc.filter(function (o) { return p[o.l]; }).length;
    if (!tried) return null;
    return { got: sc.filter(function (o) { return p[o.l] === o.k; }).length, of: sc.length };
  }
  var isOk = function (q, sc) { return q.kind === 'SBA' ? sc === true : !!sc && sc.got === sc.of; };
  function record(q, ok) { S.mcq[q.id] = { c: ok ? 1 : 0 }; bump('m'); save(); }
  function chips(q) {
    return '<div class="qh"><span class="chip id">' + q.id + '</span><span class="chip kind">' + (q.kind === 'SBA' ? 'SBA' : 'True / False') + '</span>' + (q.src === 'New' ? '<span class="chip">New (AI-written)</span>' : q.src === 'BCS' ? '<span class="chip">BCS</span>' : '') +
      '<span class="chip">' + esc(q.topic) + '</span></div>' + tagsHtml(q, 'DU MCQ');
  }
  /* answers shown: reading mode and review */
  function readCard(q, p) {
    var h = '<div class="rdq inkc" data-id="' + q.id + '">' + chips(q) + '<p class="stem">' + esc(q.stem) + '</p>';
    q.opts.forEach(function (o) {
      var cls = '', tag = '';
      if (q.kind === 'SBA') { if (o.l === q.ans) { cls = 'k'; tag = '✓ Correct'; } else if (p && p.sba === o.l) { cls = 'w'; tag = 'Your answer'; } }
      else { tag = o.k ? (o.k === 'T' ? 'True' : 'False') : 'no key'; if (o.k) cls = o.k === 'T' ? 'k' : 'f'; if (p && p[o.l]) { if (o.k && !o.conflict && p[o.l] !== o.k) { cls += ' x'; tag += ' · ✗ you said ' + (p[o.l] === 'T' ? 'True' : 'False'); } else if (o.k) tag += ' · ✓'; } }
      h += '<div class="rd ' + cls + '"><b>' + o.l + ')</b> ' + esc(o.t) + (tag ? '<em>' + tag + '</em>' : '') + (o.conflict ? '<small>Papers give different keys for this statement.</small>' : '') + (o.e ? '<small class="ex">' + esc(o.e) + '</small>' : '') + '</div>';
    });
    if (!anskey(q)) h += '<p class="note">The source has no answer key for this item.</p>';
    if (q.ref) h += '<p class="meta">Ref: ' + esc(q.ref) + '</p>';
    return h + '</div>';
  }

  /* ------------------------------------------------------------ MCQ hub */
  function mcqs() {
    var n = MCQ.length, att = nDone(), right = MCQ.filter(function (q) { return S.mcq[q.id] && S.mcq[q.id].c; }).length, wrong = att - right, left = n - att;
    var acc = att ? Math.round(right / att * 100) : null, mist = MCQ.filter(function (q) { return S.mcq[q.id] && !S.mcq[q.id].c; }).length;
    var nSba = MCQ.filter(function (q) { return q.kind === 'SBA'; }).length;
    var td = ((S.act || {})[dkey()] || {}).m || 0, goal = S.goal || 20;
    var seg = function (r, w) { return '<span class="mx-st"><u class="r" style="width:' + r + '%"></u><u class="w" style="width:' + w + '%"></u></span>'; };
    var tile = function (a, t, sub, cls, off) { return '<button type="button" class="tile ' + (cls || '') + (off ? ' off' : '') + '" data-go="' + a + '">' + CMV.chip(({ quick: 'bolt', custom: 'sliders', mock: 'clock', read: 'book', mist: 'warning', fresh: 'sparkle' })[a] || 'check', 'sm') + '<b>' + t + '</b><span>' + sub + '</span></button>'; };
    var h = hero({ crumb: '<a href="#/">Home</a> › MCQs', icon: 'check', title: 'MCQs', desc: 'Practise by chapter, build your own set, sit a timed mock paper, or read every question with the answers shown.',
      btns: '<div class="btnrow"><button class="bigbtn fill" data-go="quick">Quick 10</button><a class="bigbtn" href="#/read">Reading mode</a></div>', pills: [n + ' MCQs', 'Single best answer + true/false'] });
    h += '<div class="wrap"><div class="mx-dash"><div class="card big"><p class="k">Your accuracy</p><div class="big0">' + (att ? acc + '<small>%</small>' : '–') + '</div>' + seg(att ? right / n * 100 : 0, att ? wrong / n * 100 : 0) +
      '<div class="dots"><span class="g"><i></i>' + right + ' right</span><span class="r"><i></i>' + wrong + ' missed</span><span><i></i>' + left + ' not tried</span></div></div>' +
      '<div class="card big"><p class="k">Today</p><div class="big0">' + Math.min(td, 999) + '<small> / ' + goal + '</small></div><span class="mx-st g"><u class="r" style="width:' + Math.min(100, td / goal * 100) + '%"></u></span><div class="goalrow"><span>Goal</span>' +
      [10, 20, 30, 50].map(function (v) { return '<button data-goal="' + v + '" class="' + (v === goal ? 'on' : '') + '">' + v + '</button>'; }).join('') + '</div></div></div>' +
      '<p class="about">' + n + ' MCQs · ' + nSba + ' SBA · ' + (n - nSba) + ' True / False</p>';
    if (S.sess && !S.sess.done) h += '<button type="button" class="resume" data-go="resume"><span><small>Pick up where you left off</small>' + esc(S.sess.scope) + ' · question ' + (S.sess.i + 1) + ' of ' + S.sess.ids.length + '</span><i>›</i></button>';
    h += '<p class="h2s">Practise</p><div class="tiles">' + tile('quick', 'Quick 10', 'Mixed questions, answer shown after each') + tile('custom', 'Custom practice', 'Pick parts, topics, type, status') + tile('mock', 'Mock paper', '20 questions, 30 minutes, marked at the end') +
      tile('read', 'Reading mode', 'Every question with the answers shown') + tile('mist', 'Mistake bank', mist + ' question' + (mist === 1 ? '' : 's') + ' you got wrong', '', !mist) + tile('fresh', 'Not tried yet', left + ' MCQs you have not attempted') + '</div>';
    h += '<p class="h2s">Browse by chapter</p>' + partIds.map(function (p) {
      var gh = p === 1 || pgrp(p) !== pgrp(p - 1) ? '<p class="gdiv"><b>Group ' + pgrp(p) + '</b><span>' + GMARK + '</span></p>' : '', ms = MCQ.filter(function (q) { return q.part === p; }), a = ms.filter(function (q) { return S.mcq[q.id]; }).length, rt = ms.filter(function (q) { return S.mcq[q.id] && S.mcq[q.id].c; }).length;
      return gh + '<details class="grp mxd"><summary>' + CMV.chip(p) + '<span class="tt">' + esc(PARTS[p]) + '<span class="ct">' + pcode(p) + ' · ' + ms.length + ' MCQs · ' + (a ? Math.round(rt / a * 100) + '% right of ' + a + ' tried' : 'not started') + '</span></span><span class="chev">›</span></summary><div class="body">' +
        topicsOf(ms).map(function (t) { var tm = ms.filter(function (q) { return q.topic === t; }), ta = tm.filter(function (q) { return S.mcq[q.id]; }).length; return '<div class="tp"><span>' + esc(t) + '<small>' + tm.length + ' MCQs' + (ta ? ' · ' + ta + ' tried' : '') + '</small></span><button class="sbtn" data-go="topic" data-p="' + p + '" data-t="' + esc(t) + '">Practise</button><a class="sbtn" href="' + url('#/read', { part: p, topic: t }) + '">Read</a></div>'; }).join('') +
        '<div class="tp all"><span>Whole part<small>' + ms.length + ' MCQs</small></span><button class="sbtn" data-go="part" data-p="' + p + '">Practise</button><a class="sbtn" href="#/read?part=' + p + '">Read</a></div></div></details>';
    }).join('');
    var hist = (S.hist || []).slice(0, 5);
    if (hist.length) h += '<p class="h2s">Recent sessions</p><div class="hist">' + hist.map(function (x) { return '<div><span>' + esc(x.scope) + '<small>' + new Date(x.ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' · ' + (x.mode === 'exam' ? 'timed' : 'practice') + ' · ' + fmt(x.el) + '</small></span><b>' + x.ok + '/' + x.n + '</b></div>'; }).join('') + '</div>';
    h += '<div class="foot2"><button class="lnk" id="mreset">Reset MCQ progress</button></div></div>';
    main.innerHTML = h;
    main.querySelectorAll('[data-goal]').forEach(function (b) { b.onclick = function () { S.goal = +b.dataset.goal; save(); mcqs(); }; });
    $('#mreset').onclick = function () { if (confirm('Erase all MCQ results on this device?')) { S.mcq = {}; S.hist = []; S.sess = null; save(); mcqs(); } };
    main.querySelectorAll('[data-go]').forEach(function (b) {
      b.onclick = function () {
        var g = b.dataset.go, keyed = MCQ.filter(scorable);
        if (g === 'quick') { var pool = keyed.filter(function (q) { return !S.mcq[q.id]; }); start(shuf(pool.length >= 10 ? pool : keyed).slice(0, 10).map(function (q) { return q.id; }), { scope: 'Quick 10' }); }
        else if (g === 'mock') start(shuf(keyed).slice(0, 20).map(function (q) { return q.id; }), { scope: 'Mock paper', mode: 'exam', limit: 1800 });
        else if (g === 'custom') location.hash = '#/custom';
        else if (g === 'read') location.hash = '#/read';
        else if (g === 'mist') startFrom({ st: ['wrong'] }, { scope: 'Mistake bank' });
        else if (g === 'fresh') startFrom({ st: ['todo'] }, { scope: 'Not tried yet', n: 20, shuffle: 1 });
        else if (g === 'topic') startFrom({ part: [+b.dataset.p], topic: [b.dataset.t] }, { scope: b.dataset.t });
        else if (g === 'part') startFrom({ part: [+b.dataset.p] }, { scope: pname(+b.dataset.p) });
        else if (g === 'resume') { sess = S.sess; sess.t0 = Date.now() - (sess.elms || 0); location.hash = '#/run'; route(false); }
      };
    });
  }

  /* ---- MCQ filters (Reading mode and Custom practice) ---- */
  function mnoun(n) { return n === 1 ? 'MCQ' : 'MCQs'; }
  var MYEARS = (function () { var m = {}; MCQ.forEach(function (q) { q.years.forEach(function (y) { m[y] = 1; }); }); return Object.keys(m).sort(function (a, b) { var A = yparse(a), B = yparse(b); return B.y - A.y || ({ Nov: 5, S: 4, Ju: 3, M: 2, Ja: 1 }[B.s] || 0) - ({ Nov: 5, S: 4, Ju: 3, M: 2, Ja: 1 }[A.s] || 0) || (b < a ? -1 : 1); }); })();
  var MLAB = { kind: { SBA: 'Single best answer', TF: 'True / False' }, src: { DU: 'Past DU papers', BCS: 'BCS', New: 'New (AI-written)' }, key: { clean: 'No disputed statement', disp: 'Has a disputed statement' },
    rec: { new2: 'Last 2 years', new5: 'Last 5 years', du: 'Any DU paper', none: 'Never in a DU paper' }, rep: { r2: 'Asked 2+ times', r3: 'Asked 3+ times', r1: 'Once or never' },
    st: { todo: 'Not tried', wrong: 'Got wrong', right: 'Got right', flagged: 'Flagged' } };
  function mfix(k, order) { return { k: k, l: { kind: 'Question type', src: 'Source', key: 'Answer key', rec: 'Asked in DU', rep: 'Times asked', st: 'Your progress' }[k], lab: function (v) { return MLAB[k][v] || v; }, opts: function () { return order.map(function (v) { return [v, MLAB[k][v]]; }); } }; }
  function mcqFacets() {
    var f = [
      { k: 'G', l: 'Exam group', get: function (q) { return [q.G]; }, lab: function (v) { return 'Group ' + v; }, opts: function () { return GRPS.map(function (g) { return [g, 'Group ' + g]; }); } },
      { k: 'part', l: 'Chapter', num: 1, get: function (q) { return [q.part]; }, lab: function (v) { return pname(v); }, opts: chOpts },
      { k: 'topic', l: 'Topic', dep: 1, get: function (q) { return [q.topic]; }, lab: function (v) { return v; }, hint: function () { return 'Choose a chapter to see its topics.'; },
        opts: function (st) { var o = []; (st.f.part || []).forEach(function (n) { o.push({ h: pname(n) }); topicsOf(MCQ, n).forEach(function (t) { o.push([t, t]); }); }); return o; } },
      mfix('kind', ['SBA', 'TF']), mfix('src', ['DU', 'BCS', 'New']), mfix('key', ['clean', 'disp']), mfix('rec', ['new2', 'new5', 'du', 'none']), mfix('rep', ['r2', 'r3', 'r1']),
      { k: 'year', l: 'DU paper', get: function (q) { return q.years; }, lab: function (v) { return yparse(v).label; }, opts: function () { return MYEARS.map(function (y) { return [y, yparse(y).label]; }); } },
      mfix('st', ['todo', 'wrong', 'right', 'flagged'])];
    var G = { kind: function (q) { return [q.kind]; }, src: function (q) { return [q.src]; }, key: function (q) { return [q.opts.some(function (o) { return o.conflict; }) ? 'disp' : 'clean']; },
      rec: function (q) { if (!q.years.length) return ['none']; var y = qyear(q), a = ['du']; if (y >= RECMAX - 1) a.push('new2'); if (y >= RECMAX - 4) a.push('new5'); return a; },
      rep: function (q) { var c = q.years.length; return c >= 3 ? ['r3', 'r2'] : c === 2 ? ['r2'] : ['r1']; },
      st: function (q) { var d = S.mcq[q.id], a = [d ? (d.c ? 'right' : 'wrong') : 'todo']; if (S.flag[q.id]) a.push('flagged'); return a; } };
    f.forEach(function (x) { if (!x.get) x.get = G[x.k]; });
    return f;
  }
  var MG = [{ t: 'Syllabus', k: ['G', 'part', 'topic'] }, { t: 'Question', k: ['kind', 'src', 'key'] }, { t: 'Exam history', k: ['rec', 'rep', 'year'] }, { t: 'My progress', k: ['st'] }];
  var MQ = [['G', 'A', 'Group A'], ['G', 'B', 'Group B'], ['G', 'C', 'Group C'], ['G', 'D', 'Group D'], ['st', 'todo', 'Not tried'], ['st', 'wrong', 'Got wrong'], ['src', 'DU', 'Past DU'], ['rec', 'new5', 'Last 5 years'], ['kind', 'SBA', 'SBA'], ['kind', 'TF', 'True / False']];
  var MS = [['syl', 'Syllabus order'], ['new', 'Newest first'], ['rep', 'Most repeated']];
  var MRANK = (function () { var r = {}; partIds.forEach(function (p) { topicsOf(MCQ, p).forEach(function (t, i) { r[p + '|' + t] = i; }); }); return r; })();
  function mSort(list, s) {
    var syl = function (a, b) { return a.part - b.part || MRANK[a.part + '|' + a.topic] - MRANK[b.part + '|' + b.topic] || a.n - b.n; };
    if (s === 'new') return list.slice().sort(function (a, b) { return qyear(b) - qyear(a) || b.years.length - a.years.length || syl(a, b); });
    if (s === 'rep') return list.slice().sort(function (a, b) { return b.years.length - a.years.length || qyear(b) - qyear(a) || syl(a, b); });
    return list.slice().sort(syl);
  }
  function mText(q) { return q.stem + ' ' + q.topic + ' ' + (q.sub || '') + ' ' + q.opts.map(function (o) { return o.t + ' ' + (o.e || ''); }).join(' ') + ' ' + q.years.map(function (y) { return yparse(y).label; }).join(' '); }
  function seedM(st, qs) {
    fxReset(st); st.txt = qs.q || '';
    if (qs.part) st.f.part = [+qs.part];
    if (qs.topic) { st.f.topic = [qs.topic]; if (!qs.part) { var q0 = MCQ.filter(function (q) { return q.topic === qs.topic; })[0]; if (q0) st.f.part = [q0.part]; } }
    if (qs.kind) st.f.kind = [qs.kind]; if (qs.src) st.f.src = [qs.src]; if (qs.year) st.f.year = [qs.year]; if (qs.status) st.f.st = [qs.status];
  }
  function mScope(st) { var t = st.f.topic || [], p = st.f.part || []; return t.length === 1 ? t[0] : p.length === 1 ? pname(p[0]) : 'Filtered MCQs'; }

  /* ------------------------------------------------------------ custom practice */
  var F = { n: 20, shuffle: 1, mode: 'practice' };
  function custom() {
    var st = fxState('cu'), pool = [];
    var seg = function (o, vals) { return '<div class="seg">' + vals.map(function (v) { return '<button type="button" data-o="' + o + '" data-v="' + v[0] + '" class="' + (String(F[o]) === String(v[0]) ? 'on' : '') + '">' + v[1] + '</button>'; }).join('') + '</div>'; };
    main.innerHTML = hero({ crumb: '<a href="#/">Home</a> › <a href="#/mcqs">MCQs</a> › Custom', icon: 'sliders', title: 'Custom practice', desc: 'Build your own set. Filters narrow the pool; the count updates as you choose.' }) +
      '<div class="wrap"><div id="fxcu"></div>' +
      '<div class="panel"><p class="slabel">How many</p>' + seg('n', [[10, '10'], [20, '20'], [30, '30'], [50, '50'], [0, 'All']]) + '<p class="slabel">Order</p>' + seg('shuffle', [[1, 'Shuffled'], [0, 'Syllabus order']]) +
      '<p class="slabel">Feedback</p>' + seg('mode', [['practice', 'After each question'], ['exam', 'At the end (timed)']]) + '</div>' +
      '<div class="panel"><p class="count" id="cnt"></p><button class="bigbtn fill" id="go" style="color:#fff">Start practice</button></div></div>';
    function count() { $('#cnt').innerHTML = '<b>' + pool.length + '</b> MCQs with an answer key match' + (F.n && pool.length > F.n ? ' · ' + F.n + ' will be drawn' : ''); $('#go').disabled = !pool.length; }
    FX({ id: 'cu', kind: 'm', el: $('#fxcu'), st: st, pool: function () { return MCQ; }, facets: mcqFacets(), groups: MG, text: mText, noun: mnoun, startOpen: true,
      ph: 'Search question text and explanations', quick: MQ, list: function (list) { pool = mSort(list.filter(scorable), 'syl'); return ''; }, after: count }).paint();
    main.querySelectorAll('.seg button[data-o]').forEach(function (b) { b.onclick = function () { var v = b.dataset.v; F[b.dataset.o] = b.dataset.o === 'mode' ? v : +v; main.querySelectorAll('.seg button[data-o=' + b.dataset.o + ']').forEach(function (x) { x.classList.toggle('on', x === b); }); count(); }; });
    $('#go').onclick = function () { if (!pool.length) return; var ids = pool.map(function (q) { return q.id; }); if (F.shuffle) ids = shuf(ids); if (F.n) ids = ids.slice(0, F.n); start(ids, { scope: 'Custom practice', mode: F.mode, limit: F.mode === 'exam' ? ids.length * 90 : 0 }); };
  }

  /* ------------------------------------------------------------ reading mode */
  function reading(r) {
    var st = fxState('mr'), cur = [], vp = !Object.keys(r.qs).length && VIEW.p['#/read'], want = vp && vp.n > 30 ? vp.n : 30, first = true;
    if (Object.keys(r.qs).length) { seedM(st, r.qs); fxClean('#/read'); }
    main.innerHTML = hero({ crumb: '<a href="#/">Home</a> › <a href="#/mcqs">MCQs</a> › Reading mode', icon: 'book', title: 'Reading mode', desc: 'Every MCQ with its answer and explanations shown, for revision without pressure. Filter to a topic, a paper or your mistakes, then practise the same set.',
      btns: '<div class="btnrow"><button class="bigbtn fill" id="rp">Practise these</button><a class="bigbtn" href="#/mcqs">MCQ home</a></div>', pills: [MCQ.length + ' MCQs'] }) + '<div class="wrap"><div id="fxm"></div></div>';
    FX({ id: 'mr', kind: 'm', el: $('#fxm'), st: st, pool: function () { return MCQ; }, facets: mcqFacets(), groups: MG, text: mText, noun: mnoun,
      ph: 'Search MCQs, options and explanations', quick: MQ, sorts: MS, sort: mSort,
      list: function (list) {
        cur = list; shown = first ? want : 30; first = false;
        if (!list.length) return '<div class="empty-state"><h2>No MCQs match</h2><p>Remove a filter, or clear them all, to see more.</p></div>';
        return list.slice(0, shown).map(function (q) { return readCard(q); }).join('') + (list.length > shown ? '<button class="btn ghost more" data-more="1">Show more (' + (list.length - shown) + ' left)</button>' : '');
      },
      after: function (list, el) {
        var b = $('[data-more]', el); if (b) b.onclick = function () { var from = shown; shown += 30; b.insertAdjacentHTML('beforebegin', cur.slice(from, shown).map(function (q) { return readCard(q); }).join('')); if (cur.length > shown) b.textContent = 'Show more (' + (cur.length - shown) + ' left)'; else b.remove(); };
        $('#rp').disabled = !list.some(scorable);
      } }).paint();
    $('#rp').onclick = function () { var k = cur.filter(scorable); if (k.length) start(shuf(k).slice(0, 50).map(function (q) { return q.id; }), { scope: mScope(st) }); };
  }

  /* ------------------------------------------------------------ practice / exam runner */
  var sess = null, timer = null;
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }
  function startFrom(f, o) {
    var pool = filteredM(f).filter(scorable); if (!pool.length) { alert('No MCQs with an answer key match.'); return; }
    var ids = pool.map(function (q) { return q.id; }); if (o.shuffle !== 0) ids = shuf(ids); if (o.n) ids = ids.slice(0, o.n);
    start(ids, o);
  }
  function start(ids, o) {
    sess = { ids: ids, i: 0, ans: {}, chk: {}, mode: o.mode || 'practice', scope: o.scope || 'Practice', t0: Date.now(), el: 0, limit: o.limit || 0 };
    S.sess = sess; save();
    if (location.hash === '#/run') route(false); else location.hash = '#/run';
  }
  function persist() { if (sess && !sess.done) { sess.elms = Date.now() - sess.t0; S.sess = sess; save(); } }
  function run() {
    if (!sess) { if (S.sess && !S.sess.done) { sess = S.sess; sess.t0 = Date.now() - (sess.elms || 0); } else { location.hash = '#/mcqs'; return; } }
    if (sess.done) { result(); return; }
    var id = sess.ids[sess.i], q = byId[id], p = sess.ans[id] || {}, exam = sess.mode === 'exam', checked = !!sess.chk[id], n = sess.ids.length;
    var answered = sess.ids.filter(function (x) { return sess.ans[x] && Object.keys(sess.ans[x]).length; }).length;
    var body = '<div class="rdq inkc" data-id="' + q.id + '">' + chips(q) + '<p class="stem">' + esc(q.stem) + '</p>';
    if (q.kind === 'SBA') {
      q.opts.forEach(function (o) {
        var c = ''; if (checked) { if (o.l === q.ans) c = ' ok'; else if (p.sba === o.l) c = ' bad'; } else if (p.sba === o.l) c = ' pick';
        body += '<button class="opt' + c + '" data-l="' + o.l + '"><b>' + o.l + ')</b><span>' + esc(o.t) + (checked && o.e ? '<small class="ex">' + esc(o.e) + '</small>' : '') + '</span></button>';
      });
    } else {
      q.opts.forEach(function (o) {
        var c = '', ks = o.k ? '<span class="' + (o.k === 'T' ? 'kt">True' : 'kf">False') + '</span>' : ''; if (checked && o.k) c = o.k === 'T' ? ' ok' : ' bad'; if (checked && o.k && !o.conflict && p[o.l] && p[o.l] !== o.k) c += ' miss';
        body += '<div class="tf' + c + '" data-l="' + o.l + '"><span class="t"><b>' + o.l + ')</b> ' + esc(o.t) + (checked ? '<small>' + (o.conflict ? 'Answer (Park): ' + ks + ' · not scored, papers give different keys' : o.k ? 'Answer: ' + ks + (p[o.l] ? (p[o.l] === o.k ? ' · ✓ you were right' : ' · ✗ you said ' + (p[o.l] === 'T' ? 'True' : 'False')) : ' · not answered') : 'No key in source') + '</small>' + (o.e ? '<small class="ex">' + esc(o.e) + '</small>' : '') : '') + '</span>' +
          '<button data-t="T" class="' + (p[o.l] === 'T' ? 'sel' : '') + '">T</button><button data-t="F" class="' + (p[o.l] === 'F' ? 'sel' : '') + '">F</button></div>';
      });
    }
    if (checked) {
      var sc = scoreOf(q, p), ok = isOk(q, sc);
      body += sc === null ? '<p class="verdict">' + (q.kind === 'SBA' ? 'Answer: ' + q.ans + ')' : 'Answers shown above.') + '</p>' : '<p class="verdict ' + (ok ? 'ok' : 'bad') + '">' + (q.kind === 'SBA' ? (ok ? 'Correct' : 'Not quite — the answer is ' + q.ans + ')') : sc.got + ' of ' + sc.of + ' keyed statements correct') + '</p>';
      if (q.ref) body += '<p class="meta">Ref: ' + esc(q.ref) + '</p>';
    }
    body += '</div>';
    var acts = '';
    if (!exam && !checked && q.kind !== 'SBA') acts += '<button class="btn" data-r="check">Check answer</button>';
    if (!exam && !checked && q.kind === 'SBA') acts += '<button class="btn ghost" data-r="check">Show answer</button>';
    acts += '<button class="btn ghost sm" data-r="flag" aria-pressed="' + !!S.flag[id] + '">\u2691 ' + (S.flag[id] ? 'Flagged' : 'Flag') + '</button>';
    var last = sess.i === n - 1;
    var pal = exam ? '<div class="pal">' + sess.ids.map(function (x, k) { return '<button data-r="go" data-k="' + k + '" class="' + (k === sess.i ? 'cur ' : '') + (sess.ans[x] && Object.keys(sess.ans[x]).length ? 'done' : '') + '">' + (k + 1) + '</button>'; }).join('') + '</div>' : '';
    main.innerHTML = hero({ crumb: '<a href="#/mcqs">← MCQs</a> · ' + esc(sess.scope) + ' · ' + (exam ? 'timed exam' : 'practice'), title: 'Question ' + (sess.i + 1) + '<small> of ' + n + '</small>' }) +
      '<div class="wrap"><div class="timer"><span>' + answered + ' answered</span><span id="tm"></span></div><div class="bar" style="margin:.2rem 0 1rem"><i style="width:' + Math.round((sess.i + 1) / n * 100) + '%"></i></div>' + body + (acts ? '<div class="row">' + acts + '</div>' : '') +
      '<div class="pager"><button class="btn ghost" data-r="prev"' + (sess.i ? '' : ' disabled') + '>← Previous</button>' + (last ? '<button class="btn" data-r="finish">Finish</button>' : '<button class="btn" data-r="next">Next →</button>') + '</div>' + pal + '<p class="meta" style="text-align:center"><button class="lnk" data-r="quit">Quit session</button></p></div>';
    var tm = $('#tm');
    function tick() { var e = (Date.now() - sess.t0) / 1000; if (sess.limit) { var left = sess.limit - e; tm.textContent = '⏱ ' + fmt(left) + ' left'; if (left <= 0) { submit(); } } else tm.textContent = '⏱ ' + fmt(e); }
    stopTimer(); tick(); if (!sess.done) timer = setInterval(tick, 1000);
    main.querySelectorAll('.opt').forEach(function (b) { b.onclick = function () {
      if (checked) return; sess.ans[id] = { sba: b.dataset.l };
      if (!exam) { sess.chk[id] = 1; record(q, isOk(q, scoreOf(q, sess.ans[id]))); } persist(); redraw();
    }; });
    main.querySelectorAll('.tf button').forEach(function (b) { b.onclick = function () {
      if (checked) return; var l = b.closest('.tf').dataset.l, a = sess.ans[id] = sess.ans[id] || {}; if (a[l] === b.dataset.t) delete a[l]; else a[l] = b.dataset.t; persist(); redraw();
    }; });
    main.querySelectorAll('[data-r]').forEach(function (b) { b.onclick = function () {
      var r = b.dataset.r;
      if (r === 'check') { sess.chk[id] = 1; var s2 = scoreOf(q, sess.ans[id]); if (s2 !== null) record(q, isOk(q, s2)); persist(); redraw(); }
      else if (r === 'flag') { if (S.flag[id]) delete S.flag[id]; else S.flag[id] = 1; save(); redraw(); }
      else if (r === 'next') { sess.i++; persist(); redraw(true); }
      else if (r === 'prev') { sess.i--; persist(); redraw(true); }
      else if (r === 'go') { sess.i = +b.dataset.k; persist(); redraw(true); }
      else if (r === 'finish') { if (!exam || answered === n || confirm((n - answered) + ' question(s) unanswered. Submit now?')) submit(); }
      else if (r === 'quit') { if (confirm('Quit this session? Answers already checked are kept.')) { stopTimer(); sess = null; S.sess = null; save(); location.hash = '#/mcqs'; } }
    }; });
    function redraw(top) { var y = window.scrollY; run(); window.scrollTo(0, top ? 0 : y); }
  }
  function submit() {
    stopTimer(); if (!sess || sess.done) return;
    var ok = 0; sess.ids.forEach(function (id) { var q = byId[id], sc = scoreOf(q, sess.ans[id]); if (sc !== null) { var g = isOk(q, sc); if (sess.mode === 'exam') record(q, g); if (g) ok++; } });
    sess.done = true; sess.ok = ok; sess.el = (Date.now() - sess.t0) / 1000;
    S.hist = S.hist || []; S.hist.unshift({ scope: sess.scope, mode: sess.mode, n: sess.ids.length, ok: ok, ts: Date.now(), el: sess.el }); S.hist = S.hist.slice(0, 30); S.sess = null; save();
    run(); window.scrollTo(0, 0);
  }
  function result() {
    var n = sess.ids.length, pc = Math.round(sess.ok / n * 100), un = sess.ids.filter(function (id) { return !sess.ans[id] || !Object.keys(sess.ans[id]).length; }).length;
    main.innerHTML = hero({ crumb: '<a href="#/mcqs">← MCQs</a> · ' + esc(sess.scope), icon: 'target', title: sess.ok + ' / ' + n + ' <small>correct</small>', desc: pc + '% fully correct · ' + fmt(sess.el) + (un ? ' · ' + un + ' not answered' : '') + '. Review every answer below.',
      btns: '<div class="btnrow"><button class="bigbtn fill" id="again">Try again</button><a class="bigbtn" href="#/mcqs">MCQ home</a></div>' }) +
      wrap(sess.ids.map(function (id) { var q = byId[id], p = sess.ans[id] || {}; return readCard(q, p).replace('<div class="rdq inkc"', '<div class="rdq inkc ' + (isOk(q, scoreOf(q, p)) ? 'good' : scoreOf(q, p) === null ? '' : 'miss') + '">'); }).join(''), true);
    $('#again').onclick = function () { var ids = shuf(sess.ids); start(ids, { scope: sess.scope, mode: sess.mode, limit: sess.limit }); };
  }

  function menu() {
    var dark = document.documentElement.dataset.theme === 'dark';
    main.innerHTML = hero({ icon: 'menu', title: 'Menu', desc: 'Display, backup and the second-term archive.' }) + '<div class="wrap" style="padding-top:1rem"><div class="grid">' +
      '<div class="card"><div class="k">Display</div><h3>Reading</h3><div class="row"><button class="btn ghost sm" id="m-theme">' + (dark ? 'Day mode' : 'Night mode') + '</button><button class="btn ghost sm" id="m-fs-">A−</button><button class="btn ghost sm" id="m-fs+">A+</button></div></div>' +
      '<div class="card"><div class="k">Progress</div><h3>Backup</h3><div class="m">' + nRead() + ' read · ' + nDone() + ' MCQs tried · ' + Object.keys(S.notes).length + ' notes' + (window.CMINK && CMINK.count() ? ' · ' + CMINK.count() + ' pen strokes' : '') + '</div><div class="row"><button class="btn ghost sm" id="m-exp">Download backup</button><label class="btn ghost sm">Restore<input id="m-imp" type="file" accept="application/json" hidden></label><button class="btn ghost sm" id="m-reset">Reset</button></div></div>' +
      '<a class="card" href="#/firsts"><div class="k">Patterns</div><h3>First-time questions</h3><div class="m">New questions in each exam session since 2017.</div></a>' +
      '<a class="card ppred" href="#/predict"><div class="k">Exam</div><h3>Prediction for Prof</h3><div class="m">Four predicted papers for this year\'s format.</div></a>' +
      '<a class="card" href="#/progress"><div class="k">Track</div><h3>Progress tracker</h3><div class="m">Streak, daily activity, progress by part.</div></a>' +
      '<a class="card archive" href="second-term/"><div class="k">Separate site</div><h3>Second-term viva bank</h3><div class="m">80 solved viva questions, kept apart from this bank.</div></a>' +
      '<div class="card"><div class="k">About</div><h3>Source</h3><div class="m">Questions and MCQs come from Matrix 3rd Prof (18th Ed.) and college papers, merged and de-duplicated. Items tagged New are AI-written; check them against Park or Matrix. Model answers are being added.</div></div></div></div>';
    $('#m-theme').onclick = function () { var d = document.documentElement.dataset.theme === 'dark'; if (d) delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = 'dark'; S.theme = d ? '' : 'dark'; save(); menu(); };
    function fs(d) { var v = Math.max(80, Math.min(140, (S.fs || 100) + d)); S.fs = v; document.documentElement.style.fontSize = v + '%'; save(); }
    $('#m-fs-').onclick = function () { fs(-10); }; $('#m-fs\\+').onclick = function () { fs(10); };
    $('#m-exp').onclick = function () { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(Object.assign({}, S, { ink: window.CMINK ? CMINK.read() : {}, ws: window.CMWS ? CMWS.read() : {} }))], { type: 'application/json' })); a.download = 'community-medicine-progress.json'; a.click(); };
    $('#m-imp').onchange = function (e) { var f = e.target.files[0]; if (!f) return; e.target.value = ''; f.text().then(function (t) { var o = JSON.parse(t); if (!o || typeof o !== 'object' || Array.isArray(o)) throw 0; if (!confirm('Replace the progress on this device with this backup? (Handwriting in the backup is merged in, never overwritten.)')) return; var ink = window.CMINK && CMINK.clean(o.ink), ws = o.ws; delete o.ink; delete o.ws; if (window.CMWS) CMWS.merge(ws); S = o; save(); return (ink && ink.ok ? CMINK.mergeAsync(ink.ink) : Promise.resolve()).then(function () { location.reload(); }); }).catch(function () { alert('That file is not a valid backup.'); }); };
    $('#m-reset').onclick = function () { if (confirm('Erase all read marks, flags, notes and MCQ results on this device?')) { try { localStorage.removeItem(KEY); } catch (e) {} location.reload(); } };
  }
  $('#t-theme').onclick = function () { var d = document.documentElement.dataset.theme === 'dark'; if (d) delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = 'dark'; S.theme = d ? '' : 'dark'; save(); };
  $('#t-fs').onclick = function () { var v = (S.fs || 100) + 10; if (v > 130) v = 90; S.fs = v; document.documentElement.style.fontSize = v + '%'; save(); };
  route(false);
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) navigator.serviceWorker.register('sw.js').catch(function () {});
})();
