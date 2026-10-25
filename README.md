# bookkeeping-skills

[![CI](https://github.com/folioflux/bookkeeping-skills/actions/workflows/ci.yml/badge.svg)](https://github.com/folioflux/bookkeeping-skills/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Small, generic agent skills for basic bookkeeping literacy: reading a bank CSV, citing the source rows behind every number, reconciling two totals and explaining a cash-flow summary.

> **Status:** early (v0.1.0). The skills may change before 1.0.

## What it is

A handful of [Agent Skills](https://agentskills.io) (folders with a `SKILL.md` file) that teach an AI agent how to talk about bank and ledger data carefully. Every skill follows the same rules:

- **The engine does the math; the AI only explains it.** Totals, counts and differences come from a deterministic tool, such as the read-only tools of an MCP server like [ledger-mcp](https://github.com/folioflux/ledger-mcp), a script the agent runs and shows, or a spreadsheet formula. The agent explains the results; it does not add up numbers itself.
- **Every number cites its source rows,** for example `[january.csv: rows 2, 5]`, so the user can check it.
- **Read-only.** The agent never edits the user's files.
- **Generic and stateless.** The skills describe and explain data. They do not label transactions, forecast, or give advice.
- **Not financial, tax or legal advice.**

## Skills

| Skill                                                                    | What it does                                                                                                |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| [`read-bank-csv`](skills/read-bank-csv/SKILL.md)                         | Profiles a bank CSV before answering: columns, date and number formats, sign rule, row count, skipped rows. |
| [`cite-source-rows`](skills/cite-source-rows/SKILL.md)                   | Defines how to cite rows (`[file: rows 2-7]`) and how to check every citation before answering.             |
| [`reconcile-two-totals`](skills/reconcile-two-totals/SKILL.md)           | Compares two totals that should agree and explains any difference with the rows behind it.                  |
| [`explain-cash-flow-summary`](skills/explain-cash-flow-summary/SKILL.md) | Explains a period's opening balance, money in, money out, net change and closing balance in plain language. |

## Install

Each skill is a self-contained folder. Copy the ones you want into the skills folder that your agent client reads; see your client's documentation for where that is (for some clients it is a `skills/` folder in the project or in your home directory).

```sh
git clone https://github.com/folioflux/bookkeeping-skills.git
cp -R bookkeeping-skills/skills/read-bank-csv bookkeeping-skills/skills/cite-source-rows <your-client-skills-folder>/
```

The skills work best together, and with a tool that can read CSV files and compute totals (for example an MCP server or a code-execution tool).

## Quick start

1. Install the four skills.
2. Give your agent the synthetic example file [`examples/bank-export-2026-01.csv`](examples/bank-export-2026-01.csv).
3. Ask, for example:
   - "Read this bank export and tell me what is in it."
   - "Explain the cash flow for January."
   - "The statement in `examples/statement-summary-2026-01.txt` says money out was 1,086.29. Why does the CSV not match?"

Each skill's `SKILL.md` contains a worked example with the expected shape of the answer, built from that same synthetic file. A test checks that the figures in those examples match the file.

## Examples

A cash-flow explanation in the format defined by `explain-cash-flow-summary`:

```text
Period: 2026-01-02 to 2026-01-28 (first and last transaction dates)
Money in: 4,250.00 [january.csv: rows 2, 5]
Money out: 1,098.79 [january.csv: rows 3, 4, 6, 7]
Net change: +3,151.21
Closing balance: 5,151.21 [january.csv: row 7]
Check: opening + net change = closing -> matches
```

A reconciliation in the format defined by `reconcile-two-totals`:

```text
Status: Not reconciled
Difference (A - B): 12.50
Explained by:
  - The bank fee of 12.50 on 2026-01-28 is after the statement period ends [january.csv: row 7] -> difference after this: 0.00
Unexplained: none
```

## Validation

`pnpm validate` checks every skill folder:

- `SKILL.md` exists and starts with valid YAML frontmatter,
- the frontmatter follows the [Agent Skills specification](https://agentskills.io/specification): `name` (lowercase, hyphens, at most 64 characters, matching the folder), `description` (at most 1024 characters), and only the optional fields `license`, `compatibility`, `metadata` and `allowed-tools`,
- the body includes "The engine does the math; the AI only explains it." and "Not financial, tax or legal advice.", and asks for source-row citations,
- relative links stay inside the skill and point to files that exist,
- this README links to every skill.

```sh
pnpm install
pnpm validate
```

CI runs the validator, lint, typecheck, tests and build on every pull request.

## Limits

- The skills are instructions, not code. How well they are followed depends on the agent and model you use.
- They need a deterministic tool for the numbers. Without one, the agent should say so rather than calculate in its head.
- Only basic, generic tasks are covered. There is no transaction labelling, forecasting, tax or advice.
- The examples assume a simple CSV layout. Real bank exports vary; the `read-bank-csv` skill asks the agent to state its assumptions.
- Use synthetic or your own data only, and review what your agent client sends to its model provider.

## Contributing

Bug reports and focused pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md). Please report security problems privately, as described in [SECURITY.md](SECURITY.md).

## License

Released under the [MIT License](LICENSE).

## About

Made by [FolioFlux](https://folioflux.com). Questions: [hello@folioflux.com](mailto:hello@folioflux.com). Security reports: [security@folioflux.com](mailto:security@folioflux.com).

Not financial, tax or legal advice.
