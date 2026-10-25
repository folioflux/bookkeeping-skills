---
name: read-bank-csv
description: Read a bank CSV export safely and describe it before answering questions about it - columns, date and number formats, which sign means money in or out, row count, date range and any rows that could not be read. Use when the user shares or points to a bank, card or ledger CSV file, or asks what is in an export.
license: MIT
metadata:
  author: FolioFlux
  version: '0.1.0'
---

# Read a bank CSV

Before answering any question about a bank export, work out how the file is laid out and tell the user what you found. Most wrong answers about bank data come from a misread column, date format or sign, not from bad arithmetic.

## Ground rules

- The engine does the math; the AI only explains it. Use a deterministic tool to parse the file, count rows and find the date range (for example the read-only tools of an MCP server such as ledger-mcp, or a short script you run and show). Do not count or add rows by reading them yourself.
- Read-only: open the file for reading only. Never edit, re-save, sort or "clean" the user's file. Work on a copy if a tool needs one.
- Cite source rows (file and row number) for every count, date and amount you report. See the `cite-source-rows` skill for the format.
- Stay generic: describe the file. Do not label, group or judge the transactions in this skill.
- Not financial, tax or legal advice.

## Steps

1. **Find the header row.** Some exports start with a few lines of account details. The header is the first line whose cells look like column names (Date, Description, Amount, ...). Row numbers still count every line in the file, including the preamble.
2. **Detect the basics:** delimiter (comma, semicolon or tab), text encoding, and whether values are quoted. A semicolon delimiter often goes with a decimal comma.
3. **Map the columns** to these roles, and say which column you used for each:
   - date (and value date, if there are two),
   - description or payee,
   - amount: either one signed column, or a pair such as Money in / Money out or Debit / Credit,
   - balance (optional, running balance after each row),
   - currency (optional).
4. **Work out the formats** and state each assumption:
   - Dates: `2026-01-31`, `31/01/2026` or `01/31/2026`. If every day value is 12 or less, the format is ambiguous: ask the user rather than guess.
   - Numbers: decimal point or decimal comma, thousands separators, currency symbols, and negatives written as `-12.50`, `(12.50)` or `12.50 DR`.
   - Signs: is money out negative, positive in a separate column, or marked by a Debit/Credit flag? If there is a balance column, check one or two rows: the balance should move by the row's amount in the direction you assumed.
5. **Run the engine** to parse the file with those settings and return: number of transaction rows, first and last date, any rows it skipped and why (blank lines, a summary line such as "Closing balance", unparseable dates or amounts), and the currency if present.
6. **Report the file profile** using the template below, then answer the user's actual question.

## Output template

```text
File: <name> (read-only)
Layout: <delimiter>, header on row <n>, <encoding>
Columns: <column> -> date (<format>); <column> -> description; <column(s)> -> amount (<sign rule>); <column> -> balance
Transactions: <count> [<file>: rows <first>-<last>]
Date range: <first date> to <last date> [<file>: rows <a>, <b>]
Skipped: <row and reason, or "none">
Assumptions: <anything you assumed, or "none">
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

Profile, after the engine parsed the file:

```text
File: january.csv (read-only)
Layout: comma-separated, header on row 1, UTF-8
Columns: Date -> date (YYYY-MM-DD); Description -> description; Money in / Money out -> amount (Money out is money leaving the account); Balance -> balance
Transactions: 6 [january.csv: rows 2-7]
Date range: 2026-01-02 to 2026-01-28 [january.csv: rows 2, 7]
Skipped: none
Assumptions: none. The balance on row 3 (3550.00) is the balance on row 2 (4500.00) minus 950.00, which confirms the sign rule.
```

## Edge cases

- **Several files:** profile each file separately. Do not merge files with different layouts until the user confirms the mapping.
- **Overlapping exports:** if two files cover the same dates, say so; the same transactions may appear in both.
- **Pending or reversed rows:** report them as the file shows them. Do not drop them silently.
- **Very large files:** report the profile from the engine; do not paste the file into the conversation.
- **Personal data:** do not repeat account numbers or other identifiers from the preamble unless the user asks.

## Disclaimer

Not financial, tax or legal advice.
