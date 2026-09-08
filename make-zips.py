#!/usr/bin/env python3
"""Rebuild docs/downloads/week-N.zip from what each week's page actually asks for.

A page claims a starter file with <span class="usefile">Name.java</span>.
Nothing else ships, so a zip can never drift out of sync with the lesson.
"""

import pathlib
import re
import sys
import zipfile

DOCS = pathlib.Path(__file__).parent / "docs"
CHIP = re.compile(r'class="usefile">([^<]+)<')

# pages that belong to a week beyond its own week-NN.html
EXTRA = {3: ["battle-sim.html"]}


def wanted(week):
    pages = [f"week-{week:02d}.html"] + EXTRA.get(week, [])
    names = []
    for page in pages:
        path = DOCS / page
        if not path.exists():
            continue
        for name in CHIP.findall(path.read_text()):
            if name not in names:
                names.append(name)
    return names


def main():
    out = DOCS / "downloads"
    out.mkdir(exist_ok=True)
    problems = 0

    for src in sorted((DOCS / "starters").glob("week-*")):
        week = int(src.name.split("-")[1])
        names = wanted(week)

        if not names:
            print(f"week {week}: no page references any file, skipping")
            continue

        have = {f.name for f in src.glob("*.java")}
        missing = [n for n in names if n not in have]
        unused = sorted(have - set(names))

        for name in missing:
            print(f"  MISSING  week {week}: {name} is asked for but not in {src}")
            problems += 1
        for name in unused:
            print(f"  UNUSED   week {week}: {name} exists but no page asks for it")
            problems += 1

        target = out / f"week-{week}.zip"
        with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as z:
            for name in names:
                if name in have:
                    z.write(src / name, name)

        print(f"week {week}: {len(names)} files -> {target.relative_to(DOCS.parent)}")

    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
