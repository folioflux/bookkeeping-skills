// Demo only: invented workshop events, not a general CSV parser or product code.
type Result =
  | { status: 'accepted'; line: number; date: string; label: string }
  | { status: 'needs-format'; line: number; expected: 'YYYY-MM-DD' }
  | { status: 'invalid-row' | 'invalid-date'; line: number };

/** Headerless date,label lines; no quoting, escaping, trimming or format inference. */
export function inspectWorkshopDates(input: string): Result[] {
  const lines = input.split(/\r?\n/);
  // Permit one final newline without inventing an extra row.
  if (lines.at(-1) === '') lines.pop();
  return lines.map((row, index): Result => {
    const line = index + 1;
    const cells = row.split(',');
    const [date, label] = cells;
    if (cells.length !== 2 || !date || !label || !/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(label)) {
      return { status: 'invalid-row', line };
    }
    // Explicit allowlist: never pass an unknown date format to Date.parse.
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)) {
      return { status: 'needs-format', line, expected: 'YYYY-MM-DD' };
    }
    const year = Number(date.slice(0, 4));
    const month = Number(date.slice(5, 7));
    const day = Number(date.slice(8, 10));
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (year === 0 || month < 1 || month > 12 || day < 1 || day > (days[month - 1] ?? 0)) {
      return { status: 'invalid-date', line };
    }
    return { status: 'accepted', line, date, label };
  });
}

if (import.meta.main) {
  const sample = '2026-03-04,Paper folding\n03/04/2026,Clay workshop';
  console.log(JSON.stringify(inspectWorkshopDates(sample), null, 2));
}
