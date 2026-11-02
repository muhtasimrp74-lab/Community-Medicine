#!/usr/bin/env python3
"""Merge source/du_answers.md into data/du.js in place (only the "a" fields).

    python3 tools/inject_answers.py

Unlike build_banks.py, this keeps every other field of du.js (subtopics, part fixes) untouched.
"""
import json, pathlib, re
from markdown_it import MarkdownIt

ROOT = pathlib.Path(__file__).resolve().parent.parent
MD = MarkdownIt("commonmark", {"html": False, "breaks": True}).enable("table")
js = ROOT / "data" / "du.js"
s = js.read_text(encoding="utf-8")
m = re.search(r"CM\.du=(\[.*?\]);", s, re.S)
arr = json.loads(m.group(1))
assert json.dumps(arr, ensure_ascii=False, separators=(",", ":")) == m.group(1), "du.js format changed"
answers = {}
for mm in re.finditer(r"^## (DU\.\d+)\s*\n(.*?)(?=^## DU\.\d+|\Z)", (ROOT / "source" / "du_answers.md").read_text(encoding="utf-8"), re.M | re.S):
    answers[mm.group(1)] = MD.render(mm.group(2).strip()).strip()
for x in arr:
    x["a"] = answers.get(x["id"], x.get("a", ""))
js.write_text(s[:m.start(1)] + json.dumps(arr, ensure_ascii=False, separators=(",", ":")) + s[m.end(1):], encoding="utf-8")
print(sum(1 for x in arr if x["a"]), "answers in du.js")
