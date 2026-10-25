# Contributing to bookkeeping-skills

Thanks for your interest in improving bookkeeping-skills. Fixes, clearer wording and better examples are welcome.

## Scope

This repository is deliberately small: a few simple, generic, stateless skills for basic bookkeeping literacy. New skills should be broadly useful and must follow the rules below. Please open an issue to discuss a new skill before writing it.

## Rules for every skill

- One folder per skill in `skills/`, containing a `SKILL.md` that follows the [Agent Skills specification](https://agentskills.io/specification). The folder name and the `name` field must match.
- Frontmatter: `name`, `description` (what the skill does and when to use it), `license: MIT`, and `metadata` with `author` and `version`.
- The body must include, word for word:
  - "The engine does the math; the AI only explains it."
  - "Not financial, tax, accounting or legal advice."
- Every figure the agent states must cite its source rows.
- Skills are read-only and never ask the agent to modify the user's files.
- No transaction labelling or rules, forecasts, tax guidance or advice.
- Examples use synthetic data only. If you reuse `examples/bank-export-2026-01.csv`, embed it exactly; a test checks this.
- Keep `SKILL.md` under 500 lines. Put longer reference material in files inside the skill folder and link to them with relative paths.
- Add the skill to the table in `README.md`.

## Ground rules

- Be kind and follow the [Code of Conduct](CODE_OF_CONDUCT.md).
- Never commit real bank, personal or financial data, or secrets.
- Report security problems privately, as described in [SECURITY.md](SECURITY.md).

## Development setup

You need Node.js 24 or later and pnpm (the version is pinned in `package.json`; `corepack enable` installs it).

```sh
git clone https://github.com/folioflux/bookkeeping-skills.git
cd bookkeeping-skills
pnpm install
pnpm run check
```

| Script               | What it does                                              |
| -------------------- | --------------------------------------------------------- |
| `pnpm validate`      | Validate every skill folder                               |
| `pnpm run lint`      | ESLint                                                    |
| `pnpm run format`    | Format with Prettier (`format:check` only checks)         |
| `pnpm run typecheck` | TypeScript, no output                                     |
| `pnpm run test`      | Vitest (validator tests and checks on the skill examples) |
| `pnpm run build`     | Compile the validator to `dist/`                          |
| `pnpm run check`     | All of the above                                          |

## Pull requests

1. Fork the repository and create a branch from `main`.
2. Make your change. Keep pull requests small and focused.
3. Run `pnpm run check`.
4. Update `CHANGELOG.md` when you add or change a skill.
5. Open a pull request and fill in the template.

Pull requests are squash-merged once CI passes and a maintainer has reviewed them.

## Licence

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
