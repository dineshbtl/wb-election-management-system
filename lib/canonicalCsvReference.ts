/**
 * Reference counts from unique_locations_list_canonical.csv (same pipeline as
 * scripts/build_canonical_locations.py). Used so the Unique KPI total matches
 * the checked-in list, not live Strapi grouping alone.
 */
import fs from "fs";
import path from "path";

export type CanonicalCsvRow = {
  locationname: string;
  assembly: string;
  district: string;
};

let cachedRows: CanonicalCsvRow[] | null = null;

function parseCanonicalLine(line: string): CanonicalCsvRow | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const lastComma = trimmed.lastIndexOf(",");
  if (lastComma <= 0) return null;
  const secondLast = trimmed.lastIndexOf(",", lastComma - 1);
  if (secondLast <= 0) return null;
  return {
    locationname: trimmed.slice(0, secondLast).trim(),
    assembly: trimmed.slice(secondLast + 1, lastComma).trim(),
    district: trimmed.slice(lastComma + 1).trim(),
  };
}

export function loadCanonicalCsvRows(): CanonicalCsvRow[] {
  if (cachedRows) return cachedRows;
  const filePath = path.join(
    process.cwd(),
    "unique_locations_list_canonical.csv",
  );
  if (!fs.existsSync(filePath)) {
    cachedRows = [];
    return cachedRows;
  }
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/);
  const rows: CanonicalCsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseCanonicalLine(lines[i] ?? "");
    if (row) rows.push(row);
  }
  cachedRows = rows;
  return cachedRows;
}

/**
 * Count rows in the canonical CSV for the same filters as the survey page.
 * No filters → full file (21016 venues; file is 21017 lines with header).
 */
export function countCanonicalReferenceRows(opts: {
  districtName?: string | null;
  assemblyName?: string | null;
}): number {
  const rows = loadCanonicalCsvRows();
  if (rows.length === 0) return 0;

  if (opts.assemblyName && String(opts.assemblyName).trim()) {
    const a = String(opts.assemblyName).trim().toUpperCase();
    return rows.filter((r) => r.assembly.toUpperCase() === a).length;
  }

  if (opts.districtName && String(opts.districtName).trim()) {
    const d = String(opts.districtName).trim().toLowerCase();
    return rows.filter((r) => r.district.trim().toLowerCase() === d).length;
  }

  return rows.length;
}
