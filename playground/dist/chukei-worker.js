// chukei-runtime.js
var COMMANDS = Object.freeze({ C: "INC", CH: "DEC", CHU: "RIGHT", CHUK: "OUT", CHUKE: "JZ", CHUKEI: "JNZ" });
var SOURCE_LIMIT = 16384;
var OUTPUT_LIMIT = 16384;
var STEP_LIMIT = 1e6;
var TIME_LIMIT_MS = 1500;
function runChukei(source, options = {}) {
  const result = { ok: false, tokens: [], ast: null, bytecode: [], output: "", steps: 0, trace: [], trace_truncated: false, cells: Array(256).fill(0), pointer: 0, outputMode: "numeric" };
  const started = performance.now();
  try {
    if (options === null || typeof options !== "object" || Array.isArray(options)) throw Error("\u51FA\u529B\u8A2D\u5B9A\u304C\u4E0D\u6B63\u3067\u3059\u3002");
    const outputMode = options.outputMode === void 0 ? "numeric" : options.outputMode;
    if (outputMode !== "numeric" && outputMode !== "ascii") throw Error("\u51FA\u529B\u30E2\u30FC\u30C9\u306Fnumeric\u307E\u305F\u306Fascii\u3092\u6307\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
    result.outputMode = outputMode;
    if (typeof source !== "string") throw Error("\u30BD\u30FC\u30B9\u30B3\u30FC\u30C9\u306F\u6587\u5B57\u5217\u3067\u6307\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
    if (new TextEncoder().encode(source).length > SOURCE_LIMIT) throw Error("\u30B3\u30FC\u30C9\u306F16 KiB\u4EE5\u5185\u306B\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
    let line = 1, column = 1, scanned = 0;
    for (const match of source.matchAll(/\S+/gu)) {
      for (let i = scanned; i < match.index; i++) {
        if (source[i] === "\n") {
          line++;
          column = 1;
        } else column++;
      }
      const lexeme = match[0];
      result.tokens.push({ kind: Object.hasOwn(COMMANDS, lexeme) ? COMMANDS[lexeme] : "invalid", lexeme, line, column });
      column += lexeme.length;
      scanned = match.index + lexeme.length;
    }
    const root = { label: "CHUKEI Program", children: [] };
    let children = root.children;
    const stack = [];
    const code = [];
    for (let i = 0; i < result.tokens.length; i++) {
      const t = result.tokens[i];
      const at = `line ${t.line}, column ${t.column}`;
      if (t.kind === "invalid") throw Error(`Unknown command at ${at}: ${t.lexeme}`);
      const pc2 = code.length;
      code.push({ pc: pc2, op: t.kind, sourceIndex: i });
      if (t.kind === "JZ") {
        if (stack.length >= 128) throw Error(`Loop nesting exceeds 128 levels at ${at}`);
        const node = { label: "CHUKE \u2026 CHUKEI \xB7 Loop while current cell \u2260 0", children: [] };
        children.push(node);
        stack.push({ pc: pc2, parent: children, token: t });
        children = node.children;
      } else if (t.kind === "JNZ") {
        if (!stack.length) throw Error(`Unmatched CHUKEI at ${at}`);
        const open = stack.pop();
        code[open.pc].arg = pc2 + 1;
        code[pc2].arg = open.pc + 1;
        children = open.parent;
      } else children.push({ label: `${t.lexeme} \xB7 ${t.kind}`, children: [] });
    }
    if (stack.length) {
      const t = stack.at(-1).token;
      throw Error(`Unmatched CHUKE at line ${t.line}, column ${t.column}`);
    }
    result.ast = root;
    result.bytecode = code;
    const cells = new Uint8Array(256);
    let pointer = 0, pc = 0;
    try {
      while (pc < code.length) {
        if (result.steps >= STEP_LIMIT) throw Error("\u547D\u4EE4\u5B9F\u884C\u4E0A\u9650\uFF081,000,000\u30B9\u30C6\u30C3\u30D7\uFF09\u306B\u9054\u3057\u307E\u3057\u305F\u3002");
        if ((result.steps & 4095) === 0 && performance.now() - started > TIME_LIMIT_MS) throw Error("\u5B9F\u884C\u6642\u9593\u4E0A\u9650\uFF081.5\u79D2\uFF09\u306B\u9054\u3057\u307E\u3057\u305F\u3002");
        const ins = code[pc];
        const executedPc = pc;
        let emitted;
        result.steps++;
        switch (ins.op) {
          case "INC":
            cells[pointer] = cells[pointer] + 1 & 255;
            pc++;
            break;
          case "DEC":
            cells[pointer] = cells[pointer] + 255 & 255;
            pc++;
            break;
          case "RIGHT":
            pointer = pointer + 1 & 255;
            pc++;
            break;
          case "OUT": {
            if (outputMode === "ascii" && cells[pointer] > 127) throw Error(`ASCII\u51FA\u529B\u7BC4\u56F2\u5916 at line ${result.tokens[ins.sourceIndex].line}, column ${result.tokens[ins.sourceIndex].column}: ${cells[pointer]}\uFF080\u301C127\u306E\u307F\u5BFE\u5FDC\uFF09`);
            const text = outputMode === "ascii" ? String.fromCharCode(cells[pointer]) : `${cells[pointer]}
`;
            if (result.output.length + text.length > OUTPUT_LIMIT) throw Error("\u51FA\u529B\u4E0A\u9650\uFF0816 KiB\uFF09\u306B\u9054\u3057\u307E\u3057\u305F\u3002");
            result.output += text;
            emitted = text;
            pc++;
            break;
          }
          case "JZ":
            pc = cells[pointer] === 0 ? ins.arg : pc + 1;
            break;
          case "JNZ":
            pc = cells[pointer] !== 0 ? ins.arg : pc + 1;
            break;
          default:
            throw Error("Invalid VM instruction");
        }
        if (result.trace.length < 200) result.trace.push({ step: result.steps, pc: executedPc, op: ins.op, next_pc: pc, pointer, value: cells[pointer], ...emitted !== void 0 ? { output: emitted } : {} });
        else result.trace_truncated = true;
      }
      result.ok = true;
    } finally {
      result.cells = Array.from(cells);
      result.pointer = pointer;
    }
  } catch (err) {
    result.error = String(err?.message || err);
  }
  return result;
}

// chukei-worker.js
self.onmessage = ({ data }) => {
  self.postMessage(runChukei(data?.source, { outputMode: data?.outputMode }));
};
