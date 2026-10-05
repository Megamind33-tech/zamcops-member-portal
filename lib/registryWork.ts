// Validation and parsing for the works register edited from the staff console.

/** T-123.456.789-0, accepting the same code typed with other punctuation. Null when it cannot be one. */
export function normaliseIswc(raw: string): string | null {
  const s = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const m = /^T(\d{3})(\d{3})(\d{3})(\d)$/.exec(s);
  return m ? `T-${m[1]}.${m[2]}.${m[3]}-${m[4]}` : null;
}

/** CCXXXYYNNNNN (12 characters), accepting hyphens and spaces. Null when it cannot be one. */
export function normaliseIsrc(raw: string): string | null {
  const s = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(s) ? s : null;
}

export type Ident = { code: string; label: string; value: string };

export function parseJson<T>(s: string, fallback: T): T {
  try {
    const v = JSON.parse(s);
    return (v ?? fallback) as T;
  } catch {
    return fallback;
  }
}

/** The ISWC / ISRC columns follow whatever the identifier list says. */
export function pickCodes(ids: Ident[]) {
  const find = (re: RegExp) => ids.find((i) => re.test(`${i.code} ${i.label}`))?.value ?? "";
  return { iswc: find(/iswc/i), isrc: find(/isrc/i) };
}
