import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  REQUIRED_PHRASES,
  formatProblem,
  parseSkillMarkdown,
  relativeLinks,
  validateBody,
  validateFrontmatter,
  validateSkills,
} from '../src/validate.ts';

const GOOD_BODY = `
# Example

${REQUIRED_PHRASES.join('\n\n')}

Always cite the source rows.
`;

function skill(frontmatter: string, body = GOOD_BODY): string {
  return `---\n${frontmatter}\n---\n${body}`;
}

async function makeSkills(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'skills-'));
  for (const [path, content] of Object.entries(files)) {
    const full = join(root, path);
    await mkdir(join(full, '..'), { recursive: true });
    await writeFile(full, content, 'utf8');
  }
  return root;
}

describe('parseSkillMarkdown', () => {
  it('splits frontmatter and body', () => {
    const parsed = parseSkillMarkdown('---\nname: a\ndescription: b\n---\n# Body\n');
    expect(parsed.frontmatter).toEqual({ name: 'a', description: 'b' });
    expect(parsed.body).toBe('# Body\n');
    expect(parsed.bodyLine).toBe(5);
  });

  it('accepts CRLF line endings and a byte order mark', () => {
    expect(parseSkillMarkdown('\uFEFF---\r\nname: a\r\n---\r\nx').frontmatter).toEqual({
      name: 'a',
    });
  });

  it('rejects missing or unclosed frontmatter', () => {
    expect(() => parseSkillMarkdown('# No frontmatter')).toThrow(/must start with/);
    expect(() => parseSkillMarkdown('---\nname: a\n')).toThrow(/not closed/);
  });

  it('rejects invalid YAML and duplicate keys', () => {
    expect(() => parseSkillMarkdown('---\ndescription: a: b: c\n---\n')).toThrow(/not valid YAML/);
    expect(() => parseSkillMarkdown('---\nname: a\nname: b\n---\n')).toThrow(/not valid YAML/);
  });
});

describe('validateFrontmatter', () => {
  const valid = { name: 'read-bank-csv', description: 'Reads a CSV. Use when...' };

  it('accepts valid frontmatter with optional fields', () => {
    expect(
      validateFrontmatter(
        {
          ...valid,
          license: 'MIT',
          compatibility: 'Any agent client',
          metadata: { author: 'FolioFlux', version: '0.1.0' },
          'allowed-tools': 'Read',
        },
        'read-bank-csv',
      ),
    ).toEqual([]);
  });

  it.each<[Record<string, unknown>, RegExp]>([
    [{ description: 'x' }, /"name" is required/],
    [{ ...valid, name: 'Read-Bank' }, /lowercase/],
    [{ ...valid, name: '-read' }, /lowercase/],
    [{ ...valid, name: 'read--csv' }, /lowercase/],
    [{ ...valid, name: 'a'.repeat(65) }, /at most 64/],
    [{ ...valid, name: 'other-name' }, /must match the directory name/],
    [{ name: 'read-bank-csv' }, /"description" is required/],
    [{ ...valid, description: '   ' }, /"description" is required/],
    [{ ...valid, description: 'x'.repeat(1025) }, /at most 1024/],
    [{ ...valid, description: 'Use <b>this</b>' }, /must not contain/],
    [{ ...valid, license: 3 }, /"license"/],
    [{ ...valid, compatibility: 'x'.repeat(501) }, /at most 500/],
    [{ ...valid, metadata: { version: 1 } }, /"metadata.version" must be a string/],
    [{ ...valid, metadata: ['a'] }, /"metadata" must be a mapping/],
    [{ ...valid, 'allowed-tools': ['Read'] }, /"allowed-tools"/],
    [{ ...valid, version: '1' }, /Unknown frontmatter field "version"/],
  ])('rejects %j', (frontmatter, message) => {
    // The long-name case should only report its length, so use the name as the directory.
    const directory =
      typeof frontmatter.name === 'string' && frontmatter.name.length > 64
        ? frontmatter.name
        : 'read-bank-csv';
    expect(validateFrontmatter(frontmatter, directory).join('\n')).toMatch(message);
  });

  it('rejects non-mapping frontmatter', () => {
    expect(validateFrontmatter('just text', 'x')).toHaveLength(1);
    expect(validateFrontmatter(null, 'x')).toHaveLength(1);
  });
});

describe('validateBody', () => {
  it('accepts a body with the required phrases and citations', () => {
    expect(validateBody(GOOD_BODY)).toEqual([]);
  });

  it('requires each phrase, citations and content', () => {
    expect(validateBody('')).toHaveLength(4);
    expect(validateBody(GOOD_BODY.replace(REQUIRED_PHRASES[1], ''))).toEqual([
      `The body must include: "${REQUIRED_PHRASES[1]}"`,
    ]);
    expect(validateBody(REQUIRED_PHRASES.join(' '))).toEqual([
      'The body must tell the agent to cite source rows',
    ]);
  });
});

describe('relativeLinks', () => {
  it('finds relative links and skips URLs, anchors and absolute paths', () => {
    expect(
      relativeLinks(
        '[a](references/a.md) [b](https://example.com) [c](#top) [d](mailto:x@y.z) [e](/abs) [f](assets/t.csv#L2 "title")',
      ),
    ).toEqual(['references/a.md', 'assets/t.csv']);
  });
});

describe('validateSkills', () => {
  const frontmatter = (name: string) =>
    `name: ${name}\ndescription: Does a thing. Use when needed.`;

  it('passes a valid skills directory', async () => {
    const root = await makeSkills({
      'skills/one/SKILL.md': skill(
        frontmatter('one'),
        `${GOOD_BODY}\nSee [notes](references/notes.md).`,
      ),
      'skills/one/references/notes.md': '# Notes',
      'skills/two/SKILL.md': skill(frontmatter('two')),
      'README.md': '[one](skills/one) [two](skills/two)',
    });
    const result = await validateSkills(join(root, 'skills'), {
      root,
      readme: join(root, 'README.md'),
    });
    expect(result).toEqual({ skills: ['one', 'two'], problems: [] });
  });

  it('reports every kind of problem with file names', async () => {
    const root = await makeSkills({
      'skills/missing/.keep': '',
      'skills/bad-name/SKILL.md': skill(frontmatter('wrong')),
      'skills/bad-link/SKILL.md': skill(
        frontmatter('bad-link'),
        `${GOOD_BODY}\n[x](nope.md) [y](../bad-name/SKILL.md)`,
      ),
      'skills/long/SKILL.md': skill(frontmatter('long'), `${GOOD_BODY}${'\n'.repeat(600)}`),
      'skills/stray.md': '# stray',
      'README.md': '[one](skills/bad-name)',
    });
    const { problems } = await validateSkills(join(root, 'skills'), {
      root,
      readme: join(root, 'README.md'),
    });
    const text = problems.map(formatProblem).join('\n');
    expect(text).toContain('skills/missing: Missing SKILL.md');
    expect(text).toContain(
      'skills/bad-name/SKILL.md:1: "name" (wrong) must match the directory name (bad-name)',
    );
    expect(text).toContain('Link "nope.md" points to a file that does not exist');
    expect(text).toContain('Link "../bad-name/SKILL.md" points outside the skill directory');
    expect(text).toMatch(/skills\/long\/SKILL\.md: SKILL\.md has \d+ lines/);
    expect(text).toContain('skills/stray.md: Only skill directories belong here');
    expect(text).toContain('README.md: README does not link to skills/long');
  });

  it('reports an empty skills directory', async () => {
    const root = await makeSkills({ 'skills/.gitkeep': '' });
    const { problems } = await validateSkills(join(root, 'skills'), { root });
    expect(problems.map(formatProblem)).toEqual(['skills: No skills found']);
  });
});
