#!/usr/bin/env python3
"""Append the DU question bank and the MCQ bank to the site (run AFTER tools/build.py).

    python3 tools/import_banks.py

Adds two sections to js/data.js (ids 'du-question-bank' and 'mcq-bank'), writes
topics/07-du-question-bank.js and topics/08-mcq-bank.js and syncs index.html.
Idempotent: earlier copies of these two sections are replaced.
"""
import hashlib, html, json, pathlib, re
from markdown_it import MarkdownIt

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "source"
QMD = SRC / "Community_Medicine_Questions_Merged_v4.md"
MMD = SRC / "Community_Medicine_MCQ_Bank_Referenced_Expanded_v2.md"
MD = MarkdownIt("commonmark", {"html": False, "breaks": True}).enable("table")
esc = html.escape

def slug(t):
    return re.sub(r"[^a-z0-9]+", "-", t.lower()).strip("-") or "x"

def totext(h):
    h = re.sub(r"</(p|li|tr|h\d)>|<br\s*/?>|</t[dh]>", " ", h)
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", h))).strip()

def qid(prefix, key):
    return prefix + hashlib.sha1(key.encode()).hexdigest()[:8]

# ---------------------------------------------------------------- DU questions
def parse_questions():
    parts, part, topic, group, cur = [], None, None, None, None
    def close():
        nonlocal cur
        cur = None
    for line in QMD.read_text(encoding="utf-8").split("\n"):
        m = re.match(r"# (PART \d+) — (.+)", line)
        if m:
            close(); part = m.group(1).title() + " — " + m.group(2).title().replace("&", "&"); topic = None; continue
        m = re.match(r"## (.+)", line)
        if m and part and not line.startswith("###"):
            close(); topic = {"title": m.group(1).strip(), "part": part, "qs": []}; parts.append(topic); group = None; continue
        m = re.match(r"#{3,4} (.+)", line)
        if m and topic:
            close(); group = m.group(1).strip(); continue
        m = re.match(r"(\d+)\. (.*)", line)
        if m and topic:
            cur = {"n": m.group(1), "lines": [m.group(2)], "group": group}; topic["qs"].append(cur); continue
        if line.strip() == "---":
            close(); continue
        if cur is not None and (line.startswith("   ") or (line.strip() and not line.startswith("#"))):
            cur["lines"].append(line[3:] if line.startswith("   ") else line)
        elif cur is not None and not line.strip():
            cur["lines"].append("")
    return [t for t in parts]

def build_du():
    topics = parse_questions()
    sec = {"id": "du-question-bank", "num": "7", "title": "DU Question Bank (Matrix 3rd Prof)",
           "heading": "7. DU Question Bank (Matrix 3rd Prof)", "questionIds": [], "subsections": [],
           "noteHtml": "<p><em>765 merged, de-duplicated DU and college-paper questions from Matrix 3rd Prof (18th Ed.). "
                       "Stars, exam sessions and college tags are shown with each question. Model answers are not in the source file.</em></p>"}
    recs, seen, n = [], set(), 0
    for t in topics:
        sub = {"id": "du--" + slug(t["part"][:7] + "-" + t["title"]), "title": t["title"] + "  (" + t["part"].split(" —")[0] + ")", "questionIds": []}
        if not t["qs"]:
            sub["noteHtml"] = "<p><em>(No questions in the source file for this topic.)</em></p>"
        for q in t["qs"]:
            raw = "\n".join(q["lines"]).strip()
            first = raw.split("\n")[0]
            stars = re.match(r"(★+)\s*", first)
            tags = []
            if stars: tags.append(stars.group(1))
            if q["group"]: tags.append(re.sub(r"\s*\(college papers\)", "", q["group"]))
            n += 1
            i = qid("d-", t["part"] + t["title"] + str(q["n"]) + raw)
            assert i not in seen; seen.add(i)
            qh = MD.render(raw).strip()
            recs.append({"id": i, "num": n, "label": f"DU.{n}", "tag": ",".join(tags) or None, "missing": False,
                         "section": sec["id"], "sub": sub["id"], "qHtml": qh,
                         "aHtml": "<p><em>No model answer has been added yet. Use the notes tool to write your own.</em></p>",
                         "qText": totext(qh), "aText": ""})
            sub["questionIds"].append(i)
        sec["subsections"].append(sub)
    sec["questionIds"] = []
    return sec, recs

# ----------------------------------------------------------------------- MCQs
def parse_mcq():
    topics, part, topic, kind, cur = [], None, None, None, None
    coded, dup = {}, []
    text = MMD.read_text(encoding="utf-8").split("\n")
    for line in text:
        if line.startswith("## Needs review"): break
        if line.startswith("# ") and ("NEW" in line or "EXTRACTED" in line): topic = None; kind = None; cur = None
        m = re.match(r"## (PART \d+) — (.+)", line)
        if m: part = m.group(1).title() + " — " + m.group(2); topic = None; cur = None; continue
        m = re.match(r"### (.+?)\s+_\(final", line)
        if m and part: topic = {"title": m.group(1).strip(), "part": part, "qs": []}; topics.append(topic); cur = None; continue
        m = re.match(r"#### (SBA|True/False)", line)
        if m: kind = m.group(1); cur = None; continue
        m = re.match(r"(\d+)\. (.*)", line)
        if m and topic and kind:
            cur = {"n": m.group(1), "head": m.group(2), "kind": kind, "opts": [], "ans": None}; topic["qs"].append(cur); continue
        m = re.match(r"((?:BCS|AT|BT|A|B)\d+)\. (.*)", line)
        if m:
            code = m.group(1)
            if code in coded: cur = None; dup.append(code); continue
            k = "True/False" if code[:2] in ("AT", "BT") else "SBA"
            cur = {"n": code, "head": m.group(2), "kind": k, "opts": [], "ans": None, "coded": True}
            coded[code] = cur; continue
        if cur is not None and cur.get("coded") and cur["kind"] == "SBA":
            s2 = line.strip()
            if s2.startswith("- a)"):
                body = s2[2:]
                am = re.search(r"\s+✔\s+\*\*([a-e])\*\*\s*$", body)
                key = am.group(1) if am else None
                body = re.sub(r"\s+✔\s+\*\*[a-e]\*\*\s*$", "", body)
                parts = re.split(r"\s{2,}(?=[a-e]\) )", body)
                for pt in parts:
                    mm = re.match(r"([a-e])\) (.*)", pt.strip())
                    if mm: cur["opts"].append((mm.group(1), mm.group(2) + (" ✔ " + mm.group(1) if mm.group(1) == key else "")))
                continue
        if cur is not None:
            s = line.strip()
            m = re.match(r"- \*\*Answer: (.*?)\*\*", s)
            if m: cur["ans"] = m.group(1); continue
            m = re.match(r"- ([a-e])\) (.*)", s)
            if m: cur["opts"].append((m.group(1), m.group(2)))
    # place coded MCQs into the matching topic (via the [Ref: WQ Part n › Topic]) or an "Other topics" bucket
    by = {(t["part"][:6].upper(), t["title"].lower()): t for t in topics}
    other = {}
    for code, q in coded.items():
        m = re.search(r"WQ (Part \d+) › ([^|\]]+)", q["head"])
        placed = None
        if m:
            pk, tn = m.group(1).upper(), re.sub(r"\s+Q\d+\s*$", "", m.group(2).strip()).lower()
            placed = by.get((pk, tn))
            if not placed:
                for (kp, kt), t in by.items():
                    if kp == pk and (tn.startswith(kt) or kt.startswith(tn)): placed = t; break
            if not placed:
                parts_full = {t["part"][:6].upper(): t["part"] for t in topics}
                placed = other.setdefault(pk, {"title": "Other topics (new MCQs)", "part": parts_full.get(pk, pk), "qs": []})
        else:
            placed = other.setdefault("ZZ", {"title": "Other topics (new MCQs)", "part": "Part 99 — Other", "qs": []})
        placed["qs"].append(q)
    for k in sorted(other): topics.append(other[k])
    parse_mcq.dup = dup
    return topics

def inl(s):
    s = esc(s)
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"\*(.+?)\*", r"<em>\1</em>", s)
    return s.replace("⚠ conflicting key", "<span class=\"tag tag-missing\">conflicting key</span>")

def build_mcq():
    topics = parse_mcq()
    sec = {"id": "mcq-bank", "num": "8", "title": "MCQ Bank (DU 3rd Prof, 2019–2026)", "heading": "8. MCQ Bank (DU 3rd Prof, 2019–2026)",
           "questionIds": [], "subsections": [],
           "noteHtml": "<p><em>SBA and True/False MCQs by topic. Items tagged <strong>New</strong> are AI-written from the source files and must be checked against Park/Matrix. "
                       "Where the source gives no key or two papers disagree, the answer says so.</em></p>"}
    recs, n = [], 0
    for t in topics:
        sub = {"id": "mcq--" + slug(t["part"][:7] + "-" + t["title"]), "title": t["title"] + "  (" + t["part"].split(" —")[0] + ")", "questionIds": []}
        if not t["qs"]:
            sub["noteHtml"] = "<p><em>(No MCQs in the source file for this topic.)</em></p>"
        for q in t["qs"]:
            head = q["head"]
            ref = re.search(r"\[Ref: (.*?)\]\s*$", head); head = re.sub(r"\s*\[Ref: .*?\]\s*$", "", head)
            tagm = re.findall(r"#([A-Za-z]+)", head); head = re.sub(r"\s*`[^`]*`", "", head)
            stem = head.strip()
            tags = [x.upper() for x in tagm if x.upper() in ("SBA", "TF", "BCS", "NEW", "GROUPA", "GROUPB", "EXTRACTED")]
            tags = ["True/False" if x == "TF" else "Group A" if x == "GROUPA" else "Group B" if x == "GROUPB" else x for x in tags if x != "EXTRACTED"]
            if q["kind"] == "SBA" and "SBA" not in tags: tags.insert(0, "SBA")
            if q["kind"] != "SBA" and "True/False" not in tags: tags.insert(0, "True/False")
            qh = "<p>" + inl(stem) + "</p>"
            if q["kind"] == "SBA":
                qh += "<ol type=\"a\" class=\"opts\">" + "".join("<li>" + inl(re.sub(r"\s*✔ [a-e]\s*$", "", o)) + "</li>" for _, o in q["opts"]) + "</ol>"
                correct = [(l, re.sub(r"\s*✔ [a-e]\s*$", "", o)) for l, o in q["opts"] if re.search(r"✔ [a-e]\s*$", o)]
                if correct:
                    ah = "<p><strong>Correct answer: " + ", ".join(f"{l}) {inl(o)}" for l, o in correct) + "</strong></p>"
                else:
                    ah = "<p><em>Answer not given in the source.</em></p>"
            else:
                qh += "<ol type=\"a\" class=\"opts\">" + "".join("<li>" + inl(o.split(" — ")[0]) + "</li>" for _, o in q["opts"]) + "</ol>"
                rows = []
                for l, o in q["opts"]:
                    bits = o.split(" — ")
                    key = bits[1] if len(bits) > 1 else ""
                    note = " ".join(bits[2:])
                    k = re.sub(r"\*", "", key).strip()
                    k = {"T": "True", "F": "False"}.get(k, "Answer not given" if "not given" in k else k)
                    rows.append(f"<li>{l}) {inl(bits[0])} — <strong>{esc(k)}</strong>" + (f" <small>{inl(note)}</small>" if note else "") + "</li>")
                ah = "<ul class=\"key\">" + "".join(rows) + "</ul>"
            years = re.search(r"\*([^*]+)\*\s*$", stem)
            if ref: ah += "<p><small>Ref: " + esc(ref.group(1)) + "</small></p>"
            n += 1
            i = qid("m-", t["part"] + t["title"] + q["kind"] + q["n"] + stem)
            recs.append({"id": i, "num": n, "label": f"M.{n}", "tag": ",".join(tags) or None, "missing": False,
                         "section": sec["id"], "sub": sub["id"], "qHtml": qh, "aHtml": ah,
                         "qText": totext(qh), "aText": totext(ah)})
            sub["questionIds"].append(i)
        sec["subsections"].append(sub)
    return sec, recs

# ---------------------------------------------------------------------- write
def main():
    data = (ROOT / "js" / "data.js").read_text(encoding="utf-8")
    m = re.search(r"QB\.structure = (\[.*?\n\]);\nQB\.questions", data, re.S)
    structure = [s for s in json.loads(m.group(1)) if s["id"] not in ("du-question-bank", "mcq-bank")]
    meta = json.loads(re.search(r"QB\.meta = (\{.*?\n\});", data, re.S).group(1))
    out = []
    for fn, (sec, recs) in (("07-du-question-bank.js", build_du()), ("08-mcq-bank.js", build_mcq())):
        structure.append(sec)
        (ROOT / "topics" / fn).write_text(f"/* GENERATED by tools/import_banks.py - section: {sec['heading']} */\nQB.defineQuestions({json.dumps(recs, ensure_ascii=False, indent=1)});\n", encoding="utf-8")
        out.append((fn, len(recs)))
    meta["totalQuestions"] = meta.get("baseTotal", meta["totalQuestions"])
    meta["baseTotal"] = meta["totalQuestions"]
    meta["totalQuestions"] += sum(n for _, n in out)
    dump = lambda o: json.dumps(o, ensure_ascii=False, indent=1)
    new = re.sub(r"QB\.meta = \{.*?\n\};", lambda _: "QB.meta = " + dump(meta) + ";", data, count=1, flags=re.S)
    new = re.sub(r"QB\.structure = \[.*?\n\];\nQB\.questions", lambda _: "QB.structure = " + dump(structure) + ";\nQB.questions", new, count=1, flags=re.S)
    (ROOT / "js" / "data.js").write_text(new, encoding="utf-8")
    idx = (ROOT / "index.html").read_text(encoding="utf-8")
    tags = "\n".join(f'  <script src="topics/{p.name}"></script>' for p in sorted((ROOT / "topics").glob("*.js")))
    idx = re.sub(r"(<!-- topics:start -->).*?(<!-- topics:end -->)", lambda m: f"{m.group(1)}\n{tags}\n  {m.group(2)}", idx, flags=re.S)
    (ROOT / "index.html").write_text(idx, encoding="utf-8")
    print(out, "total", meta["totalQuestions"])

if __name__ == "__main__":
    main()
