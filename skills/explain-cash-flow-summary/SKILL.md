---
name: explain-cash-flow-summary
description: Explain a cash-flow summary for a period in plain language - opening balance, money in, money out, net change and closing balance - using figures produced by a deterministic tool and citing the source rows behind each one. Use when the user asks what happened to their money over a month or another period, or asks you to explain a summary.
license: MIT
metadata:
  author: FolioFlux
  version: '0.1.0'
---

# Explain a cash-flow summary

Turn a period's figures into a short, plain explanation the user can check. The figures come from the engine; your job is to explain them clearly, show where they came from, and point out anything that does not add up.

## Ground rules

- The engine does the math; the AI only explains it. Opening and closing balances, money in, money out, net change and the largest rows all come from a deterministic tool (for example the read-only tools of an MCP server such as ledger-mcp, or a short script you run and show).
- Read-only: never change the user's files.
- Cite source rows for every figure. See the `cite-source-rows` skill for the format.
- Describe the past only. Do not forecast, project, budget or recommend actions, and do not label or judge transactions.
- Not financial, tax or legal advice.

## Inputs

- The rows for one period, already read with the `read-bank-csv` skill (so the columns and sign rule are known).
- The period's start and end dates. If the user did not give them, use the first and last transaction dates and say so.

## Steps

1. **Ask the engine for the summary** of the period: money in, money out and net change (money in minus money out), each with the rows used. If the file has a running balance, also get the opening balance (before the first row) and the closing balance (after the last row).
2. **Check that it adds up:** have the engine confirm that opening balance + net change = closing balance. If it does not, say so first and cite the rows involved; the `reconcile-two-totals` skill can help find out why.
3. **Ask the engine for the largest rows** by amount: up to three money-in rows and three money-out rows, each with its row number.
4. **Write the explanation** with the template below: the figures first, then two to four short sentences in plain language. Use the user's currency and the same number of decimals as the file.
5. **Stop there.** Offer follow-ups the data can answer (for example "show every money-out row"), not advice.

## Output template

```text
Period: <start> to <end>
Opening balance: <amount> [<file>: row <n>, balance before this row]
Money in: <amount> [<file>: rows ...]
Money out: <amount> [<file>: rows ...]
Net change: <+/- amount>
Closing balance: <amount> [<file>: row <n>]
Check: opening + net change = closing -> <matches | does not match by <amount>>
Largest money in: <amount> <description> on <date> [row <n>]; ...
Largest money out: <amount> <description> on <date> [row <n>]; ...

<Two to four plain sentences that explain the figures above.>
```

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

Explanation, using the figures the engine returned:

```text
Period: 2026-01-02 to 2026-01-28 (first and last transaction dates)
Opening balance: 2,000.00 [january.csv: row 2, balance 4,500.00 before money in of 2,500.00]
Money in: 4,250.00 [january.csv: rows 2, 5]
Money out: 1,098.79 [january.csv: rows 3, 4, 6, 7]
Net change: +3,151.21
Closing balance: 5,151.21 [january.csv: row 7]
Check: opening + net change = closing -> matches
Largest money in: 2,500.00 Client payment - Invoice 1001 on 2026-01-02 [row 2]; 1,750.00 Client payment - Invoice 1002 on 2026-01-15 [row 5]
Largest money out: 950.00 Office rent on 2026-01-05 [row 3]; 86.30 Train tickets on 2026-01-20 [row 6]; 49.99 Software licence on 2026-01-09 [row 4]

More money came in than went out in this period, so the balance rose by 3,151.21. Two client payments [rows 2, 5] make up all of the money in. Office rent [row 3] is the largest single payment out, at 950.00 of the 1,098.79 total.
```

## Edge cases

- **No balance column:** skip the opening and closing balance and the check, and say that the file has no balance to check against.
- **Several currencies:** summarize each currency separately; never add amounts in different currencies.
- **Partial period:** if the rows start after or end before the period the user asked about, say which dates are missing.
- **Comparisons with another period:** only if the engine computes both periods from the user's own data, each with its own citations.

## Disclaimer

Not financial, tax or legal advice.
