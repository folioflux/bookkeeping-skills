---
name: reconcile-two-totals
description: Check whether two totals that should agree actually do - for example the sum of rows in a CSV export and the figure on a bank statement, or two exports of the same account - and explain any difference with the source rows behind it. Use when the user asks why two numbers do not match, or wants to confirm that an export is complete.
license: MIT
metadata:
  author: FolioFlux
  version: '0.1.0'
---

# Reconcile two totals

Two totals that should be equal often are not: one source covers a different period, a row was exported twice, or a sign was flipped. This skill compares the two totals, measures the difference with the engine, and explains it with the rows involved. It never changes either side to make them agree.

## Ground rules

- The engine does the math; the AI only explains it. Every total, difference and check below is computed by a deterministic tool (for example the read-only tools of an MCP server such as ledger-mcp, or a short script you run and show).
- Read-only: never edit the source files or "adjust" a figure to force a match.
- Cite source rows for every figure, candidate and conclusion. See the `cite-source-rows` skill for the format.
- Report what the data shows. Do not guess at causes the rows do not support, and do not call anything an error or fraud.
- Not financial, tax or legal advice.

## Inputs

- **Total A** and **Total B**, each with its source: a file and the rows it covers, or a document and the line where the figure appears.
- What each total measures (for example "money out"), its period and its currency.

If any of these is unclear, ask before you compare.

## Steps

1. **Confirm the two totals measure the same thing:** same account, same currency, same sign convention (is money out positive or negative?), and the same period with the same start and end dates. Note any mismatch; it is often the whole answer.
2. **Have the engine compute** A, B and the difference A minus B, to the smallest currency unit (for example cents).
3. **If the difference is zero,** report "Reconciled" with both totals and their sources, and stop.
4. **Otherwise run these checks with the engine**, in this order, and keep every one that matches:
   1. Rows dated outside the other source's period.
   2. A single row whose amount equals the difference.
   3. Possible duplicates: rows with the same date, amount and description.
   4. A possible sign flip: a row whose amount is half the difference (counting it with the wrong sign moves a total by twice its amount).
   5. If there is a running balance column, rows where the balance does not move by the row's amount (a sign of a missing row).
   6. Rounding or currency conversion, if amounts have more decimals than the currency uses or more than one currency appears.
5. **Have the engine recompute the difference after each candidate explanation** (for example "excluding rows dated after 2026-01-27"). Only call the difference explained when the recomputed difference is zero.
6. **Report** using the template below. List the remaining difference honestly if the checks do not explain all of it.

## Output template

```text
Status: Reconciled | Not reconciled
Total A: <amount> (<what it measures>, <period>) [<source>]
Total B: <amount> (<what it measures>, <period>) [<source>]
Difference (A - B): <amount>
Explained by:
  - <finding> [<file>: rows ...] -> difference after this: <amount>
Unexplained: <amount, or "none">
Next step: <what the user could check, e.g. "confirm the statement period">
```

## Example

Synthetic data. `january.csv` (rows 2-7, money out on rows 3, 4, 6 and 7):

```csv
Date,Description,Money in,Money out,Balance
2026-01-02,Client payment - Invoice 1001,2500.00,,4500.00
2026-01-05,Office rent,,950.00,3550.00
2026-01-09,Software licence,,49.99,3500.01
2026-01-15,Client payment - Invoice 1002,1750.00,,5250.01
2026-01-20,Train tickets,,86.30,5163.71
2026-01-28,Bank fee,,12.50,5151.21
```

The statement summary says: "Period: 2026-01-01 to 2026-01-27. Money out: 1,086.29."

```text
Status: Not reconciled
Total A: 1,098.79 (money out, 2026-01-02 to 2026-01-28) [january.csv: rows 3, 4, 6, 7]
Total B: 1,086.29 (money out, 2026-01-01 to 2026-01-27) [statement summary: "Money out"]
Difference (A - B): 12.50
Explained by:
  - The bank fee of 12.50 on 2026-01-28 is after the statement period ends [january.csv: row 7] -> difference after this: 0.00
Unexplained: none
Next step: compare against the next statement, which should include row 7.
```

## Edge cases

- **Both totals come from the same rows:** say so; that comparison proves nothing.
- **Several candidates match:** list them all and say which one the engine confirmed brings the difference to zero.
- **Large unexplained difference:** stop after the checks above and suggest which source the user should re-export or inspect. Do not invent rows.

## Disclaimer

Not financial, tax or legal advice.
