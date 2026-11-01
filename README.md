# Community Medicine — DU Question Bank & MCQs

Main site (root): Dashboard, Questions (765), Answers (to be filled), MCQs (546) with quiz, Menu.
`second-term/` is the old solved viva bank, kept as a separate site.

Rebuild data after editing the sources in `source/`:

    pip install markdown-it-py
    python3 tools/build_banks.py

Add model answers by writing `source/du_answers.md`:

    ## DU.12
    Answer in Markdown...

then rebuild. They then show under each question's Answer button and in the Answers tab.
