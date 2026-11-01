(function () {
  'use strict';
  var DU = CM.du, MCQ = CM.mcq, PARTS = CM.parts, KEY = 'cmb:v1';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var main = $('#main');
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var S;
  try { S = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { S = {}; }
  S.read = S.read || {}; S.flag = S.flag || {}; S.notes = S.notes || {}; S.mcq = S.mcq || {};
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
    document.querySelectorAll('#bnav a').forEach(function (a) { var k = a.getAttribute('data-r'); a.classList.toggle('on', k === r.r || (r.r === 'q' && k === 'questions') || (r.r === 'quiz' && k === 'mcqs')); });
    var fn = { home: home, questions: questions, q: single, answers: answers, mcqs: mcqs, quiz: quiz, menu: menu }[r.r] || home;
    if (!keep) shown = 30;
    var y = window.scrollY;
    fn(r);
    if (keep) window.scrollTo(0, y); else window.scrollTo(0, 0);
    document.title = 'Community Medicine — ' + ({ home: 'Dashboard', questions: 'Questions', q: 'Question', answers: 'Answers', mcqs: 'MCQs', quiz: 'Quiz', menu: 'Menu' }[r.r] || 'DU Question Bank');
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
      '<a class="card" href="#/quiz"><div class="k">Test yourself</div><h3>Random 20-MCQ quiz</h3><div class="m">Scored, from all topics</div></a>' +
      '<a class="card" href="#/answers"><div class="k">Answers</div><h3>Model answers</h3><div class="m">' + DU.filter(function (q) { return q.a; }).length + ' added so far</div></a></div>';
    h += '<div class="sec"><h2>Browse by part</h2></div><div class="grid">' + partIds.map(function (n) {
      var qs = DU.filter(function (q) { return q.part === n; }), ms = MCQ.filter(function (q) { return q.part === n; });
      var d = qs.filter(function (q) { return S.read[q.id]; }).length;
      return '<a class="card" href="#/questions?part=' + n + '"><div class="k">Part ' + n + '</div><h3>' + esc(PARTS[n]) + '</h3><div class="m">' + qs.length + ' questions · ' + ms.length + ' MCQs</div><div class="bar"><i style="width:' + (qs.length ? Math.round(d / qs.length * 100) : 0) + '%"></i></div></a>';
    }).join('') + '</div>';
    h += '<div class="sec"><h2>Archive</h2></div><a class="card archive" href="second-term/"><div class="k">Separate site</div><h3>Second-term solved viva bank</h3><div class="m">80 fully solved viva questions (Environment, PHC, CD/NCD, MCH-FP, School and Occupational Health). Kept apart from this question bank.</div></a>';
    main.innerHTML = h;
  }
  function strip(h) { return String(h).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }

  /* ------------------------------------------------------------ filters */
  function sel(name, label, opts, val) {
    return '<select data-f="' + name + '" aria-label="' + label + '"><option value="">' + label + '</option>' + opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(val) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>';
  }
  function partOpts(list) { return partIds.map(function (n) { return [n, pname(n) + ' (' + list.filter(function (q) { return q.part === n; }).length + ')']; }); }
  function topicOpts(list, part) {
    var seen = {}, out = [];
    list.forEach(function (q) { if ((!part || q.part == part) && !seen[q.topic]) { seen[q.topic] = 1; out.push([q.topic, q.topic]); } });
    return out;
  }
  function bindFilters(base) {
    main.querySelectorAll('[data-f]').forEach(function (el) {
      el.addEventListener(el.tagName === 'INPUT' ? 'change' : 'change', function () {
        var r = parse(), qs = r.qs; qs[el.getAttribute('data-f')] = el.value;
        if (el.getAttribute('data-f') === 'part') qs.topic = '';
        location.hash = url(base, qs);
      });
    });
  }
  function yearList() {
    var m = {}; DU.forEach(function (q) { q.years.forEach(function (y) { m[y] = 1; }); }); MCQ.forEach(function (q) { q.years.forEach(function (y) { m[y] = 1; }); });
    function key(y) { var n = parseInt(y, 10); return (n < 50 ? 2000 + n : 1900 + n) * 10 + ({ Ja: 1, M: 2, Ju: 3, S: 4, Nov: 5 }[y.replace(/^\d+/, '')] || 0); }
    return Object.keys(m).sort(function (a, b) { return key(b) - key(a); }).map(function (y) { return [y, y]; });
  }
  var YEARS = yearList();

  /* ------------------------------------------------------------ questions */
  function filteredQ(qs) {
    var tk = (qs.q || '').toLowerCase().split(/\s+/).filter(Boolean);
    return DU.filter(function (q) {
      if (qs.part && q.part != qs.part) return false;
      if (qs.topic && q.topic !== qs.topic) return false;
      if (qs.stars && q.stars < +qs.stars) return false;
      if (qs.year && q.years.indexOf(qs.year) < 0) return false;
      if (qs.kind && q.kind !== qs.kind) return false;
      if (qs.status === 'unread' && S.read[q.id]) return false;
      if (qs.status === 'read' && !S.read[q.id]) return false;
      if (qs.status === 'flagged' && !S.flag[q.id]) return false;
      if (qs.status === 'noted' && !S.notes[q.id]) return false;
      if (tk.length) { var t = (strip(q.q) + ' ' + q.topic + ' ' + q.colleges + ' ' + q.asked).toLowerCase(); for (var i = 0; i < tk.length; i++) if (t.indexOf(tk[i]) < 0) return false; }
      return true;
    });
  }
  function qCard(q, open) {
    var chips = '<span class="chip id">' + q.id + '</span>' + (q.stars ? '<span class="chip star">' + '★'.repeat(q.stars) + '</span>' : '') + (q.kind ? '<span class="chip kind">' + esc(q.kind) + '</span>' : '') + '<span class="chip">' + esc(q.topic) + (q.sub ? ' › ' + esc(q.sub) : '') + '</span>';
    var meta = '';
    if (q.years.length) meta += '<div class="meta"><b>Asked:</b> ' + q.years.map(esc).join(', ') + '</div>';
    if (q.colleges) meta += '<div class="meta"><b>Colleges:</b> ' + esc(q.colleges) + '</div>';
    if (q.asked) meta += '<div class="meta"><b>Also asked as:</b> ' + esc(q.asked) + '</div>';
    return '<article class="q' + (S.read[q.id] ? ' read' : '') + '" data-id="' + q.id + '"><div class="qh">' + chips + '</div><div class="qb">' + q.q + '</div>' + meta +
      '<div class="acts"><button data-a="read" aria-pressed="' + !!S.read[q.id] + '">' + (S.read[q.id] ? '✓ Read' : 'Mark read') + '</button>' +
      '<button data-a="flag" aria-pressed="' + !!S.flag[q.id] + '">⚑ Flag</button><button data-a="ans">Answer' + (q.a ? '' : ' (not added)') + '</button><button data-a="note">Notes' + (S.notes[q.id] ? ' •' : '') + '</button>' +
      (open ? '' : '<a href="#/q/' + q.id + '">Open</a>') + '</div><div class="slot"></div></article>';
  }
  function ansHtml(q) { return '<div class="ans">' + (q.a ? '<div class="qb">' + q.a + '</div>' : '<p class="empty">The model answer for this question has not been added yet.</p>') + '</div>'; }
  function questions(r) {
    var qs = r.qs, list = filteredQ(qs);
    var h = '<h1 class="pg">Questions</h1><p class="lede">' + DU.length + ' merged DU and college questions. Filter by part, topic, stars or exam year.</p><div class="filters">' +
      '<div class="wide"><input type="search" data-f="q" placeholder="Search questions, topics, colleges" value="' + esc(qs.q || '') + '"></div>' +
      sel('part', 'All parts', partOpts(DU), qs.part) + sel('topic', 'All topics', topicOpts(DU, qs.part), qs.topic) +
      sel('stars', 'Any stars', [[3, '★★★ only'], [2, '★★ and above'], [1, '★ and above']], qs.stars) + sel('year', 'Any year', YEARS, qs.year) +
      sel('kind', 'All types', [['SEQ', 'SEQ'], ['Case-based', 'Case-based']], qs.kind) + sel('status', 'Any status', [['unread', 'Unread'], ['read', 'Read'], ['flagged', 'Flagged'], ['noted', 'With notes']], qs.status) + '</div>';
    h += '<div class="count">' + list.length + ' question' + (list.length === 1 ? '' : 's') + '</div><div id="list">' + list.slice(0, shown).map(function (q) { return qCard(q); }).join('') + '</div>';
    if (list.length > shown) h += '<button class="btn ghost more" id="more">Show more (' + (list.length - shown) + ' left)</button>';
    if (!list.length) h += '<div class="empty-state"><h2>No questions match</h2><p>Try removing a filter.</p></div>';
    main.innerHTML = h; bindFilters('#/questions'); bindCards(list);
    var more = $('#more'); if (more) more.onclick = function () { shown += 30; route(true); };
  }
  function bindCards(list) {
    main.querySelectorAll('.q').forEach(function (card) {
      card.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-a]'); if (!b) return;
        var q = byId[card.dataset.id], a = b.dataset.a, slot = $('.slot', card);
        if (a === 'read') { if (S.read[q.id]) delete S.read[q.id]; else S.read[q.id] = 1; S.last = q.id; save(); card.classList.toggle('read', !!S.read[q.id]); b.setAttribute('aria-pressed', !!S.read[q.id]); b.textContent = S.read[q.id] ? '✓ Read' : 'Mark read'; }
        if (a === 'flag') { if (S.flag[q.id]) delete S.flag[q.id]; else S.flag[q.id] = 1; save(); b.setAttribute('aria-pressed', !!S.flag[q.id]); }
        if (a === 'ans') { var on = slot.dataset.v === 'ans'; slot.dataset.v = on ? '' : 'ans'; slot.innerHTML = on ? '' : ansHtml(q); S.last = q.id; save(); }
        if (a === 'note') {
          if (slot.dataset.v === 'note') { slot.dataset.v = ''; slot.innerHTML = ''; return; }
          slot.dataset.v = 'note'; slot.innerHTML = '<div class="notes"><textarea placeholder="Your notes for ' + q.id + '">' + esc(S.notes[q.id] || '') + '</textarea></div>';
          var ta = $('textarea', slot); ta.focus();
          ta.addEventListener('input', function () { if (ta.value.trim()) S.notes[q.id] = ta.value; else delete S.notes[q.id]; save(); b.textContent = 'Notes' + (S.notes[q.id] ? ' •' : ''); });
        }
      });
    });
  }
  function single(r) {
    var q = byId[r.id]; if (!q || !q.part || q.id.charAt(0) !== 'D') { location.hash = '#/questions'; return; }
    S.last = q.id; save();
    var i = DU.indexOf(q), p = DU[i - 1], n = DU[i + 1];
    main.innerHTML = '<p class="meta" style="margin-top:1rem"><a href="#/questions?part=' + q.part + '">← ' + esc(pname(q.part)) + '</a></p>' + qCard(q, true) +
      '<div class="pager">' + (p ? '<a class="btn ghost sm" href="#/q/' + p.id + '">← ' + p.id + '</a>' : '<span></span>') + (n ? '<a class="btn ghost sm" href="#/q/' + n.id + '">' + n.id + ' →</a>' : '') + '</div>';
    bindCards([q]);
  }

  /* ------------------------------------------------------------ answers */
  function answers(r) {
    var qs = r.qs, have = DU.filter(function (q) { return q.a && (!qs.part || q.part == qs.part); });
    var h = '<h1 class="pg">Answers</h1><p class="lede">Model answers for the DU question bank. ' + DU.filter(function (q) { return q.a; }).length + ' of ' + DU.length + ' added so far.</p>';
    if (!have.length) {
      h += '<div class="card empty-state"><h2>Answers are on their way</h2><p>No model answers have been added yet. They will appear here, grouped by part, and also under each question\'s <b>Answer</b> button.</p>' +
        '<p>To add answers, put them in <code>source/du_answers.md</code> as <code>## DU.12</code> followed by the answer in Markdown, then run <code>python3 tools/build_banks.py</code>.</p><a class="btn" href="#/questions">Go to questions</a></div>';
    } else {
      h += '<div class="filters">' + sel('part', 'All parts', partOpts(DU), qs.part) + '</div><div id="list">' + have.map(function (q) { return qCard(q); }).join('') + '</div>';
    }
    main.innerHTML = h; bindFilters('#/answers'); bindCards(have);
  }

  /* ------------------------------------------------------------ mcqs */
  function filteredM(qs) {
    return MCQ.filter(function (q) {
      if (qs.part && q.part != qs.part) return false;
      if (qs.topic && q.topic !== qs.topic) return false;
      if (qs.kind && q.kind !== qs.kind) return false;
      if (qs.src && q.src !== qs.src) return false;
      if (qs.year && q.years.indexOf(qs.year) < 0) return false;
      if (qs.status === 'todo' && S.mcq[q.id]) return false;
      if (qs.status === 'wrong' && !(S.mcq[q.id] && !S.mcq[q.id].c)) return false;
      if (qs.status === 'flagged' && !S.flag[q.id]) return false;
      if (qs.q && (q.stem + ' ' + q.topic).toLowerCase().indexOf(qs.q.toLowerCase()) < 0) return false;
      return true;
    });
  }
  var anskey = function (q) { return q.kind === 'SBA' ? !!q.ans : q.opts.some(function (o) { return o.k; }); };
  function mCard(q, st) {
    st = st || {};
    var done = S.mcq[q.id], chips = '<span class="chip id">' + q.id + '</span><span class="chip kind">' + (q.kind === 'SBA' ? 'SBA' : 'True / False') + '</span>' +
      (q.src !== 'DU' ? '<span class="chip">' + (q.src === 'New' ? 'New (AI-written)' : 'BCS') + '</span>' : '') + '<span class="chip">' + esc(q.topic) + '</span>' + q.years.map(function (y) { return '<span class="chip">' + esc(y) + '</span>'; }).join('');
    var h = '<article class="q" data-id="' + q.id + '"><div class="qh">' + chips + '</div><div class="qb"><p>' + esc(q.stem) + '</p></div><div class="opts">';
    if (q.kind === 'SBA') {
      q.opts.forEach(function (o) { h += '<button class="opt" data-l="' + o.l + '"><b>' + o.l + ')</b><span>' + esc(o.t) + '</span></button>'; });
    } else {
      q.opts.forEach(function (o) { h += '<div class="tf" data-l="' + o.l + '"><span class="t"><b>' + o.l + ')</b> ' + esc(o.t) + (o.conflict ? '<small>Papers give different keys for this statement.</small>' : '') + '</span><button data-t="T">T</button><button data-t="F">F</button></div>'; });
    }
    h += '</div><div class="res"></div><div class="acts"><button data-a="show">Show answer</button><button data-a="flag" aria-pressed="' + !!S.flag[q.id] + '">⚑ Flag</button>' + (done ? '<button data-a="reset">Try again</button>' : '') + '</div></article>';
    return h;
  }
  function bindM(root, onDone) {
    root.querySelectorAll('.q').forEach(function (card) {
      var q = byId[card.dataset.id], picked = {}, over = false;
      function paint() {
        if (q.kind === 'SBA') {
          card.querySelectorAll('.opt').forEach(function (b) { var l = b.dataset.l; b.classList.toggle('ok', over && l === q.ans); b.classList.toggle('bad', over && picked.sba === l && l !== q.ans); });
        } else {
          card.querySelectorAll('.tf').forEach(function (row) {
            var l = row.dataset.l, o = q.opts.filter(function (x) { return x.l === l; })[0];
            row.querySelectorAll('button').forEach(function (b) { b.classList.toggle('sel', picked[l] === b.dataset.t); });
            row.classList.remove('ok', 'bad');
            if (over && o.k && !o.conflict && picked[l]) row.classList.add(picked[l] === o.k ? 'ok' : 'bad');
            var tail = $('.k', row); if (tail) tail.remove();
            if (over) row.insertAdjacentHTML('beforeend', '<span class="k chip">' + (o.k ? (o.k === 'T' ? 'True' : 'False') : 'no key') + '</span>');
          });
        }
      }
      function finish(forced) {
        over = true; paint();
        var res = $('.res', card), msg = '';
        if (!anskey(q)) { res.innerHTML = '<p class="note">The source has no answer key for this item.</p>'; return; }
        if (q.kind === 'SBA') {
          var ok = picked.sba === q.ans;
          if (picked.sba) { S.mcq[q.id] = { c: ok ? 1 : 0 }; save(); msg = '<p class="verdict ' + (ok ? 'ok' : 'bad') + '">' + (ok ? 'Correct' : 'Not quite — the answer is ' + q.ans + ')') + '</p>'; }
          else msg = '<p class="verdict">Answer: ' + q.ans + ')</p>';
        } else {
          var scored = q.opts.filter(function (o) { return o.k && !o.conflict; }), got = scored.filter(function (o) { return picked[o.l] === o.k; }).length, tried = scored.filter(function (o) { return picked[o.l]; }).length;
          if (tried) { S.mcq[q.id] = { c: got === scored.length ? 1 : 0 }; save(); msg = '<p class="verdict ' + (got === scored.length ? 'ok' : 'bad') + '">' + got + ' of ' + scored.length + ' keyed statements correct</p>'; }
          if (q.opts.some(function (o) { return o.conflict; })) msg += '<p class="note">Some statements have conflicting keys across papers and are not scored.</p>';
        }
        if (q.ref) msg += '<p class="meta">Ref: ' + esc(q.ref) + '</p>';
        res.innerHTML = msg;
        if (!$('[data-a=reset]', card)) $('.acts', card).insertAdjacentHTML('beforeend', '<button data-a="reset">Try again</button>');
        if (onDone) onDone(q);
      }
      card.addEventListener('click', function (e) {
        var o = e.target.closest('.opt'), t = e.target.closest('.tf button'), a = e.target.closest('button[data-a]');
        if (o && !over) { picked.sba = o.dataset.l; finish(); }
        else if (t && !over) { picked[t.closest('.tf').dataset.l] = t.dataset.t; paint(); }
        else if (a) {
          if (a.dataset.a === 'show') finish(true);
          if (a.dataset.a === 'flag') { if (S.flag[q.id]) delete S.flag[q.id]; else S.flag[q.id] = 1; save(); a.setAttribute('aria-pressed', !!S.flag[q.id]); }
          if (a.dataset.a === 'reset') { picked = {}; over = false; $('.res', card).innerHTML = ''; paint(); a.remove(); }
        }
      });
      if (q.kind !== 'SBA') {
        var acts = $('.acts', card); acts.insertAdjacentHTML('afterbegin', '<button data-a="check">Check my answers</button>');
        $('[data-a=check]', card).addEventListener('click', function () { finish(); });
      }
    });
  }
  function mcqs(r) {
    var qs = r.qs, list = filteredM(qs), tried = nDone(), right = MCQ.filter(function (q) { return S.mcq[q.id] && S.mcq[q.id].c; }).length;
    var h = '<h1 class="pg">MCQs</h1><p class="lede">' + MCQ.length + ' single-best-answer and true/false MCQs. Pick an answer for instant feedback.</p>' +
      '<div class="stats"><span class="stat"><b>' + tried + '</b> tried</span><span class="stat"><b>' + right + '</b> fully correct</span></div><div class="filters">' +
      '<div class="wide"><input type="search" data-f="q" placeholder="Search MCQs" value="' + esc(qs.q || '') + '"></div>' +
      sel('part', 'All parts', partOpts(MCQ), qs.part) + sel('topic', 'All topics', topicOpts(MCQ, qs.part), qs.topic) +
      sel('kind', 'SBA and T/F', [['SBA', 'SBA only'], ['TF', 'True/False only']], qs.kind) + sel('src', 'All sources', [['DU', 'Past DU papers'], ['BCS', 'BCS'], ['New', 'New (AI-written)']], qs.src) +
      sel('year', 'Any year', YEARS, qs.year) + sel('status', 'Any status', [['todo', 'Not tried'], ['wrong', 'Got wrong'], ['flagged', 'Flagged']], qs.status) + '</div>' +
      '<div class="row"><a class="btn sm" href="' + url('#/quiz', { part: qs.part, topic: qs.topic, kind: qs.kind, src: qs.src, year: qs.year }) + '">Quiz me on these (20)</a></div>' +
      '<div class="count">' + list.length + ' MCQ' + (list.length === 1 ? '' : 's') + '</div><div id="list">' + list.slice(0, shown).map(function (q) { return mCard(q); }).join('') + '</div>';
    if (list.length > shown) h += '<button class="btn ghost more" id="more">Show more (' + (list.length - shown) + ' left)</button>';
    if (!list.length) h += '<div class="empty-state"><h2>No MCQs match</h2></div>';
    main.innerHTML = h; bindFilters('#/mcqs'); bindM(main);
    var more = $('#more'); if (more) more.onclick = function () { shown += 30; route(true); };
  }
  function quiz(r) {
    var pool = filteredM(r.qs).filter(anskey), ids = pool.map(function (q) { return q.id; });
    for (var i = ids.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = ids[i]; ids[i] = ids[j]; ids[j] = t; }
    ids = ids.slice(0, 20);
    if (!ids.length) { main.innerHTML = '<div class="empty-state"><h2>No MCQs with an answer key match</h2><a class="btn" href="#/mcqs">Back to MCQs</a></div>'; return; }
    var k = 0, score = 0;
    function step() {
      if (k >= ids.length) {
        main.innerHTML = '<h1 class="pg">Quiz finished</h1><div class="card empty-state"><h2>' + score + ' / ' + ids.length + '</h2><p>' + Math.round(score / ids.length * 100) + '% fully correct</p><a class="btn" href="' + esc(location.hash) + '" onclick="setTimeout(function(){location.reload()},0)">New quiz</a> <a class="btn ghost" href="#/mcqs">Back to MCQs</a></div>'; return;
      }
      var q = byId[ids[k]];
      main.innerHTML = '<h1 class="pg">Quiz</h1><p class="lede">Question ' + (k + 1) + ' of ' + ids.length + ' · score ' + score + '</p>' + mCard(q) + '<div class="pager"><a class="btn ghost sm" href="#/mcqs">Quit</a><button class="btn sm" id="next" disabled>' + (k + 1 === ids.length ? 'Finish' : 'Next') + ' →</button></div>';
      bindM(main, function (qq) { if (S.mcq[qq.id] && S.mcq[qq.id].c) score++; $('#next').disabled = false; });
      $('#next').onclick = function () { k++; step(); };
    }
    step();
  }

  /* ------------------------------------------------------------ menu */
  function menu() {
    var dark = document.documentElement.dataset.theme === 'dark';
    main.innerHTML = '<h1 class="pg">Menu</h1><div class="grid">' +
      '<div class="card"><div class="k">Display</div><h3>Reading</h3><div class="row"><button class="btn ghost sm" id="m-theme">' + (dark ? 'Day mode' : 'Night mode') + '</button><button class="btn ghost sm" id="m-fs-">A−</button><button class="btn ghost sm" id="m-fs+">A+</button></div></div>' +
      '<div class="card"><div class="k">Progress</div><h3>Backup</h3><div class="m">' + nRead() + ' read · ' + nDone() + ' MCQs tried · ' + Object.keys(S.notes).length + ' notes</div><div class="row"><button class="btn ghost sm" id="m-exp">Download backup</button><label class="btn ghost sm">Restore<input id="m-imp" type="file" accept="application/json" hidden></label><button class="btn ghost sm" id="m-reset">Reset</button></div></div>' +
      '<a class="card archive" href="second-term/"><div class="k">Separate site</div><h3>Second-term viva bank</h3><div class="m">80 solved viva questions, kept apart from this bank.</div></a>' +
      '<div class="card"><div class="k">About</div><h3>Source</h3><div class="m">Questions and MCQs come from Matrix 3rd Prof (18th Ed.) and college papers, merged and de-duplicated. Items tagged New are AI-written; check them against Park or Matrix. Model answers are being added.</div></div></div>';
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
