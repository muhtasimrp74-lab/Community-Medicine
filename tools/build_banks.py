#!/usr/bin/env python3
"""Build data/du.js and data/mcq.js for the main site from the two Markdown banks in source/.

    python3 tools/build_banks.py

Optional model answers: put them in source/du_answers.md as
    ## DU.12
    <answer in Markdown>
They are merged into the matching question (label DU.<n>, as shown on each card).
"""
import html, json, pathlib, re, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import bank_parsers as bp
from markdown_it import MarkdownIt

ROOT = pathlib.Path(__file__).resolve().parent.parent
MD = MarkdownIt("commonmark", {"html": False, "breaks": True}).enable("table")
PARTNAME = {}

def part_names():
    for l in bp.MMD.read_text(encoding="utf-8").split("\n"):
        m = re.match(r"## PART (\d+) — (.+)", l)
        if m: PARTNAME[int(m.group(1))] = m.group(2).strip()
    for l in bp.QMD.read_text(encoding="utf-8").split("\n"):
        m = re.match(r"# PART (\d+) — (.+)", l)
        if m: PARTNAME.setdefault(int(m.group(1)), m.group(2).strip().title())

def pnum(s): return int(re.search(r"(\d+)", s).group(1))

def build_du():
    answers = {}
    af = ROOT / "source" / "du_answers.md"
    if af.exists():
        for m in re.finditer(r"^## (DU\.\d+)\s*\n(.*?)(?=^## DU\.\d+|\Z)", af.read_text(encoding="utf-8"), re.M | re.S):
            answers[m.group(1)] = MD.render(m.group(2).strip()).strip()
    out, n = [], 0
    for t in bp.parse_questions():
        pn = pnum(t["part"])
        for q in t["qs"]:
            n += 1
            raw = "\n".join(q["lines"]).strip()
            first, _, rest = raw.partition("\n")
            stars = ""
            m = re.match(r"(★+)\s*", first)
            if m: stars, first = m.group(1), first[m.end():]
            # Trailing annotations look like  *(also asked: ...)*, *(asked as: ...)*, *(also listed in ..., Part n)*
            # and may sit after the colleges (with a "|" before them) or after the years (without one).
            # Peel them all off first so they never leak into the colleges / years / question text.
            asked, note, notes = "", [], []
            while True:
                m = re.search(r"\s*(?:\|\s*)?\*\((.*?)\)\*\s*$", first)
                # keep "(no year given)" for the years parser, and never strip a line that is only a pointer
                if not m or m.group(1).startswith("no year") or not first[:m.start()].strip(" —"): break
                notes.insert(0, m.group(1).strip()); first = first[:m.start()]
            for t_ in notes:
                m = re.match(r"(?:also )?asked as: (.*)$|also asked: (.*)$", t_)
                if m: asked = (asked + "; " if asked else "") + (m.group(1) or m.group(2))
                else: note.append(t_[:1].upper() + t_[1:])
            colleges = ""
            m = re.search(r"\s*\|\s*\*\*Colleges:\*\*\s*(.*)$", first)
            if m: colleges, first = m.group(1).strip(), first[:m.start()]
            years = ""
            m = re.search(r"\s+—\s+\*([^*]+)\*\s*$", first)
            if m: years, first = m.group(1), first[:m.start()]
            body = first + ("\n" + rest if rest.strip() else "")
            g = q["group"] or ""
            kind = "Case-based" if "Case-based" in g else "SEQ" if g.strip() == "SEQ" else ""
            sub = "" if kind else g
            label = f"DU.{n}"
            out.append({"id": label, "n": n, "part": pn, "topic": t["title"], "stars": len(stars),
                        "years": [y.strip() for y in years.split(",") if y.strip() and "no year" not in y], "colleges": colleges,
                        "asked": asked, "note": "; ".join(note), "kind": kind, "sub": sub, "q": MD.render(body).strip(), "a": answers.get(label, "")})
    return out

def clean_opt(o):
    return re.sub(r"\s*✔ [a-e]\s*$", "", o)

def build_mcq():
    out, n = [], 0
    topics = bp.parse_mcq()
    for t in topics:
        pn = pnum(t["part"])
        for q in t["qs"]:
            n += 1
            head = q["head"]
            ref = ""
            m = re.search(r"\[Ref: (.*?)\]\s*$", head)
            if m: ref, head = m.group(1), head[:m.start()]
            tags = re.findall(r"#([A-Za-z]+)", head); head = re.sub(r"\s*`[^`]*`", "", head).strip()
            src = "BCS" if "BCS" in tags else "New" if "NEW" in tags else "DU"
            grp = "A" if "GroupA" in tags else "B" if "GroupB" in tags else ""
            years = ""
            m = re.search(r"\s+—\s+\*([^*]+)\*\s*$", head)
            if m: years, head = m.group(1), head[:m.start()]
            rec = {"id": f"M.{n}", "n": n, "part": pn, "topic": t["title"], "kind": "SBA" if q["kind"] == "SBA" else "TF",
                   "stem": head.strip(), "src": src, "grp": grp, "years": [y.strip() for y in years.split(",") if y.strip() and "no year" not in y], "ref": ref}
            if rec["kind"] == "SBA":
                rec["opts"] = [{"l": l, "t": clean_opt(o)} for l, o in q["opts"]]
                c = [l for l, o in q["opts"] if re.search(r"✔ [a-e]\s*$", o)]
                rec["ans"] = c[0] if c else ""
            else:
                opts = []
                for l, o in q["opts"]:
                    bits = o.split(" — ")
                    key = re.sub(r"\*", "", bits[1]).strip() if len(bits) > 1 else ""
                    note = " ".join(bits[2:]) if len(bits) > 2 else ""
                    k = key if key in ("T", "F") else ""
                    opts.append({"l": l, "t": bits[0], "k": k, "y": re.sub(r"[*]|⚠ conflicting key", "", note).strip(),
                                 "conflict": "conflicting" in note})
                rec["opts"] = opts
            out.append(rec)
    return out

def main():
    part_names()
    du, mcq = build_du(), build_mcq()
    (ROOT / "data").mkdir(exist_ok=True)
    meta = {"parts": {str(k): v for k, v in sorted(PARTNAME.items())}}
    (ROOT / "data" / "du.js").write_text("window.CM=window.CM||{};CM.parts=" + json.dumps(meta["parts"], ensure_ascii=False) + ";\nCM.du=" + json.dumps(du, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
    (ROOT / "data" / "mcq.js").write_text("window.CM=window.CM||{};CM.mcq=" + json.dumps(mcq, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
    print(len(du), "DU questions;", sum(1 for x in du if x["a"]), "with answers;", len(mcq), "MCQs;", len(PARTNAME), "parts")

if __name__ == "__main__":
    main()
