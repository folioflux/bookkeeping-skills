# Workshop dates: demo only

This tiny runnable example demonstrates two ideas from the public
[`read-bank-csv`](../skills/read-bank-csv/SKILL.md) and
[`cite-source-rows`](../skills/cite-source-rows/SKILL.md) instructions: require an
explicit date format and preserve source line references. All workshop events
are invented, non-bank data. This is not a skill implementation or product code.

From the repository root, with Node.js 24 or later:

```sh
node examples/workshop-dates.ts
```

The embedded sample is headerless:

```text
2026-03-04,Paper folding
03/04/2026,Clay workshop
```

The output is:

```json
[
  {
    "status": "accepted",
    "line": 1,
    "date": "2026-03-04",
    "label": "Paper folding"
  },
  {
    "status": "needs-format",
    "line": 2,
    "expected": "YYYY-MM-DD"
  }
]
```

`needs-format` has no guessed date value: the caller must supply an explicit
`YYYY-MM-DD` date. The accepted format uses ASCII digits, years 0001–9999, and
valid Gregorian calendar days. Other formats are never inferred or normalized.

Input is intentionally limited to one `date,label` pair per LF or CRLF line.
Labels contain ASCII letters separated by single spaces. No header, quoted cells,
escaped commas, embedded newlines, trimming, or delimiter detection is supported.
This is **not a general CSV parser**. Malformed rows return `invalid-row`;
impossible calendar dates return `invalid-date`. Every result includes the
original 1-based physical line, including blank lines. One final newline is
ignored; empty input yields no results.

The demo has no dependencies, file reads or writes, network calls, agent/model,
finance logic, or bank data at runtime. It inspects an in-memory string and prints
JSON to stdout. It does not compute or reconcile totals. Existing worked fixtures
and skills are unchanged.

After the repository's development dependencies are installed, run the focused test:

```sh
pnpm exec vitest run test/workshop-dates.test.ts
```

Not financial, tax or legal advice.
