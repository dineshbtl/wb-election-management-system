/** Brihaspathi zonal coverage — auto-fills Engaging Agency when district is chosen. */
export const ENGAGING_AGENCY_NAME = "Brihaspathi Technologies Limited";

/** Shown as Designation for the authorised zonal contact. */
export const ZONAL_DESIGNATION = "Zonal Manager";

export type ZonalContact = {
  authorisedPersonName: string;
  mobile: string;
};

/** When no roster match (including fuzzy) for a non-empty district name. */
export const FALLBACK_ZONAL_CONTACT: ZonalContact = {
  authorisedPersonName: "Saketh Addepalli",
  mobile: "+91 96408 33333",
};

/** District label → zonal manager & mobile (per internal roster). */
export const DISTRICT_TO_ZONAL: Record<string, ZonalContact> = {
  Bongaigaon: { authorisedPersonName: "Jaswanth", mobile: "9000552766" },
  Chirang: { authorisedPersonName: "Jaswanth", mobile: "9000552766" },
  Dhubri: { authorisedPersonName: "Jaswanth", mobile: "9000552766" },
  Kokrajhar: { authorisedPersonName: "Jaswanth", mobile: "9000552766" },
  "South Salmara": { authorisedPersonName: "Jaswanth", mobile: "9000552766" },
  Bajali: { authorisedPersonName: "Jaswanth", mobile: "9000552766" },
  Barpeta: { authorisedPersonName: "Jaswanth", mobile: "9000552766" },

  Baksa: { authorisedPersonName: "Inamul", mobile: "8179321919" },
  Goalpara: { authorisedPersonName: "Inamul", mobile: "8179321919" },
  Golpara: { authorisedPersonName: "Inamul", mobile: "8179321919" },
  Kamrup: { authorisedPersonName: "Inamul", mobile: "8179321919" },
  "Kamrup Metro": { authorisedPersonName: "Inamul", mobile: "8179321919" },
  Nagaon: { authorisedPersonName: "Inamul", mobile: "8179321919" },
  Nalbari: { authorisedPersonName: "Inamul", mobile: "8179321919" },
  Tamulpur: { authorisedPersonName: "Inamul", mobile: "8179321919" },
  Morigaon: { authorisedPersonName: "Inamul", mobile: "8179321919" },

  Biswanath: { authorisedPersonName: "Soumya", mobile: "7376521320" },
  Darrang: { authorisedPersonName: "Soumya", mobile: "7376521320" },
  Dhemaji: { authorisedPersonName: "Soumya", mobile: "7376521320" },
  Lakhimpur: { authorisedPersonName: "Soumya", mobile: "7376521320" },
  Sonitpur: { authorisedPersonName: "Soumya", mobile: "7376521320" },
  Udalguri: { authorisedPersonName: "Soumya", mobile: "7376521320" },
  Majuli: { authorisedPersonName: "Soumya", mobile: "7376521320" },

  Charaideo: { authorisedPersonName: "Srija", mobile: "9672812345" },
  Charideo: { authorisedPersonName: "Srija", mobile: "9672812345" },
  Dibrugarh: { authorisedPersonName: "Srija", mobile: "9672812345" },
  Dibrugargh: { authorisedPersonName: "Srija", mobile: "9672812345" },
  Golaghat: { authorisedPersonName: "Srija", mobile: "9672812345" },
  Jorhat: { authorisedPersonName: "Srija", mobile: "9672812345" },
  Sivasagar: { authorisedPersonName: "Srija", mobile: "9672812345" },
  Sivsagar: { authorisedPersonName: "Srija", mobile: "9672812345" },
  Tinsukia: { authorisedPersonName: "Srija", mobile: "9672812345" },

  "West Karbi Anglong": { authorisedPersonName: "Zack", mobile: "9069912345" },
  "West Karbi": { authorisedPersonName: "Zack", mobile: "9069912345" },
  "Karbi Anglong": { authorisedPersonName: "Zack", mobile: "9069912345" },
  Hojai: { authorisedPersonName: "Zack", mobile: "9069912345" },
  "Dima Hasao": { authorisedPersonName: "Zack", mobile: "9069912345" },
  Cachar: { authorisedPersonName: "Zack", mobile: "9069912345" },
  Hailakandi: { authorisedPersonName: "Zack", mobile: "9069912345" },
  Sribhumi: { authorisedPersonName: "Zack", mobile: "9069912345" },
  Sribhummi: { authorisedPersonName: "Zack", mobile: "9069912345" },
};

export const DISTRICT_OPTIONS = Object.keys(DISTRICT_TO_ZONAL).sort((a, b) =>
  a.localeCompare(b),
);

function normalizeDistrictName(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Levenshtein distance for typo-tolerant matching. */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array<number>(n + 1).fill(0),
  );
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}

function fuzzyThreshold(maxLen: number): number {
  if (maxLen <= 8) return 2;
  if (maxLen <= 14) return 3;
  return 4;
}

/**
 * Resolves zonal manager + mobile for a district name from the API.
 * Order: exact → case-insensitive → normalized → substring → Levenshtein.
 * If nothing matches, returns {@link FALLBACK_ZONAL_CONTACT}.
 * Empty/whitespace input returns empty contact (caller should clear fields).
 */
export function resolveZonalContact(
  districtName: string | undefined,
): ZonalContact {
  const raw = districtName?.trim() ?? "";
  if (!raw) {
    return { authorisedPersonName: "", mobile: "" };
  }

  if (DISTRICT_TO_ZONAL[raw]) return DISTRICT_TO_ZONAL[raw];

  const lower = raw.toLowerCase();
  const ciKey = Object.keys(DISTRICT_TO_ZONAL).find(
    (k) => k.toLowerCase() === lower,
  );
  if (ciKey) return DISTRICT_TO_ZONAL[ciKey];

  const n = normalizeDistrictName(raw);
  for (const k of Object.keys(DISTRICT_TO_ZONAL)) {
    if (normalizeDistrictName(k) === n) return DISTRICT_TO_ZONAL[k];
  }

  for (const k of Object.keys(DISTRICT_TO_ZONAL)) {
    const nk = normalizeDistrictName(k);
    const shorter = n.length <= nk.length ? n : nk;
    const longer = n.length > nk.length ? n : nk;
    if (shorter.length >= 4 && longer.includes(shorter))
      return DISTRICT_TO_ZONAL[k];
  }

  let best: { key: string; dist: number } | null = null;
  for (const k of Object.keys(DISTRICT_TO_ZONAL)) {
    const nk = normalizeDistrictName(k);
    const d = levenshtein(n, nk);
    const th = fuzzyThreshold(Math.max(n.length, nk.length));
    if (d <= th && (!best || d < best.dist)) best = { key: k, dist: d };
  }
  if (best) return DISTRICT_TO_ZONAL[best.key];

  return FALLBACK_ZONAL_CONTACT;
}

/** @deprecated Use {@link resolveZonalContact} (includes fuzzy + fallback). */
export function getZonalForDistrict(
  district: string | undefined,
): ZonalContact | null {
  if (!district?.trim()) return null;
  return resolveZonalContact(district);
}
