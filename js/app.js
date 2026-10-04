/* app.js - UI logic. Question content comes from data.js + topics/*.js (generated),
 * persistence and progress maths come from progress.js.
 *
 * Routes (hash based, no page reloads):
 *   #/                      dashboard
 *   #/all[?filters]         every question, with filters
 *   #/s/<sectionId>         one major topic
 *   #/t/<subsectionId>      one subtopic
 *   #/q/<questionId>        a single question
 *   #/about
 * List routes accept ?q=keyword&status=read|unread&notes=with|without&type=case|other
 */
(function () {
  'use strict';

  var QB = window.QB, P = window.QBProgress;
  var $ = function (id) { return document.getElementById(id); };
  var main = $('main'), sidebar = $('sidebar'), crumbsEl = $('crumbs'), app = $('app');

  /* ------------------------------------------------------------------ data */
  var missing = (function () {
    var m = 0;
    QB.structure.forEach(function (s) {
      s.questionIds.concat.apply(s.questionIds, s.subsections.map(function (x) { return x.questionIds; }))
        .forEach(function (id) { if (!QB.questions[id]) m++; });
    });
    return m;
  })();
  if (missing) {
    main.innerHTML = '<p class="empty-note">Some question files did not load (' + missing + ' missing). Check that the topics folder was uploaded with index.html.</p>';
    return;
  }
  P.init();

  var S = QB.structure, Q = QB.questions, order = P.order();
  var secById = {}, subById = {}, loc = {}, pos = {};
  S.forEach(function (sec) {
    secById[sec.id] = sec;
    sec.subsections.forEach(function (sub) { subById[sub.id] = sub; sub.sec = sec; });
  });
  order.forEach(function (id, i) {
    var q = Q[id];
    loc[id] = { sec: secById[q.section], sub: q.sub ? subById[q.sub] : null };
    pos[id] = i;
  });
  var hasTags = order.some(function (id) { return Q[id].tag; });

  /* search index (lower-cased once) */
  var idx = {};
  order.forEach(function (id) {
    var q = Q[id], l = loc[id];
    idx[id] = {
      q: q.qText.toLowerCase(),
      a: q.aText.toLowerCase(),
      m: (l.sec.heading + ' ' + (l.sub ? l.sub.title : '')).toLowerCase()
    };
  });

  /* ------------------------------------------------------------- utilities */
  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return ESC[c]; }); }
  function rx(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function enc(s) { return encodeURIComponent(s); }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  function tokensOf(t) { return (t || '').toLowerCase().split(/\s+/).filter(Boolean); }
  function scoreOf(id, tokens) {
    var e = idx[id], s = 0;
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i], hit = 0;
      if (e.q.indexOf(t) >= 0) hit += 3;
      if (e.m.indexOf(t) >= 0) hit += 2;
      if (e.a.indexOf(t) >= 0) hit += 1;
      if (!hit) return 0;
      s += hit;
    }
    return s;
  }
  function hl(text, tokens) {
    if (!tokens || !tokens.length) return esc(text);
    var re = new RegExp('(' + tokens.map(rx).join('|') + ')', 'gi'), out = '', last = 0, m;
    while ((m = re.exec(text))) {
      out += esc(text.slice(last, m.index)) + '<mark>' + esc(m[0]) + '</mark>';
      last = m.index + m[0].length;
    }
    return out + esc(text.slice(last));
  }
  function snippet(id, tokens) {
    var a = Q[id].aText, m = new RegExp(tokens.map(rx).join('|'), 'i').exec(a);
    if (!m) return esc(a.slice(0, 150)) + (a.length > 150 ? '…' : '');
    var start = Math.max(0, m.index - 60), end = Math.min(a.length, m.index + 110);
    return (start > 0 ? '…' : '') + hl(a.slice(start, end), tokens) + (end < a.length ? '…' : '');
  }
  function announce(msg) { var l = $('live'); l.textContent = ''; setTimeout(function () { l.textContent = msg; }, 20); }
  function tagLabel(t) { return t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : ''; }
  function where(id) { var l = loc[id]; return l.sec.title + (l.sub ? ' → ' + l.sub.title : ''); }
  function pct(d, t) { return t ? Math.round(d / t * 100) : 0; }

  var ICON_CHECK = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.4l2.4 2.4 4.6-5.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var ICON_CARET = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><rect x=".5" y=".5" width="15" height="15" rx="2.5"/><path d="M6.4 4.9L9.6 8l-3.2 3.1" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var ICON_CHEV = '<svg class="dd-chev" viewBox="0 0 12 12" width="11" height="11" aria-hidden="true"><path d="M2.5 4.5L6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var ICON_NOTE = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 2.5h10v8.5l-3 3H3zM10 14v-3h3" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>';
  function noteMark(id) {
    return P.hasNote(id) ? '<span class="nmark" role="img" aria-label="Has a note" title="Has a note">' + ICON_NOTE + '</span>' : '';
  }
  function bar(done, total, cls, label) {
    return '<span class="bar ' + (cls || '') + '" role="progressbar" aria-valuemin="0" aria-valuemax="' + total +
      '" aria-valuenow="' + done + '" aria-label="' + esc(label || 'Progress') + '"><i style="width:' + pct(done, total) + '%"></i></span>';
  }
  function proseHtml(html) {
    return html.replace(/<table>/g, '<div class="table-wrap" tabindex="0" role="region" aria-label="Table"><table>')
      .replace(/<\/table>/g, '</table></div>');
  }
  function storageWarn() {
    return P.persistent() ? '' :
      '<p class="storage-warn">This browser is blocking local storage, so read marks and notes will be lost when you close the page. Open the site in a normal (non-private) window to keep them.</p>';
  }

  /* --------------------------------------------------------------- filters */
  var F = { topic: '', sub: '', status: 'all', notes: 'all', type: 'all', q: '' };
  function resetF() { F = { topic: '', sub: '', status: 'all', notes: 'all', type: 'all', q: '' }; }
  function hashFor(f) {
    var base = f.sub ? '#/t/' + enc(f.sub) : f.topic ? '#/s/' + enc(f.topic) : '#/all', qs = [];
    if (f.q) qs.push('q=' + enc(f.q));
    ['status', 'notes', 'type'].forEach(function (k) { if (f[k] !== 'all') qs.push(k + '=' + enc(f[k])); });
    return base + (qs.length ? '?' + qs.join('&') : '');
  }
  function scopeIds() {
    if (F.sub && subById[F.sub]) return subById[F.sub].questionIds;
    if (F.topic && secById[F.topic]) return secById[F.topic].allIds;
    return order;
  }
  function filtered() {
    var tokens = tokensOf(F.q);
    return scopeIds().filter(function (id) {
      var r = P.isRead(id), n = P.hasNote(id);
      if (F.status === 'read' && !r) return false;
      if (F.status === 'unread' && r) return false;
      if (F.notes === 'with' && !n) return false;
      if (F.notes === 'without' && n) return false;
      if (F.type === 'case' && !Q[id].tag) return false;
      if (F.type === 'other' && Q[id].tag) return false;
      return !tokens.length || scoreOf(id, tokens) > 0;
    });
  }
  function anyFilter() { return !!(F.topic || F.sub || F.q || F.status !== 'all' || F.notes !== 'all' || F.type !== 'all'); }
  function listTitle() { return F.sub ? subById[F.sub].title : F.topic ? secById[F.topic].heading : 'All questions'; }

  /* ----------------------------------------------------------------- state */
  var cur = { type: 'dash', id: '', secId: '', subId: '' };
  var noteMode = 'view';
  var noteTimer = null;

  /* ---------------------------------------------------------------- routing */
  function parseHash() {
    var h = location.hash.replace(/^#\/?/, ''), qs = {}, i = h.indexOf('?');
    if (i >= 0) {
      h.slice(i + 1).split('&').forEach(function (kv) {
        if (!kv) return;
        var p = kv.split('=');
        try { qs[decodeURIComponent(p[0])] = decodeURIComponent((p[1] || '').replace(/\+/g, ' ')); } catch (e) { /* ignore */ }
      });
      h = h.slice(0, i);
    }
    var parts = h.split('/').filter(Boolean).map(function (x) { try { return decodeURIComponent(x); } catch (e) { return x; } });
    return { parts: parts, qs: qs };
  }

  function route(keepScroll) {
    flushNote();
    var r = parseHash(), p = r.parts, t = p[0] || '';
    closePop(); closeDrawer();
    noteMode = 'view';
    document.body.classList.remove('notes-open');
    var crumbs = [], title = QB.meta.title;

    if (t === 'q' && Q[p[1]]) {
      var q = Q[p[1]], l = loc[p[1]];
      cur = { type: 'question', id: p[1], secId: l.sec.id, subId: l.sub ? l.sub.id : '' };
      renderQuestion(p[1]);
      crumbs = [['Home', '#/'], [l.sec.title, '#/s/' + enc(l.sec.id)]];
      if (l.sub) crumbs.push([l.sub.title, '#/t/' + enc(l.sub.id)]);
      crumbs.push([q.label, null]);
      title = q.label + ' — ' + q.qText.slice(0, 70);
    } else if ((t === 's' && secById[p[1]]) || (t === 't' && subById[p[1]]) || t === 'all' || t === 'search') {
      resetF();
      if (t === 's') F.topic = p[1];
      if (t === 't') { F.sub = p[1]; F.topic = subById[p[1]].sec.id; }
      var qs = r.qs;
      if (qs.q) F.q = qs.q;
      if (/^(read|unread)$/.test(qs.status || '')) F.status = qs.status;
      if (/^(with|without)$/.test(qs.notes || '')) F.notes = qs.notes;
      if (/^(case|other)$/.test(qs.type || '')) F.type = qs.type;
      if (t === 'search' && qs.q) F.q = qs.q;
      cur = { type: 'list', id: '', secId: F.topic, subId: F.sub };
      renderListPage();
      crumbs = [['Home', '#/']];
      if (F.topic) crumbs.push([secById[F.topic].title, F.sub ? '#/s/' + enc(F.topic) : null]);
      if (F.sub) crumbs.push([subById[F.sub].title, null]);
      if (!F.topic) crumbs.push(['All questions', null]);
      title = listTitle();
    } else if (t === 'about') {
      cur = { type: 'about', id: '', secId: '', subId: '' };
      P.setCtx(null);
      renderAbout();
      crumbs = [['Home', '#/'], ['About', null]];
      title = 'About';
    } else {
      cur = { type: 'dash', id: '', secId: '', subId: '' };
      P.setCtx(null);
      renderDashboard();
      crumbs = [['Home', null]];
      if (t) { main.insertAdjacentHTML('afterbegin', '<p class="empty-note">That page was not found, so you are back on the dashboard.</p>'); }
    }
    document.body.setAttribute('data-page', cur.type);
    renderCrumbs(crumbs);
    renderSidebar();
    applyMode();
    document.title = title + ' | Preventive & Social Medicine';
    if (!keepScroll) { window.scrollTo(0, 0); }
  }

  function renderCrumbs(items) {
    crumbsEl.innerHTML = '<ol>' + items.map(function (c, i) {
      var last = i === items.length - 1;
      return '<li>' + (c[1] && !last ? '<a href="' + c[1] + '">' + esc(c[0]) + '</a>' : '<span' + (last ? ' aria-current="page"' : '') + '>' + esc(c[0]) + '</span>') + '</li>';
    }).join('') + '</ol>';
  }

  /* -------------------------------------------------------------- dashboard */
  function continueTarget() {
    var rec = P.recent(), i;
    for (i = 0; i < rec.length; i++) if (!P.isRead(rec[i].id)) return rec[i].id;
    for (i = 0; i < order.length; i++) if (!P.isRead(order[i])) return order[i];
    var l = P.last();
    return l ? l.id : order[0];
  }

  function renderDashboard() {
    var ov = P.overall(), withNotes = P.noteIds().length, target = continueTarget(), started = ov.done > 0 || P.recent().length > 0;
    var titleParts = String(QB.meta.title).split(/\s+[—-]\s+/), main1 = titleParts[0], tail = titleParts.slice(1).join(' ');
    var h = '<div class="dash">';
    h += '<header class="masthead"><p class="eyebrow">' + esc(QB.meta.site) + ' &middot; MBBS</p>' +
      '<h1 class="dash-title">' + esc(main1) + (tail ? '<span class="solved">' + esc(tail) + '</span>' : '') + '</h1>' +
      '<p class="lede">' + plural(ov.total, 'question') + ' across ' + plural(S.length, 'topic') + ', each with a complete answer. Mark what you have read, keep notes, and pick up where you left off.</p></header>';
    h += storageWarn();

    h += '<div class="hero-grid">' +
      '<section class="resume" aria-label="Continue studying"><p class="eyebrow">' + (started ? 'Continue studying' : 'Start here') + '</p>' +
      '<p class="resume-q">' + esc(Q[target].qText) + '</p>' +
      '<p class="resume-where"><b>' + esc(Q[target].label) + '</b>' + esc(where(target)) + '</p>' +
      '<div class="dash-actions"><a class="btn btn-primary" href="#/q/' + enc(target) + '">' + (started ? 'Continue studying' : 'Begin studying') + '</a>' +
      '<a class="btn" href="#/all">Browse all questions</a></div></section>' +
      '<section class="ledger" aria-label="Overall progress"><p class="eyebrow">Overall progress</p>' +
      '<div class="ledger-pct">' + ov.pct + '<small>%</small></div>' + bar(ov.done, ov.total, 'big', 'Overall progress') +
      '<p class="ledger-note">' + ov.done + ' / ' + ov.total + ' questions read</p>' +
      '<dl class="figs"><div><dt>Total questions</dt><dd>' + ov.total + '</dd></div>' +
      '<div><dt>Completed</dt><dd>' + ov.done + '</dd></div>' +
      '<div><dt>Remaining</dt><dd>' + (ov.total - ov.done) + '</dd></div>' +
      '<div><dt>With notes</dt><dd>' + withNotes + '</dd></div></dl>' +
      (withNotes ? '<p class="link-row"><a href="#/all?notes=with">View questions with notes (' + withNotes + ')</a></p>' : '') + '</section></div>';

    h += '<h2>Topics and progress</h2><ul class="topics">';
    S.forEach(function (sec) {
      var st = P.stats(sec.allIds);
      h += '<li class="topic"><a class="topic-link" href="#/s/' + enc(sec.id) + '"><span class="topic-num" aria-hidden="true">' + esc(sec.num || '') + '</span>' +
        '<span class="topic-name">' + esc(sec.title) + '</span>' +
        '<span class="topic-meta"><span><b>' + st.done + '</b> / ' + st.total + ' read</span><span>' + st.pct + '%</span></span></a>' +
        bar(st.done, st.total, 'thin', sec.heading + ' progress');
      if (sec.subsections.length) {
        h += '<ul class="topic-subs">';
        sec.subsections.forEach(function (sub) {
          var s2 = P.stats(sub.questionIds), empty = !s2.total;
          h += '<li><a class="' + (empty ? 'is-empty' : '') + '" href="#/t/' + enc(sub.id) + '"><span class="st">' + esc(sub.title) + '</span><span class="lead"></span>' +
            '<span class="rt">' + (empty ? 'no questions' : '<b>' + s2.done + '</b> / ' + s2.total) + '</span></a></li>';
        });
        h += '</ul>';
      }
      h += '</li>';
    });
    h += '</ul>';

    h += '<h2>Recently studied</h2>';
    var rec = P.recent().slice(0, 6);
    if (!rec.length) h += '<p class="empty-note">Nothing yet. Questions you open will appear here.</p>';
    else {
      h += '<ul class="mini-list">' + rec.map(function (r) {
        var q = Q[r.id];
        return '<li><a href="#/q/' + enc(r.id) + '"><span class="ml-n">' + esc(q.label) + '</span><span><span class="ml-q">' + esc(q.qText) +
          '</span><span class="ml-p">' + esc(where(r.id)) + ', ' + (P.isRead(r.id) ? 'read' : 'unread') + '</span></span><span class="marks">' + noteMark(r.id) + '</span></a></li>';
      }).join('') + '</ul>';
    }
    h += '</div>';
    main.innerHTML = h;
  }

  /* ------------------------------------------------------------------ about */
  function renderAbout() {
    main.innerHTML = '<div class="about"><h1>About this question bank</h1>' +
      '<p>' + esc(QB.meta.title) + ' covers Preventive &amp; Social Medicine for MBBS students. The topics, subtopics, questions and answers are shown exactly as they appear in the source file, with bold, italics, lists and tables kept.</p>' +
      '<h2>Your progress</h2><p>Read marks, notes, reading size and recently studied questions are saved in this browser only. They are tied to each question, so they stay in place if the question bank is reordered. Clearing site data for this page also clears them.</p>' +
      '<h2>Shortcuts</h2><ul><li><kbd>←</kbd> and <kbd>→</kbd> move to the previous or next question.</li><li><kbd>Esc</kbd> exits Focus Mode or closes search.</li></ul>' +
      '<h2>Credits</h2><p class="credits">Created by Muhtasim Ahmed<br>Netrokona Medical College<br>Session 22–23</p></div>';
  }

  /* -------------------------------------------------------------- list page */
  function renderListPage() {
    var scope = scopeIds(), st = P.stats(scope), h = '<section class="list-page">';
    h += '<div class="list-head"><h1>' + esc(listTitle()) + '</h1><div class="lh-meta"><span>' + plural(st.total, 'question') + '</span>' +
      (st.total ? bar(st.done, st.total, '', listTitle() + ' progress') + '<span>' + st.done + ' read, ' + st.pct + '%</span>' : '') + '</div>';
    var note = F.sub ? subById[F.sub].noteHtml : (F.topic && !F.sub ? secById[F.topic].noteHtml : '');
    if (note && !st.total) h += '<div class="prose" style="margin-top:.8rem">' + note + '</div>';
    var chips = '';
    if (!F.topic) {
      chips = S.map(function (s) { return '<a href="#/s/' + enc(s.id) + '">' + esc(s.heading) + '<span class="c">' + s.allIds.length + '</span></a>'; }).join('');
    } else if (secById[F.topic].subsections.length) {
      var sec = secById[F.topic];
      chips = '<a href="#/s/' + enc(sec.id) + '"' + (!F.sub ? ' aria-current="true"' : '') + '>All<span class="c">' + sec.allIds.length + '</span></a>' +
        sec.subsections.map(function (s) {
          return '<a href="#/t/' + enc(s.id) + '"' + (F.sub === s.id ? ' aria-current="true"' : '') + (s.questionIds.length ? '' : ' class="is-empty"') + '>' + esc(s.title) + '<span class="c">' + s.questionIds.length + '</span></a>';
        }).join('');
    }
    if (chips) h += '<nav class="subnav" aria-label="Topics">' + chips + '</nav>';
    h += '</div>';

    h += '<div class="filters" role="group" aria-label="Filters"><div class="f-row">' +
      '<label class="f-field grow"><span id="f-q-label">Search</span><input type="search" id="f-q" autocomplete="off" spellcheck="false" value="' + esc(F.q) + '"></label>' +
      '<div class="f-field"><span class="f-lab" id="f-topic-lab">Topic</span><select id="f-topic" aria-labelledby="f-topic-lab"><option value="">All topics</option>' +
      S.map(function (s) { return '<option value="' + esc(s.id) + '"' + (F.topic === s.id ? ' selected' : '') + '>' + esc(s.heading) + ' (' + s.allIds.length + ')</option>'; }).join('') + '</select></div>' +
      '<div class="f-field"><span class="f-lab" id="f-sub-lab">Subtopic</span><select id="f-sub" aria-labelledby="f-sub-lab"></select></div></div><div class="f-row">' +
      seg('f-status', 'Status', [['all', 'All'], ['unread', 'Unread'], ['read', 'Read']]) +
      seg('f-notes', 'Notes', [['all', 'All'], ['with', 'Has notes'], ['without', 'No notes']]) +
      (hasTags ? seg('f-type', 'Type', [['all', 'All'], ['case', 'Case'], ['other', 'Other']]) : '') +
      '</div></div>';
    h += '<div class="f-summary"><span class="count" id="f-count" role="status" aria-live="polite"></span><div class="chips" id="f-chips"></div></div>';
    h += '<ol class="results" id="results"></ol></section>';
    main.innerHTML = h;
    refreshList();
  }
  function seg(key, label, opts) {
    return '<fieldset class="seg"><legend>' + label + '</legend><div class="seg-btns">' +
      opts.map(function (o) { return '<button type="button" data-act="' + key + '" data-v="' + o[0] + '" aria-pressed="false">' + o[1] + '</button>'; }).join('') + '</div></fieldset>';
  }


  /* ------------------------------------------------ on-brand dropdowns
     The native <select> stays in the DOM (hidden) as the source of truth; this draws a
     page-styled button and list over it and fires a normal 'change' event on selection. */
  var ddOpen = null;
  function closeDd(refocus) {
    if (!ddOpen) return;
    ddOpen.list.hidden = true; ddOpen.btn.setAttribute('aria-expanded', 'false');
    var b = ddOpen.btn; ddOpen = null;
    if (refocus && document.body.contains(b)) b.focus();
  }
  function skinSelect(sel) {
    var box = sel.parentNode, dd = box.querySelector('.dd'), kids = [].slice.call(sel.children);
    if (!dd) {
      sel.hidden = true; sel.tabIndex = -1;
      dd = document.createElement('div'); dd.className = 'dd';
      dd.innerHTML = '<button type="button" class="dd-btn" aria-haspopup="listbox" aria-expanded="false" id="' + sel.id + '-btn"><span class="dd-val" id="' + sel.id + '-val"></span>' + ICON_CHEV + '</button>' +
        '<ul class="dd-list" role="listbox" tabindex="-1" hidden></ul>';
      box.appendChild(dd);
      var b = dd.querySelector('.dd-btn'), l = dd.querySelector('.dd-list'), active = -1;
      var opts = function () { return [].slice.call(l.querySelectorAll('[role="option"]')); };
      var mark = function (n) {
        var o = opts(); if (!o.length) return;
        active = Math.max(0, Math.min(o.length - 1, n));
        o.forEach(function (el, k) { el.classList.toggle('is-active', k === active); });
        l.setAttribute('aria-activedescendant', o[active].id);
        o[active].scrollIntoView({ block: 'nearest' });
      };
      var open = function () {
        if (b.disabled) return;
        if (ddOpen && ddOpen.btn !== b) closeDd();
        l.hidden = false; b.setAttribute('aria-expanded', 'true'); ddOpen = { btn: b, list: l };
        var o = opts(), sIdx = o.findIndex(function (el) { return el.getAttribute('aria-selected') === 'true'; });
        mark(sIdx < 0 ? 0 : sIdx); l.focus({ preventScroll: true });
      };
      var choose = function (n) {
        var o = opts(); if (!o[n]) return;
        var v = o[n].getAttribute('data-v'); closeDd(true);
        if (sel.value !== v) { sel.value = v; sel.dispatchEvent(new Event('change', { bubbles: true })); }
      };
      b.addEventListener('click', function () { if (l.hidden) open(); else closeDd(true); });
      b.addEventListener('keydown', function (e) { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); open(); } });
      l.addEventListener('click', function (e) { var li = e.target.closest('[role="option"]'); if (li) choose(opts().indexOf(li)); });
      l.addEventListener('mousemove', function (e) { var li = e.target.closest('[role="option"]'); if (li) { var n = opts().indexOf(li); if (n !== active) mark(n); } });
      l.addEventListener('keydown', function (e) {
        var k = e.key;
        if (k === 'ArrowDown') { e.preventDefault(); mark(active + 1); }
        else if (k === 'ArrowUp') { e.preventDefault(); mark(active - 1); }
        else if (k === 'Home') { e.preventDefault(); mark(0); }
        else if (k === 'End') { e.preventDefault(); mark(opts().length - 1); }
        else if (k === 'Enter' || k === ' ') { e.preventDefault(); choose(active); }
        else if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); closeDd(true); }
        else if (k === 'Tab') { closeDd(false); }
      });
    }
    var btn = dd.querySelector('.dd-btn'), list = dd.querySelector('.dd-list'), html = '', n = 0, shown = '';
    function opt(o) {
      var on = o.value === sel.value, id = sel.id + '-o' + (n++);
      if (on) shown = o.textContent;
      return '<li role="option" id="' + id + '" data-v="' + esc(o.value) + '" aria-selected="' + on + '">' + esc(o.textContent) + '</li>';
    }
    kids.forEach(function (k) {
      if (k.tagName === 'OPTGROUP') { html += '<li class="dd-group" role="presentation">' + esc(k.label) + '</li>'; [].forEach.call(k.children, function (o) { html += opt(o); }); }
      else html += opt(k);
    });
    list.innerHTML = html;
    if (!shown && sel.options.length) shown = sel.options[0].textContent;
    dd.querySelector('.dd-val').textContent = shown;
    btn.setAttribute('aria-labelledby', sel.id + '-lab ' + sel.id + '-val');
    btn.disabled = sel.disabled;
    if (ddOpen && ddOpen.btn === btn) { var s = list.querySelector('[aria-selected="true"]'); if (s) s.classList.add('is-active'); }
  }
  document.addEventListener('mousedown', function (e) { if (ddOpen && !e.target.closest('.dd')) closeDd(false); });

  function updateFilterControls() {
    var sel = $('f-sub'); if (!sel) return;
    $('f-topic').value = F.topic;
    var o = '';
    if (F.topic) {
      var sec = secById[F.topic];
      o = sec.subsections.length
        ? '<option value="">All subtopics</option>' + sec.subsections.map(function (s) { return '<option value="' + esc(s.id) + '"' + (F.sub === s.id ? ' selected' : '') + '>' + esc(s.title) + ' (' + s.questionIds.length + ')</option>'; }).join('')
        : '<option value="">No subtopics</option>';
      sel.disabled = !sec.subsections.length;
    } else {
      o = '<option value="">All subtopics</option>' + S.filter(function (s) { return s.subsections.length; }).map(function (s) {
        return '<optgroup label="' + esc(s.title) + '">' + s.subsections.map(function (x) { return '<option value="' + esc(x.id) + '">' + esc(x.title) + ' (' + x.questionIds.length + ')</option>'; }).join('') + '</optgroup>';
      }).join('');
      sel.disabled = false;
    }
    sel.innerHTML = o;
    if (F.sub) sel.value = F.sub;
    skinSelect($('f-topic')); skinSelect(sel);
    $('f-q-label').textContent = F.sub ? 'Search within this subtopic' : F.topic ? 'Search within this topic' : 'Search all questions';
    ['status', 'notes', 'type'].forEach(function (k) {
      [].forEach.call(main.querySelectorAll('[data-act="f-' + k + '"]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === F[k])); });
    });
  }

  function refreshList() {
    updateFilterControls();
    var ids = filtered(), tokens = tokensOf(F.q), total = order.length;
    P.setCtx({ ids: ids, label: F.q ? 'Search “' + F.q + '”' : listTitle() + (F.status !== 'all' || F.notes !== 'all' || F.type !== 'all' ? ' (filtered)' : ''), hash: hashFor(F) });
    $('f-count').innerHTML = anyFilter() ? '<strong>' + ids.length + '</strong> of ' + plural(total, 'question') : '<strong>' + ids.length + '</strong> ' + (ids.length === 1 ? 'question' : 'questions');
    var chips = [];
    if (F.topic) chips.push(['topic', 'Topic: ' + secById[F.topic].title]);
    if (F.sub) chips.push(['sub', 'Subtopic: ' + subById[F.sub].title]);
    if (F.status !== 'all') chips.push(['status', F.status === 'read' ? 'Read' : 'Unread']);
    if (F.notes !== 'all') chips.push(['notes', F.notes === 'with' ? 'Has notes' : 'No notes']);
    if (F.type !== 'all') chips.push(['type', F.type === 'case' ? 'Case questions' : 'Other questions']);
    if (F.q) chips.push(['q', 'Search: “' + F.q + '”']);
    $('f-chips').innerHTML = chips.map(function (c) {
      return '<span class="chip">' + esc(c[1]) + '<button type="button" data-act="f-remove" data-key="' + c[0] + '" aria-label="Remove filter: ' + esc(c[1]) + '">×</button></span>';
    }).join('') + (chips.length ? '<button type="button" class="linkbtn" data-act="f-clear">Clear all filters</button>' : '');

    var res = $('results');
    if (!ids.length) {
      var inherent = !scopeIds().length;
      res.outerHTML = '<div class="empty-state" id="results">' + (inherent ? '<p>There are no questions under this heading in the source file.</p>' : '<p>No questions match these filters. Remove a filter or change the search words.</p>' + (anyFilter() ? '<button type="button" class="btn" data-act="f-clear">Clear all filters</button>' : '')) + '</div>';
      return;
    }
    var html = ids.map(function (id) {
      var q = Q[id], r = P.isRead(id);
      return '<li class="res' + (r ? ' is-read' : '') + '" data-id="' + id + '">' +
        '<button type="button" class="rowcheck" role="checkbox" aria-checked="' + r + '" aria-label="' + esc(q.label) + ' read" data-act="toggle-read" data-id="' + id + '"><span class="rdot' + (r ? ' on' : '') + '">' + ICON_CHECK + '</span></button>' +
        '<a class="rowlink" href="#/q/' + enc(id) + '"><span class="row-head"><span class="qn">' + esc(q.label) + '</span>' + (q.tag ? '<span class="tag">' + esc(tagLabel(q.tag)) + '</span>' : '') +
        '<span>' + esc(F.sub ? '' : where(id)) + '</span></span><span class="row-q">' + hl(q.qText, tokens) + '</span>' +
        (tokens.length ? '<span class="row-snip">' + snippet(id, tokens) + '</span>' : '') + '</a><span class="marks">' + noteMark(id) + '</span></li>';
    }).join('');
    if (res.tagName !== 'OL') { res.outerHTML = '<ol class="results" id="results">' + html + '</ol>'; } else { res.innerHTML = html; }
  }

  function setF(patch) {
    var before = F.topic + '|' + F.sub;
    Object.keys(patch).forEach(function (k) { F[k] = patch[k]; });
    if (F.topic + '|' + F.sub !== before) { location.hash = hashFor(F); return; }
    history.replaceState(null, '', hashFor(F));
    refreshList();
  }

  /* --------------------------------------------------------- question page */
  function readBox(id, compact) {
    var r = P.isRead(id);
    return '<button type="button" class="readbox' + (compact ? ' compact' : '') + '" role="checkbox" aria-checked="' + r + '" data-act="toggle-read" data-id="' + id + '" data-readbox>' +
      '<span class="box">' + ICON_CHECK + '</span><span class="lbl">' + (r ? 'Read' : 'Mark as read') + '</span><span class="undo">Mark unread</span></button>';
  }

  function sequence(id) {
    var ctx = P.getCtx();
    if (ctx && ctx.ids.indexOf(id) >= 0) return { ids: ctx.ids, ctx: ctx };
    return { ids: order, ctx: null };
  }

  function renderQuestion(id) {
    var q = Q[id], l = loc[id], seq = sequence(id), ids = seq.ids, i = ids.indexOf(id), ov = P.overall();
    P.touch(id);
    revealInSidebar(id);
    var prev = ids[i - 1], next = ids[i + 1], r = P.isRead(id);

    function pg(target, dir) {
      var lab = dir === 'prev' ? '← Previous' : 'Next →';
      if (!target) return '<span class="pg pg-' + dir + ' is-off"><span class="pg-dir">' + lab + '</span><span class="pg-title">' + (dir === 'prev' ? 'This is the first question in the list' : 'This is the last question in the list') + '</span></span>';
      return '<a class="pg pg-' + dir + '" href="#/q/' + enc(target) + '" rel="' + dir + '"><span class="pg-dir">' + lab + '</span><span class="pg-label">' + esc(Q[target].label) + '</span><span class="pg-title">' + esc(Q[target].qText) + '</span></a>';
    }

    var h = '<article class="q-page' + (r ? ' is-read' : '') + '" id="q-page"><div class="q-grid"><div class="q-col reading">';
    h += '<header class="q-head"><div class="q-meta"><span class="q-num">' + esc(q.label) + '</span>' +
      (q.tag ? '<span class="tag">' + esc(tagLabel(q.tag)) + '</span>' : '') +
      '<span>' + esc(where(id)) + '</span><span id="q-notemark">' + noteMark(id) + '</span>' + readBox(id, false) + '</div></header>';
    h += '<div class="q-prog"><span class="bar" role="progressbar" aria-label="Position in list" aria-valuemin="1" aria-valuemax="' + ids.length + '" aria-valuenow="' + (i + 1) + '"><i style="width:' + pct(i + 1, ids.length) + '%"></i></span>' +
      '<div class="q-prog-note"><span class="q-pos">Question ' + (i + 1) + ' of ' + ids.length + '</span><span id="q-readcount">' + ov.done + ' of ' + ov.total + ' read</span></div></div>';
    h += '<div class="q-text prose" role="heading" aria-level="1">' + proseHtml(q.qHtml) + '</div>';
    h += '<section class="answer" aria-label="Answer"><div class="answer-label">Answer</div><div class="prose">' + proseHtml(q.aHtml) + '</div></section>';
    h += '<div class="q-actions">' + readBox(id, false) + '<span class="hint">Saved in this browser.</span></div>';
    h += '<nav class="pager" aria-label="Question navigation">' + pg(prev, 'prev') + pg(next, 'next') + '</nav>';
    if (seq.ctx) {
      h += '<p class="ctx-line"><span>Stepping through: ' + esc(seq.ctx.label) + '</span><a href="' + esc(seq.ctx.hash) + '">Back to list</a><button type="button" class="linkbtn" data-act="ctx-clear">Step through all questions</button></p>';
    }
    h += '</div><aside class="q-aside" aria-label="Notes"><section class="notes" id="notes"></section></aside></div></article>';
    main.innerHTML = h;
    renderNotes();
    renderFocusBar(id, prev, next);
  }

  function renderNotes() {
    var id = cur.id, el = $('notes'); if (!el || cur.type !== 'question') return;
    var text = P.getNote(id), has = P.hasNote(id), h;
    if (noteMode === 'edit') {
      h = '<h2>My notes</h2><textarea class="note-edit" id="note-input" aria-label="Note for ' + esc(Q[id].label) + '" placeholder="Write a note for this question">' + esc(text) + '</textarea>' +
        '<div class="note-actions"><button type="button" class="btn btn-primary" data-act="note-save">Save note</button>' +
        (has ? '<button type="button" class="btn" data-act="note-delete">Delete note</button>' : '') + '<span class="note-status" id="note-status">Saves as you type</span></div>';
    } else if (noteMode === 'confirm') {
      h = '<h2>My notes</h2><div class="note-text">' + esc(text) + '</div><div class="note-confirm" role="alertdialog" aria-label="Confirm delete">Delete this note? It cannot be restored.<br>' +
        '<button type="button" class="btn btn-primary" data-act="note-delete-yes">Delete note</button><button type="button" class="btn" data-act="note-delete-no">Keep note</button></div>';
    } else if (has) {
      h = '<h2><span class="nmark">' + ICON_NOTE + '</span>My notes</h2><div class="note-text">' + esc(text) + '</div>' +
        '<div class="note-actions"><button type="button" class="btn" data-act="note-edit">Edit note</button><button type="button" class="btn" data-act="note-delete">Delete note</button></div>';
    } else {
      h = '<h2>My notes</h2><p class="notes-help">Add a personal note to this question. It stays with ' + esc(Q[id].label) + ' in this browser.</p>' +
        '<div class="note-actions"><button type="button" class="btn" data-act="note-edit">Add note</button></div>';
    }
    el.innerHTML = h + (P.persistent() ? '' : storageWarn());
    if (noteMode === 'edit') { var ta = $('note-input'); ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
  }
  function saveNoteNow() {
    clearTimeout(noteTimer); noteTimer = null;
    var ta = $('note-input'); if (!ta || cur.type !== 'question') return;
    P.setNote(cur.id, ta.value);
    var s = $('note-status'); if (s) s.textContent = 'Saved';
  }
  function flushNote() { if (noteTimer && cur.type === 'question') saveNoteNow(); }

  function renderFocusBar(id, prev, next) {
    var fb = $('focus-bar');
    fb.innerHTML = '<a class="btn' + (prev ? '' : ' is-off') + '"' + (prev ? ' href="#/q/' + enc(prev) + '"' : ' aria-disabled="true"') + '>← Previous</a>' +
      readBox(id, true) +
      '<button type="button" class="btn' + (P.hasNote(id) ? ' has-note' : '') + '" data-act="toggle-notes" aria-expanded="false" id="fb-notes">Notes</button>' +
      '<a class="btn' + (next ? '' : ' is-off') + '"' + (next ? ' href="#/q/' + enc(next) + '"' : ' aria-disabled="true"') + '>Next →</a>';
    $('focus-info').textContent = Q[id].label + ' · ' + loc[id].sec.title;
  }

  function updateQuestionUI() {
    if (cur.type !== 'question') return;
    var id = cur.id, r = P.isRead(id), qp = $('q-page'), ov = P.overall();
    if (qp) qp.classList.toggle('is-read', r);
    [].forEach.call(document.querySelectorAll('[data-readbox][data-id="' + id + '"]'), function (b) {
      b.setAttribute('aria-checked', String(r));
      b.querySelector('.lbl').textContent = r ? 'Read' : 'Mark as read';
    });
    var rc = $('q-readcount'); if (rc) rc.textContent = ov.done + ' of ' + ov.total + ' read';
    var nm = $('q-notemark'); if (nm) nm.innerHTML = noteMark(id);
    var fbn = $('fb-notes'); if (fbn) fbn.classList.toggle('has-note', P.hasNote(id));
  }

  /* ---------------------------------------------------------------- sidebar */
  function revealInSidebar(id) {
    var l = loc[id]; P.setOpen(l.sec.id, true); if (l.sub) P.setOpen(l.sub.id, true);
  }
  function renderSidebar() {
    var keep = sidebar.querySelector('.sb-scroll'), top = keep ? keep.scrollTop : 0, ov = P.overall();
    function nav(href, label, on) { return '<a href="' + href + '"' + (on ? ' aria-current="page"' : '') + '>' + label + '</a>'; }
    var h = '<div class="sb-top"><div class="sb-head"><a class="sb-brand" href="#/"><span class="sb-eyebrow">Preventive &amp; Social Medicine</span><span class="sb-title">Viva Question Bank</span><span class="sb-sub">Second term, solved</span></a>' +
      '<button type="button" class="sb-hide" data-act="collapse-sb" aria-label="Hide contents" title="Hide contents"><svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true"><path d="M11.5 5L6.5 10l5 5M16 5l-5 5 5 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>' +
      '<div class="sb-overall"><div class="row"><span>Overall</span><span><b>' + ov.done + '</b> / ' + ov.total + ' &middot; ' + ov.pct + '%</span></div>' + bar(ov.done, ov.total, 'thin', 'Overall progress') + '</div></div>' +
      '<nav class="sb-nav" aria-label="Pages">' + nav('#/', 'Dashboard', cur.type === 'dash') + nav('#/all', 'All questions', cur.type === 'list' && !cur.secId) + nav('#/about', 'About', cur.type === 'about') + '</nav>' +
      '<div class="sb-scroll"><ul class="tree">';
    S.forEach(function (sec) {
      var st = P.stats(sec.allIds), open = P.isOpen(sec.id);
      var secActive = cur.type === 'list' && cur.secId === sec.id && !cur.subId;
      h += '<li class="sec"><div class="row-line"><button type="button" class="caret" data-toggle="' + esc(sec.id) + '" aria-expanded="' + open + '" aria-label="' + (open ? 'Collapse ' : 'Expand ') + esc(sec.title) + '">' + ICON_CARET + '</button>' +
        '<a class="node-link' + (secActive ? ' is-active' : '') + '" href="#/s/' + enc(sec.id) + '"><span class="t">' + esc(sec.heading) + '</span><span class="n">' + sec.allIds.length + '</span></a></div>' +
        '<div class="mini" aria-hidden="true"><i style="width:' + st.pct + '%"></i></div>';
      if (open) {
        if (sec.questionIds.length) h += qList(sec.questionIds);
        if (sec.subsections.length) {
          h += '<ul class="subs">';
          sec.subsections.forEach(function (sub) {
            var so = P.isOpen(sub.id), n = sub.questionIds.length, subActive = cur.type === 'list' && cur.subId === sub.id;
            h += '<li class="sub"><div class="row-line">' +
              (n ? '<button type="button" class="caret" data-toggle="' + esc(sub.id) + '" aria-expanded="' + so + '" aria-label="' + (so ? 'Collapse ' : 'Expand ') + esc(sub.title) + '">' + ICON_CARET + '</button>' : '<span class="caret" aria-hidden="true"></span>') +
              '<a class="node-link' + (subActive ? ' is-active' : '') + (n ? '' : ' is-empty') + '" href="#/t/' + enc(sub.id) + '"><span class="t">' + esc(sub.title) + '</span><span class="n">' + n + '</span></a></div>' +
              (n && so ? qList(sub.questionIds) : '') + '</li>';
          });
          h += '</ul>';
        }
      }
      h += '</li>';
    });
    h += '</ul></div>';
    sidebar.innerHTML = h;
    var sc = sidebar.querySelector('.sb-scroll'); sc.scrollTop = top;
    var act = sidebar.querySelector('.qrow.is-active');
    if (act && cur.type === 'question' && !renderSidebar.noScroll) {
      var ar = act.getBoundingClientRect(), sr = sc.getBoundingClientRect();
      if (ar.top < sr.top || ar.bottom > sr.bottom) sc.scrollTop += ar.top - sr.top - sr.height / 3;
    }
  }
  function qList(ids) {
    return '<ul class="qs">' + ids.map(function (id) {
      var q = Q[id], r = P.isRead(id), on = cur.type === 'question' && cur.id === id;
      return '<li><a class="qrow' + (on ? ' is-active' : '') + '" href="#/q/' + enc(id) + '"' + (on ? ' aria-current="page"' : '') + '><span class="qn">' + esc(q.label.replace('Q.', '')) + '</span><span class="qt">' + esc(q.qText) +
        '</span><span class="marks">' + noteMark(id) + '<span class="rdot' + (r ? ' on' : '') + '" role="img" aria-label="' + (r ? 'Read' : 'Unread') + '">' + ICON_CHECK + '</span></span></a></li>';
    }).join('') + '</ul>';
  }

  /* ------------------------------------------------- top bar, modes, fonts */
  function isMobile() { return window.matchMedia && window.matchMedia('(max-width: 62rem)').matches; }
  function closeDrawer() { app.classList.remove('drawer-open'); $('scrim').hidden = true; syncContentsBtn(); }
  function syncContentsBtn() {
    $('btn-contents').setAttribute('aria-expanded', String(isMobile() ? app.classList.contains('drawer-open') : !app.classList.contains('sb-collapsed')));
  }
  function applyMode() {
    var isQ = cur.type === 'question', on = P.getFocus() && isQ;
    document.body.classList.toggle('focus', on);
    document.body.classList.toggle('is-question', isQ);
    $('btn-focus').hidden = !isQ;
    $('btn-focus').setAttribute('aria-pressed', String(on));
    $('btn-exit-focus').hidden = !on;
    $('focus-info').hidden = !on;
    if (!isQ) $('focus-bar').innerHTML = '';
  }
  function setFocus(v) { P.setFocus(v); applyMode(); window.scrollTo(0, 0); if (v) announce('Focus mode on'); else announce('Focus mode off'); }
  function applyFont() {
    var v = P.getFont(), st = P.fontSteps;
    document.documentElement.style.setProperty('--scale', v);
    $('font-reset').textContent = Math.round(v * 100) + '%';
    $('font-dec').disabled = v <= st[0];
    $('font-inc').disabled = v >= st[st.length - 1];
  }

  /* ----------------------------------------------------------------- search */
  var pop = $('search-pop'), sInput = $('search'), popActive = -1, popLinks = [], searchScope = 'all', lastRes = [], lastSeeAll = '';
  function closePop() { pop.hidden = true; sInput.setAttribute('aria-expanded', 'false'); sInput.removeAttribute('aria-activedescendant'); popActive = -1; }
  function runSearch() {
    var text = sInput.value.trim();
    if (!text) { closePop(); return; }
    var tokens = tokensOf(text), useTopic = searchScope === 'topic' && cur.secId, pool = useTopic ? secById[cur.secId].allIds : order, res = [];
    pool.forEach(function (id) { var s = scoreOf(id, tokens); if (s) res.push({ id: id, s: s }); });
    res.sort(function (a, b) { return b.s - a.s || pos[a.id] - pos[b.id]; });
    lastRes = res.map(function (x) { return x.id; });
    lastSeeAll = hashFor({ topic: useTopic ? cur.secId : '', sub: '', q: text, status: 'all', notes: 'all', type: 'all' });
    var h = '<div class="sp-head"><span>' + plural(res.length, 'result') + (useTopic ? ' in this topic' : '') + '</span>';
    if (cur.secId) {
      h += '<span class="sp-scope" role="group" aria-label="Search scope"><button type="button" data-scope="all" aria-pressed="' + !useTopic + '">All questions</button><button type="button" data-scope="topic" aria-pressed="' + !!useTopic + '" title="' + esc(secById[cur.secId].title) + '">This topic</button></span>';
    }
    h += '</div>';
    if (!res.length) h += '<div class="sp-empty">No questions match “' + esc(text) + '”. Try fewer or different words.</div>';
    res.slice(0, 8).forEach(function (x, n) {
      var q = Q[x.id];
      h += '<a class="sp-item" role="option" id="sp-' + n + '" href="#/q/' + enc(x.id) + '" aria-selected="false"><span class="sp-line"><span class="qn">' + esc(q.label) + '</span><span>' + esc(where(x.id)) + '</span><span>' + (P.isRead(x.id) ? 'Read' : 'Unread') + '</span>' + noteMark(x.id) + '</span>' +
        '<span class="sp-title">' + hl(q.qText, tokens) + '</span><span class="sp-snip">' + snippet(x.id, tokens) + '</span></a>';
    });
    if (res.length > 8) h += '<a class="sp-foot" href="' + lastSeeAll + '">See all ' + res.length + ' results with filters</a>';
    pop.innerHTML = h; pop.hidden = false; sInput.setAttribute('aria-expanded', 'true');
    popLinks = [].slice.call(pop.querySelectorAll('.sp-item')); popActive = -1;
  }
  function movePop(d) {
    if (!popLinks.length) return;
    popActive = (popActive + d + popLinks.length) % popLinks.length;
    popLinks.forEach(function (a, n) { a.classList.toggle('is-active', n === popActive); a.setAttribute('aria-selected', String(n === popActive)); });
    sInput.setAttribute('aria-activedescendant', popLinks[popActive].id);
    popLinks[popActive].scrollIntoView && popLinks[popActive].scrollIntoView({ block: 'nearest' });
  }
  var sTimer;
  sInput.addEventListener('input', function () { clearTimeout(sTimer); sTimer = setTimeout(runSearch, 70); });
  sInput.addEventListener('focus', function () { if (sInput.value.trim()) runSearch(); });
  sInput.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (pop.hidden) runSearch(); else movePop(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); movePop(-1); }
    else if (e.key === 'Enter') {
      e.preventDefault(); clearTimeout(sTimer);
      if (!sInput.value.trim()) return;
      if (pop.hidden || popActive < 0) { runSearch(); P.setCtx({ ids: lastRes, label: 'Search “' + sInput.value.trim() + '”', hash: lastSeeAll }); location.hash = lastSeeAll; }
      else { P.setCtx({ ids: lastRes, label: 'Search “' + sInput.value.trim() + '”', hash: lastSeeAll }); location.hash = popLinks[popActive].getAttribute('href'); }
      closePop();
    } else if (e.key === 'Escape') { closePop(); }
  });
  pop.addEventListener('mousedown', function (e) { e.preventDefault(); });
  pop.addEventListener('click', function (e) {
    var sc = e.target.closest('[data-scope]');
    if (sc) { searchScope = sc.getAttribute('data-scope'); runSearch(); return; }
    if (e.target.closest('.sp-item')) P.setCtx({ ids: lastRes, label: 'Search “' + sInput.value.trim() + '”', hash: lastSeeAll });
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('#search-wrap')) closePop(); });
  $('btn-search-toggle').addEventListener('click', function () {
    var tb = $('topbar'), open = !tb.classList.contains('search-open');
    tb.classList.toggle('search-open', open); this.setAttribute('aria-expanded', String(open));
    if (open) sInput.focus(); else closePop();
  });

  /* ------------------------------------------------------------ global events */
  main.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]'); if (!el) return;
    var act = el.getAttribute('data-act'), id = el.getAttribute('data-id');
    if (act === 'toggle-read') { toggleRead(id); }
    else if (act === 'f-status') setF({ status: el.getAttribute('data-v') });
    else if (act === 'f-notes') setF({ notes: el.getAttribute('data-v') });
    else if (act === 'f-type') setF({ type: el.getAttribute('data-v') });
    else if (act === 'f-clear') { resetF(); history.replaceState(null, '', hashFor(F)); route(true); }
    else if (act === 'f-remove') {
      var k = el.getAttribute('data-key');
      if (k === 'topic') setF({ topic: '', sub: '' });
      else if (k === 'sub') setF({ sub: '' });
      else setF((function (o) { o[k] = k === 'q' ? '' : 'all'; return o; })({}));
    }
    else if (act === 'note-edit') { noteMode = 'edit'; renderNotes(); }
    else if (act === 'note-save') { saveNoteNow(); noteMode = 'view'; renderNotes(); announce('Note saved'); }
    else if (act === 'note-delete') { if (noteMode === 'edit' && !P.hasNote(cur.id)) { noteMode = 'view'; renderNotes(); } else { clearTimeout(noteTimer); noteTimer = null; noteMode = 'confirm'; renderNotes(); } }
    else if (act === 'note-delete-yes') { P.deleteNote(cur.id); noteMode = 'view'; renderNotes(); announce('Note deleted'); }
    else if (act === 'note-delete-no') { noteMode = 'view'; renderNotes(); }
    else if (act === 'ctx-clear') { P.setCtx(null); route(true); }
  });
  main.addEventListener('input', function (e) {
    if (e.target.id === 'f-q') { setFTyping(e.target.value); }
    else if (e.target.id === 'note-input') {
      var s = $('note-status'); if (s) s.textContent = 'Saving…';
      clearTimeout(noteTimer); noteTimer = setTimeout(saveNoteNow, 400);
    }
  });
  main.addEventListener('change', function (e) {
    if (e.target.id === 'f-topic') setF({ topic: e.target.value, sub: '' });
    else if (e.target.id === 'f-sub') { var v = e.target.value; setF(v ? { sub: v, topic: subById[v].sec.id } : { sub: '' }); }
  });
  function setFTyping(v) { F.q = v.trim(); history.replaceState(null, '', hashFor(F)); refreshListKeepInput(); }
  function refreshListKeepInput() { var a = document.activeElement; refreshList(); if (a && a.id === 'f-q') a.focus(); }

  $('focus-bar').addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]'); if (!el) return;
    var act = el.getAttribute('data-act');
    if (act === 'toggle-read') toggleRead(el.getAttribute('data-id'));
    else if (act === 'toggle-notes') {
      var on = !document.body.classList.contains('notes-open');
      document.body.classList.toggle('notes-open', on); el.setAttribute('aria-expanded', String(on));
      if (on) { var n = $('notes'); n && n.scrollIntoView({ block: 'center' }); }
    }
  });
  $('focus-bar').addEventListener('click', function (e) { var a = e.target.closest('a.is-off'); if (a) e.preventDefault(); });

  sidebar.addEventListener('click', function (e) {
    var c = e.target.closest('[data-toggle]');
    if (c) {
      var k = c.getAttribute('data-toggle'); P.setOpen(k, !P.isOpen(k)); renderSidebar.noScroll = true; renderSidebar(); renderSidebar.noScroll = false;
      var again = sidebar.querySelector('[data-toggle="' + k.replace(/"/g, '') + '"]'); if (again) again.focus();
      return;
    }
    if (e.target.closest('[data-act="collapse-sb"]')) { toggleSidebar(); return; }
    if (e.target.closest('a.qrow')) P.setCtx(null);
  });
  function toggleSidebar() {
    if (isMobile()) { var o = !app.classList.contains('drawer-open'); app.classList.toggle('drawer-open', o); $('scrim').hidden = !o; }
    else { var c = !app.classList.contains('sb-collapsed'); app.classList.toggle('sb-collapsed', c); P.setSidebarCollapsed(c); }
    syncContentsBtn();
  }
  $('btn-contents').addEventListener('click', toggleSidebar);
  $('scrim').addEventListener('click', closeDrawer);
  $('btn-focus').addEventListener('click', function () { setFocus(!P.getFocus()); });
  $('btn-exit-focus').addEventListener('click', function () { setFocus(false); });
  $('font-dec').addEventListener('click', function () { P.stepFont(-1); });
  $('font-inc').addEventListener('click', function () { P.stepFont(1); });
  $('font-reset').addEventListener('click', function () { P.setFont(1); });
  window.addEventListener('hashchange', function () { route(false); });
  window.addEventListener('resize', syncContentsBtn);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (ddOpen) { closeDd(true); return; }
      if (!pop.hidden) { closePop(); return; }
      if (app.classList.contains('drawer-open')) { closeDrawer(); return; }
      if (document.body.classList.contains('focus')) { setFocus(false); return; }
    }
    var t = e.target, tag = t && t.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
    if (cur.type !== 'question') return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      var a = main.querySelector('a.pg[rel="' + (e.key === 'ArrowLeft' ? 'prev' : 'next') + '"]');
      if (a) { e.preventDefault(); location.hash = a.getAttribute('href'); }
    }
  });

  function toggleRead(id) {
    var now = P.toggleRead(id), ov = P.overall();
    announce(Q[id].label + (now ? ' marked as read. ' : ' marked as unread. ') + ov.done + ' of ' + ov.total + ' read.');
  }

  /* ----------------------------------------------------------- state events */
  P.on(function (type) {
    if (type === 'font') { applyFont(); return; }
    if (type === 'external') { applyFont(); route(true); return; }
    renderSidebar();
    if (cur.type === 'question') updateQuestionUI();
    else if (cur.type === 'list') { var y = window.scrollY; refreshList(); window.scrollTo(0, y); }
    else if (cur.type === 'dash') { var y2 = window.scrollY; renderDashboard(); window.scrollTo(0, y2); }
  });

  /* ------------------------------------------------------------------ start */
  if (P.isSidebarCollapsed() && !isMobile()) app.classList.add('sb-collapsed');
  syncContentsBtn();
  applyFont();
  window.addEventListener('beforeunload', flushNote);
  route(false);
})();
