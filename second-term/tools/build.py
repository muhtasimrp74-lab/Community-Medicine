#!/usr/bin/env python3
"""
Build the question-bank data files from the Markdown source.

    python3 tools/build.py            # regenerate js/data.js and topics/*.js, then verify
    python3 tools/build.py --verify   # verify only (no files written)

The Markdown file is the single source of truth. This script:
  * parses  ## section / ### subsection / #### Q.n question headings,
  * converts each question and answer to HTML (bold, italic, lists, tables kept),
  * gives every question a stable ID derived from its question text,
  * writes js/data.js (hierarchy) and one topics/NN-<slug>.js file per section,
  * checks that nothing was lost in conversion.

Requires:  pip install markdown-it-py
"""
import hashlib
import html
import json
import pathlib
import re
import sys
import unicodedata

from markdown_it import MarkdownIt

ROOT = pathlib.Path(__file__).resolve().parent.parent
SOURCE = ROOT / "source" / "second_term_viva_question_bank_solved.md"
OVERRIDES = ROOT / "tools" / "id-overrides.json"   # optional: {"Q.12": "q-0123abcd"}
INDEX_HTML = ROOT / "index.html"

# Soft line breaks in the source are meaningful line breaks (the author puts one
# "**Label:** text" per line), so render them as <br>. Raw HTML is never allowed.
MD = MarkdownIt("commonmark", {"html": False, "breaks": True, "typographer": False}).enable("table")


# ----------------------------------------------------------------------------
# helpers
# ----------------------------------------------------------------------------
def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text or "section"


def norm_for_id(text: str) -> str:
    text = re.sub(r"[*_`]", "", text)
    return re.sub(r"\s+", " ", text).strip().lower()


def html_to_text(fragment: str) -> str:
    fragment = re.sub(r"</(p|li|tr|h\d|div)>", " ", fragment)
    fragment = re.sub(r"<br\s*/?>", " ", fragment)
    fragment = re.sub(r"</t[dh]>", " ", fragment)
    fragment = re.sub(r"<[^>]+>", "", fragment)
    return re.sub(r"\s+", " ", html.unescape(fragment)).strip()


def render(md_text: str) -> str:
    return MD.render(md_text).strip()


# ----------------------------------------------------------------------------
# parse
# ----------------------------------------------------------------------------
def parse(source_text: str):
    lines = source_text.split("\n")
    doc_title = ""
    sections = []
    cur_sec = cur_sub = cur_q = None
    buf = []

    def flush():
        """Attach buffered lines to whatever is open."""
        nonlocal buf
        if cur_q is not None:
            cur_q["raw"].extend(buf)
        elif cur_sub is not None:
            cur_sub["rawNote"].extend(buf)
        elif cur_sec is not None:
            cur_sec["rawNote"].extend(buf)
        buf = []

    for line in lines:
        if re.match(r"^# (?!#)", line):
            flush()
            doc_title = line[2:].strip()
            continue
        m = re.match(r"^## (?!#)(.+)$", line)
        if m:
            flush()
            heading = m.group(1).strip()
            mm = re.match(r"^(\d+)\.\s+(.*)$", heading)
            cur_sec = {
                "heading": heading,
                "num": mm.group(1) if mm else "",
                "title": mm.group(2) if mm else heading,
                "rawNote": [],
                "questions": [],
                "subsections": [],
            }
            sections.append(cur_sec)
            cur_sub = cur_q = None
            continue
        m = re.match(r"^### (?!#)(.+)$", line)
        if m:
            flush()
            cur_sub = {"title": m.group(1).strip(), "rawNote": [], "questions": []}
            cur_sec["subsections"].append(cur_sub)
            cur_q = None
            continue
        m = re.match(r"^#### ((?:Q|M)\.(\d+)(?:\s*&\s*(?:Q|M)\.\d+)?)(?:\s+\(([^)]+)\))?\s*$", line)
        if m:
            flush()
            cur_q = {"label": m.group(1), "num": int(m.group(2)), "tag": m.group(3), "raw": []}
            (cur_sub["questions"] if cur_sub is not None else cur_sec["questions"]).append(cur_q)
            continue
        buf.append(line)
    flush()
    return doc_title, sections


def split_question(raw_lines):
    """Return (question_md, answer_md) from the lines under a #### heading."""
    lines = list(raw_lines)
    # drop trailing blank lines and the '---' separator that ends each question block
    while lines and lines[-1].strip() == "":
        lines.pop()
    if lines and lines[-1].strip() == "---":
        lines.pop()
    while lines and lines[-1].strip() == "":
        lines.pop()
    while lines and lines[0].strip() == "":
        lines.pop(0)

    q_idx = next(i for i, l in enumerate(lines) if l.strip().startswith("**Question:**"))
    a_idx = next(i for i, l in enumerate(lines) if l.strip().startswith("**Answer:**"))
    q_first = lines[q_idx].strip()[len("**Question:**"):].strip()
    a_first = lines[a_idx].strip()[len("**Answer:**"):].strip()
    q_lines = ([q_first] if q_first else []) + lines[q_idx + 1:a_idx]
    a_lines = ([a_first] if a_first else []) + lines[a_idx + 1:]
    strip = lambda ls: "\n".join(ls).strip("\n")
    return strip(q_lines), strip(a_lines)


# ----------------------------------------------------------------------------
# build
# ----------------------------------------------------------------------------
def build():
    text = SOURCE.read_text(encoding="utf-8")
    doc_title, sections = parse(text)
    overrides = json.loads(OVERRIDES.read_text()) if OVERRIDES.exists() else {}

    used_ids = {}
    structure, topic_files, flat = [], [], []

    for si, sec in enumerate(sections, start=1):
        sec_slug = slugify(sec["title"])
        sec_out = {
            "id": sec_slug,
            "num": sec["num"],
            "title": sec["title"],
            "heading": sec["heading"],
            "questionIds": [],
            "subsections": [],
        }
        if "".join(sec["rawNote"]).strip():
            sec_out["noteHtml"] = render("\n".join(sec["rawNote"]).strip())
        qrecords = []

        def add_questions(qs, sub_id):
            for q in qs:
                q_md, a_md = split_question(q["raw"])
                base = norm_for_id(q_md)
                qid = overrides.get(q["label"]) or "q-" + hashlib.sha1(base.encode("utf-8")).hexdigest()[:8]
                if qid in used_ids:
                    raise SystemExit(f"ID collision: {q['label']} and {used_ids[qid]} -> {qid}")
                used_ids[qid] = q["label"]
                q_html, a_html = render(q_md), render(a_md)
                tags = [t.strip().upper() for t in (q["tag"] or "").split(",") if t.strip()]
                rec = {
                    "id": qid,
                    "num": q["num"],
                    "label": q["label"],
                    "tag": q["tag"],
                    "missing": "MISSING" in tags,
                    "section": sec_slug,
                    "sub": sub_id,
                    "qHtml": q_html,
                    "aHtml": a_html,
                    "qText": html_to_text(q_html),
                    "aText": html_to_text(a_html),
                }
                qrecords.append(rec)
                flat.append((q, q_md, a_md, rec))
                yield qid

        sec_out["questionIds"] = list(add_questions(sec["questions"], None))
        for sub in sec["subsections"]:
            sub_slug = sec_slug + "--" + slugify(sub["title"])
            sub_out = {"id": sub_slug, "title": sub["title"], "questionIds": []}
            if "".join(sub["rawNote"]).strip():
                sub_out["noteHtml"] = render("\n".join(sub["rawNote"]).strip())
            sub_out["questionIds"] = list(add_questions(sub["questions"], sub_slug))
            sec_out["subsections"].append(sub_out)
        structure.append(sec_out)
        topic_files.append((f"{si:02d}-{sec_slug}.js", sec, qrecords))

    meta = {
        "title": doc_title,
        "site": "Preventive & Social Medicine",
        "source": SOURCE.name,
        "totalQuestions": sum(1 for *_, rec in flat if not rec["missing"]),
        "missingQuestions": sum(1 for *_, rec in flat if rec["missing"]),
    }
    return doc_title, sections, structure, topic_files, flat, meta


def dump(obj):
    return json.dumps(obj, ensure_ascii=False, indent=1)


def write_outputs(structure, topic_files, meta):
    data_js = (
        "/* GENERATED by tools/build.py from source/{src} - do not edit by hand.\n"
        "   This file holds the topic hierarchy only; question bodies live in topics/*.js. */\n"
        "window.QB = window.QB || {{}};\n"
        "QB.meta = {meta};\n"
        "QB.structure = {structure};\n"
        "QB.questions = {{}};\n"
        "QB.defineQuestions = function (list) {{\n"
        "  list.forEach(function (q) {{ QB.questions[q.id] = q; }});\n"
        "}};\n"
    ).format(src=meta["source"], meta=dump(meta), structure=dump(structure))
    (ROOT / "js" / "data.js").write_text(data_js, encoding="utf-8")

    for old in (ROOT / "topics").glob("*.js"):
        old.unlink()
    for fname, sec, recs in topic_files:
        body = (
            f"/* GENERATED by tools/build.py - section: {sec['heading']} */\n"
            f"QB.defineQuestions({dump(recs)});\n"
        )
        (ROOT / "topics" / fname).write_text(body, encoding="utf-8")

    # keep <script> tags in index.html in sync with the generated topic files
    if INDEX_HTML.exists():
        h = INDEX_HTML.read_text(encoding="utf-8")
        tags = "\n".join(f'  <script src="topics/{f}"></script>' for f, _, _ in topic_files)
        h2 = re.sub(
            r"(<!-- topics:start -->).*?(<!-- topics:end -->)",
            lambda m: f"{m.group(1)}\n{tags}\n  {m.group(2)}",
            h,
            flags=re.S,
        )
        if h2 != h:
            INDEX_HTML.write_text(h2, encoding="utf-8")


# ----------------------------------------------------------------------------
# verification: compare the generated HTML against the Markdown source
# ----------------------------------------------------------------------------
def visible_fragments(md_text: str):
    """Yield the plain-text fragments a reader should see for each source line."""
    for line in md_text.split("\n"):
        s = line.strip()
        if not s or re.fullmatch(r"\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?", s):
            continue
        s = re.sub(r"^(\d+\.|[-*+])\s+", "", s)           # list markers
        cells = [c for c in s.split("|")] if s.startswith("|") else [s]
        for c in cells:
            c = re.sub(r"[*_]", "", c)
            c = re.sub(r"\s+", " ", c).strip()
            if c:
                yield c


def verify(doc_title, sections, structure, flat, meta):
    problems, notes = [], []

    # 1) every heading in the source is in the structure, in the same order
    src_secs = [s["heading"] for s in sections]
    out_secs = [s["heading"] for s in structure]
    if src_secs != out_secs:
        problems.append("Section headings differ from source")
    for s_src, s_out in zip(sections, structure):
        if [x["title"] for x in s_src["subsections"]] != [x["title"] for x in s_out["subsections"]]:
            problems.append(f"Subsection titles differ in {s_src['heading']}")

    # 2) question count / numbering / uniqueness
    labels = [q["label"] for q, *_ in flat]
    ids = [rec["id"] for *_, rec in flat]
    src_count = len(re.findall(r"^#### [QM]\.\d+", SOURCE.read_text(encoding="utf-8"), flags=re.M))
    if len(flat) != src_count:
        problems.append(f"Question count {len(flat)} != source headings {src_count}")
    if len(set(ids)) != len(ids):
        problems.append("Duplicate question IDs")
    if len(set(labels)) != len(labels):
        problems.append("Duplicate question labels")
    nums = [q["num"] for q, _, _, rec in flat if not rec["missing"]]
    if nums != list(range(1, len(nums) + 1)):
        notes.append("Question numbers in the source are not a gapless 1..N sequence (kept as written)")

    # 3) per-question text, formatting and structure checks
    totals = dict(strong_src=0, strong_out=0, li_src=0, li_out=0, tables_src=0, tables_out=0, rows_src=0, rows_out=0)
    for q, q_md, a_md, rec in flat:
        out_q, out_a = html_to_text(rec["qHtml"]), html_to_text(rec["aHtml"])
        for md_text, out_text, kind in ((q_md, out_q, "question"), (a_md, out_a, "answer")):
            for frag in visible_fragments(md_text):
                f = re.sub(r"\s+", " ", frag)
                if f not in out_text:
                    problems.append(f"{q['label']} {kind}: missing text -> {f[:90]!r}")
        both_md = q_md + "\n" + a_md
        both_html = rec["qHtml"] + rec["aHtml"]

        # bold spans may legitimately contain single-asterisk italics, e.g. **... *Genus species* ...**
        s_src = len(re.findall(r"\*\*(?:[^*\n]|\*(?!\*))+?\*\*", both_md))
        s_out = both_html.count("<strong>")
        totals["strong_src"] += s_src
        totals["strong_out"] += s_out
        if s_src != s_out:
            problems.append(f"{q['label']}: bold spans source={s_src} output={s_out}")

        li_src = len(re.findall(r"^\s*(?:\d+\.|-)\s+\S", both_md, flags=re.M))
        li_out = both_html.count("<li>")
        totals["li_src"] += li_src
        totals["li_out"] += li_out
        if li_src != li_out:
            problems.append(f"{q['label']}: list items source={li_src} output={li_out}")

        rows_src = len([l for l in both_md.split("\n") if l.strip().startswith("|")]) 
        tbl_src = len(re.findall(r"^\|\s*-{3}", both_md, flags=re.M))
        tbl_out = both_html.count("<table>")
        rows_out = both_html.count("<tr>")
        # source rows include the |---| separator line, which is not a row in HTML
        rows_src -= tbl_src
        totals["tables_src"] += tbl_src
        totals["tables_out"] += tbl_out
        totals["rows_src"] += rows_src
        totals["rows_out"] += rows_out
        if tbl_src != tbl_out or rows_src != rows_out:
            problems.append(f"{q['label']}: table/rows source={tbl_src}/{rows_src} output={tbl_out}/{rows_out}")

        # italics: every *...* span in the source (not bold) must be an <em>
        stripped = re.sub(r"\*\*(?:[^*\n]|\*(?!\*))+?\*\*", "", both_md)
        em_src = len(re.findall(r"(?<!\*)\*(?!\*)[^*\n]+?\*(?!\*)", stripped))
        em_out = both_html.count("<em>")
        # bold wrapping italic (***x***) or italic inside bold appears as nested tags; compare loosely
        if em_src > em_out:
            problems.append(f"{q['label']}: italic spans source>={em_src} output={em_out}")

    summary = {
        "sections": len(structure),
        "subsections": sum(len(s["subsections"]) for s in structure),
        "questions": len(flat),
        "case_tagged": sum(1 for q, *_ in flat if "CASE" in (q["tag"] or "").upper()),
        "missing_tagged": sum(1 for *_, rec in flat if rec["missing"]),
        "empty_subsections": [sub["title"] for s in structure for sub in s["subsections"] if not sub["questionIds"]],
        **totals,
    }
    return problems, notes, summary


def main():
    verify_only = "--verify" in sys.argv
    doc_title, sections, structure, topic_files, flat, meta = build()
    if not verify_only:
        write_outputs(structure, topic_files, meta)
    problems, notes, summary = verify(doc_title, sections, structure, flat, meta)
    print(json.dumps(summary, indent=2, ensure_ascii=False))
    for n in notes:
        print("NOTE:", n)
    if problems:
        print(f"\n{len(problems)} PROBLEM(S):")
        for p in problems:
            print(" -", p)
        sys.exit(1)
    print("\nIntegrity check passed: every source question/answer line, bold span, list item, table and row is present in the output.")


if __name__ == "__main__":
    main()
