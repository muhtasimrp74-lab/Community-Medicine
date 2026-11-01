#!/usr/bin/env python3
"""Parsers for the two Markdown banks in source/ (used by tools/build_banks.py).

    python3 tools/build_banks.py     # this is the script to run; this module is only imported
"""
import pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "source"
QMD = SRC / "Community_Medicine_Questions_Merged_v4.md"
MMD = SRC / "Community_Medicine_MCQ_Bank_Referenced_Expanded_v2.md"

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
