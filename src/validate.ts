import { readdir, readFile, stat } from 'node:fs/promises';
import { basename, join, relative, resolve, sep } from 'node:path';
import { parse } from 'yaml';

/** Phrases every skill body must contain, word for word. */
export const REQUIRED_PHRASES = [
  'The engine does the math; the AI only explains it.',
  'Not financial, tax or legal advice.',
] as const;

/** Frontmatter fields allowed by the Agent Skills specification (https://agentskills.io). */
export const ALLOWED_FIELDS = [
  'name',
  'description',
  'license',
  'compatibility',
  'metadata',
  'allowed-tools',
] as const;

/** Recommended maximum length of a SKILL.md file, in lines. */
export const MAX_SKILL_LINES = 500;

const NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

/** One problem found in a file. `line` is 1-based when known. */
export interface Problem {
  file: string;
  line?: number;
  message: string;
}

/** The parts of a SKILL.md file. */
export interface ParsedSkill {
  frontmatter: unknown;
  body: string;
  /** 1-based line number where the body starts. */
  bodyLine: number;
}

/** Splits a SKILL.md file into YAML frontmatter and Markdown body. Throws on a malformed file. */
export function parseSkillMarkdown(text: string): ParsedSkill {
  const source = text.replace(/^\uFEFF/u, '').replace(/\r\n?/gu, '\n');
  const lines = source.split('\n');
  if (lines[0] !== '---') {
    throw new SyntaxError('SKILL.md must start with a "---" line that opens the YAML frontmatter');
  }
  const end = lines.indexOf('---', 1);
  if (end === -1) {
    throw new SyntaxError('YAML frontmatter is not closed with a "---" line');
  }
  const yamlText = lines.slice(1, end).join('\n');
  let frontmatter: unknown;
  try {
    frontmatter = parse(yamlText, { uniqueKeys: true, prettyErrors: false }) as unknown;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new SyntaxError(`Frontmatter is not valid YAML: ${reason}`, { cause: error });
  }
  return { frontmatter, body: lines.slice(end + 1).join('\n'), bodyLine: end + 2 };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Validates frontmatter against the Agent Skills specification. Returns problem messages. */
export function validateFrontmatter(frontmatter: unknown, directoryName: string): string[] {
  const problems: string[] = [];
  if (!isRecord(frontmatter)) {
    return ['Frontmatter must be a YAML mapping with at least "name" and "description"'];
  }

  for (const key of Object.keys(frontmatter)) {
    if (!(ALLOWED_FIELDS as readonly string[]).includes(key)) {
      problems.push(`Unknown frontmatter field "${key}" (allowed: ${ALLOWED_FIELDS.join(', ')})`);
    }
  }

  const { name, description, license, compatibility, metadata } = frontmatter;
  const allowedTools = frontmatter['allowed-tools'];

  if (typeof name !== 'string' || name === '') {
    problems.push('"name" is required and must be a non-empty string');
  } else {
    if (name.length > 64) problems.push('"name" must be at most 64 characters');
    if (!NAME_PATTERN.test(name)) {
      problems.push(
        '"name" may only contain lowercase letters, digits and single hyphens, and must not start or end with a hyphen',
      );
    }
    if (name !== directoryName) {
      problems.push(`"name" (${name}) must match the directory name (${directoryName})`);
    }
  }

  if (typeof description !== 'string' || description.trim() === '') {
    problems.push('"description" is required and must be a non-empty string');
  } else {
    if (description.length > 1024) problems.push('"description" must be at most 1024 characters');
    if (/[<>]/u.test(description)) problems.push('"description" must not contain "<" or ">"');
  }

  if (license !== undefined && (typeof license !== 'string' || license.trim() === '')) {
    problems.push('"license" must be a non-empty string');
  }

  if (compatibility !== undefined) {
    if (typeof compatibility !== 'string' || compatibility.trim() === '') {
      problems.push('"compatibility" must be a non-empty string');
    } else if (compatibility.length > 500) {
      problems.push('"compatibility" must be at most 500 characters');
    }
  }

  if (metadata !== undefined) {
    if (!isRecord(metadata)) {
      problems.push('"metadata" must be a mapping of string keys to string values');
    } else {
      for (const [key, value] of Object.entries(metadata)) {
        if (typeof value !== 'string') {
          problems.push(`"metadata.${key}" must be a string (quote numbers such as "1.0")`);
        }
      }
    }
  }

  if (allowedTools !== undefined && typeof allowedTools !== 'string') {
    problems.push('"allowed-tools" must be a space-separated string');
  }

  return problems;
}

/** Relative Markdown link targets in a body, for example `references/formats.md`. */
export function relativeLinks(body: string): string[] {
  const links: string[] = [];
  for (const match of body.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/gu)) {
    const target = match[1] ?? '';
    if (/^(?:[a-z][a-z0-9+.-]*:|#|\/)/iu.test(target)) continue;
    links.push(target.split('#')[0] ?? target);
  }
  return links.filter((link) => link !== '');
}

/** Checks the body for this repository's rules. Returns problem messages. */
export function validateBody(body: string): string[] {
  const problems: string[] = [];
  if (body.trim() === '') problems.push('The body after the frontmatter must not be empty');
  for (const phrase of REQUIRED_PHRASES) {
    if (!body.includes(phrase)) problems.push(`The body must include: "${phrase}"`);
  }
  if (!/source rows?/iu.test(body)) {
    problems.push('The body must tell the agent to cite source rows');
  }
  return problems;
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/** Validates one skill directory. */
export async function validateSkill(skillDir: string, root = process.cwd()): Promise<Problem[]> {
  const file = relative(root, join(skillDir, 'SKILL.md')) || 'SKILL.md';
  const skillPath = join(skillDir, 'SKILL.md');
  if (!(await exists(skillPath))) {
    return [{ file: relative(root, skillDir) || '.', message: 'Missing SKILL.md' }];
  }

  const text = await readFile(skillPath, 'utf8');
  let parsed: ParsedSkill;
  try {
    parsed = parseSkillMarkdown(text);
  } catch (error) {
    return [{ file, line: 1, message: error instanceof Error ? error.message : String(error) }];
  }

  const problems: Problem[] = [
    ...validateFrontmatter(parsed.frontmatter, basename(skillDir)).map((message) => ({
      file,
      line: 1,
      message,
    })),
    ...validateBody(parsed.body).map((message) => ({ file, message })),
  ];

  const lineCount = text.split('\n').length;
  if (lineCount > MAX_SKILL_LINES) {
    problems.push({
      file,
      message: `SKILL.md has ${lineCount} lines; keep it under ${MAX_SKILL_LINES}`,
    });
  }

  const skillRoot = resolve(skillDir);
  for (const link of relativeLinks(parsed.body)) {
    const target = resolve(skillRoot, decodeURI(link));
    if (target !== skillRoot && !target.startsWith(skillRoot + sep)) {
      problems.push({ file, message: `Link "${link}" points outside the skill directory` });
    } else if (!(await exists(target))) {
      problems.push({ file, message: `Link "${link}" points to a file that does not exist` });
    }
  }

  return problems;
}

/** The result of validating a skills directory. */
export interface ValidationResult {
  skills: string[];
  problems: Problem[];
}

/** Options for `validateSkills`. */
export interface ValidateOptions {
  /** Base directory for file names in problems. Defaults to the current directory. */
  root?: string;
  /** When given, this Markdown file must link to every skill as `skills/<name>`. */
  readme?: string;
}

/** Validates every directory inside `skillsDir`. */
export async function validateSkills(
  skillsDir: string,
  options: ValidateOptions = {},
): Promise<ValidationResult> {
  const root = options.root ?? process.cwd();
  const problems: Problem[] = [];
  const entries = await readdir(skillsDir, { withFileTypes: true });
  const skills = entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort();

  if (skills.length === 0) {
    problems.push({ file: relative(root, skillsDir) || '.', message: 'No skills found' });
  }
  for (const entry of entries) {
    if (entry.isFile() && !entry.name.startsWith('.')) {
      problems.push({
        file: relative(root, join(skillsDir, entry.name)),
        message: 'Only skill directories belong here; move this file into a skill or remove it',
      });
    }
  }

  for (const skill of skills) {
    problems.push(...(await validateSkill(join(skillsDir, skill), root)));
  }

  if (options.readme !== undefined) {
    const readme = await readFile(options.readme, 'utf8');
    const file = relative(root, options.readme) || options.readme;
    for (const skill of skills) {
      if (!readme.includes(`skills/${skill}`)) {
        problems.push({ file, message: `README does not link to skills/${skill}` });
      }
    }
  }

  return { skills, problems };
}

/** Formats a problem as `file:line: message`. */
export function formatProblem(problem: Problem): string {
  return `${problem.file}${problem.line === undefined ? '' : `:${problem.line}`}: ${problem.message}`;
}
