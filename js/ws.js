/* Writing space: a blank / ruled / grid / dot area under a question's answer or an MCQ, for handwriting that does not fit between the lines.
   The area lives INSIDE the annotatable card, so ink.js draws on it like any other part of the card. Settings are stored per card id. */
(function () {
  'use strict';
  var KEY = 'cm-ws', TYPES = [['blank', 'Blank'], ['ruled', 'Ruled'], ['grid', 'Grid'], ['dot', 'Dots']], WS = {}, st = 0, root = document.documentElement;
  function load() { try { var o = JSON.parse(localStorage.getItem(KEY) || '{}'); Object.keys(o).forEach(function (k) { var w = clean(o[k]); if (w && k !== '__proto__') WS[k] = w; }); } catch (e) {} }
  function clean(w) { if (!w || typeof w !== 'object' || Array.isArray(w) || !TYPES.some(function (t) { return t[0] === w.t; }) || typeof w.h !== 'number' || !isFinite(w.h)) return null; return { t: w.t, h: Math.max(60, Math.min(1600, Math.round(w.h))) }; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(WS)); } catch (e) { if (!save.w) { save.w = 1; alert('Writing-space settings could not be saved in this browser (storage full or blocked).'); } } }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function btn(txt, label, fn, cls) { var b = el('button', cls, txt); b.type = 'button'; b.setAttribute('aria-label', label); b.addEventListener('click', function (e) { e.stopPropagation(); fn(); }); return b; }
  function hostOf(card) { return card.querySelector(':scope>.qexp') || card; }
  function set(id, patch) { var w = Object.assign({ t: 'ruled', h: 220 }, WS[id], patch); w = clean(w); if (!w) return; WS[id] = w; save(); ensureAll(); }
  function remove(id) { if (!confirm('Remove this writing space? Anything written in it stays saved and comes back if you add the space again.')) return; delete WS[id]; save(); ensureAll(); }
  function ensure(card) {
    var id = card.dataset.id; if (!id) return; var host = hostOf(card), w = WS[id], box = host.querySelector(':scope>.cmws'), add = host.querySelector(':scope>.cmws-add');
    if (!w) {
      if (box) box.remove();
      if (!add) { add = btn('+ Add writing space', 'Add writing space under this ' + (card.classList.contains('rdq') ? 'MCQ' : 'answer'), function () { set(id, {}); }, 'cmws-add'); host.appendChild(add); }
      return;
    }
    if (add) add.remove();
    if (!box) {
      box = el('div', 'cmws'); var bar = el('div', 'cmws-bar'); bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'Writing space');
      var seg = el('span', 'cmws-seg'); TYPES.forEach(function (t) { var b = btn(t[1], t[1] + ' paper', function () { set(id, { t: t[0] }); }); b.dataset.t = t[0]; seg.appendChild(b); });
      bar.append(seg, btn('−', 'Make shorter', function () { set(id, { h: WS[id].h - 60 }); }), btn('+', 'Make taller', function () { set(id, { h: WS[id].h + 60 }); }), btn('Remove', 'Remove writing space (your writing stays saved)', function () { remove(id); }, 'cmws-x'));
      box.append(bar, el('div', 'cmws-a')); host.appendChild(box);
    }
    box.dataset.t = w.t; box.style.setProperty('--wsh', w.h + 'px');
    box.querySelectorAll('.cmws-seg button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.t === w.t); });
  }
  function ensureAll() { document.querySelectorAll('#main .inkc').forEach(ensure); }
  function soon() { clearTimeout(st); st = setTimeout(ensureAll, 60); }
  load();
  new MutationObserver(function (ms) { for (var i = 0; i < ms.length; i++) { var m = ms[i]; if (m.type === 'childList' && [].concat([].slice.call(m.addedNodes)).some(function (n) { return n.nodeType === 1 && !(n.classList && (n.classList.contains('cmws') || n.classList.contains('cmws-add') || n.nodeName === 'CANVAS')); })) { soon(); return; } } }).observe(document.getElementById('main') || document.body, { childList: true, subtree: true });
  ensureAll();
  /* hooks for the app-wide backup in Menu */
  window.CMWS = {
    read: function () { return JSON.parse(JSON.stringify(WS)); },
    merge: function (d) { var n = 0; if (d && typeof d === 'object') Object.keys(d).forEach(function (k) { var w = clean(d[k]); if (w && k !== '__proto__' && !WS[k]) { WS[k] = w; n++; } }); if (n) { save(); ensureAll(); } return n; },
    count: function () { return Object.keys(WS).length; }
  };
})();
