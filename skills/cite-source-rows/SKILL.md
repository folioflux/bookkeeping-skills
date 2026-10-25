---
name: cite-source-rows
description: 'Cite the exact source rows behind every number in an answer about bank or ledger data, for example "[january.csv: rows 2, 5-7]". Use whenever you state a total, count, balance, date or amount taken from a CSV export, spreadsheet or ledger tool, and when the user asks where a number came from.'
license: MIT
metadata:
  author: FolioFlux
  version: '0.1.0'
---

# Cite source rows

Every number you state about someone's money must point back to the rows it came from, so the user can check it in seconds. This skill defines how to cite rows and how to check your citations before you answer. Use it together with the other bookkeeping skills.

## Ground rules

- The engine does the math; the AI only explains it. Totals, counts and differences come from a deterministic tool (for example the read-only tools of an MCP server such as ledger-mcp, a script you run, or a spreadsheet formula), never from adding numbers in your head.
- Read-only: never change, re-save or reformat the user's files.
- Cite source rows for every figure. If you cannot cite a number, do not state it.
- Not financial, tax, accounting or legal advice.

## What a row number means

- Use the row numbers that the engine returns. If it reports its own row IDs, use those and say so once.
- If you read a file yourself, a row number is the 1-based line number in the file, so it matches what the user sees in a spreadsheet: the header is usually row 1 and the first transaction row 2. Lines before the header (a bank's preamble) still count.
- Always name the file when there is more than one, and do not renumber rows after sorting or filtering.

## Citation format

Put the citation right after the figure it supports:

- One row: `[january.csv: row 4]`
- Several rows: `[january.csv: rows 2, 5, 9]`
- A continuous range: `[january.csv: rows 2-7]`
- Several files: `[january.csv: rows 2-7; february.csv: rows 2-4]`

For a figure built from many rows (more than about 20), cite the range or the engine query that produced it, and offer to list every row.

When a single row is the whole answer, quote it so the user does not have to open the file:

> Bank fee of 12.50 on 2026-01-28 [january.csv: row 7]

## Steps

1. Get every figure from the engine together with the rows it used. Ask the engine for row numbers if it did not return them.
2. Write the answer, citing rows right after each figure.
3. Check each citation before you send the answer:
   - the cited rows exist in the file or engine result,
   - the quoted dates, descriptions and amounts match those rows exactly,
   - the figure is what the engine returned for exactly those rows.
4. Remove or correct any figure that fails a check. If something cannot be checked, say so plainly instead of guessing.

## Example

Synthetic data, `january.csv`:

```csv
Date,Description,Money in,Money out,Balance
2026-01-02,Client payment - Invoice 1001,2500.00,,4500.00
2026-01-05,Office rent,,950.00,3550.00
2026-01-09,Software licence,,49.99,3500.01
2026-01-15,Client payment - Invoice 1002,1750.00,,5250.01
2026-01-20,Train tickets,,86.30,5163.71
2026-01-28,Bank fee,,12.50,5151.21
```

Question: "How much came in during January?"

Good answer, after the engine returned a total of 4250.00 for rows 2 and 5:

> Money in for January was 4,250.00 [january.csv: rows 2, 5]: two client payments of 2,500.00 on 2026-01-02 [row 2] and 1,750.00 on 2026-01-15 [row 5].

Not acceptable:

- "About 4,000 came in" (no citation, rounded without saying so).
- Citing rows 2-7 for money in (rows 3, 4, 6 and 7 are money out).
- A total you added up yourself instead of getting it from the engine.

## Disclaimer

Not financial, tax, accounting or legal advice.
