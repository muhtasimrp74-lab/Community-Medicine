(function () {
  'use strict';
  var DU = CM.du, MCQ = CM.mcq, PARTS = CM.parts, KEY = 'cmb:v1';
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
  function pname(n) { return 'Part ' + n + ' · ' + PARTS[n]; }
  var nRead = function () { return DU.filter(function (q) { return S.read[q.id]; }).length; };
  var nDone = function () { return MCQ.filter(function (q) { return S.mcq[q.id]; }).length; };

  /* ------------------------------------------------------------ router */
  function parse() {
    var h = location.hash.replace(/^#\/?/, ''), qs = {}, i = h.indexOf('?');
    if (i >= 0) { h.slice(i + 1).split('&').forEach(function (kv) { var p = kv.split('='); if (p[0]) qs[p[0]] = decodeURIComponent((p[1] || '').replace(/\+/g, ' ')); }); h = h.slice(0, i); }
    var parts = h.split('/').filter(Boolean).map(decodeURIComponent);
    return { r: parts[0] || 'home', id: parts[1], qs: qs };
  }
  function url(base, qs) {
    var a = Object.keys(qs).filter(function (k) { return qs[k]; }).map(function (k) { return k + '=' + encodeURIComponent(qs[k]); });
    return base + (a.length ? '?' + a.join('&') : '');
  }
  var shown = 30;
  function route(keep) {
    var r = parse();
    document.querySelectorAll('#bnav a').forEach(function (a) { var k = a.getAttribute('data-r'); a.classList.toggle('on', k === r.r || (r.r === 'q' && k === 'questions') || (r.r === 'chapter' && k === 'chapters') || (['read','custom','run'].indexOf(r.r) >= 0 && k === 'mcqs')); });
    var fn = { home: home, questions: questions, q: single, chapters: chapters, chapter: chapter, answers: answers, mcqs: mcqs, custom: custom, read: reading, run: run, menu: menu }[r.r] || home;
    if (!keep) shown = 30;
    var y = window.scrollY; stopTimer();
    fn(r);
    if (keep) window.scrollTo(0, y); else window.scrollTo(0, 0);
    document.title = 'Community Medicine — ' + ({ home: 'Dashboard', questions: 'Questions', q: 'Question', chapters: 'Chapters', chapter: 'Chapter', answers: 'Answers', mcqs: 'MCQs', custom: 'Custom practice', read: 'Reading mode', run: 'MCQ session', menu: 'Menu' }[r.r] || 'DU Question Bank');
  }
  window.addEventListener('hashchange', function () { route(false); });

  /* ------------------------------------------------------------ home */
  function home() {
    var rd = nRead(), md = nDone(), last = S.last && byId[S.last];
    var h = '<section class="hero"><p class="eyebrow">DU 3rd Prof MBBS · Matrix 18th Ed.</p><h1>Community Medicine for written and viva exams</h1>' +
      '<p>' + DU.length + ' merged DU and college questions and ' + MCQ.length + ' MCQs, sorted by topic with exam years and star ratings. Read, recall, practise.</p>' +
      '<a class="btn" href="#/questions">Explore questions</a></section>' +
      '<div class="stats"><span class="stat"><b>' + DU.length + '</b> questions</span><span class="stat"><b>' + MCQ.length + '</b> MCQs</span><span class="stat"><b>' + rd + '</b> read</span><span class="stat"><b>' + md + '</b> MCQs tried</span><span class="stat"><b>' + Object.keys(S.flag).length + '</b> flagged</span></div>';
    if (last) h += '<a class="cont" href="#/q/' + esc(last.id) + '"><small>CONTINUE WHERE YOU STOPPED</small><div>' + esc(last.id) + ' · ' + esc(strip(last.q).slice(0, 110)) + '…</div></a>';
    h += '<div class="sec"><h2>Quick start</h2></div><div class="grid">' +
      '<a class="card" href="#/questions?stars=3"><div class="k">Most asked</div><h3>★★★ questions</h3><div class="m">' + DU.filter(function (q) { return q.stars === 3; }).length + ' high-yield questions</div></a>' +
      '<a class="card" href="#/mcqs"><div class="k">Practice</div><h3>MCQ practice</h3><div class="m">SBA and true/false with instant keys</div></a>' +
      '<a class="card" href="#/chapters"><div class="k">Chapter-wise</div><h3>Chapters</h3><div class="m">Every part, topic by topic</div></a>' +
      '<a class="card" href="#/answers"><div class="k">Answers</div><h3>Model answers</h3><div class="m">' + DU.filter(function (q) { return q.a; }).length + ' added so far</div></a></div>';
    h += '<div class="sec"><h2>Browse by part</h2></div><div class="grid">' + partIds.map(function (n) {
      var qs = DU.filter(function (q) { return q.part === n; }), ms = MCQ.filter(function (q) { return q.part === n; });
      var d = qs.filter(function (q) { return S.read[q.id]; }).length;
      return '<a class="card" href="#/chapter/' + n + '"><div class="k">Part ' + n + '</div><h3>' + esc(PARTS[n]) + '</h3><div class="m">' + qs.length + ' questions · ' + ms.length + ' MCQs</div><div class="bar"><i style="width:' + (qs.length ? Math.round(d / qs.length * 100) : 0) + '%"></i></div></a>';
    }).join('') + '</div>';
    h += '<div class="sec"><h2>Archive</h2></div><a class="card archive" href="second-term/"><div class="k">Separate site</div><h3>Second-term solved viva bank</h3><div class="m">80 fully solved viva questions (Environment, PHC, CD/NCD, MCH-FP, School and Occupational Health). Kept apart from this question bank.</div></a>';
    main.innerHTML = '<div class="wrap">' + h + '</div>';
  }
  function wrap(h, pad) { return '<div class="wrap"' + (pad ? ' style="padding-top:1rem"' : '') + '>' + h + '</div>'; }
  function hero(o) {
    return '<section class="phero"><div class="wrap">' + (o.crumb ? '<p class="crumb">' + o.crumb + '</p>' : '') + '<h1>' + o.title + '</h1>' + (o.desc ? '<p class="d">' + o.desc + '</p>' : '') +
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
  var SESN = { Ja: 'Jan', M: 'May', Ju: 'Jun', S: 'Sep', Nov: 'Nov' };
  function yparse(code) {
    var m = String(code).match(/^(\d{2})(Ja|M|Ju|S|Nov)$/);
    if (m) return { y: 2000 + +m[1], s: m[2], label: SESN[m[2]] + ' ' + (2000 + +m[1]) };
    var n = String(code).match(/^(\d{2})/);
    return { y: n ? 2000 + +n[1] : 0, s: '', label: n ? '20' + n[1] + ' (' + code.slice(2) + ')' : code };
  }
  function ccol(q) {
    if (q._c) return q._c; var out = [];
    (q.colleges || '').split(';').forEach(function (s) {
      var m = s.trim().match(/^([A-Za-z]+)\s*\((.*)\)$/); if (!m) return;
      m[2].split(',').forEach(function (p) { var mm = p.trim().match(/^(.*?)\s+([A-Z]\d+)$/); out.push({ c: m[1], p: mm ? mm[1] : p.trim(), k: mm ? mm[2] : '' }); });
    });
    return (q._c = out);
  }
  function tagsHtml(q, lab) {
    var h = '', c = ccol(q);
    if (q.years.length) h += '<div class="tagrow"><span class="tg du">' + (lab || 'DU Written') + '</span>' + q.years.map(function (y) { return '<span class="tg yr" title="Exam code ' + esc(y) + '">' + esc(yparse(y).label) + '</span>'; }).join('') + '</div>';
    if (c.length) h += '<div class="tagrow"><span class="tg lab">College</span>' + c.map(function (x) { return '<span class="tg col c-' + esc(x.c) + '"><b>' + esc(x.c) + '</b>' + esc(x.p) + (x.k ? '<i>' + esc(x.k) + '</i>' : '') + '</span>'; }).join('') + '</div>';
    if (!lab && !q.years.length && !c.length) h += '<div class="tagrow"><span class="tg lab">No exam tag</span></div>';
    return h;
  }
  var QSTAT = { unread: 'Not read', read: 'Read', flagged: 'Flagged', noted: 'Has my notes' };
  var FACETS = [
    ['stars', 'Importance', function (q) { return [q.stars]; }, function (v) { return v === 3 ? '★★★ High-yield' : v === 2 ? '★★ Often asked' : v === 1 ? '★ Repeated' : 'Unstarred'; }, [3, 2, 1, 0]],
    ['kind', 'Question type', function (q) { return [q.kind || 'Standard']; }, function (v) { return v; }, ['Standard', 'SEQ', 'Case-based']],
    ['yr', 'DU Written year', function (q) { return q.years.map(function (y) { return yparse(y).y; }); }, function (v) { return v; }, 'years'],
    ['ses', 'DU Written session', function (q) { return q.years.map(function (y) { return yparse(y).s; }).filter(Boolean); }, function (v) { return { Ja: 'January', M: 'May', Ju: 'June', S: 'September', Nov: 'November' }[v]; }, ['Ja', 'M', 'Ju', 'S', 'Nov']],
    ['col', 'Medical college paper', function (q) { return ccol(q).map(function (x) { return x.c; }); }, function (v) { return v; }, ['MMC', 'MuMC', 'ShSMC', 'SSMC', 'DMC']],
    ['paper', 'College exam', function (q) { return ccol(q).map(function (x) { return x.p; }); }, function (v) { return v; }, 'papers'],
    ['st', 'Your progress', function (q) { var a = []; a.push(S.read[q.id] ? 'read' : 'unread'); if (S.flag[q.id]) a.push('flagged'); if (S.notes[q.id]) a.push('noted'); return a; }, function (v) { return QSTAT[v]; }, ['unread', 'read', 'flagged', 'noted']],
    ['ans', 'Model answer', function (q) { return [q.a ? 'yes' : 'no']; }, function (v) { return v === 'yes' ? 'Answer added' : 'Answer not added yet'; }, ['yes', 'no']]
  ];
  FACETS.forEach(function (f) {
    if (f[4] === 'years') { var m = {}; DU.forEach(function (q) { q.years.forEach(function (y) { m[yparse(y).y] = 1; }); }); f[4] = Object.keys(m).map(Number).sort(function (a, b) { return b - a; }); }
    if (f[4] === 'papers') { var p = {}; DU.forEach(function (q) { ccol(q).forEach(function (x) { p[x.p] = 1; }); }); f[4] = Object.keys(p).sort(); }
  });
  function emptyQF() { var o = { txt: '', part: [], topic: [] }; FACETS.forEach(function (f) { o[f[0]] = []; }); return o; }
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
    var tk = f.txt.toLowerCase().split(/\s+/).filter(Boolean);
    if (tk.length) { var t = (strip(q.q) + ' ' + q.topic + ' ' + q.colleges + ' ' + q.asked + ' ' + q.years.map(function (y) { return yparse(y).label; }).join(' ')).toLowerCase(); for (var j = 0; j < tk.length; j++) if (t.indexOf(tk[j]) < 0) return false; }
    return true;
  }
  var QF = null;
  function nActive(f) { var n = f.part.length + f.topic.length + (f.txt ? 1 : 0); FACETS.forEach(function (x) { n += f[x[0]].length; }); return n; }
  function ansHtml(q) { return q.a ? '<div class="qb">' + q.a + '</div>' : '<p class="empty">The model answer for this question has not been added yet.</p>'; }
  function qRow(q, open) {
    var meta = '';
    if (q.kind) meta += '<span class="tpill">' + esc(q.kind) + '</span>';
    return '<div class="qrow' + (S.read[q.id] ? ' read' : '') + (open ? ' open' : '') + '" data-id="' + q.id + '"><div class="qtop"><span class="qid">' + esc(q.id.replace('DU.', '')) + '</span><div class="qtx qb">' + q.q + '</div>' +
      '<div class="qside">' + stars(q.stars) + '<a class="abtn" href="#/q/' + q.id + '">Answer</a></div></div>' + (meta ? '<div class="qmeta">' + meta + '</div>' : '') + tagsHtml(q) +
      '<div class="qexp"><div class="ansbox">' + ansHtml(q) + '</div>' + (q.asked ? '<p class="meta"><b>Also asked as:</b> ' + esc(q.asked) + '</p>' : '') +
      '<div class="acts"><button data-a="read" aria-pressed="' + !!S.read[q.id] + '">' + (S.read[q.id] ? '✓ Read' : 'Mark read') + '</button><button data-a="flag" aria-pressed="' + !!S.flag[q.id] + '">⚑ Flag</button><button data-a="note">Notes' + (S.notes[q.id] ? ' •' : '') + '</button></div><div class="slot"></div></div></div>';
  }
  function groupedRows(list, openAll) {
    var h = '';
    partIds.forEach(function (n) {
      var items = list.filter(function (q) { return q.part === n; }); if (!items.length) return;
      var done = items.filter(function (q) { return S.read[q.id]; }).length, byT = {}, order = [];
      items.forEach(function (q) { if (!byT[q.topic]) { byT[q.topic] = []; order.push(q.topic); } byT[q.topic].push(q); });
      h += '<div class="grp' + (openAll ? ' open' : '') + '"><button type="button" data-a="grp"><span class="num">P' + n + '</span><span class="tt">' + esc(PARTS[n]) + '<span class="ct">' + items.length + ' question' + (items.length === 1 ? '' : 's') + ' · ' + done + ' read</span></span><span class="chev">›</span></button><div class="body">' +
        order.map(function (t) { return '<p class="tlabel">' + esc(t) + ' <small>' + byT[t].length + '</small></p>' + byT[t].map(function (q) { return qRow(q); }).join(''); }).join('') + '</div></div>';
    });
    return h;
  }
  function progLine(n, tot, word) { return '<div class="progline"><span>' + n + ' of ' + tot + ' ' + word + '</span><div class="bar"><i style="width:' + (tot ? Math.round(n / tot * 100) : 0) + '%"></i></div></div>'; }

  main.addEventListener('click', function (e) {
    var g = e.target.closest('[data-a=grp]'); if (g) { g.parentNode.classList.toggle('open'); return; }
    var b = e.target.closest('.qrow button[data-a]'), row = e.target.closest('.qrow');
    if (b && row) {
      var q = byId[row.dataset.id], a = b.dataset.a, slot = $('.slot', row);
      if (a === 'read') { if (S.read[q.id]) delete S.read[q.id]; else S.read[q.id] = 1; S.last = q.id; save(); row.classList.toggle('read', !!S.read[q.id]); b.setAttribute('aria-pressed', !!S.read[q.id]); b.textContent = S.read[q.id] ? '✓ Read' : 'Mark read'; }
      if (a === 'flag') { if (S.flag[q.id]) delete S.flag[q.id]; else S.flag[q.id] = 1; save(); b.setAttribute('aria-pressed', !!S.flag[q.id]); }
      if (a === 'note') {
        if (slot.dataset.v === 'note') { slot.dataset.v = ''; slot.innerHTML = ''; return; }
        slot.dataset.v = 'note'; slot.innerHTML = '<div class="notes"><textarea placeholder="Your notes for ' + q.id + '">' + esc(S.notes[q.id] || '') + '</textarea></div>';
        var ta = $('textarea', slot); ta.focus();
        ta.addEventListener('input', function () { if (ta.value.trim()) S.notes[q.id] = ta.value; else delete S.notes[q.id]; save(); b.textContent = 'Notes' + (S.notes[q.id] ? ' •' : ''); });
      }
      return;
    }
    if (row && !e.target.closest('a,button,textarea,.slot')) { row.classList.toggle('open'); S.last = row.dataset.id; save(); }
  });
  document.addEventListener('click', function (e) {
    var x = e.target.closest('[data-x]'); if (!x) return;
    var open = x.dataset.x === 'open'; main.querySelectorAll('.grp').forEach(function (gp) { gp.classList.toggle('open', open); });
  });

  /* ------------------------------------------------------------ questions */
  function questions(r) {
    if (!QF || Object.keys(r.qs).length) QF = fromQs(r.qs);
    var h = hero({ crumb: '<a href="#/">Home</a> › Questions', title: 'Questions', desc: 'Tap a question to read its answer right here, or tap Answer to open it on its own page.',
      btns: '<div class="btnrow"><button class="bigbtn fill" id="rnd">Random question</button><a class="bigbtn" href="#/chapters">Chapters</a></div>', pills: [DU.length + ' questions', 'DU Written years', 'College papers'] });
    h += '<div class="wrap" id="qpage"><div class="bar2"><input type="search" id="qtxt" placeholder="Search questions, topics, colleges, years" aria-label="Search"><button class="sbtn" id="ftog" aria-expanded="false">Filters <span id="fbadge"></span></button></div>' +
      '<div class="panel fpanel" id="fpanel" hidden></div><div class="chips" id="quick"></div><div id="active" class="chips"></div>' + progLine(nRead(), DU.length, 'read') +
      '<div class="toolrow"><span class="count" id="qcount"></span><span><button class="lnk" data-x="open">Expand all</button><button class="lnk" data-x="close">Collapse all</button></span></div><div id="qlist"></div></div>';
    main.innerHTML = h;
    var txt = $('#qtxt'); txt.value = QF.txt;
    var open = false, tg = {};
    function fchip(k, v, label, cnt) { var on = QF[k].indexOf(v) >= 0; return '<button type="button" class="fchip' + (on ? ' on' : '') + (cnt === 0 && !on ? ' z' : '') + '" data-fq="' + k + '" data-v="' + esc(v) + '" aria-pressed="' + on + '">' + label + (cnt == null ? '' : '<em>' + cnt + '</em>') + '</button>'; }
    function cnt(k, v) { return DU.filter(function (q) { return qMatch(q, QF, k) && (k === 'part' ? q.part === v : k === 'topic' ? q.topic === v : FACETS.filter(function (f) { return f[0] === k; })[0][2](q).indexOf(v) >= 0); }).length; }
    function panel() {
      var p = '<div class="fsec"><p class="fh">Part</p><div class="chips">' + partIds.map(function (n) { return fchip('part', n, 'P' + n + ' · ' + esc(PARTS[n]), cnt('part', n)); }).join('') + '</div></div>';
      if (QF.part.length) {
        p += '<div class="fsec"><p class="fh">Topic</p>' + QF.part.map(function (n) { return '<p class="fsub">' + esc(PARTS[n]) + '</p><div class="chips">' + topicsOf(DU, n).map(function (t) { return fchip('topic', t, esc(t), cnt('topic', t)); }).join('') + '</div>'; }).join('') + '</div>';
      }
      FACETS.forEach(function (f) { p += '<div class="fsec"><p class="fh">' + f[1] + '</p><div class="chips">' + f[4].map(function (v) { return fchip(f[0], v, esc(f[3](v)), cnt(f[0], v)); }).join('') + '</div></div>'; });
      var tot = DU.filter(function (q) { return qMatch(q, QF); }).length;
      return p + '<div class="fsum"><b>' + tot + '</b> questions match<span><button class="lnk" data-fa="clear">Clear all</button><button class="sbtn" data-fa="close">Show results</button></span></div>';
    }
    function activeChips() {
      var a = [];
      QF.part.forEach(function (n) { a.push(['part', n, 'P' + n + ' ' + PARTS[n]]); }); QF.topic.forEach(function (t) { a.push(['topic', t, t]); });
      FACETS.forEach(function (f) { QF[f[0]].forEach(function (v) { a.push([f[0], v, f[3](v)]); }); });
      return a.map(function (x) { return '<button type="button" class="fchip on" data-fq="' + x[0] + '" data-v="' + esc(x[1]) + '">' + esc(x[2]) + ' ✕</button>'; }).join('') + (QF.txt ? '<button type="button" class="fchip on" data-fa="txt">“' + esc(QF.txt) + '” ✕</button>' : '');
    }
    function paint() {
      var list = DU.filter(function (q) { return qMatch(q, QF); }), n = nActive(QF);
      $('#quick').innerHTML = fchip('stars', 3, '★★★ High-yield') + fchip('st', 'unread', 'Not read') + fchip('st', 'flagged', 'Flagged') + fchip('kind', 'SEQ', 'SEQ') + fchip('kind', 'Case-based', 'Case-based');
      $('#active').innerHTML = activeChips();
      $('#fbadge').textContent = n ? '(' + n + ')' : '';
      $('#qcount').textContent = list.length + ' question' + (list.length === 1 ? '' : 's') + (n ? ' match' : '');
      $('#fpanel').innerHTML = panel(); $('#fpanel').hidden = !open; $('#ftog').setAttribute('aria-expanded', open);
      $('#qlist').innerHTML = list.length ? groupedRows(list, n > 0 && list.length < 120) : '<div class="empty-state"><h2>No questions match</h2><p>Remove a filter to see more.</p></div>';
      $('#rnd').onclick = function () { var q = (list.length ? list : DU)[Math.floor(Math.random() * (list.length || DU.length))]; location.hash = '#/q/' + q.id; };
    }
    $('#qpage').addEventListener('click', function (e) {
      var c = e.target.closest('[data-fq]'), a = e.target.closest('[data-fa]');
      if (c) { var k = c.dataset.fq, v = (k === 'part' || k === 'stars' || k === 'yr') ? +c.dataset.v : c.dataset.v, i = QF[k].indexOf(v); if (i >= 0) QF[k].splice(i, 1); else QF[k].push(v); if (k === 'part') QF.topic = QF.topic.filter(function (t) { return QF.part.length === 0 || QF.part.some(function (pn) { return topicsOf(DU, pn).indexOf(t) >= 0; }); }); paint(); }
      if (a) { var f = a.dataset.fa; if (f === 'clear') { QF = emptyQF(); txt.value = ''; } if (f === 'txt') { QF.txt = ''; txt.value = ''; } if (f === 'close') { open = false; window.scrollTo(0, $('#qpage').offsetTop); } paint(); }
    });
    var t; txt.oninput = function () { clearTimeout(t); t = setTimeout(function () { QF.txt = txt.value; paint(); }, 250); };
    $('#ftog').onclick = function () { open = !open; paint(); };
    paint();
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
    var h = hero({ crumb: '<a href="#/">Home</a> › Chapters', title: 'Chapters', desc: 'Pick a part to study its questions topic by topic, and jump to the matching MCQs. For one flat list to drill, use Questions.',
      btns: '<a class="bigbtn fill" href="#/questions">All questions</a>', pills: [partIds.length + ' parts', DU.length + ' questions', MCQ.length + ' MCQs'] });
    h += wrap('<div class="pgrid">' + partIds.map(function (n) {
      var qs = DU.filter(function (q) { return q.part === n; }), ms = MCQ.filter(function (q) { return q.part === n; }), d = qs.filter(function (q) { return S.read[q.id]; }).length, tp = topicsOf(qs);
      return '<a class="pcard" href="#/chapter/' + n + '"><span class="num">P' + n + '</span><h3>' + esc(PARTS[n]) + '</h3><span class="prev">' + esc(tp.slice(0, 3).join(' · ') + (tp.length > 3 ? ' …' : '')) + '</span><span class="st">' + qs.length + ' questions · ' + ms.length + ' MCQs · ' + tp.length + ' topics · ' + d + ' read</span><div class="bar"><i style="width:' + (qs.length ? Math.round(d / qs.length * 100) : 0) + '%"></i></div></a>';
    }).join('') + '</div>');
    main.innerHTML = h;
  }
  function chapter(r) {
    var n = +r.id; if (!PARTS[n]) { location.hash = '#/chapters'; return; }
    var list = DU.filter(function (q) { return q.part === n; }), tp = topicsOf(list), ms = MCQ.filter(function (q) { return q.part === n; });
    var h = hero({ crumb: '<a href="#/">Home</a> › <a href="#/chapters">Chapters</a> › Part ' + n, title: esc(PARTS[n]), desc: list.length + ' questions across ' + tp.length + ' topics, ' + ms.length + ' MCQs.',
      btns: '<div class="btnrow"><button class="bigbtn fill" data-go="practice">Practise MCQs</button><a class="bigbtn" href="#/read?part=' + n + '">Read MCQs</a></div>' });
    h += '<div class="wrap">' + progLine(list.filter(function (q) { return S.read[q.id]; }).length, list.length, 'read') + '<div class="toolrow"><span class="count">' + list.length + ' questions</span><span><button class="lnk" data-x="open">Expand all</button><button class="lnk" data-x="close">Collapse all</button></span></div>' +
      (n > 1 ? '' : '') + groupedRows(list, true) + '<div class="pager">' + (n > 1 ? '<a class="btn ghost sm" href="#/chapter/' + (n - 1) + '">← Part ' + (n - 1) + '</a>' : '<span></span>') + (PARTS[n + 1] ? '<a class="btn ghost sm" href="#/chapter/' + (n + 1) + '">Part ' + (n + 1) + ' →</a>' : '') + '</div></div>';
    main.innerHTML = h;
    $('[data-go=practice]').onclick = function () { startFrom({ part: [n] }, { scope: pname(n) }); };
  }

  /* ------------------------------------------------------------ answers */
  function answers(r) {
    var qs = r.qs, have = DU.filter(function (q) { return q.a && (!qs.part || q.part == qs.part); }), tot = DU.filter(function (q) { return q.a; }).length;
    var h = hero({ crumb: '<a href="#/">Home</a> › Answers', title: 'Answers', desc: 'Model answers for the DU question bank. ' + tot + ' of ' + DU.length + ' added so far.' });
    if (!have.length) h += wrap('<div class="panel empty-state"><h2>Answers are on their way</h2><p>No model answers have been added yet. They will appear here by part, and under each question\'s answer.</p><p>To add answers, put them in <code>source/du_answers.md</code> as <code>## DU.12</code> followed by the answer, then run <code>python3 tools/build_banks.py</code>.</p><a class="btn" href="#/questions">Go to questions</a></div>', true);
    else h += wrap('<div class="panel filters">' + sel('part', 'All parts', partOpts(DU), qs.part) + '</div>' + groupedRows(have, !!qs.part), true);
    main.innerHTML = h; bindFilters('#/answers');
  }

  /* ------------------------------------------------------------ MCQ core */
  var anskey = function (q) { return q.kind === 'SBA' ? !!q.ans : q.opts.some(function (o) { return o.k; }); };
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
  function record(q, ok) { S.mcq[q.id] = { c: ok ? 1 : 0 }; save(); }
  function chips(q) {
    return '<div class="qh"><span class="chip id">' + q.id + '</span><span class="chip kind">' + (q.kind === 'SBA' ? 'SBA' : 'True / False') + '</span>' + (q.src === 'New' ? '<span class="chip">New (AI-written)</span>' : q.src === 'BCS' ? '<span class="chip">BCS</span>' : '') +
      '<span class="chip">' + esc(q.topic) + '</span></div>' + tagsHtml(q, 'DU MCQ');
  }
  /* answers shown: reading mode and review */
  function readCard(q, p) {
    var h = '<div class="rdq">' + chips(q) + '<p class="stem">' + esc(q.stem) + '</p>';
    q.opts.forEach(function (o) {
      var cls = '', tag = '';
      if (q.kind === 'SBA') { if (o.l === q.ans) { cls = 'k'; tag = '✓ Correct'; } else if (p && p.sba === o.l) { cls = 'w'; tag = 'Your answer'; } }
      else { tag = o.k ? (o.k === 'T' ? 'True' : 'False') : 'no key'; if (o.k) cls = 'k'; if (p && p[o.l]) { if (o.k && !o.conflict && p[o.l] !== o.k) { cls = 'w'; tag += ' · you said ' + (p[o.l] === 'T' ? 'True' : 'False'); } else if (o.k) tag += ' · ✓'; } }
      h += '<div class="rd ' + cls + '"><b>' + o.l + ')</b> ' + esc(o.t) + (tag ? '<em>' + tag + '</em>' : '') + (o.conflict ? '<small>Papers give different keys for this statement.</small>' : '') + '</div>';
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
    var today = new Date().toDateString(), td = (S.hist || []).filter(function (x) { return new Date(x.ts).toDateString() === today; }).reduce(function (a, x) { return a + x.n; }, 0), goal = S.goal || 20;
    var seg = function (r, w) { return '<span class="mx-st"><u class="r" style="width:' + r + '%"></u><u class="w" style="width:' + w + '%"></u></span>'; };
    var tile = function (a, t, sub, cls, off) { return '<button type="button" class="tile ' + (cls || '') + (off ? ' off' : '') + '" data-go="' + a + '"><b>' + t + '</b><span>' + sub + '</span></button>'; };
    var h = hero({ crumb: '<a href="#/">Home</a> › MCQs', title: 'MCQs', desc: 'Practise by chapter, build your own set, sit a timed mock paper, or read every question with the answers shown.',
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
      var ms = MCQ.filter(function (q) { return q.part === p; }), a = ms.filter(function (q) { return S.mcq[q.id]; }).length, rt = ms.filter(function (q) { return S.mcq[q.id] && S.mcq[q.id].c; }).length;
      return '<details class="grp mxd"><summary><span class="num">P' + p + '</span><span class="tt">' + esc(PARTS[p]) + '<span class="ct">' + ms.length + ' MCQs · ' + (a ? Math.round(rt / a * 100) + '% right of ' + a + ' tried' : 'not started') + '</span></span><span class="chev">›</span></summary><div class="body">' +
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
        var g = b.dataset.go, keyed = MCQ.filter(anskey);
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

  /* ------------------------------------------------------------ custom practice */
  var F = { part: [], topic: [], kind: [], src: [], st: [], txt: '', n: 20, shuffle: 1, mode: 'practice' };
  function custom() {
    var tg = function (f, v, label) { return '<label class="fchip' + (F[f].indexOf(v) >= 0 ? ' on' : '') + '"><input type="checkbox" hidden data-f="' + f + '" data-v="' + esc(v) + '"' + (F[f].indexOf(v) >= 0 ? ' checked' : '') + '>' + label + '</label>'; };
    var seg = function (o, vals) { return '<div class="seg">' + vals.map(function (v) { return '<button type="button" data-o="' + o + '" data-v="' + v[0] + '" class="' + (String(F[o]) === String(v[0]) ? 'on' : '') + '">' + v[1] + '</button>'; }).join('') + '</div>'; };
    var tp = F.part.length ? F.part.reduce(function (a, p) { return a.concat(topicsOf(MCQ, p).map(function (t) { return [p, t]; })); }, []) : [];
    var h = hero({ crumb: '<a href="#/">Home</a> › <a href="#/mcqs">MCQs</a> › Custom', title: 'Custom practice', desc: 'Build your own set. Filters narrow the pool; the count updates as you choose.' });
    h += '<div class="wrap"><div class="bar2"><input type="search" id="ftxt" placeholder="Search question text" value="' + esc(F.txt) + '"></div>' +
      '<div class="panel"><p class="slabel">Part</p><div class="chips">' + partIds.map(function (p) { return tg('part', p, 'P' + p + ' · ' + esc(PARTS[p])); }).join('') + '</div>' +
      (tp.length ? '<p class="slabel">Topic</p><div class="chips">' + tp.map(function (x) { return tg('topic', x[1], esc(x[1])); }).join('') + '</div>' : '') +
      '<p class="slabel">Question type</p><div class="chips">' + tg('kind', 'SBA', 'Single best answer') + tg('kind', 'TF', 'True / False') + '</div>' +
      '<p class="slabel">Source</p><div class="chips">' + tg('src', 'DU', 'Past DU papers') + tg('src', 'BCS', 'BCS') + tg('src', 'New', 'New (AI-written)') + '</div>' +
      '<p class="slabel">Your progress</p><div class="chips">' + tg('st', 'todo', 'Not tried') + tg('st', 'wrong', 'Got wrong') + tg('st', 'right', 'Got right') + tg('st', 'flagged', 'Flagged') + '</div></div>' +
      '<div class="panel"><p class="slabel">How many</p>' + seg('n', [[10, '10'], [20, '20'], [30, '30'], [50, '50'], [0, 'All']]) + '<p class="slabel">Order</p>' + seg('shuffle', [[1, 'Shuffled'], [0, 'Syllabus order']]) +
      '<p class="slabel">Feedback</p>' + seg('mode', [['practice', 'After each question'], ['exam', 'At the end (timed)']]) + '</div>' +
      '<div class="panel"><p class="count" id="cnt"></p><button class="bigbtn fill" id="go" style="color:#fff">Start practice</button><button class="lnk" id="clr">Clear all filters</button></div></div>';
    main.innerHTML = h;
    function count() { var pool = filteredM(F).filter(anskey); $('#cnt').innerHTML = '<b>' + pool.length + '</b> MCQs with an answer key match' + (F.n && pool.length > F.n ? ' · ' + F.n + ' will be drawn' : ''); $('#go').disabled = !pool.length; return pool; }
    count();
    main.querySelectorAll('input[data-f]').forEach(function (c) { c.onchange = function () { var a = F[c.dataset.f], v = c.dataset.f === 'part' ? +c.dataset.v : c.dataset.v, i = a.indexOf(v); if (i >= 0) a.splice(i, 1); else a.push(v); if (c.dataset.f === 'part') F.topic = []; var y = window.scrollY; custom(); window.scrollTo(0, y); }; });
    main.querySelectorAll('.seg button').forEach(function (b) { b.onclick = function () { var v = b.dataset.v; F[b.dataset.o] = b.dataset.o === 'mode' ? v : +v; main.querySelectorAll('.seg button[data-o=' + b.dataset.o + ']').forEach(function (x) { x.classList.toggle('on', x === b); }); count(); }; });
    $('#ftxt').oninput = function () { F.txt = this.value; count(); };
    $('#clr').onclick = function () { F.part = []; F.topic = []; F.kind = []; F.src = []; F.st = []; F.txt = ''; custom(); };
    $('#go').onclick = function () { var pool = count(); if (!pool.length) return; var ids = pool.map(function (q) { return q.id; }); if (F.shuffle) ids = shuf(ids); if (F.n) ids = ids.slice(0, F.n); start(ids, { scope: 'Custom practice', mode: F.mode, limit: F.mode === 'exam' ? ids.length * 90 : 0 }); };
  }

  /* ------------------------------------------------------------ reading mode */
  function reading(r) {
    var qs = r.qs, list = filteredM(qsToF(qs)), keyed = list.filter(anskey);
    var h = hero({ crumb: '<a href="#/">Home</a> › <a href="#/mcqs">MCQs</a> › Reading mode', title: 'Reading mode', desc: 'Every MCQ with its answer shown, for revision without pressure. Switch to practice when you are ready to test yourself.',
      btns: '<div class="btnrow"><button class="bigbtn fill" id="rp"' + (keyed.length ? '' : ' disabled') + '>Practise these</button><a class="bigbtn" href="#/mcqs">MCQ home</a></div>', pills: [list.length + ' MCQs'] });
    h += '<div class="wrap"><div class="bar2"><input type="search" data-f="q" placeholder="Search MCQs" value="' + esc(qs.q || '') + '"></div><div class="panel filters">' +
      sel('part', 'All parts', partOpts(MCQ), qs.part) + sel('topic', 'All topics', topicsOf(MCQ, qs.part).map(function (t) { return [t, t]; }), qs.topic) + sel('kind', 'SBA and T/F', [['SBA', 'SBA only'], ['TF', 'True/False only']], qs.kind) + sel('src', 'All sources', [['DU', 'Past DU papers'], ['BCS', 'BCS'], ['New', 'New (AI-written)']], qs.src) + '</div>' +
      '<div class="toolrow"><span class="count">' + list.length + ' MCQ' + (list.length === 1 ? '' : 's') + '</span></div><div>' + list.slice(0, shown).map(function (q) { return readCard(q); }).join('') + '</div>';
    if (list.length > shown) h += '<button class="btn ghost more" id="more">Show more (' + (list.length - shown) + ' left)</button>';
    if (!list.length) h += '<div class="empty-state"><h2>No MCQs match</h2></div>';
    main.innerHTML = h + '</div>'; bindFilters('#/read');
    var more = $('#more'); if (more) more.onclick = function () { shown += 30; route(true); };
    $('#rp').onclick = function () { if (keyed.length) start(shuf(keyed).slice(0, 50).map(function (q) { return q.id; }), { scope: qs.topic || (qs.part ? pname(+qs.part) : 'Practice') }); };
  }

  /* ------------------------------------------------------------ practice / exam runner */
  var sess = null, timer = null;
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }
  function startFrom(f, o) {
    var pool = filteredM(f).filter(anskey); if (!pool.length) { alert('No MCQs with an answer key match.'); return; }
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
    var body = '<div class="rdq">' + chips(q) + '<p class="stem">' + esc(q.stem) + '</p>';
    if (q.kind === 'SBA') {
      q.opts.forEach(function (o) {
        var c = ''; if (checked) { if (o.l === q.ans) c = ' ok'; else if (p.sba === o.l) c = ' bad'; } else if (p.sba === o.l) c = ' pick';
        body += '<button class="opt' + c + '" data-l="' + o.l + '"><b>' + o.l + ')</b><span>' + esc(o.t) + '</span></button>';
      });
    } else {
      q.opts.forEach(function (o) {
        var c = ''; if (checked && o.k && !o.conflict && p[o.l]) c = p[o.l] === o.k ? ' ok' : ' bad';
        body += '<div class="tf' + c + '" data-l="' + o.l + '"><span class="t"><b>' + o.l + ')</b> ' + esc(o.t) + (checked ? '<small>' + (o.conflict ? 'Papers give different keys for this statement.' : o.k ? 'Correct: ' + (o.k === 'T' ? 'True' : 'False') : 'No key in source') + '</small>' : '') + '</span>' +
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
    var last = sess.i === n - 1;
    var pal = exam ? '<div class="pal">' + sess.ids.map(function (x, k) { return '<button data-r="go" data-k="' + k + '" class="' + (k === sess.i ? 'cur ' : '') + (sess.ans[x] && Object.keys(sess.ans[x]).length ? 'done' : '') + '">' + (k + 1) + '</button>'; }).join('') + '</div>' : '';
    main.innerHTML = hero({ crumb: '<a href="#/mcqs">← MCQs</a> · ' + esc(sess.scope) + ' · ' + (exam ? 'timed exam' : 'practice'), title: 'Question ' + (sess.i + 1) + '<small> of ' + n + '</small>' }) +
      '<div class="wrap"><div class="timer"><span>' + answered + ' answered</span><span id="tm"></span></div><div class="bar" style="margin:.2rem 0 1rem"><i style="width:' + Math.round((sess.i + 1) / n * 100) + '%"></i></div>' + body + (acts ? '<div class="row">' + acts + '</div>' : '') +
      '<div class="pager"><button class="btn ghost" data-r="prev"' + (sess.i ? '' : ' disabled') + '>← Previous</button>' + (last ? '<button class="btn" data-r="finish">Finish</button>' : '<button class="btn" data-r="next">Next →</button>') + '</div>' + pal + '<p class="meta" style="text-align:center"><button class="lnk" data-r="quit">Quit session</button></p></div>';
    var tm = $('#tm');
    function tick() { var e = (Date.now() - sess.t0) / 1000; if (sess.limit) { var left = sess.limit - e; tm.textContent = '⏱ ' + fmt(left) + ' left'; if (left <= 0) { submit(); } } else tm.textContent = '⏱ ' + fmt(e); }
    stopTimer(); tick(); timer = setInterval(tick, 1000);
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
    main.innerHTML = hero({ crumb: '<a href="#/mcqs">← MCQs</a> · ' + esc(sess.scope), title: sess.ok + ' / ' + n + ' <small>correct</small>', desc: pc + '% fully correct · ' + fmt(sess.el) + (un ? ' · ' + un + ' not answered' : '') + '. Review every answer below.',
      btns: '<div class="btnrow"><button class="bigbtn fill" id="again">Try again</button><a class="bigbtn" href="#/mcqs">MCQ home</a></div>' }) +
      wrap(sess.ids.map(function (id) { var q = byId[id], p = sess.ans[id] || {}; return readCard(q, p).replace('<div class="rdq">', '<div class="rdq ' + (isOk(q, scoreOf(q, p)) ? 'good' : scoreOf(q, p) === null ? '' : 'miss') + '">'); }).join(''), true);
    $('#again').onclick = function () { var ids = shuf(sess.ids); start(ids, { scope: sess.scope, mode: sess.mode, limit: sess.limit }); };
  }

  function menu() {
    var dark = document.documentElement.dataset.theme === 'dark';
    main.innerHTML = hero({ title: 'Menu', desc: 'Display, backup and the second-term archive.' }) + '<div class="wrap" style="padding-top:1rem"><div class="grid">' +
      '<div class="card"><div class="k">Display</div><h3>Reading</h3><div class="row"><button class="btn ghost sm" id="m-theme">' + (dark ? 'Day mode' : 'Night mode') + '</button><button class="btn ghost sm" id="m-fs-">A−</button><button class="btn ghost sm" id="m-fs+">A+</button></div></div>' +
      '<div class="card"><div class="k">Progress</div><h3>Backup</h3><div class="m">' + nRead() + ' read · ' + nDone() + ' MCQs tried · ' + Object.keys(S.notes).length + ' notes</div><div class="row"><button class="btn ghost sm" id="m-exp">Download backup</button><label class="btn ghost sm">Restore<input id="m-imp" type="file" accept="application/json" hidden></label><button class="btn ghost sm" id="m-reset">Reset</button></div></div>' +
      '<a class="card archive" href="second-term/"><div class="k">Separate site</div><h3>Second-term viva bank</h3><div class="m">80 solved viva questions, kept apart from this bank.</div></a>' +
      '<div class="card"><div class="k">About</div><h3>Source</h3><div class="m">Questions and MCQs come from Matrix 3rd Prof (18th Ed.) and college papers, merged and de-duplicated. Items tagged New are AI-written; check them against Park or Matrix. Model answers are being added.</div></div></div></div>';
    $('#m-theme').onclick = function () { var d = document.documentElement.dataset.theme === 'dark'; if (d) delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = 'dark'; S.theme = d ? '' : 'dark'; save(); menu(); };
    function fs(d) { var v = Math.max(80, Math.min(140, (S.fs || 100) + d)); S.fs = v; document.documentElement.style.fontSize = v + '%'; save(); }
    $('#m-fs-').onclick = function () { fs(-10); }; $('#m-fs\\+').onclick = function () { fs(10); };
    $('#m-exp').onclick = function () { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(S)], { type: 'application/json' })); a.download = 'community-medicine-progress.json'; a.click(); };
    $('#m-imp').onchange = function (e) { var f = e.target.files[0]; if (!f) return; f.text().then(function (t) { var o = JSON.parse(t); if (o && typeof o === 'object') { S = o; save(); location.reload(); } }).catch(function () { alert('That file is not a valid backup.'); }); };
    $('#m-reset').onclick = function () { if (confirm('Erase all read marks, flags, notes and MCQ results on this device?')) { try { localStorage.removeItem(KEY); } catch (e) {} location.reload(); } };
  }
  $('#t-theme').onclick = function () { var d = document.documentElement.dataset.theme === 'dark'; if (d) delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = 'dark'; S.theme = d ? '' : 'dark'; save(); };
  $('#t-fs').onclick = function () { var v = (S.fs || 100) + 10; if (v > 130) v = 90; S.fs = v; document.documentElement.style.fontSize = v + '%'; save(); };
  route(false);
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) navigator.serviceWorker.register('sw.js').catch(function () {});
})();
