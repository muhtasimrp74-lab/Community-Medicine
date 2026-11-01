# Added: DU Question Bank (765) + MCQ Bank (546)

Sources are in `source/`. Regenerate with:

    python3 tools/build.py          # solved viva bank (sections 1-6)
    python3 tools/import_banks.py   # sections 7 (DU questions) and 8 (MCQs), run after build.py

DU questions have no model answers in the source file. 28 MCQ statements have no key and 17 carry a conflicting key between papers; both are flagged in the answer. New (AI-written) MCQs are tagged NEW and should be checked against Park/Matrix.
