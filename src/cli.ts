#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { formatProblem, validateSkills } from './validate.ts';

const USAGE = `Usage: validate-skills [skills-dir] [--readme <file>] [--no-readme]

Checks every skill folder in skills-dir (default: ./skills):
  - SKILL.md exists and starts with valid YAML frontmatter
  - frontmatter follows the Agent Skills specification (name, description, ...)
  - name matches the folder name
  - the body includes the required phrases and asks for source-row citations
  - relative links point to files inside the skill
  - the README links to every skill (README.md next to skills-dir, if present)
`;

async function main(): Promise<number> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      readme: { type: 'string' },
      'no-readme': { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  if (values.help) {
    process.stdout.write(USAGE);
    return 0;
  }

  const skillsDir = resolve(positionals[0] ?? 'skills');
  const defaultReadme = join(dirname(skillsDir), 'README.md');
  const readme = values['no-readme']
    ? undefined
    : (values.readme ?? (existsSync(defaultReadme) ? defaultReadme : undefined));

  const { skills, problems } = await validateSkills(skillsDir, {
    ...(readme === undefined ? {} : { readme: resolve(readme) }),
  });

  for (const problem of problems) process.stderr.write(`${formatProblem(problem)}\n`);
  if (problems.length > 0) {
    process.stderr.write(`\n${problems.length} problem(s) in ${skills.length} skill(s)\n`);
    return 1;
  }
  process.stdout.write(`All ${skills.length} skills are valid: ${skills.join(', ')}\n`);
  return 0;
}

try {
  process.exitCode = await main();
} catch (error) {
  process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 2;
}
