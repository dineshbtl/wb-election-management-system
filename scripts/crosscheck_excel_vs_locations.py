#!/usr/bin/env python3
"""Compare unique_excel_list.csv to unique_locations_list.csv using the same
canonical keys as scripts/build_canonical_locations.py.

Writes:
  excel_vs_locations_summary.txt  — counts and short explanation
  excel_vs_locations_detail.csv    — one row per excel line with match status
"""

from __future__ import annotations

import argparse
import csv
import importlib.util
import re
from collections import Counter
from pathlib import Path


def load_build_module(scripts_dir: Path):
    spec = importlib.util.spec_from_file_location(
        "build_canonical_locations", scripts_dir / "build_canonical_locations.py"
    )
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader
    spec.loader.exec_module(mod)
    return mod


def parse_assembly_name(asmbly_no: str) -> str:
    s = asmbly_no.strip()
    m = re.search(r"\(\s*([^)]+?)\s*\)\s*$", s)
    if m:
        return m.group(1).strip().upper()
    return s.upper() if s else ""


def norm_district(district_cd: str) -> str:
    return district_cd.strip().lower()


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    ap = argparse.ArgumentParser()
    ap.add_argument("--excel", type=Path, default=root / "unique_excel_list.csv")
    ap.add_argument("--locations", type=Path, default=root / "unique_locations_list.csv")
    ap.add_argument("--out-summary", type=Path, default=root / "excel_vs_locations_summary.txt")
    ap.add_argument("--out-detail", type=Path, default=root / "excel_vs_locations_detail.csv")
    args = ap.parse_args()

    mod = load_build_module(root / "scripts")

    ref: set[tuple[str, str, str]] = set()
    with open(args.locations, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            ref.add(mod.canonical_key(row["locationname"], row["assembly"], row["district"]))

    excel_rows: list[tuple[int, dict[str, str]]] = []
    with open(args.excel, encoding="utf-8") as f:
        first = f.readline()
        f.seek(0)
        delim = "\t" if "\t" in first else ","
        for line_no, row in enumerate(csv.DictReader(f, delimiter=delim), start=2):
            excel_rows.append((line_no, row))

    n_excel = len(excel_rows)
    matched = 0
    not_in_ref = 0
    keys: list[tuple[str, str, str]] = []
    detail_rows: list[dict[str, str]] = []

    for line_no, row in excel_rows:
        loc = (row.get("LOCATION_NAME") or "").strip()
        dist = norm_district(row.get("DISTRICT_CD") or "")
        asm_raw = (row.get("ASMBLY_NO") or "").strip()
        asm = parse_assembly_name(asm_raw)
        k = mod.canonical_key(loc, asm, dist)
        keys.append(k)
        ok = k in ref
        if ok:
            matched += 1
        else:
            not_in_ref += 1
        detail_rows.append(
            {
                "excel_line": str(line_no),
                "status": "matched" if ok else "not_in_reference",
                "LOCATION_NAME": loc,
                "DISTRICT_CD": row.get("DISTRICT_CD", ""),
                "ASMBLY_NO": asm_raw,
                "assembly_parsed": asm,
                "canonical_name_key": k[0],
            }
        )

    key_counts = Counter(keys)
    dup_keys = sum(1 for c in key_counts.values() if c > 1)
    extra_dup_rows = sum(c - 1 for c in key_counts.values() if c > 1)

    excel_key_set = set(keys)
    ref_only = ref - excel_key_set
    n_ref = len(ref)

    summary = f"""Excel vs reference location list (canonical keys)
================================================

Files
  Excel export:     {args.excel.name}
  Reference list:   {args.locations.name}  (keys use same rules as build_canonical_locations.py)

Row counts
  Lines in Excel file (including header):  typically 1 + N; N = data rows below
  Excel data rows:              {n_excel:,}
  Reference canonical keys:     {n_ref:,}   (deduplicated venue keys from reference)

Cross-check (Excel row -> reference key)
  Matched (Excel name+district+assembly normalizes to a reference key):  {matched:,}  ({100*matched/n_excel:.1f}%)
  Not in reference (name/spelling/venue not in list under that key):       {not_in_ref:,}  ({100*not_in_ref/n_excel:.1f}%)

Excel internal duplicates
  Distinct canonical keys in Excel:        {len(key_counts):,}
  Keys appearing more than once:          {dup_keys:,}  ({extra_dup_rows:,} extra duplicate rows)

Coverage the other way
  Reference keys with no Excel row:        {len(ref_only):,}  (extra booths/sides in reference, or not in Excel)

Why numbers differ
  * unique_excel_list.csv  ~20.6k  — one row per Excel location (your target export).
  * unique_locations_list    ~29.4k  — often splits one building into (l/w), (north side), etc.
  * unique_locations_list_canonical  ~22.8k  — merged same-venue rows; still more than Excel because
    the reference includes many places not in this Excel extract, and spelling differs (e.g. lp school vs lps).

Detail rows: {args.out_detail.name}
"""

    args.out_summary.write_text(summary, encoding="utf-8")
    with open(args.out_detail, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(
            f,
            fieldnames=[
                "excel_line",
                "status",
                "LOCATION_NAME",
                "DISTRICT_CD",
                "ASMBLY_NO",
                "assembly_parsed",
                "canonical_name_key",
            ],
        )
        w.writeheader()
        w.writerows(detail_rows)

    print(summary)


if __name__ == "__main__":
    main()
