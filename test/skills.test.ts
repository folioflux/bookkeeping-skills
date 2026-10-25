import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseSkillMarkdown, validateSkills } from '../src/validate.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const skillsDir = `${root}skills`;
const exampleCsvPath = `${root}examples/bank-export-2026-01.csv`;

interface Row {
  row: number;
  date: string;
  description: string;
  moneyIn: number;
  moneyOut: number;
  balance: number;
}

/** A tiny reference parser for the synthetic example file, used to check the skills' examples. */
function parseExample(csv: string): Row[] {
  const lines = csv.trim().split('\n');
  return lines.slice(1).map((line, index) => {
    const [date = '', description = '', moneyIn = '', moneyOut = '', balance = ''] =
      line.split(',');
    return {
      row: index + 2,
      date,
      description,
      moneyIn: Math.round(Number(moneyIn || 0) * 100),
      moneyOut: Math.round(Number(moneyOut || 0) * 100),
      balance: Math.round(Number(balance) * 100),
    };
  });
}

const cents = (value: number) =>
  (value / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

describe('the skills in this repository', () => {
  it('are all valid', async () => {
    const result = await validateSkills(skillsDir, { root, readme: `${root}README.md` });
    expect(result.problems).toEqual([]);
    expect(result.skills.length).toBeGreaterThanOrEqual(3);
    expect(result.skills.length).toBeLessThanOrEqual(5);
  });

  it('use MIT licence metadata and a version', async () => {
    for (const name of await readdir(skillsDir)) {
      const { frontmatter } = parseSkillMarkdown(
        await readFile(`${skillsDir}/${name}/SKILL.md`, 'utf8'),
      );
      expect(frontmatter).toMatchObject({
        license: 'MIT',
        metadata: { author: 'FolioFlux', version: '0.1.0' },
      });
    }
  });

  it('embed exactly the synthetic example CSV', async () => {
    const csv = (await readFile(exampleCsvPath, 'utf8')).trim();
    for (const name of await readdir(skillsDir)) {
      const text = await readFile(`${skillsDir}/${name}/SKILL.md`, 'utf8');
      const blocks = [...text.matchAll(/```csv\n([\s\S]*?)```/gu)].map((match) =>
        (match[1] ?? '').trim(),
      );
      for (const block of blocks) expect(block).toBe(csv);
    }
  });
});

describe('the figures quoted in the skill examples', () => {
  it('match the synthetic example CSV', async () => {
    const rows = parseExample(await readFile(exampleCsvPath, 'utf8'));
    const moneyIn = rows.reduce((sum, row) => sum + row.moneyIn, 0);
    const moneyOut = rows.reduce((sum, row) => sum + row.moneyOut, 0);
    const first = rows[0];
    const last = rows.at(-1);
    if (!first || !last) throw new Error('example CSV has no rows');
    const opening = first.balance - first.moneyIn + first.moneyOut;

    // Each running balance moves by the row's amount.
    rows.reduce((previous, row) => {
      expect(row.balance).toBe(previous + row.moneyIn - row.moneyOut);
      return row.balance;
    }, opening);

    expect(rows.map((row) => row.row)).toEqual([2, 3, 4, 5, 6, 7]);
    expect(cents(moneyIn)).toBe('4,250.00');
    expect(cents(moneyOut)).toBe('1,098.79');
    expect(cents(moneyIn - moneyOut)).toBe('3,151.21');
    expect(cents(opening)).toBe('2,000.00');
    expect(cents(last.balance)).toBe('5,151.21');

    // reconcile-two-totals: the statement ends on 2026-01-27.
    const inPeriod = rows.filter((row) => row.date <= '2026-01-27');
    expect(cents(inPeriod.reduce((sum, row) => sum + row.moneyOut, 0))).toBe('1,086.29');
    expect(cents(moneyOut - 108629)).toBe('12.50');

    const statement = await readFile(`${root}examples/statement-summary-2026-01.txt`, 'utf8');
    expect(statement).toContain('Money out: 1,086.29');
    expect(statement).toContain(`Closing balance: ${cents(inPeriod.at(-1)?.balance ?? 0)}`);
    expect(statement).toContain(
      `Money in: ${cents(inPeriod.reduce((sum, row) => sum + row.moneyIn, 0))}`,
    );

    const skills = await Promise.all(
      ['cite-source-rows', 'explain-cash-flow-summary', 'reconcile-two-totals'].map((name) =>
        readFile(`${skillsDir}/${name}/SKILL.md`, 'utf8'),
      ),
    );
    const all = skills.join('\n');
    for (const figure of [
      '4,250.00',
      '1,098.79',
      '3,151.21',
      '5,151.21',
      '2,000.00',
      '1,086.29',
      '12.50',
    ]) {
      expect(all).toContain(figure);
    }
  });
});
