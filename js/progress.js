/* progress.js - persistence (localStorage) and progress maths.
 *
 * Everything the reader creates is keyed by the stable question ID produced by
 * tools/build.py (never by position), so reorganising the question bank does
 * not lose read marks or notes.
 *
 * localStorage keys (all prefixed "psmqb:v1:")
 *   read      { [questionId]: isoTimestamp }
 *   notes     { [questionId]: { text, t } }
 *   marks     { [questionId]: isoTimestamp }   flagged "revise later"
 *   recent    [ { id, t } ]            most recent first
 *   last      { id, t }                last question opened
 *   font      number                   reading-size multiplier
 *   theme     "light" | "dark"
 *   practice  bool                     hide answers until tapped
 *   ui        { open: {[id]: true}, collapsed: bool }   sidebar state
 * sessionStorage (this tab only)
 *   focus     "1" when Focus Mode is on
 *   ctx       { ids, label, hash }     list the reader is stepping through
 */
(function () {
  'use strict';

  var NS = 'psmqb:v1:';
  var FONT_STEPS = [0.8, 0.9, 1, 1.1, 1.2, 1.35, 1.5];
  var RECENT_MAX = 15;

  /* ---------- safe storage wrappers (fall back to memory if blocked) ---------- */
  function probe(store) {
    try {
      var k = NS + '__probe';
      store.setItem(k, '1');
      store.removeItem(k);
      return true;
    } catch (e) {
      return false;
    }
  }
  var okLocal = probe(window.localStorage || {});
  var okSession = probe(window.sessionStorage || {});
  var memLocal = {};
  var memSession = {};

  function readKey(store, mem, ok, key, def) {
    if (ok) {
      try {
        var raw = store.getItem(NS + key);
        if (raw === null) return def;
        return JSON.parse(raw);
      } catch (e) { /* fall through to memory */ }
    }
    return Object.prototype.hasOwnProperty.call(mem, key) ? mem[key] : def;
  }
  function writeKey(store, mem, okFlagName, key, value) {
    mem[key] = value;
    var ok = okFlagName === 'local' ? okLocal : okSession;
    if (!ok) return;
    try {
      store.setItem(NS + key, JSON.stringify(value));
    } catch (e) {
      if (okFlagName === 'local') okLocal = false; else okSession = false;
    }
  }
  function lget(key, def) { return readKey(window.localStorage, memLocal, okLocal, key, def); }
  function lset(key, val) { writeKey(window.localStorage, memLocal, 'local', key, val); }
  function sget(key, def) { return readKey(window.sessionStorage, memSession, okSession, key, def); }
  function sset(key, val) { writeKey(window.sessionStorage, memSession, 'session', key, val); }

  /* ---------- in-memory caches ---------- */
  var readMap = lget('read', {});
  var notes = lget('notes', {});
  var marks = lget('marks', {});
  var recent = lget('recent', []);
  var last = lget('last', null);
  var font = lget('font', 1);
  var theme = lget('theme', 'light') === 'dark' ? 'dark' : 'light';
  var practice = lget('practice', false) === true;
  var ui = lget('ui', { open: {}, collapsed: false });
  if (!ui || typeof ui !== 'object') ui = { open: {}, collapsed: false };
  if (!ui.open) ui.open = {};
  if (FONT_STEPS.indexOf(font) < 0) font = 1;

  var listeners = [];
  function emit(type, detail) {
    listeners.slice().forEach(function (fn) {
      try { fn(type, detail || {}); } catch (e) { if (window.console) console.error(e); }
    });
  }

  /* ---------- structure helpers ---------- */
  var order = [];
  function init() {
    order = [];
    QB.structure.forEach(function (sec) {
      sec.allIds = [];
      sec.questionIds.forEach(function (id) { order.push(id); sec.allIds.push(id); });
      sec.subsections.forEach(function (sub) {
        sub.questionIds.forEach(function (id) { order.push(id); sec.allIds.push(id); });
      });
    });
  }

  /* ---------- API ---------- */
  var API = {
    init: init,
    persistent: function () { return okLocal; },
    on: function (fn) { listeners.push(fn); },

    /* read / unread */
    isRead: function (id) { return !!readMap[id]; },
    setRead: function (id, value) {
      if (QB.questions[id] && QB.questions[id].missing) return;   // placeholders cannot be marked read
      if (value) readMap[id] = new Date().toISOString(); else delete readMap[id];
      lset('read', readMap);
      emit('read', { id: id, value: !!value });
    },
    toggleRead: function (id) {
      API.setRead(id, !API.isRead(id));
      return API.isRead(id);
    },

    /* "revise later" flags */
    isMarked: function (id) { return !!marks[id]; },
    toggleMark: function (id) {
      if (marks[id]) delete marks[id]; else marks[id] = new Date().toISOString();
      lset('marks', marks);
      emit('mark', { id: id, value: !!marks[id] });
      return !!marks[id];
    },
    markedIds: function () { return order.filter(function (id) { return !!marks[id]; }); },

    /* backup / restore: everything the reader has created, keyed by question ID */
    exportData: function () {
      return { app: 'psm-viva-question-bank', version: 1, exported: new Date().toISOString(), read: readMap, notes: notes, marks: marks };
    },
    importData: function (obj) {
      if (!obj || typeof obj !== 'object' || obj.app !== 'psm-viva-question-bank') throw new Error('This is not a backup file from this question bank.');
      var known = function (id) { return !!QB.questions[id]; }, added = { read: 0, notes: 0, marks: 0 }, id;
      var inRead = obj.read || {}, inNotes = obj.notes || {}, inMarks = obj.marks || {};
      for (id in inRead) if (known(id) && !QB.questions[id].missing && !readMap[id]) { readMap[id] = String(inRead[id]); added.read++; }
      for (id in inNotes) {
        var n = inNotes[id];
        if (known(id) && n && typeof n.text === 'string' && n.text.trim() && (!notes[id] || String(n.t) > String(notes[id].t))) {
          notes[id] = { text: n.text, t: String(n.t || new Date().toISOString()) }; added.notes++;
        }
      }
      for (id in inMarks) if (known(id) && !marks[id]) { marks[id] = String(inMarks[id]); added.marks++; }
      lset('read', readMap); lset('notes', notes); lset('marks', marks);
      emit('external', { key: 'import' });
      return added;
    },

    /* notes */
    getNote: function (id) { return notes[id] ? notes[id].text : ''; },
    hasNote: function (id) { return !!(notes[id] && notes[id].text && notes[id].text.trim()); },
    setNote: function (id, text) {
      if (!text || !text.trim()) delete notes[id];
      else notes[id] = { text: text, t: new Date().toISOString() };
      lset('notes', notes);
      emit('note', { id: id });
    },
    deleteNote: function (id) { API.setNote(id, ''); },
    noteIds: function () {
      return order.filter(function (id) { return API.hasNote(id); });
    },

    /* recently studied + position */
    touch: function (id) {
      var now = new Date().toISOString();
      recent = recent.filter(function (r) { return r.id !== id; });
      recent.unshift({ id: id, t: now });
      if (recent.length > RECENT_MAX) recent.length = RECENT_MAX;
      lset('recent', recent);
      last = { id: id, t: now };
      lset('last', last);
    },
    recent: function () {
      return recent.filter(function (r) { return QB.questions[r.id]; });
    },
    last: function () { return last && QB.questions[last.id] ? last : null; },

    /* reading size */
    fontSteps: FONT_STEPS,
    getFont: function () { return font; },
    setFont: function (v) {
      if (FONT_STEPS.indexOf(v) < 0) return;
      font = v;
      lset('font', font);
      emit('font', { value: font });
    },
    stepFont: function (dir) {
      var i = FONT_STEPS.indexOf(font) + dir;
      i = Math.max(0, Math.min(FONT_STEPS.length - 1, i));
      API.setFont(FONT_STEPS[i]);
    },

    /* night theme, practice mode */
    getTheme: function () { return theme; },
    setTheme: function (v) { theme = v === 'dark' ? 'dark' : 'light'; lset('theme', theme); emit('theme', { value: theme }); },
    getPractice: function () { return practice; },
    setPractice: function (v) { practice = !!v; lset('practice', practice); emit('practice', { value: practice }); },

    /* sidebar state */
    isOpen: function (id) { return !!ui.open[id]; },
    setOpen: function (id, v) {
      if (v) ui.open[id] = true; else delete ui.open[id];
      lset('ui', ui);
    },
    isSidebarCollapsed: function () { return !!ui.collapsed; },
    setSidebarCollapsed: function (v) { ui.collapsed = !!v; lset('ui', ui); },

    /* session-only */
    getFocus: function () { return sget('focus', '') === '1'; },
    setFocus: function (v) { sset('focus', v ? '1' : ''); },
    getCtx: function () { return sget('ctx', null); },
    setCtx: function (c) { sset('ctx', c); },

    /* progress maths */
    stats: function (ids) {
      var done = 0, total = 0;
      for (var i = 0; i < ids.length; i++) {
        var q = QB.questions[ids[i]];
        if (q && q.missing) continue;          // "Missing" placeholders are listed but not counted
        total++;
        if (readMap[ids[i]]) done++;
      }
      return { done: done, total: total, pct: total ? Math.round((done / total) * 100) : 0 };
    },
    overall: function () { return API.stats(order); },
    order: function () { return order; }
  };

  /* keep several open tabs in sync */
  window.addEventListener('storage', function (e) {
    if (!e.key || e.key.indexOf(NS) !== 0) return;
    readMap = lget('read', {});
    notes = lget('notes', {});
    marks = lget('marks', {});
    recent = lget('recent', []);
    last = lget('last', null);
    font = lget('font', 1);
    theme = lget('theme', 'light') === 'dark' ? 'dark' : 'light';
    practice = lget('practice', false) === true;
    emit('external', { key: e.key });
  });

  window.QBProgress = API;
})();
