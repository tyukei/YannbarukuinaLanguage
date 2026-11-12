# Queena Playground — hosted browser edition

Static, browser-local Yambaru Queena playground. No code execution endpoint, credentials, user database or code upload is required. The editor runs each program in a fresh Web Worker. A watchdog terminates runs exceeding 15 seconds.

The compiler is based on tyukei/YannbarukuinaLanguage, with the corrected parser and Z80 generator. The hosted runtime compiles to Z80 machine code and executes through a Z80 CPU emulator with minimal CP/M console support, not a complete CP/M operating system. The CPU emulator is not written in Queena.

Source code entered by visitors is not persisted or sent to an execution server. Hosting access logs are outside this application's control.

GitHub Pages publishes the generated static files from the `gh-pages` branch root. Source and tests live on `feat/queena-chukei-playground` under `playground/`. Sites is retained during migration. The deployment contains no server or secrets. Relative asset URLs support both the repository URL and a custom domain.

## Illustrated guide and syntax tree
Two requested illustrations are served locally under `dist/images/`; tapping opens the original resolution. The responsive guide follows the editor, without changing the runtime privacy model. The AST panel renders structured compiler output as safe text and collapsible branches, not HTML, and marks earlier results stale when source changes.

The lexical analysis panel uses the compiler's real lexer tokens in source order, including EOF. Whitespace/comments are omitted by the lexer, and column values use UTF-8 byte positions. Token strings are rendered with textContent, not HTML; parse errors can still show their lexical stream.

## CHUKEI educational language
Separate selectable language with six whitespace-delimited commands: C increment, CH decrement, CHU move right, CHUK numeric output, CHUKE begin loop, CHUKEI end loop. It compiles to an explicitly educational VM instruction stream, not Z80. Its 256 uint8 cells and pointer wrap. The UI shows tokens, nested structure, generated instructions and bounded execution history. Source remains browser-local; both runtimes are terminated by the existing cancel/watchdog.

CHUKEI now offers numeric (default, unchanged) and ASCII output modes for CHUK. ASCII mode emits one character without an automatic newline; 0–127 only, with 10 newline and 32 space. Values above127 report an error, not arbitrary Unicode conversion. UI includes ABC/AZaz/cell/newline examples and marks results stale when the mode changes.

UI uses the same language/output controls, editor/result pair, and token/tree/generated-code/execution-step disclosures for both languages. Language details and illustrations are collapsed; Queena's unsupported ASCII selector is disabled and its step panel explicitly says CHUKEI only. Runtime assets are unchanged.
