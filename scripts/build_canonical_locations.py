#!/usr/bin/env python3
"""Build unique_locations_list_canonical.csv from unique_locations_list.csv.

Merges rows that refer to the same venue: wing/side/direction suffixes,
(l)/(r)/(m), room numbers, (left/right part), (centre no N), (ep)/(wp)/…,
trailing ep/wp/mp/np/sp and e p / w p, jb vs j b school, l p vs lp school,
p w d vs pwd, (r-1)/(l-2)-style suffixes, bidyalay→bidyalaya,
bare l/w r/w at end, (middle wing)/(4th wing)/ordinal wings,
middle-1/middle-2, (l/e)/(r/w) style, (east building)/…, (new/old building left|right),
(room no - N), m/wing n/wing, ((→( typo, strip bidi/zero-width,
(m 1)/(m 2), (a - left|right), (new building), h s→hs, matiabug→matiabag,
maj-jakhali→maj jakhali, girls' apostrophe,
trailing left/right/middle, m e / e e spacing, redundant assembly name in text.
"""

from __future__ import annotations

import argparse
import csv
import re
from collections import defaultdict
from pathlib import Path

# Order: try each pattern once per loop iteration (outer loop repeats until stable).
_TRAILING_PAREN_PATTERNS = [
    # (north side), (south side), ...
    re.compile(r"\s*\(\s*(north|south|east|west|middle)\s+side\s*\)\s*$", re.I),
    # (n/side), (s/side), ...
    re.compile(r"\s*\(\s*(n|s|e|w|m)/side\s*\)\s*$", re.I),
    # (north), (south), (east), (west), (middle) — no "side"
    re.compile(r"\s*\(\s*(north|south|east|west|middle)\s*\)\s*$", re.I),
    # (north pt), (east pt), (middle pt), ...
    re.compile(r"\s*\(\s*(north|south|east|west|middle)\s+pt\.?\s*\)\s*$", re.I),
    # (north part), (left part), (right part), …
    re.compile(
        r"\s*\(\s*(north|south|east|west|middle|left|right)\s+part\s*\)\s*$", re.I
    ),
    # (east building), (north building), …
    re.compile(
        r"\s*\(\s*(north|south|east|west|middle)\s+building\s*\)\s*$", re.I
    ),
    # (new building left), (old building right), …
    re.compile(
        r"\s*\(\s*(new|old)\s+building\s+(left|right)\s*\)\s*$", re.I
    ),
    # (new building) — without left/right
    re.compile(r"\s*\(\s*new\s+building\s*\)\s*$", re.I),
    # (a - left), (a - right), …
    re.compile(r"\s*\(\s*a\s*-\s*(left|right)\s*\)\s*$", re.I),
    # (centre no 1), …
    re.compile(r"\s*\(\s*centre\s+no\s*\d+\s*\)\s*$", re.I),
    # (ep), (wp), (mp), … compass / part abbreviations in parens
    re.compile(r"\s*\(\s*(ep|wp|mp|np|sp)\s*\)\s*$", re.I),
    # (l/e), (r/w), … — letter / direction
    re.compile(r"\s*\(\s*[lr]/[ewns]\s*\)\s*$", re.I),
    # Wing abbreviations (same building, different wing)
    # Includes: (lw), (rw), (mw), (lw 1), (rw-2), (l w), (m/w), …
    re.compile(
        r"\s*\(\s*("
        r"(?:lw|rw|mw)(?:\s+\d+|-\d+)?|"
        r"l\s+w|r\s+w|m\s+w|"
        r"(?:l/w|r/w|m/w|n/w|s/w|w/w|e/w)(?:-\d+)?|"
        r"l/wing|r/wing|m/wing|n/wing|s/wing|"
        r"(?:left|right|middle)\s+wing|"
        r"\d+(?:st|nd|rd|th)\s+wing"
        r")\s*\)\s*$",
        re.I,
    ),
    # (room 1), (room-2), … — same building, different rooms
    re.compile(r"\s*\(\s*room\s*[- ]?\s*\d+\s*\)\s*$", re.I),
    # (room no - 1), (room no - 2), …
    re.compile(r"\s*\(\s*room\s+no\s*-\s*\d+\s*\)\s*$", re.I),
    # (r-1), (l-2), … — letter + hyphen + digit (booth / section)
    re.compile(r"\s*\(\s*([lrmnesw])\s*-\s*\d+\s*\)\s*$", re.I),
    # (m 1), (m 2), … — middle / section number (before bare (m))
    re.compile(r"\s*\(\s*m\s+\d+\s*\)\s*$", re.I),
    # Single-letter booth markers: (l), (r), (m), (e), ...
    re.compile(r"\s*\(\s*([lrmnesw])\s*\)\s*$", re.I),
]

_TRAILING_WORDS = re.compile(r"\s+(left|right|middle)\s*$", re.I)

# After words: centre no N, spaced e p / w p, then ep/wp/mp/np/sp tokens.
_EXTRA_TRAILING = [
    # middle-1, middle-2 (section labels)
    re.compile(r"\s+middle-\d+\s*$", re.I),
    # l/w r/w … without parentheses (same as (l/w) in parens)
    re.compile(r"\s+(l/w|r/w|m/w|n/w|s/w|w/w|e/w)\s*$", re.I),
    re.compile(r"\s+centre\s+no\s+\d+\s*$", re.I),
    re.compile(r"\s+e\s+p\s*$", re.I),
    re.compile(r"\s+w\s+p\s*$", re.I),
    re.compile(r"\s+n\s+p\s*$", re.I),
    re.compile(r"\s+s\s+p\s*$", re.I),
    re.compile(r"\s+(ep|wp|mp|np|sp)\s*$", re.I),
]


def collapse_spaces(s: str) -> str:
    # Zero-width / bidi marks (e.g. after "(w)") that prevent suffix matching
    s = re.sub(r"[\u200b-\u200f\u202a-\u202e\u2060\ufeff‎‏]", "", s)
    return " ".join(s.split())


def normalize_tokens(s: str) -> str:
    n = collapse_spaces(s)
    # Typo: double "(" before (new building …) / (old building …)
    n = re.sub(r"\(\(+", "(", n)
    n = re.sub(r"\bm e\b", "me", n, flags=re.I)
    n = re.sub(r"\be e\b", "ee", n, flags=re.I)
    # Common OCR / typing: glued school-type tokens (lp school vs lpschool, etc.)
    n = re.sub(r"\blpschool\b", "lp school", n, flags=re.I)
    n = re.sub(r"\bmeschool\b", "me school", n, flags=re.I)
    n = re.sub(r"\bmvschool\b", "mv school", n, flags=re.I)
    n = re.sub(r"\bhsschool\b", "hs school", n, flags=re.I)
    n = re.sub(r"\bl\s+p\s+school\b", "lp school", n, flags=re.I)
    n = re.sub(r"\bj\s+b\s+school\b", "jb school", n, flags=re.I)
    n = re.sub(r"\bp\s+w\s+d\b", "pwd", n, flags=re.I)
    n = re.sub(r"\bbidyalay\b", "bidyalaya", n, flags=re.I)
    n = re.sub(r"\bh\s+s\s+school\b", "hs school", n, flags=re.I)
    n = re.sub(r"\bmatiabug\b", "matiabag", n, flags=re.I)
    n = re.sub(r"\bmaj-jakhali\b", "maj jakhali", n, flags=re.I)
    # Apostrophe variants: girls' / girls' (unicode)
    n = re.sub(r"\bgirls['\u2019]\s*", "girls ", n, flags=re.I)
    return n


def strip_redundant_assembly_token(name: str, assembly: str) -> str:
    token = assembly.strip()
    if len(token) < 3:
        return name
    n = re.sub(rf"\s+{re.escape(token)}\b", "", name, flags=re.I)
    return collapse_spaces(n)


def strip_trailing_suffixes(name: str) -> str:
    n = normalize_tokens(name)
    while True:
        old = n
        stripped = False
        for pat in _TRAILING_PAREN_PATTERNS:
            m = pat.search(n)
            if m:
                n = collapse_spaces(n[: m.start()])
                stripped = True
                break
        if not stripped:
            m = _TRAILING_WORDS.search(n)
            if m:
                n = collapse_spaces(n[: m.start()])
                stripped = True
        if not stripped:
            for pat in _EXTRA_TRAILING:
                m = pat.search(n)
                if m:
                    n = collapse_spaces(n[: m.start()])
                    stripped = True
                    break
        n = normalize_tokens(n)
        if not stripped or n == old:
            break
    return n


def canonical_key(locationname: str, assembly: str, district: str) -> tuple[str, str, str]:
    n = strip_trailing_suffixes(locationname)
    n = strip_redundant_assembly_token(n, assembly)
    n = strip_trailing_suffixes(n)
    return (n.lower(), assembly.strip(), district.strip())


def canonical_display(locationname: str, assembly: str) -> str:
    n = strip_trailing_suffixes(locationname)
    n = strip_redundant_assembly_token(n, assembly)
    n = strip_trailing_suffixes(n)
    return n.lower()


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--src",
        type=Path,
        default=root / "unique_locations_list.csv",
        help="Source CSV (default: unique_locations_list.csv)",
    )
    ap.add_argument(
        "--out",
        type=Path,
        default=root / "unique_locations_list_canonical.csv",
        help="Output CSV (default: unique_locations_list_canonical.csv)",
    )
    args = ap.parse_args()

    rows: list[dict[str, str]] = []
    with open(args.src, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        assert fieldnames
        for row in reader:
            rows.append(row)

    by_key: dict[tuple[str, str, str], list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        k = canonical_key(row["locationname"], row["assembly"], row["district"])
        by_key[k].append(row)

    out_rows: list[dict[str, str]] = []
    for group in by_key.values():
        display = canonical_display(group[0]["locationname"], group[0]["assembly"])
        ref = group[0]
        out_rows.append(
            {
                "locationname": display,
                "assembly": ref["assembly"].strip(),
                "district": ref["district"].strip(),
            }
        )

    out_rows.sort(
        key=lambda r: (r["district"].lower(), r["assembly"].lower(), r["locationname"].lower())
    )

    with open(args.out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, quoting=csv.QUOTE_MINIMAL)
        w.writeheader()
        w.writerows(out_rows)

    print(f"Wrote {args.out} with {len(out_rows)} rows (from {len(rows)} source rows)")


if __name__ == "__main__":
    main()
