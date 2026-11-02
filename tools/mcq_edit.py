#!/usr/bin/env python3
"""Safe editor for data/mcq.js (the MCQ bank).

All edits to data/mcq.js go through this module.  It
  * loads the bank (window.CM=window.CM||{};CM.mcq=[...];),
  * offers small edit helpers (get / fix fields / fix TF keys / add / merge / retire),
  * validates the bank and checks that the JSON round-trips,
  * writes it back in exactly the same compact format
    (separators (",", ":"), ensure_ascii=False, trailing ";\n").

IDs are tied to students' saved progress, so:
  * an existing item keeps its id when it is fixed;
  * new items get the next free number above every id ever used
    (live ids + ids retired in source/mcq_audit_progress.md);
  * deleted / merged-away ids are retired for good and never reused.

Usage inside a batch script:
    import sys; sys.path.insert(0, 'tools'); from mcq_edit import *
    db = Bank()
    db.set('M.12', stem='...', years=['22M', '25Nov'])
    db.tf('M.12', 'c', k='F', conflict=True)
    db.add(part=9, topic='Food & Nutrition', kind='SBA', ...)
    db.save()

Run directly to validate:  python3 tools/mcq_edit.py
NEVER run tools/build_banks.py: it overwrites manual fixes.
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MCQ = os.path.join(ROOT, 'data', 'mcq.js')
LOG = os.path.join(ROOT, 'source', 'mcq_audit_progress.md')
PRE = 'window.CM=window.CM||{};CM.mcq='
SUF = ';\n'
FIELD_ORDER = ['id', 'n', 'part', 'topic', 'kind', 'stem', 'src', 'grp', 'years', 'ref', 'opts', 'ans', 'sub']
YEAR_RE = re.compile(r'^\d{2}(Ja|M|Ju|S|Nov)(-[AB])?\u2020?$|^\d{2}M&Nov\u2020?$')
SESS = {'Ja': 1, 'M': 2, 'Ju': 3, 'S': 4, 'Nov': 5}


def year_key(y):
    """Sort key for exam-year codes: newest first when used with reverse=True."""
    c = y.replace('\u2020', '')
    m = re.match(r'^(\d{2})(M&Nov|Ja|M|Ju|S|Nov)(?:-([AB]))?', c)
    if not m:
        return (0, 0, '')
    s = 2 if m.group(2) == 'M&Nov' else SESS[m.group(2)]
    return (int(m.group(1)), s, m.group(3) or '')


def sort_years(ys):
    out = []
    for y in ys:
        if y not in out:
            out.append(y)
    # drop a daggered copy when the clean code is present
    out = [y for y in out if not (y.endswith('\u2020') and y[:-1] in out)]
    return sorted(out, key=year_key, reverse=True)


STAR = '\u2605'


def stars(n):
    """Repeat marker used on the site: 2 papers = 1 star, 3-4 = 2, 5+ = 3."""
    return '' if n <= 1 else STAR if n == 2 else STAR * 2 if n <= 4 else STAR * 3


def unstar(t):
    return re.sub('^[' + STAR + '\u2606]+\\s*', '', t).strip()


def starred(t, n):
    s = stars(n)
    return (s + ' ' + unstar(t)) if s else unstar(t)


def retired_ids():
    if not os.path.exists(LOG):
        return set()
    txt = open(LOG, encoding='utf-8').read()
    m = re.search(r'^RETIRED:(.*)$', txt, re.M)
    if not m:
        return set()
    return set(re.findall(r'M\.\d+', m.group(1)))


def load():
    s = open(MCQ, encoding='utf-8').read()
    assert s.startswith(PRE) and s.endswith(SUF), 'unexpected mcq.js wrapper'
    return json.loads(s[len(PRE):-len(SUF)])


def dump(items):
    body = json.dumps(items, separators=(',', ':'), ensure_ascii=False)
    assert json.loads(body) == items, 'JSON does not round-trip'
    return PRE + body + SUF


def validate(items, retired=()):
    errs = []
    seen = set()
    for q in items:
        i = q.get('id', '?')
        if i in seen:
            errs.append(i + ': duplicate id')
        seen.add(i)
        if i in retired:
            errs.append(i + ': id is retired')
        if q.get('n') != int(i[2:]):
            errs.append(i + ': n does not match id')
        if not (isinstance(q.get('part'), int) and 1 <= q['part'] <= 11):
            errs.append(i + ': bad part')
        if q.get('src') not in ('DU', 'BCS', 'New'):
            errs.append(i + ': bad src')
        if q['src'] == 'New' and q.get('grp') not in ('A', 'B'):
            errs.append(i + ': New item without grp A/B')
        for y in q.get('years', []):
            if not YEAR_RE.match(y):
                errs.append(i + ': odd year code ' + y)
        letters = [o['l'] for o in q['opts']]
        if q['kind'] == 'SBA':
            if len(q['opts']) != 4 or letters != list('abcd'):
                errs.append(i + ': SBA needs options a-d')
            if q.get('ans') not in letters:
                errs.append(i + ': SBA ans invalid')
        elif q['kind'] == 'TF':
            if 'ans' in q:
                errs.append(i + ': TF has ans')
            if len(q['opts']) != 5 or letters != list('abcde'):
                errs.append(i + ': TF needs options a-e')
            for o in q['opts']:
                if o.get('k') not in ('T', 'F'):
                    errs.append(i + ' ' + o['l'] + ': TF key not T/F')
                if not isinstance(o.get('conflict'), bool):
                    errs.append(i + ' ' + o['l'] + ': conflict not bool')
        else:
            errs.append(i + ': bad kind')
        for o in q['opts']:
            if not o.get('t', '').strip():
                errs.append(i + ' ' + o['l'] + ': empty option')
    return errs


class Bank:
    def __init__(self):
        self.items = load()
        self.by = {q['id']: q for q in self.items}
        self.retired = retired_ids()
        self.newly_retired = []
        self.changes = []          # (id, note) lines for the progress log

    # ---------------------------------------------------------- lookup
    def get(self, i):
        return self.by[i]

    def note(self, i, msg):
        self.changes.append((i, msg))

    # ---------------------------------------------------------- edits
    def set(self, i, note=None, **kw):
        q = self.by[i]
        for k, v in kw.items():
            if k == 'years':
                v = sort_years(v)
            q[k] = v
        self._order(q)
        if note:
            self.note(i, note)
        return q

    def add_years(self, i, *ys, note=None):
        q = self.by[i]
        q['years'] = sort_years(q['years'] + list(ys))
        if note:
            self.note(i, note)

    def opt(self, i, l, note=None, **kw):
        q = self.by[i]
        o = next(o for o in q['opts'] if o['l'] == l)
        o.update(kw)
        if note:
            self.note(i, note)
        return o

    def tf(self, i, l, k=None, t=None, conflict=None, y=None, note=None):
        q = self.by[i]
        assert q['kind'] == 'TF', i + ' is not TF'
        o = next(o for o in q['opts'] if o['l'] == l)
        if k is not None:
            assert k in ('T', 'F')
            o['k'] = k
        if t is not None:
            o['t'] = t
        if conflict is not None:
            o['conflict'] = conflict
        if y is not None:
            o['y'] = y
        if note:
            self.note(i, note)

    def tf_opts(self, i, rows, y='', note=None):
        """Replace all five TF options. rows = [(text, 'T'|'F'[, conflict]), ...]"""
        q = self.by[i]
        assert len(rows) == 5
        q['opts'] = [{'l': l, 't': r[0], 'k': r[1], 'y': y,
                      'conflict': bool(r[2]) if len(r) > 2 else False}
                     for l, r in zip('abcde', rows)]
        q.pop('ans', None)
        q['kind'] = 'TF'
        if note:
            self.note(i, note)

    def sba_opts(self, i, texts, ans, note=None):
        q = self.by[i]
        assert len(texts) == 4 and ans in 'abcd'
        q['opts'] = [{'l': l, 't': t} for l, t in zip('abcd', texts)]
        q['ans'] = ans
        q['kind'] = 'SBA'
        self._order(q)
        if note:
            self.note(i, note)

    def tf_full(self, i, stem, rows, years=None, ref=None, note=None):
        """Rebuild a TF item completely.
        rows: 5 tuples (text, 'T'|'F', [years the statement was asked], conflict=False[, extra_y]).
        extra_y is appended to the option's y (e.g. '20Ju: key not given').
        Item years = union of row years (plus `years`). Stars are recomputed."""
        q = self.by[i]
        assert len(rows) == 5, i
        ys = set(years or [])
        opts = []
        for l, r in zip('abcde', rows):
            t, k, oy = r[0], r[1], list(r[2])
            c = bool(r[3]) if len(r) > 3 else False
            extra = r[4] if len(r) > 4 else ''
            assert k in ('T', 'F'), (i, l)
            oy = sort_years(oy)
            ys.update(oy)
            y = ', '.join(oy)
            if extra:
                y = (y + ' (' + extra + ')') if y else extra
            opts.append({'l': l, 't': starred(t, len(oy)), 'k': k, 'y': y, 'conflict': c})
        q['kind'] = 'TF'
        q.pop('ans', None)
        q['years'] = sort_years(list(ys))
        q['stem'] = starred(stem, len(q['years']))
        q['opts'] = opts
        if ref is not None:
            q['ref'] = ref
        self._order(q)
        self.note(i, note or 'rebuilt from PDF')
        return q

    def sba_full(self, i, stem, texts, ans, years=None, ref=None, note=None):
        q = self.by[i]
        assert len(texts) == 4 and ans in 'abcd'
        if years is not None:
            q['years'] = sort_years(list(years))
        q['stem'] = starred(stem, len(q['years']))
        q['opts'] = [{'l': l, 't': t} for l, t in zip('abcd', texts)]
        q['ans'] = ans
        q['kind'] = 'SBA'
        if ref is not None:
            q['ref'] = ref
        self._order(q)
        self.note(i, note or 'checked vs PDF')
        return q

    def stamp_y(self, i):
        """Set every TF option's y to the item's year list."""
        q = self.by[i]
        if q['kind'] == 'TF':
            ys = ', '.join(q['years'])
            for o in q['opts']:
                o['y'] = ys

    def next_id(self):
        used = [int(x[2:]) for x in list(self.by) + list(self.retired) + self.newly_retired]
        return max(used) + 1

    def add(self, part, topic, kind, stem, src, opts, ans=None, years=(), ref='', grp='', sub='',
            note='added'):
        """opts: SBA -> 4 strings; TF -> 5 (text, 'T'|'F'[, conflict]) tuples."""
        n = self.next_id()
        i = 'M.%d' % n
        topics = {(q['part'], q['topic']) for q in self.items}
        assert (part, topic) in topics, 'unknown part/topic: %r' % ((part, topic),)
        q = {'id': i, 'n': n, 'part': part, 'topic': topic, 'kind': kind, 'stem': stem, 'src': src,
             'grp': grp, 'years': sort_years(list(years)), 'ref': ref, 'opts': [], 'sub': sub}
        if kind == 'SBA':
            assert len(opts) == 4 and ans in 'abcd'
            q['opts'] = [{'l': l, 't': t} for l, t in zip('abcd', opts)]
            q['ans'] = ans
        else:
            assert len(opts) == 5
            ys = ', '.join(q['years'])
            q['opts'] = [{'l': l, 't': r[0], 'k': r[1], 'y': ys,
                          'conflict': bool(r[2]) if len(r) > 2 else False}
                         for l, r in zip('abcde', opts)]
        self._order(q)
        self.items.append(q)
        self.by[i] = q
        self.note(i, note)
        return i

    def retire(self, i, why):
        q = self.by.pop(i)
        self.items.remove(q)
        self.newly_retired.append(i)
        self.note(i, 'deleted (' + why + ')')

    def merge(self, keep, drop, note=None):
        """Merge drop into keep: union years, retire drop. Fix the text of keep separately."""
        a, b = self.by[keep], self.by[drop]
        a['years'] = sort_years(a['years'] + b['years'])
        self.retire(drop, 'merged into ' + keep)
        self.note(keep, note or ('merged ' + drop + ' (years united)'))

    # ---------------------------------------------------------- output
    @staticmethod
    def _order(q):
        keys = [k for k in FIELD_ORDER if k in q] + [k for k in q if k not in FIELD_ORDER]
        items = [(k, q[k]) for k in keys]
        q.clear()
        q.update(items)

    def save(self):
        retired = self.retired | set(self.newly_retired)
        errs = validate(self.items, retired)
        touched = {c[0] for c in self.changes}
        hard = [e for e in errs if e.split(' ')[0].rstrip(':') in touched]
        if hard:
            raise SystemExit('VALIDATION FAILED (edited items):\n' + '\n'.join(hard[:50]))
        if errs:
            bad = sorted({e.split(' ')[0].rstrip(':') for e in errs}, key=lambda x: int(x[2:]))
            print('warning: %d untouched items still fail validation: %s' % (len(bad), ', '.join(bad)))
        txt = dump(self.items)
        open(MCQ, 'w', encoding='utf-8').write(txt)
        assert load() == self.items
        if self.newly_retired:
            self._log_retired(retired)
        print('saved %d MCQs (%d changes, %d retired this run)'
              % (len(self.items), len(self.changes), len(self.newly_retired)))
        return self.changes

    def _log_retired(self, retired):
        txt = open(LOG, encoding='utf-8').read() if os.path.exists(LOG) else ''
        line = 'RETIRED: ' + ', '.join(sorted(retired, key=lambda x: int(x[2:])))
        if re.search(r'^RETIRED:.*$', txt, re.M):
            txt = re.sub(r'^RETIRED:.*$', line, txt, count=1, flags=re.M)
        else:
            txt = txt.rstrip('\n') + '\n\n' + line + '\n'
        open(LOG, 'w', encoding='utf-8').write(txt)


if __name__ == '__main__':
    items = load()
    errs = validate(items, retired_ids())
    print('%d MCQs; %d validation problems' % (len(items), len(errs)))
    for e in errs[:80]:
        print('  ' + e)
    dump(items)
    sys.exit(1 if errs else 0)
