/**
 * Mirrors scripts/build_canonical_locations.py so KPI / unique list match
 * unique_locations_list_canonical.csv grouping rules.
 */

const ZW_RE = /[\u200b-\u200f\u202a-\u202e\u2060\ufeff‎‏]/g;

const TRAILING_PAREN_PATTERNS: RegExp[] = [
  /\s*\(\s*(north|south|east|west|middle)\s+side\s*\)\s*$/i,
  /\s*\(\s*(n|s|e|w|m)\/side\s*\)\s*$/i,
  /\s*\(\s*(north|south|east|west|middle)\s*\)\s*$/i,
  /\s*\(\s*(north|south|east|west|middle)\s+pt\.?\s*\)\s*$/i,
  /\s*\(\s*(north|south|east|west|middle|left|right)\s+part\s*\)\s*$/i,
  /\s*\(\s*(north|south|east|west|middle)\s+building\s*\)\s*$/i,
  /\s*\(\s*(new|old)\s+building\s+(left|right)\s*\)\s*$/i,
  /\s*\(\s*new\s+building\s*\)\s*$/i,
  /\s*\(\s*a\s*-\s*(left|right)\s*\)\s*$/i,
  /\s*\(\s*centre\s+no\s*\d+\s*\)\s*$/i,
  /\s*\(\s*(ep|wp|mp|np|sp)\s*\)\s*$/i,
  /\s*\(\s*[lr]\/[ewns]\s*\)\s*$/i,
  /\s*\(\s*((?:lw|rw|mw)(?:\s+\d+|-\d+)?|l\s+w|r\s+w|m\s+w|(?:l\/w|r\/w|m\/w|n\/w|s\/w|w\/w|e\/w)(?:-\d+)?|l\/wing|r\/wing|m\/wing|n\/wing|s\/wing|(?:left|right|middle)\s+wing|\d+(?:st|nd|rd|th)\s+wing)\s*\)\s*$/i,
  /\s*\(\s*room\s*[- ]?\s*\d+\s*\)\s*$/i,
  /\s*\(\s*room\s+no\s*-\s*\d+\s*\)\s*$/i,
  /\s*\(\s*([lrmnesw])\s*-\s*\d+\s*\)\s*$/i,
  /\s*\(\s*m\s+\d+\s*\)\s*$/i,
  /\s*\(\s*([lrmnesw])\s*\)\s*$/i,
];

const TRAILING_WORDS = /\s+(left|right|middle)\s*$/i;

const EXTRA_TRAILING: RegExp[] = [
  /\s+middle-\d+\s*$/i,
  /\s+(l\/w|r\/w|m\/w|n\/w|s\/w|w\/w|e\/w)\s*$/i,
  /\s+centre\s+no\s+\d+\s*$/i,
  /\s+e\s+p\s*$/i,
  /\s+w\s+p\s*$/i,
  /\s+n\s+p\s*$/i,
  /\s+s\s+p\s*$/i,
  /\s+(ep|wp|mp|np|sp)\s*$/i,
];

export function collapseSpaces(s: string): string {
  return s.replace(ZW_RE, "").replace(/\s+/g, " ").trim();
}

/** Strip leading booth number prefix (Strapi PS_Name), like normalizePSName start. */
export function stripLeadingBoothPrefix(raw: string): string {
  let s = String(raw).trim();
  s = s.replace(/^\d+[\s,.\-–]*/g, "");
  s = s.replace(/^\s*NO\.?\s+/i, "");
  return collapseSpaces(s);
}

function normalizeTokens(s: string): string {
  let n = collapseSpaces(s);
  n = n.replace(/\(\(+/g, "(");
  n = n.replace(/\bm e\b/gi, "me");
  n = n.replace(/\be e\b/gi, "ee");
  n = n.replace(/\blpschool\b/gi, "lp school");
  n = n.replace(/\bmeschool\b/gi, "me school");
  n = n.replace(/\bmvschool\b/gi, "mv school");
  n = n.replace(/\bhsschool\b/gi, "hs school");
  n = n.replace(/\bl\s+p\s+school\b/gi, "lp school");
  n = n.replace(/\bj\s+b\s+school\b/gi, "jb school");
  n = n.replace(/\bp\s+w\s+d\b/gi, "pwd");
  n = n.replace(/\bbidyalay\b/gi, "bidyalaya");
  n = n.replace(/\bh\s+s\s+school\b/gi, "hs school");
  n = n.replace(/\bmatiabug\b/gi, "matiabag");
  n = n.replace(/\bmaj-jakhali\b/gi, "maj jakhali");
  n = n.replace(/\bgirls['\u2019]\s*/gi, "girls ");
  return n;
}

function stripRedundantAssemblyToken(name: string, assembly: string): string {
  const token = assembly.trim();
  if (token.length < 3) return name;
  const re = new RegExp(`\\s+${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
  return collapseSpaces(name.replace(re, ""));
}

export function stripTrailingSuffixes(name: string): string {
  let n = normalizeTokens(name);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const old = n;
    let stripped = false;
    for (const pat of TRAILING_PAREN_PATTERNS) {
      const m = n.match(pat);
      if (m && m.index !== undefined) {
        n = collapseSpaces(n.slice(0, m.index));
        stripped = true;
        break;
      }
    }
    if (!stripped) {
      const mw = n.match(TRAILING_WORDS);
      if (mw && mw.index !== undefined) {
        n = collapseSpaces(n.slice(0, mw.index));
        stripped = true;
      }
    }
    if (!stripped) {
      for (const pat of EXTRA_TRAILING) {
        const m = n.match(pat);
        if (m && m.index !== undefined) {
          n = collapseSpaces(n.slice(0, m.index));
          stripped = true;
          break;
        }
      }
    }
    n = normalizeTokens(n);
    if (!stripped || n === old) break;
  }
  return n;
}

export function canonicalDisplayName(
  locationname: string,
  assembly: string,
): string {
  let n = stripTrailingSuffixes(locationname);
  n = stripRedundantAssemblyToken(n, assembly);
  n = stripTrailingSuffixes(n);
  return n.toLowerCase();
}

export function canonicalLocationKey(
  locationname: string,
  assembly: string,
  district: string,
): string {
  let n = stripTrailingSuffixes(locationname);
  n = stripRedundantAssemblyToken(n, assembly);
  n = stripTrailingSuffixes(n);
  return `${n.toLowerCase()}||${assembly.trim()}||${district.trim()}`;
}
