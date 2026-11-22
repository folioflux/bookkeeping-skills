import { describe, expect, it } from 'vitest';
import { inspectWorkshopDates } from '../examples/workshop-dates.ts';

describe('demo-only workshop date inspection', () => {
  it('accepts an explicit date and refuses to guess the next line', () => {
    expect(inspectWorkshopDates('2026-03-04,Paper folding\n03/04/2026,Clay workshop')).toEqual([
      { status: 'accepted', line: 1, date: '2026-03-04', label: 'Paper folding' },
      { status: 'needs-format', line: 2, expected: 'YYYY-MM-DD' },
    ]);
  });

  it.each(['2026-3-04', '04/03/2026', '2026-03-04T00:00:00Z', ' 2026-03-04'])(
    'does not infer or normalize the format of %s',
    (date) => {
      expect(inspectWorkshopDates(`${date},Workshop`)).toEqual([
        { status: 'needs-format', line: 1, expected: 'YYYY-MM-DD' },
      ]);
    },
  );

  it.each([
    '2026-02-29',
    '1900-02-29',
    '2026-04-31',
    '2026-00-01',
    '2026-13-01',
    '2026-01-00',
    '0000-01-01',
  ])('rejects impossible calendar date %s', (date) => {
    expect(inspectWorkshopDates(`${date},Workshop`)).toEqual([{ status: 'invalid-date', line: 1 }]);
  });

  it('accepts a leap day and CRLF with a final newline', () => {
    expect(inspectWorkshopDates('2000-02-29,Workshop\r\n')).toEqual([
      { status: 'accepted', line: 1, date: '2000-02-29', label: 'Workshop' },
    ]);
  });

  it.each([
    '2026-03-04',
    '2026-03-04,',
    ',Workshop',
    '2026-03-04,Clay,workshop',
    '2026-03-04,"Workshop"',
  ])('rejects unsupported row structure %s', (row) => {
    expect(inspectWorkshopDates(row)).toEqual([{ status: 'invalid-row', line: 1 }]);
  });

  it('keeps physical line numbers across blank lines', () => {
    expect(inspectWorkshopDates('\n03/04/2026,Workshop\n')).toEqual([
      { status: 'invalid-row', line: 1 },
      { status: 'needs-format', line: 2, expected: 'YYYY-MM-DD' },
    ]);
    expect(inspectWorkshopDates('')).toEqual([]);
  });
});
