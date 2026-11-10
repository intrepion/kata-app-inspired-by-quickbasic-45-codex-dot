# Bytewell

**A little code. A little wonder.**

An original, local-first BASIC workbench inspired by QuickBASIC 4.5. Part of the [Kata Tool Shed](https://intrepion.github.io/tools/).

Write a small program, run it, draw something, pause, step, and watch its variables. Bytewell is a learning project with a deliberately limited BASIC dialect. It is **not Microsoft QuickBASIC, a DOS emulator, or a source-compatible QuickBASIC compiler**. No Microsoft code, binaries, artwork, or bundled example programs are included.

## Start locally

Node.js 22 or newer. No package installation or network dependencies are needed.

```sh
npm run dev
```

Open **http://127.0.0.1:4173/** in your browser. Always use the HTTP server. Do not open `index.html` through a `file://` URL.

```sh
npm run check
npm test
npm run build
```

`dist/` contains a self-contained static app. All paths are relative, including subpath hosting. This repository is prepared locally; no repository or public app URL has been provisioned by this work.

## The workbench

- Highlighted source editor with line numbers, next-statement marker and line-specific errors.
- Run / Continue (F5), Step (F8), Pause (Esc), Reset, and automatic scalar-variable inspection.
- Immediate single statements share the program's variable state.
- Text output and a 640 × 480 drawing canvas with a sixteen-color palette.
- Five original examples: Orbit study, Hello world, Fibonacci steps, Guess the number, Color blocks.
- INPUT forms pause without blocking the browser. Invalid numeric input is recoverable.
- Save on this browser, automatic draft recovery, plain UTF-8 `.bas` import and export, and a replacement confirmation for changed source.
- In-app language guide, keyboard controls, accessible form labels, and a stacked narrow layout.

First visit runs the original Orbit study. Returning visits restore the draft without executing it. Editing or replacing source resets execution; pause keeps the current execution position. STOP is resumable. Run after completion starts fresh.

## Language reference

One statement per physical source line. Keywords and names are case-insensitive. Optional numeric line labels and named labels are supported; a named label occupies its own line. Execution follows source order, not sorted line numbers. REM and apostrophe comments are supported. Double a quote inside a string to escape it.

| Area | Supported |
| --- | --- |
| Variables | `name = expression`, optional `LET`, numeric scalars and `$` string scalars |
| Output | `PRINT` / `?`; `;` joins output, `,` advances to 14-column zones, trailing delimiters suppress newline |
| Input | `INPUT variable` or `INPUT "Prompt"; variable`, one scalar at a time |
| Conditions | Inline `IF … THEN statement ELSE statement`, block `IF / ELSE / END IF` |
| Loops | `FOR variable = start TO end STEP increment / NEXT`, `WHILE / WEND` |
| Flow | `GOTO`, `GOSUB / RETURN`, `END`, resumable `STOP` |
| Screen | `CLS`, `COLOR foreground[, background]`, `SCREEN 0`, `SCREEN 12` |
| Drawing | `PSET (x,y)[, color]`, `LINE (x,y)-(x,y)[, color[, B or BF]]`, `CIRCLE (x,y), radius[, color]` |
| Operators | `+ - * / \ MOD ^`, comparisons `= <> < > <= >=`, bitwise `AND OR NOT` |
| Functions | `ABS INT SQR SIN COS LEN STR$ VAL CHR$ ASC LEFT$ RIGHT$ MID$ RND` |

Functions take parentheses except `RND`, which may also be bare. `RND()` takes no seed argument. Angles use radians. Comparisons return -1 (true) or 0 (false). Variables not yet assigned default to 0 or the empty string. Numeric PRINT adds a leading space for nonnegative numbers and a trailing space. Strings and numbers are not implicitly mixed. Numeric input accepts decimal and exponent notation.

**Deliberate differences and omissions:** JavaScript 64-bit numbers are used rather than QuickBASIC's numeric types. Integer division truncates the quotient; MOD truncates operands. String handling uses Unicode rather than DOS code pages. Graphics colors are an original soft palette; circles are geometrically round, and canvas rendering is not pixel-perfect DOS graphics. COLOR changes the whole text-output panel, rather than preserving historical per-character attributes. PRINT is displayed below graphics rather than on the same screen. No arrays, SUB/FUNCTION, DECLARE, DO/LOOP, SELECT CASE, DATA/READ, numeric type suffixes, colon-separated statements, ELSEIF, nested inline IF, file I/O, SOUND/PLAY, DOS/system calls, executable output, or Quick libraries. Inline IF cannot contain loops, block control, or INPUT. Unknown statements and functions produce errors, not silent no-ops.

Immediate supports one assignment, PRINT, CLS, COLOR, PSET, LINE or CIRCLE. Program INPUT must finish or the runtime must be reset before Immediate is available. Immediate mutations affect paused programs, so changes can intentionally alter subsequent execution.

## Safety and privacy

The interpreter tokenizes and evaluates its own expressions. It never evaluates JavaScript source and exposes no DOM, shell, filesystem, or network API to BASIC programs. Execution yields between 150-statement batches so Pause and the editor remain responsive. There is no backend, analytics, remote font, account, or runtime CDN.

Each run is limited to 100,000 statements, 65,536 text-output characters, 10,000 drawing commands, 256 variables, 128 nested GOSUB calls, and 8,192 characters per string. Source is limited to 200,000 characters, 5,000 lines, and 2,048 characters per line. Expressions have a 64-level nesting limit. Imports are limited to 200 KB. Bounds errors are visible. These are browser-responsiveness safeguards, not a formal security sandbox certification.

The one current draft is saved in browser localStorage under `bytewell-draft-v1`, including its name and selected example. Browser data deletion, private browsing, quota errors, or switching origins/devices can remove or isolate the draft. Save does not create a disk file. **Export a `.bas` file for a portable copy.** When storage fails, the app warns visibly and guards navigation away from unsaved work. No source is uploaded. New/Open/example replacement preserves source until the confirmation is accepted; Cancel and Escape leave it in place.

## Historical research

[Microsoft's 1988 QuickBASIC learning manual](https://www.pcjs.org/documents/books/mspl13/basic/qblearn/) describes the editor, Immediate and Watch windows, help, stepping, and the compile-to-executable workflow. That close feedback loop, rather than full compatibility, shaped Bytewell's editor, output, variables, and guide panels. [Microsoft KB Q43308](https://msarchive.pcjs.org/kb/Q43308/) identifies Instant Watch and the expanded Advisor help as 4.5 additions. Those references are historical Microsoft material preserved by PCjs, not current Microsoft product documentation. Research reviewed on 2026-11-10.

## Repository map

- `src/basic.js`: independent parser, expression evaluator and resumable interpreter.
- `src/app.js`: editor, canvas, controls, local storage, import/export and UI.
- `src/examples.js`: five original programs.
- `tests/basic.test.mjs`: automated interpreter coverage.
- `docs/TESTING.md`: exact verification and remaining limits.
- `app.json`: application metadata.
- `docs/tool-shed-entry.json`: unpublished Tool Shed listing candidate.
- `docs/screenshots/`: actual localhost browser captures.

MIT licensed. QuickBASIC is a Microsoft trademark; Bytewell is independent and unaffiliated.
