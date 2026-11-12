# Queena browser runtime

Existing corrected Zig lexer/parser/Z80 code generator compiled to WebAssembly, followed by an MIT-licensed browser assembler and Z80 CPU emulator. This is actual generated Z80 machine-code execution, not a JavaScript language interpreter. A minimal CP/M BDOS console shim handles calls 2 and 9; no full CP/M OS or ROM is loaded.

## Rebuild the checked-in hosted assets
From this directory, with Zig 0.14.1 and Node.js installed:

```sh
npm ci
zig build
mkdir -p dist
cp zig-out/bin/queena.wasm dist/queena.wasm
cp dist/queena.wasm ../dist/queena.wasm
node_modules/.bin/esbuild worker.js --bundle --format=esm --platform=browser --target=es2020 --outfile=../dist/runtime-worker.js
node_modules/.bin/esbuild chukei-worker.js --bundle --format=esm --platform=browser --target=es2020 --outfile=../dist/chukei-worker.js
node test.mjs
node extended-test.mjs
node ast-test.mjs
node token-test.mjs
node chukei-test.mjs
```

Serve `../dist/` with a static HTTP server, e.g. `python3 -m http.server 8000 --bind 127.0.0.1 --directory ../dist`. The checked-in dist is immediately usable without rebuilding. Keep THIRD-PARTY-LICENSES.txt with deployments. The UI runs module Workers and provides Cancel and a watchdog.

Limits: UTF-8 source 16 KiB, output 16 KiB, compiled code below 0x7000 (entry 0x0100), 5 million instructions, 2.5 second internal execution deadline, 32 MiB WASM maximum memory. No network other than static same-origin WASM fetch; source never leaves the device. Each run has fresh WASM instance and CPU memory.

Dependencies: @fugloy/asm 1.3.0 (with @fugloy/disasm and @fugloy/z80); z80-emulator 2.3.0 and z80-base 2.0.1. See THIRD-PARTY-LICENSES.txt. These differ from the local Python-based test tools. Twenty-one browser-runtime pipeline tests pass on Node WebAssembly, separately from earlier native tests. Browser UI QA belongs to the hosting layer.

## AST visualization

Successful parsing now returns `ast` alongside all results, including later code-generation or execution failures. Syntax errors return `ast: null` plus the existing line/column diagnostic. This is JSON serialized directly from the existing Zig parser's `Node` graph, not another parser or a reconstruction of the input text. WASM exports `ast_ptr()` / `ast_length()` in addition to the original compiler interface.

Each node is `{id, kind, label, role, line, column, children}`. `label` already includes the role for display (e.g. `condition · Binary: <`); `children` are nested AST nodes. Missing source locations are null rather than invented. The parser lowers `mata` to nested `if_stmt` nodes in `else`; `hoka` is an `else` block. Comments and punctuation not retained in the compiler AST are not represented as nodes. Labels are plain strings: render via `textContent`, never HTML.

AST JSON has a 2 MiB serialization limit; exhaustion yields a clear error rather than a partial tree. Runtime CPU instruction/time/output limits retain the parsed tree. Host watchdog termination during compilation may not return a tree. Clear or mark displayed AST stale when source changes. `node ast-test.mjs` adds 13 tests for operators, branch chains, loop roles, parser errors, retained trees on runtime and code-generation errors, and clearing a prior tree on parse failure.

## Lexical token visualization

`result.tokens` is an array in source order from the same Zig `Lexer.nextToken`
used by the compiler, collected in a separate lexer pass before parsing. Every
record has `{kind, lexeme, line, column}`. EOF is included; whitespace and comments
are not returned by the original lexer. Positions are exactly the original lexer
positions (1-based, byte-oriented columns), not a new source map. The complete
stream remains available on ordinary parse errors, codegen errors and execution
errors. Before compilation (input validation or WASM load failure) it is `[]`.
A compiler trap or host worker timeout may prevent returning the stream.

The lexer operates on bytes. An invalid non-ASCII byte may be its own `invalid`
token; when such a lexeme is not valid UTF-8, it is shown losslessly as `\\xHH`
escapes and adds `lexeme_encoding: "escaped-bytes"`. Other lexemes are the exact
original token text. Token JSON is capped at 2 MiB. Render lexemes with textContent,
never as HTML. Tokens do not imply syntax or code generation support: for example,
the lexer recognizes strings even though this compiler cannot execute them.

Run `node token-test.mjs` for 10 additional lexer-export regression tests.
