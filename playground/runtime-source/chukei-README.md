# CHUKEI educational VM

This is a separate language/runtime, not Queena, native CPU machine code or Z80.
Exact case-sensitive whitespace-delimited commands:
C increment; CH decrement; CHU move right; CHUK output current number and newline;
CHUKE begin loop while current cell != 0; CHUKEI end loop.
There are 256 uint8 cells. Values wrap modulo 256 and the pointer wraps modulo 256.
Loop conditions check the current pointer's cell, including after moving inside a loop.
No comments, strings, input, external calls, filesystem access or network requests.

`chukei-worker.js` receives `{source}`. Bundled deployment artifact is
`dist/chukei-worker.js` (no imports/dependencies). Results:
`{ok,tokens,ast,bytecode,output,steps,cells,pointer,trace,trace_truncated,error?}`.
Tokens have `{kind,lexeme,line,column}`; whitespace omitted, no EOF token.
Positions are 1-based lines and UTF-16 code-unit columns; LF advances line.
AST labels/children are derived from matched command tokens; on compile failure
AST is null and bytecode empty, tokens retained. No source evaluation is used.
Unknown commands and unmatched loops report the original location.
Bytecode records `{pc,op,arg?,sourceIndex}` use INC/DEC/RIGHT/OUT/JZ/JNZ.
`arg` is an absolute PC. JZ skips beyond loop end, JNZ jumps to first body instruction.
`sourceIndex` indexes result.tokens. `steps` counts attempted instructions.

Trace records the first 200 completed instructions:
`{step,pc,op,next_pc,pointer,value,output?}`. State is AFTER the instruction;
`pc` is the executed instruction, `next_pc` is the resulting PC. `output` is only
that OUT instruction's emitted text, not cumulative text. value is the current
cell at the resulting pointer. No trace entry is added for an instruction that
throws. `trace_truncated` is true when later completed instructions were omitted.
`cells` and `pointer` are the final VM state, including on execution-limit errors.
No per-step cell arrays are retained. Replaying captured trace is inspection,
not live single-stepping and not a full history after 200 steps.

Limits: 16KiB UTF-8 source, 16KiB ASCII output, 1,000,000 instructions, 1.5s checked
every 4096 steps, loop nesting 128 levels. Host should also terminate the worker
with its independent watchdog. Each run allocates fresh state; empty input is a
valid empty program. UI must render source/error/labels with textContent.

Tests: `node chukei-test.mjs` (15 cases).

## ASCII output option

`runChukei(source, {outputMode:'ascii'})` or worker `{source,outputMode:'ascii'}`
selects ASCII output. Omitting outputMode or using `'numeric'` preserves the
original number-plus-newline behavior. No command was added or changed.
In ASCII mode CHUK emits exactly one character for values 0–127 with NO automatic
newline. All ASCII controls (including NUL, tab, LF, CR and ESC) and DEL are
preserved literally; they may be invisible. Render as text, never terminal/HTML
escape interpretation. Values 128–255 cause an explicit runtime error when OUT
is executed; previous output and final VM state are retained. Those byte values
are still valid cell values for all other operations. This is ASCII, not UTF-8,
Latin-1 or arbitrary Unicode support.
`result.outputMode` reports the validated mode (numeric default). `trace[].output`
contains the actual emitted text for that instruction, including ASCII controls.
Invalid mode/settings fail before compilation. Output limit remains 16 KiB,
which equals 16,384 characters in ASCII mode. `node chukei-ascii-test.mjs` adds
9 tests; the original 15 tests still pass. The worker artifact is rebuilt.
