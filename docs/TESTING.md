# Verification

## Automated checks

Run on 2026-11-10 with Node.js 24.22.1:

- `npm run check`: JavaScript syntax checks passed.
- `npm test`: 32 tests passed, 0 failed. Covers expression evaluation, precedence, strings and typing, PRINT formatting, loops, branches, labels, subroutines, INPUT recovery, STOP/resume, drawing, source errors, unsupported syntax, recursion, execution/output/string/source/variable limits, and all original examples.
- `npm run build`: passed. `dist/` contains the standalone static app.

## Browser checks

Browser verification is performed only through an HTTP server at `http://127.0.0.1:4173/`. The file protocol is not used.

`tests/browser.html` runs the actual workbench in an iframe and exercises its DOM controls, not a mocked interpreter. It tests drawing output, run/step/watch, Immediate, invalid and valid INPUT, line-numbered runtime/syntax errors, pause and the execution budget, destructive replacement confirmation/cancel, BAS import/export bytes, save/reload, non-executing draft restore, guide dismissal, and reset during INPUT.

The harness suppresses the final browser download click and inspects the generated Blob's bytes and filename; the actual download workflow is a separate manual check. It restores the pre-test browser draft after it finishes. Do not interrupt the harness if preserving that draft matters.

`tests/responsive.html` provides a 390 CSS-pixel iframe for narrow-layout inspection. This is a responsive Chromium simulation, not a physical-device test.

Final Chromium result on 2026-11-10: **29 passed, 0 failed** at `http://127.0.0.1:4173/tests/browser.html`. This includes two layout regressions added after visual inspection exposed a panel-height overflow. The final CSS constrains the editor and output grid row; the complete suite passed again after that fix.

Additional direct browser checks passed:

- Exported the original Orbit study through the browser's real download event, read the resulting 624-character source, reopened that downloaded file through the native file chooser, and ran it to completion (157 statements).
- Ran the same program with F5 in the 390 CSS-pixel iframe. The source, graphics, variables, Immediate entry, and status remained available. The document measured 390 pixels wide with a 390-pixel scroll width, so there was no horizontal document overflow.
- Inspected the final desktop and narrow screenshots. The screenshot API's `fullPage` mode timed out; exact document-bound captures succeeded. Neither final image is a mockup.

Screenshot evidence:

| File | Dimensions | Source |
| --- | --- | --- |
| `screenshots/bytewell-desktop.jpg` | 1165 × 1053 | Whole app captured from the localhost root with Orbit study finished. |
| `screenshots/bytewell-narrow.jpg` | 390 × 1420 | 390 CSS-pixel same-origin iframe, captured after F5 execution. Responsive simulation, not a phone screenshot. |

SHA-256:

```text
78bf5829c5d2c2e1f07f073a5783651d51ebaf484c31d3a446ce2906a0d906c7  bytewell-desktop.jpg
e3615f2ffd7a727e6ca8820ff7daa9be6d93830c3151ab533cdf0abe77265549  bytewell-narrow.jpg
```

The shared localhost preview was stopped after verification. Start it again with the README command when reviewing the app.

## Scope and remaining limits

The automated checks verify this documented dialect, not compatibility with arbitrary QuickBASIC programs. There is no Microsoft compiler comparison suite. Other browsers and operating systems, real assistive technology, physical phones, long-lived storage persistence, and unavailable-storage behavior are not yet end-to-end verified. The initial QA pass was local. The subsequent public release uses the checked GitHub Pages workflow; remote deployment verification is separate from these local/browser test results.
