var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// node_modules/@fugloy/z80/dist/tables.js
var NEXT = { kind: "next", conditional: false, indirect: false };
var flow = (kind, conditional = false, indirect = false) => ({ kind, conditional, indirect });
var fixed = (op) => ({ t: "fixed", op });
var reg = (r) => fixed({ kind: "reg", reg: r });
var reg16 = (r) => fixed({ kind: "reg16", reg: r });
var ind = (r) => fixed({ kind: "ind", reg: r });
var cond = (c) => fixed({ kind: "cc", cond: c });
var bit = (b) => fixed({ kind: "bit", bit: b });
var byte = (v) => fixed({ kind: "byte", value: v });
var N = { t: "n" };
var NN = { t: "nn" };
var MEM = { t: "(nn)" };
var PORT = { t: "(n)" };
var E = { t: "e" };
var R = [reg("B"), reg("C"), reg("D"), reg("E"), reg("H"), reg("L"), ind("HL"), reg("A")];
var RP = ["BC", "DE", "HL", "SP"];
var RP2 = ["BC", "DE", "HL", "AF"];
var CC = ["NZ", "Z", "NC", "C", "PO", "PE", "P", "M"];
var ALU = [
  ["ADD", true],
  ["ADC", true],
  ["SUB", false],
  ["SBC", true],
  ["AND", false],
  ["XOR", false],
  ["OR", false],
  ["CP", false]
];
var ROT = ["RLC", "RRC", "RL", "RR", "SLA", "SRA", "SLL", "SRL"];
var BLI = [
  ["LDI", "CPI", "INI", "OUTI"],
  ["LDD", "CPD", "IND", "OUTD"],
  ["LDIR", "CPIR", "INIR", "OTIR"],
  ["LDDR", "CPDR", "INDR", "OTDR"]
];
var X0Z7 = ["RLCA", "RRCA", "RLA", "RRA", "DAA", "CPL", "SCF", "CCF"];
var SLOT_BYTES = { fixed: 0, n: 1, nn: 2, "(nn)": 2, "(n)": 1, e: 1, "(ix+d)": 1, d: 1 };
var isFixed = (o, kind, name) => o?.t === "fixed" && o.op.kind === kind && (name === void 0 || "reg" in o.op && o.op.reg === name);
var FLAG_RULES = [
  // Operand-sensitive cases first.
  [(m, o) => (m === "INC" || m === "DEC") && isFixed(o[0], "reg16"), ""],
  // 16-bit INC/DEC
  [(m, o) => m === "ADD" && isFixed(o[0], "reg16"), "HNC"],
  // ADD HL/IX/IY,rr
  [(m, o) => (m === "ADC" || m === "SBC") && isFixed(o[0], "reg16"), "SZHPNC"],
  // ADC/SBC HL,rr
  [(m, o) => m === "POP" && isFixed(o[0], "reg16", "AF"), "SZHPNC"],
  // POP AF loads F
  [(m, o) => m === "EX" && isFixed(o[1], "reg16", "AF'"), "SZHPNC"],
  // EX AF,AF'
  [(m, o) => m === "LD" && isFixed(o[0], "reg", "A") && (isFixed(o[1], "reg", "I") || isFixed(o[1], "reg", "R")), "SZHPN"],
  // LD A,I / LD A,R
  [(m, o) => m === "IN" && o[1]?.t === "fixed" && o[1].op.kind === "ind", "SZHPN"],
  // IN r,(C); IN A,(n) has none
  // Plain mnemonic groups.
  [(m) => ["ADD", "ADC", "SUB", "SBC", "CP", "AND", "OR", "XOR", "NEG"].includes(m), "SZHPNC"],
  // 8-bit ALU
  [(m) => m === "INC" || m === "DEC", "SZHPN"],
  // 8-bit INC/DEC leave carry alone
  [(m) => ["RLCA", "RRCA", "RLA", "RRA", "SCF", "CCF"].includes(m), "HNC"],
  // accumulator rotates, carry flag
  [(m) => m === "DAA", "SZHPC"],
  [(m) => m === "CPL", "HN"],
  [(m) => ROT.includes(m), "SZHPNC"],
  // CB rotates and shifts
  [(m) => m === "BIT", "SZHPN"],
  [(m) => m === "RLD" || m === "RRD", "SZHPN"],
  [(m) => ["LDI", "LDD", "LDIR", "LDDR"].includes(m), "HPN"],
  [(m) => ["CPI", "CPD", "CPIR", "CPDR"].includes(m), "SZHPN"],
  [(m) => ["INI", "IND", "INIR", "INDR", "OUTI", "OUTD", "OTIR", "OTDR"].includes(m), "ZN"]
  // S, H, P are undefined
];
function flagsOf(mnemonic, operands) {
  for (const [matches, flags] of FLAG_RULES)
    if (matches(mnemonic, operands))
      return flags;
  return "";
}
function entry(prefixLen, mnemonic, operands, cycles, opts = {}) {
  const length = prefixLen + 1 + operands.reduce((n, o) => n + SLOT_BYTES[o.t], 0);
  const t = { mnemonic, operands, length, cycles, flow: opts.flow ?? NEXT, documented: opts.documented ?? true, flags: flagsOf(mnemonic, operands) };
  if (opts.notTaken !== void 0)
    t.cyclesNotTaken = opts.notTaken;
  return t;
}
function db(bytes, cycles) {
  const operands = bytes.map((b) => b === "d" ? { t: "d" } : byte(b));
  return { mnemonic: "DB", operands, length: bytes.length, cycles, flow: NEXT, documented: false, flags: "" };
}
var prefixEntry = (prefix) => ({
  mnemonic: "PREFIX",
  operands: [],
  length: 1,
  cycles: 0,
  flow: NEXT,
  documented: true,
  flags: "",
  prefix
});
var isIndHL = (o) => o.t === "fixed" && o.op.kind === "ind" && o.op.reg === "HL";
function alu(y, operand2, cycles) {
  const [mnemonic, withA] = ALU[y];
  return entry(0, mnemonic, withA ? [reg("A"), operand2] : [operand2], cycles);
}
function baseEntry(op) {
  const x = op >> 6, y = op >> 3 & 7, z = op & 7, p = y >> 1, q = y & 1;
  const r = (i) => R[i];
  const hl = (i) => i === 6;
  if (x === 0) {
    switch (z) {
      case 0:
        if (y === 0)
          return entry(0, "NOP", [], 4);
        if (y === 1)
          return entry(0, "EX", [reg16("AF"), reg16("AF'")], 4);
        if (y === 2)
          return entry(0, "DJNZ", [E], 13, { notTaken: 8, flow: flow("jump", true) });
        if (y === 3)
          return entry(0, "JR", [E], 12, { flow: flow("jump") });
        return entry(0, "JR", [cond(CC[y - 4]), E], 12, { notTaken: 7, flow: flow("jump", true) });
      case 1:
        return q === 0 ? entry(0, "LD", [reg16(RP[p]), NN], 10) : entry(0, "ADD", [reg16("HL"), reg16(RP[p])], 11);
      case 2:
        if (q === 0) {
          if (p === 0)
            return entry(0, "LD", [ind("BC"), reg("A")], 7);
          if (p === 1)
            return entry(0, "LD", [ind("DE"), reg("A")], 7);
          if (p === 2)
            return entry(0, "LD", [MEM, reg16("HL")], 16);
          return entry(0, "LD", [MEM, reg("A")], 13);
        }
        if (p === 0)
          return entry(0, "LD", [reg("A"), ind("BC")], 7);
        if (p === 1)
          return entry(0, "LD", [reg("A"), ind("DE")], 7);
        if (p === 2)
          return entry(0, "LD", [reg16("HL"), MEM], 16);
        return entry(0, "LD", [reg("A"), MEM], 13);
      case 3:
        return entry(0, q === 0 ? "INC" : "DEC", [reg16(RP[p])], 6);
      case 4:
        return entry(0, "INC", [r(y)], hl(y) ? 11 : 4);
      case 5:
        return entry(0, "DEC", [r(y)], hl(y) ? 11 : 4);
      case 6:
        return entry(0, "LD", [r(y), N], hl(y) ? 10 : 7);
      default:
        return entry(0, X0Z7[y], [], 4);
    }
  }
  if (x === 1) {
    if (z === 6 && y === 6)
      return entry(0, "HALT", [], 4, { flow: flow("halt") });
    return entry(0, "LD", [r(y), r(z)], hl(y) || hl(z) ? 7 : 4);
  }
  if (x === 2)
    return alu(y, r(z), hl(z) ? 7 : 4);
  switch (z) {
    case 0:
      return entry(0, "RET", [cond(CC[y])], 11, { notTaken: 5, flow: flow("return", true) });
    case 1:
      if (q === 0)
        return entry(0, "POP", [reg16(RP2[p])], 10);
      if (p === 0)
        return entry(0, "RET", [], 10, { flow: flow("return") });
      if (p === 1)
        return entry(0, "EXX", [], 4);
      if (p === 2)
        return entry(0, "JP", [ind("HL")], 4, { flow: flow("jump", false, true) });
      return entry(0, "LD", [reg16("SP"), reg16("HL")], 6);
    case 2:
      return entry(0, "JP", [cond(CC[y]), NN], 10, { flow: flow("jump", true) });
    case 3:
      switch (y) {
        case 0:
          return entry(0, "JP", [NN], 10, { flow: flow("jump") });
        case 1:
          return prefixEntry("CB");
        case 2:
          return entry(0, "OUT", [PORT, reg("A")], 11);
        case 3:
          return entry(0, "IN", [reg("A"), PORT], 11);
        case 4:
          return entry(0, "EX", [ind("SP"), reg16("HL")], 19);
        case 5:
          return entry(0, "EX", [reg16("DE"), reg16("HL")], 4);
        case 6:
          return entry(0, "DI", [], 4);
        default:
          return entry(0, "EI", [], 4);
      }
    case 4:
      return entry(0, "CALL", [cond(CC[y]), NN], 17, { notTaken: 10, flow: flow("call", true) });
    case 5:
      if (q === 0)
        return entry(0, "PUSH", [reg16(RP2[p])], 11);
      if (p === 0)
        return entry(0, "CALL", [NN], 17, { flow: flow("call") });
      if (p === 1)
        return prefixEntry("DD");
      if (p === 2)
        return prefixEntry("ED");
      return prefixEntry("FD");
    case 6:
      return alu(y, N, 7);
    default:
      return entry(0, "RST", [fixed({ kind: "rst", addr: y * 8 })], 11, { flow: flow("call") });
  }
}
function cbEntry(op) {
  const x = op >> 6, y = op >> 3 & 7, z = op & 7;
  const r = R[z];
  const mem = z === 6;
  if (x === 0)
    return entry(1, ROT[y], [r], mem ? 15 : 8, { documented: y !== 6 });
  if (x === 1)
    return entry(1, "BIT", [bit(y), r], mem ? 12 : 8);
  return entry(1, x === 2 ? "RES" : "SET", [bit(y), r], mem ? 15 : 8);
}
function edEntry(op) {
  const x = op >> 6, y = op >> 3 & 7, z = op & 7, p = y >> 1, q = y & 1;
  const undoc = (cycles = 8) => db([237, op], cycles);
  if (x === 1) {
    switch (z) {
      case 0:
        return y === 6 ? undoc(12) : entry(1, "IN", [R[y], ind("C")], 12);
      case 1:
        return y === 6 ? undoc(12) : entry(1, "OUT", [ind("C"), R[y]], 12);
      case 2:
        return entry(1, q === 0 ? "SBC" : "ADC", [reg16("HL"), reg16(RP[p])], 15);
      case 3:
        return q === 0 ? entry(1, "LD", [MEM, reg16(RP[p])], 20) : entry(1, "LD", [reg16(RP[p]), MEM], 20);
      case 4:
        return y === 0 ? entry(1, "NEG", [], 8) : undoc();
      case 5:
        if (y === 0)
          return entry(1, "RETN", [], 14, { flow: flow("return") });
        if (y === 1)
          return entry(1, "RETI", [], 14, { flow: flow("return") });
        return undoc(14);
      case 6:
        if (y === 0)
          return entry(1, "IM", [fixed({ kind: "im", mode: 0 })], 8);
        if (y === 2)
          return entry(1, "IM", [fixed({ kind: "im", mode: 1 })], 8);
        if (y === 3)
          return entry(1, "IM", [fixed({ kind: "im", mode: 2 })], 8);
        return undoc();
      default:
        switch (y) {
          case 0:
            return entry(1, "LD", [reg("I"), reg("A")], 9);
          case 1:
            return entry(1, "LD", [reg("R"), reg("A")], 9);
          case 2:
            return entry(1, "LD", [reg("A"), reg("I")], 9);
          case 3:
            return entry(1, "LD", [reg("A"), reg("R")], 9);
          case 4:
            return entry(1, "RRD", [], 18);
          case 5:
            return entry(1, "RLD", [], 18);
          default:
            return undoc();
        }
    }
  }
  if (x === 2 && z <= 3 && y >= 4) {
    const repeat = y >= 6;
    return entry(1, BLI[y - 4][z], [], repeat ? 21 : 16, repeat ? { notTaken: 16 } : {});
  }
  return undoc();
}
function indexEntry(base, ix) {
  if (base.prefix === "CB")
    return prefixEntry("CB");
  const noop = db([ix === "IX" ? 221 : 253], 4);
  if (base.prefix)
    return noop;
  if (base.mnemonic === "EX" && base.operands[0]?.t === "fixed" && base.operands[0].op.kind === "reg16" && base.operands[0].op.reg === "DE")
    return noop;
  const hasIndHL = base.operands.some(isIndHL);
  const bare2 = base.mnemonic === "JP";
  let changed = false;
  const operands = base.operands.map((o) => {
    if (o.t !== "fixed")
      return o;
    const op = o.op;
    if (op.kind === "reg16" && op.reg === "HL") {
      changed = true;
      return reg16(ix);
    }
    if (op.kind === "ind" && op.reg === "HL") {
      changed = true;
      return bare2 ? ind(ix) : { t: "(ix+d)", reg: ix };
    }
    if (!hasIndHL && op.kind === "reg" && (op.reg === "H" || op.reg === "L")) {
      changed = true;
      return reg(`${ix}${op.reg}`);
    }
    return o;
  });
  if (!changed)
    return noop;
  const indexed = operands.some((o) => o.t === "(ix+d)");
  const halfReg = operands.some((o) => o.t === "fixed" && o.op.kind === "reg" && o.op.reg.length === 3);
  let cycles = base.cycles + 4;
  if (indexed)
    cycles = base.mnemonic === "LD" && operands.some((o) => o.t === "n") ? 19 : base.cycles + 12;
  const t = {
    mnemonic: base.mnemonic,
    operands,
    cycles,
    flow: base.flow,
    documented: !halfReg,
    flags: flagsOf(base.mnemonic, operands),
    length: base.length + 1 + (indexed ? 1 : 0)
  };
  if (base.cyclesNotTaken !== void 0)
    t.cyclesNotTaken = base.cyclesNotTaken;
  return t;
}
function indexCbEntry(cb, op, ix) {
  const x = op >> 6, z = op & 7;
  const cycles = x === 1 ? 20 : 23;
  if (z !== 6)
    return db([ix === "IX" ? 221 : 253, 203, "d", op], cycles);
  const operands = cb.operands.map((o) => isIndHL(o) ? { t: "(ix+d)", reg: ix } : o);
  return { mnemonic: cb.mnemonic, operands, length: 4, cycles, flow: cb.flow, documented: cb.documented, flags: flagsOf(cb.mnemonic, operands) };
}
function table(make) {
  const out = [];
  for (let op = 0; op < 256; op++)
    out.push(make(op));
  return out;
}
function generateTables() {
  const base = table(baseEntry);
  const cb = table(cbEntry);
  const ed = table(edEntry);
  const dd = table((op) => indexEntry(base[op], "IX"));
  const fd = table((op) => indexEntry(base[op], "IY"));
  const ddcb = table((op) => indexCbEntry(cb[op], op, "IX"));
  const fdcb = table((op) => indexCbEntry(cb[op], op, "IY"));
  return { base, cb, ed, dd, fd, ddcb, fdcb };
}
var TABLES = generateTables();

// node_modules/@fugloy/z80/dist/format.js
var hex = (n, width) => n.toString(16).toUpperCase().padStart(width, "0");
var hex4 = (n) => hex(n & 65535, 4);

// node_modules/@fugloy/asm/dist/shape.js
var IMMEDIATE = /* @__PURE__ */ new Set(["n", "nn", "e", "num"]);
var MEMORY = /* @__PURE__ */ new Set(["(n)", "(nn)"]);
var isImmediate = (shape) => IMMEDIATE.has(shape);
var isMemory = (shape) => MEMORY.has(shape);
function slotText(o) {
  switch (o.t) {
    case "fixed": {
      const op = o.op;
      switch (op.kind) {
        case "reg":
        case "reg16":
          return op.reg;
        case "cc":
          return op.cond;
        case "ind":
          return `(${op.reg})`;
        case "bit":
          return "b";
        case "rst":
          return "p";
        case "im":
          return String(op.mode);
        default:
          return op.kind;
      }
    }
    case "(ix+d)":
      return `(${o.reg}+d)`;
    default:
      return o.t;
  }
}
function fits(shape, o, indexZero) {
  switch (o.t) {
    case "fixed": {
      const op = o.op;
      switch (op.kind) {
        case "reg":
        case "reg16":
          return shape === op.reg;
        case "cc":
          return shape === op.cond;
        case "ind":
          return shape === `(${op.reg})`;
        case "bit":
        case "rst":
        case "im":
          return isImmediate(shape);
        default:
          return false;
      }
    }
    case "n":
    case "nn":
    case "e":
    case "d":
      return isImmediate(shape);
    case "(n)":
    case "(nn)":
      return isMemory(shape);
    case "(ix+d)":
      return shape === `(${o.reg}+d)` || indexZero && shape === `(${o.reg})`;
  }
}
function fixedNumber(o) {
  if (o.t !== "fixed")
    return void 0;
  const op = o.op;
  if (op.kind === "bit")
    return op.bit;
  if (op.kind === "rst")
    return op.addr;
  if (op.kind === "im")
    return op.mode;
  return void 0;
}

// node_modules/@fugloy/asm/dist/encode.js
var TABLE_ORDER = ["base", "cb", "ed", "dd", "fd", "ddcb", "fdcb"];
var BASE_DUPLICATES = /* @__PURE__ */ new Set(["ed:63", "ed:6b"]);
var slotName = (table2, opcode) => `${table2}:${opcode.toString(16).padStart(2, "0")}`;
function ownShapes(tpl) {
  return tpl.operands.map((o) => {
    if (fixedNumber(o) !== void 0 || o.t === "n" || o.t === "nn" || o.t === "e" || o.t === "d")
      return "nn";
    if (o.t === "(n)" || o.t === "(nn)")
      return "(nn)";
    if (o.t === "(ix+d)")
      return o.reg === "IX" ? "(IX+d)" : "(IY+d)";
    return slotText(o);
  });
}
var fixedKey = (tpl) => tpl.operands.map((o) => fixedNumber(o) ?? "").join(",");
function buildIndex(tables) {
  const index = /* @__PURE__ */ new Map();
  for (const table2 of TABLE_ORDER) {
    tables[table2].forEach((tpl, opcode) => {
      if (tpl.prefix !== void 0 || tpl.mnemonic === "DB")
        return;
      const list2 = index.get(tpl.mnemonic) ?? [];
      list2.push({ tpl, table: table2, opcode, form: tpl.operands.map(slotText).join(",") });
      index.set(tpl.mnemonic, list2);
    });
  }
  for (const [mnemonic, entries] of index) {
    const kept = entries.filter((e) => {
      const rivals = fitting(entries, ownShapes(e.tpl)).filter((r) => r !== e && fixedKey(r.tpl) === fixedKey(e.tpl));
      if (rivals.length === 0)
        return true;
      if (BASE_DUPLICATES.has(slotName(e.table, e.opcode)))
        return false;
      if (rivals.every((r) => BASE_DUPLICATES.has(slotName(r.table, r.opcode))))
        return true;
      throw new Error(`The z80 tables give ${mnemonic} ${e.form} two encodings the encoder cannot tell apart: ${[e, ...rivals].map((r) => slotName(r.table, r.opcode)).join(" and ")}.`);
    });
    index.set(mnemonic, kept);
  }
  return index;
}
function fitting(entries, shapes) {
  const match = (indexZero) => entries.filter((e) => e.tpl.operands.length === shapes.length && e.tpl.operands.every((o, i) => fits(shapes[i], o, indexZero)));
  const exact = match(false);
  return exact.length > 0 ? exact : match(true);
}
var INDEX = buildIndex(TABLES);
var candidates = (mnemonic, shapes) => fitting(INDEX.get(mnemonic) ?? [], shapes);
function lead(entry2, d) {
  switch (entry2.table) {
    case "base":
      return [entry2.opcode];
    case "cb":
      return [203, entry2.opcode];
    case "ed":
      return [237, entry2.opcode];
    case "dd":
      return [221, entry2.opcode];
    case "fd":
      return [253, entry2.opcode];
    case "ddcb":
      return [221, 203, d & 255, entry2.opcode];
    case "fdcb":
      return [253, 203, d & 255, entry2.opcode];
  }
}
function show(value) {
  if (value <= 9)
    return String(value);
  const digits = value > 255 ? Math.max(4, value.toString(16).length) : 2;
  return `${value} ($${value.toString(16).toUpperCase().padStart(digits, "0")})`;
}
var address = (value) => `$${(value & 65535).toString(16).toUpperCase().padStart(4, "0")}`;
var asSource = (value) => value <= 9 ? String(value) : `${value.toString(16).toUpperCase()}H`;
function list(items, word3) {
  if (items.length <= 1)
    return items.join("");
  if (items.length === 2)
    return `${items[0]} ${word3} ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, ${word3} ${items[items.length - 1]}`;
}
var formName = (mnemonic, entry2) => entry2.form === "" ? mnemonic : `${mnemonic} ${entry2.form}`;
var formsOf = (entries) => [...new Set(entries.map((e) => e.form))].sort();
var WORDS = {
  num: "number",
  n: "number",
  nn: "number",
  e: "label",
  "(n)": "(port)",
  "(nn)": "(address)",
  b: "bit",
  p: "address",
  "(IX+d)": "(IX+offset)",
  "(IY+d)": "(IY+offset)"
};
var TARGETS = /* @__PURE__ */ new Set(["JP", "CALL"]);
var word = (shape, mnemonic = "") => shape === "nn" && TARGETS.has(mnemonic) ? "label" : WORDS[shape] ?? shape;
var GOES = /* @__PURE__ */ new Set(["JP", "CALL", "JR", "DJNZ"]);
var EXAMPLES = { LD: "A,number", IN: "A,(port)", OUT: "(port),A", EX: "DE,HL", IM: "1", ADD: "A,number", ADC: "A,number", SBC: "A,number", SUB: "number", AND: "number", OR: "number", XOR: "number", CP: "number", BIT: "0,A", SET: "0,A", RES: "0,A" };
var RESTARTS = "one of 0, 8, 10H, 18H, 20H, 28H, 30H, and 38H";
function needsOperands(mnemonic, readable) {
  if (GOES.has(mnemonic))
    return `${mnemonic} needs a target: write ${mnemonic} label.`;
  if (mnemonic === "RST")
    return `RST needs a restart address, ${RESTARTS}: write RST 28H, for example.`;
  const count = (f) => f.split(",").length;
  const fewest = Math.min(...readable.map(count));
  const short = readable.filter((f) => count(f) === fewest);
  const example = EXAMPLES[mnemonic] ?? short.find((f) => f.startsWith("A")) ?? short.find((f) => /^[A-Z]/.test(f)) ?? short[0];
  return `${mnemonic} needs ${fewest === 1 ? "an operand" : "operands"}: write ${mnemonic} ${example}, for example.`;
}
function undocumentedEd(mnemonic, operands) {
  const shapes = operands.map((o) => o.shape).join(",");
  const db2 = (form, low) => ({ error: `${mnemonic} ${form} is undocumented, and Fugl\xF8y writes it as DB 0EDH,${low}H; use that instead.`, rewrite: `DB 0EDH,${low}H` });
  if (mnemonic === "IN" && (shapes === "F,(C)" || shapes === "(C)"))
    return db2(shapes, "70");
  if (mnemonic === "OUT" && operands.length === 2 && operands[0].shape === "(C)" && isImmediate(operands[1].shape) && operands[1].value === 0)
    return db2("(C),0", "71");
  return void 0;
}
var dbByte = (v) => {
  const h = `${v.toString(16).toUpperCase().padStart(2, "0")}H`;
  return /^[A-F]/.test(h) ? `0${h}` : h;
};
var EIGHTY_PAIRS = { A: "AF", B: "BC", D: "DE", H: "HL", "AF'": "AF" };
var BYTE_REGISTERS = /* @__PURE__ */ new Set(["A", "B", "C", "D", "E", "H", "L"]);
var BRANCHES = /* @__PURE__ */ new Set(["JP", "CALL", "JR", "RET"]);
var CONDITION_SHAPES = /* @__PURE__ */ new Set(["NZ", "Z", "NC", "C", "PO", "PE", "P", "M"]);
var ROTATES = /* @__PURE__ */ new Set(["RLC", "RRC", "RL", "RR", "SLA", "SRA", "SLL", "SRL", "RES", "SET"]);
function spelling(mnemonic, operands, written) {
  const shapes = operands.map((o) => o.shape);
  const text = (i) => written?.[i] ?? (operands[i].value === void 0 ? shapes[i] : asSource(operands[i].value));
  const bare2 = (i) => text(i).replace(/^\((.*)\)$/, "$1");
  const one = operands.length === 1;
  const said = (message, rewrite) => ({ error: `${message}: write ${rewrite}.`, rewrite });
  if (mnemonic === "IN" && one && (isImmediate(shapes[0]) || shapes[0] === "(nn)")) {
    return said("IN needs A and the port in parentheses", `IN A,(${bare2(0)})`);
  }
  if (mnemonic === "OUT" && one && (isImmediate(shapes[0]) || shapes[0] === "(nn)")) {
    return said("OUT needs the port in parentheses and then A", `OUT (${bare2(0)}),A`);
  }
  if (mnemonic === "OUT" && operands.length === 2 && isImmediate(shapes[0]) && candidates(mnemonic, ["(nn)", shapes[1]]).length > 0) {
    return said("OUT needs the port in parentheses", `OUT (${text(0)}),${text(1)}`);
  }
  if (mnemonic === "IN" && operands.length === 2 && isImmediate(shapes[1]) && candidates(mnemonic, [shapes[0], "(nn)"]).length > 0) {
    return said("IN needs the port in parentheses", `IN ${text(0)},(${text(1)})`);
  }
  if (mnemonic === "JP" && one && (shapes[0] === "HL" || shapes[0] === "IX" || shapes[0] === "IY")) {
    return said(`JP ${shapes[0]} jumps to the address in ${shapes[0]}, which Z80 assembly writes in parentheses`, `JP (${shapes[0]})`);
  }
  if ((mnemonic === "PUSH" || mnemonic === "POP") && one && EIGHTY_PAIRS[shapes[0]] !== void 0) {
    const pair = EIGHTY_PAIRS[shapes[0]];
    const why = shapes[0] === "AF'" ? `${mnemonic} works on AF, not the shadow AF'` : `${mnemonic} works on register pairs, and ${shapes[0]} is the 8080's short name for ${pair}`;
    return said(why, `${mnemonic} ${pair}`);
  }
  if (BRANCHES.has(mnemonic) && one && CONDITION_SHAPES.has(shapes[0]) && candidates(mnemonic, [shapes[0], "nn"]).length > 0) {
    return { error: `${mnemonic} ${text(0)} names a condition but no address to go to: write ${mnemonic} ${text(0)},label.` };
  }
  if (shapes.includes("M") && !BRANCHES.has(mnemonic)) {
    const swapped = shapes.map((sh) => sh === "M" ? "(HL)" : sh);
    const withA = candidates(mnemonic, swapped).length === 0 && candidates(mnemonic, ["A", ...swapped]).length > 0;
    if (candidates(mnemonic, swapped).length > 0 || withA) {
      const form = shapes.map((sh, i) => sh === "M" ? "(HL)" : text(i));
      return said("M is the 8080's name for the byte HL points at", `${mnemonic} ${withA ? "A," : ""}${form.join(",")}`);
    }
  }
  const last = shapes[shapes.length - 1];
  const index = shapes.findIndex((sh) => sh === "(IX+d)" || sh === "(IX)" || sh === "(IY+d)" || sh === "(IY)");
  if (ROTATES.has(mnemonic) && operands.length >= 2 && BYTE_REGISTERS.has(last) && index === operands.length - 2) {
    const onIndex = encode(mnemonic, operands.slice(0, -1), 0);
    const onRegister = encode(mnemonic, [...operands.slice(0, -2), { shape: last }], 0);
    if ("bytes" in onIndex && "bytes" in onRegister) {
      const bytes = [...onIndex.bytes.slice(0, -1), onRegister.bytes[onRegister.bytes.length - 1]];
      const head = `${mnemonic} ${operands.map((_, i) => text(i)).join(",")}`;
      const db2 = `DB ${bytes.map(dbByte).join(",")}`;
      return { error: `${head} is undocumented: it works on the byte at ${bare2(index)} and also copies the result into ${last}. Fugl\xF8y writes it as data, so write ${db2}.`, rewrite: db2 };
    }
  }
  return void 0;
}
function capped(forms2) {
  if (forms2.length <= 6)
    return { text: list(forms2, "and"), all: true };
  return { text: list([...forms2.slice(0, 5), `${forms2.length - 5} more`], "and"), all: false };
}
function noForm(mnemonic, shapes, entries, written) {
  const said = shapes.map((sh) => word(sh, mnemonic));
  const all = [...new Set(formsOf(entries).map((f) => f === "" ? f : f.split(",").map((x) => word(x, mnemonic)).join(",")))];
  if (shapes.length === 0)
    return needsOperands(mnemonic, all.filter((f) => f !== ""));
  const head = `${mnemonic} has no form ${(written ?? said).join(",")}.`;
  if (mnemonic === "RST")
    return `${head} RST takes a restart address, ${RESTARTS}.`;
  if (all.length === 1 && all[0] === "")
    return `${head} ${mnemonic} takes no operands.`;
  const first = said[0];
  const sharing = first === void 0 ? [] : all.filter((f) => f.split(",")[0] === first);
  if (sharing.length === 1)
    return `${head} The form that starts with ${first} is ${sharing[0]}.`;
  if (sharing.length > 1)
    return `${head} The forms that start with ${first} are ${capped(sharing).text}.`;
  const shown = capped(all.map((f) => f === "" ? `${mnemonic} alone` : f));
  return `${head} Its forms ${shown.all ? "are" : "include"} ${shown.text}.`;
}
function badFixed(mnemonic, slot, value, allowed) {
  if (slot.t === "fixed" && slot.op.kind === "bit") {
    return `${mnemonic} takes a bit number from ${Math.min(...allowed)} to ${Math.max(...allowed)}; ${show(value)} is out of range.`;
  }
  return `${mnemonic} takes ${list(allowed.map(asSource), "or")}; ${show(value)} is not one of them.`;
}
var RELATIVE_FIX = { JR: "Use JP.", DJNZ: "Use DEC B and JP NZ." };
var at = (error, operand2) => ({ error, operand: operand2 });
function encode(mnemonic, operands, pc, options = {}) {
  const mn = mnemonic.toUpperCase();
  const entries = INDEX.get(mn);
  if (entries === void 0)
    return { error: `Unknown instruction ${mn}.` };
  const shapes = operands.map((o) => o.shape);
  let found = candidates(mn, shapes);
  if (found.length === 0)
    return undocumentedEd(mn, operands) ?? spelling(mn, operands, options.written) ?? { error: noForm(mn, shapes, entries, options.written) };
  const fixedAt = found[0].tpl.operands.findIndex((o) => fixedNumber(o) !== void 0);
  if (fixedAt >= 0) {
    const slot = found[0].tpl.operands[fixedAt];
    const value = operands[fixedAt].value;
    if (value === void 0)
      return at(`${formName(mn, found[0])} needs a value for ${slotText(slot)}.`, fixedAt);
    const exact = found.filter((e) => fixedNumber(e.tpl.operands[fixedAt]) === value);
    if (exact.length === 0) {
      const allowed = [...new Set(found.map((e) => fixedNumber(e.tpl.operands[fixedAt])))].sort((a, b) => a - b);
      return at(badFixed(mn, slot, value, allowed), fixedAt);
    }
    found = exact;
  }
  const entry2 = found[0];
  const { tpl } = entry2;
  const name = formName(mn, entry2);
  const tail = [];
  let d = 0;
  for (let i = 0; i < tpl.operands.length; i++) {
    const slot = tpl.operands[i];
    if (slot.t === "fixed")
      continue;
    const given = operands[i];
    const value = slot.t === "(ix+d)" && given.shape === `(${slot.reg})` ? 0 : given.value;
    if (value === void 0)
      return at(`${name} needs a value for ${slotText(slot)}.`, i);
    if (!Number.isInteger(value))
      return at(`${name} needs a whole number for ${slotText(slot)}; ${value} is not one.`, i);
    switch (slot.t) {
      case "n":
      case "d": {
        if (value < -128 || value > 255)
          return at(`${name} takes a byte, -128 to 255; ${show(value)} is out of range.`, i);
        tail.push(value & 255);
        break;
      }
      case "(n)": {
        if (value < 0 || value > 255)
          return at(`${name} takes a port, 0 to 255; ${show(value)} is out of range.`, i);
        tail.push(value);
        break;
      }
      case "nn":
      case "(nn)": {
        if (value < -32768 || value > 65535)
          return at(`${name} takes ${slot.t === "nn" ? "a word" : "an address"}, -32768 to 65535; ${show(value)} is out of range.`, i);
        tail.push(value & 255, value >> 8 & 255);
        break;
      }
      case "e": {
        if (value < -32768 || value > 65535)
          return at(`${name} takes an address, -32768 to 65535; ${show(value)} is out of range.`, i);
        const fix = RELATIVE_FIX[mn] ?? "Use JP.";
        const target = value & 65535;
        const disp = target - (pc + tpl.length);
        if (disp < -128 || disp > 127) {
          const wrapped = (disp % 65536 + 98304) % 65536 - 32768;
          if (wrapped >= -128 && wrapped <= 127)
            return at(`${mn} cannot wrap around the top of memory from ${address(pc)} to ${address(target)}. ${fix}`, i);
          const where = disp > 0 ? `${disp} bytes ahead` : `${-disp} bytes back`;
          return at(`${mn} reaches 128 bytes either way; ${options.target ?? `the target ${address(value)}`} is ${where}. ${fix}`, i);
        }
        tail.push(disp & 255);
        break;
      }
      case "(ix+d)": {
        if (value < -128 || value > 127)
          return at(`The displacement in (${slot.reg}+d) runs from -128 to 127; ${show(value)} is out of range.`, i);
        d = value;
        if (entry2.table !== "ddcb" && entry2.table !== "fdcb")
          tail.push(value & 255);
        break;
      }
    }
  }
  return { bytes: [...lead(entry2, d), ...tail] };
}
function lengthOf(mnemonic, shapes) {
  return candidates(mnemonic.toUpperCase(), shapes)[0]?.tpl.length ?? null;
}
function forms(mnemonic) {
  return formsOf(INDEX.get(mnemonic.toUpperCase()) ?? []);
}
function mnemonics() {
  return [...INDEX.keys()].sort();
}

// node_modules/@fugloy/disasm/dist/memory.js
var SIZE = 65536;
function ranges(b) {
  if (b.length === 0)
    return [];
  const last = b.start + b.length - 1;
  if (last < SIZE)
    return [[b.start, last]];
  return [[b.start, SIZE - 1], [0, last - SIZE]];
}
var MemoryImage = class {
  constructor() {
    __publicField(this, "bytes", new Uint8Array(SIZE));
    /** 1 where a byte was loaded, else 0. One byte per address, never packed. */
    __publicField(this, "loaded", new Uint8Array(SIZE));
    __publicField(this, "blocks", []);
    __publicField(this, "overlaps", []);
  }
  /** Writes `data` at `addr`, wrapping past $FFFF, and records the block and any overlaps. */
  load(addr, data) {
    const start = addr & 65535;
    const length = data.length;
    const block = {
      index: this.blocks.length,
      start,
      length,
      end: start + Math.max(length, 1) - 1 & 65535,
      wrapped: start + length > SIZE
    };
    for (const earlier of this.blocks) {
      for (const [lo2, hi2] of ranges(block)) {
        for (const [elo, ehi] of ranges(earlier)) {
          const s = Math.max(lo2, elo);
          const e = Math.min(hi2, ehi);
          if (s <= e)
            this.overlaps.push({ block: block.index, earlier: earlier.index, start: s, end: e });
        }
      }
    }
    for (let i = 0; i < length; i++) {
      const a = start + i & 65535;
      this.bytes[a] = data[i] & 255;
      this.loaded[a] = 1;
    }
    this.blocks.push(block);
    return block;
  }
  isLoaded(addr) {
    return this.loaded[addr & 65535] === 1;
  }
  /** The byte at `addr`, or undefined when nothing was loaded there. */
  read(addr) {
    const a = addr & 65535;
    return this.loaded[a] === 1 ? this.bytes[a] : void 0;
  }
  /** Contiguous loaded ranges in address order; each becomes its own ORG. */
  runs() {
    const out = [];
    let start = -1;
    for (let a = 0; a <= SIZE; a++) {
      const on = a < SIZE && this.loaded[a] === 1;
      if (on && start < 0)
        start = a;
      if (!on && start >= 0) {
        out.push({ start, end: a - 1, length: a - start });
        start = -1;
      }
    }
    return out;
  }
  lowestLoaded() {
    const i = this.loaded.indexOf(1);
    return i < 0 ? null : i;
  }
};

// node_modules/@fugloy/disasm/dist/symbols/types.js
var SELECTIONS = [
  { machine: 1, dos: "ldos", tables: ["rom-model1", "hardware-model1", "dos-ldos51-model1"] },
  { machine: 1, dos: "none", tables: ["rom-model1", "hardware-model1"] },
  { machine: 3, dos: "trsdos", tables: ["rom-model3", "hardware-model3", "dos-trsdos13"] },
  { machine: 3, dos: "ldos", tables: ["rom-model3", "hardware-model3", "dos-ldos51-model3"] },
  { machine: 3, dos: "none", tables: ["rom-model3", "hardware-model3"] },
  { machine: 4, dos: "none", tables: ["svc-lsdos6"] }
];

// node_modules/@fugloy/disasm/dist/symbols/tables.generated.js
var TABLES2 = {
  "rom-model1": [
    { table: "rom-model1", kind: "routine", key: 0, name: "$RESET", length: 1, purpose: "power-on and RESET entry: disable interrupts, clear A, and jump to the cold-start code at 0674H", cite: [{ source: "paay", page: "2" }, { source: "decker", page: "51" }, { source: "m3-basic", page: "12/15" }], coined: false, note: "RST 00H continues at 0674H here; on the Model III it continues at 3015H (decker 51)" },
    { table: "rom-model1", kind: "routine", key: 8, name: "SYNCHK", length: 1, purpose: "check that (HL) equals the byte after the RST, else syntax error; then get the next text character", cite: [{ source: "paay", page: "2" }, { source: "decker", page: "51" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 11, name: "GETPC", length: 1, purpose: "POP HL then JP (HL): return with the caller's return address in HL, so relocatable code can find itself", cite: [{ source: "decker", page: "53" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 13, name: "DISKBOOT", length: 1, purpose: "warm restart: jump to the disk bootstrap loader at 069FH without re-initializing the system", cite: [{ source: "decker", page: "53" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 16, name: "NEXTCHAR", length: 1, purpose: "step HL to the next non-blank text character; carry for a digit, zero at a colon or end of line", cite: [{ source: "paay", page: "2" }, { source: "decker", page: "51" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 19, name: "GETDEV", length: 1, purpose: "read a byte into A from the device whose control block DE addresses; Z if it was ready", cite: [{ source: "decker", page: "10" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 24, name: "CMPHLDE", length: 1, purpose: "compare HL with DE as unsigned 16-bit numbers; Z if equal, carry if DE is the larger", cite: [{ source: "paay", page: "3" }, { source: "decker", page: "52" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 27, name: "PUTDEV", length: 1, purpose: "send the byte in A to the device whose control block DE points to; Z is set if the device was ready", cite: [{ source: "decker", page: "10" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 32, name: "TESTNTF", length: 1, purpose: "test the number type flag at 40AFH; the flags show the type and A returns the type minus 3", cite: [{ source: "paay", page: "3" }, { source: "decker", page: "52" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 40, name: "BREAKRST", length: 1, purpose: "jump through the vector at 400CH, a no-op without a disk system and a DOS hook for BREAK and overlays", cite: [{ source: "paay", page: "3" }, { source: "decker", page: "52" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 43, name: "$KBCHAR", length: 1, purpose: "scan the keyboard once: A returns the key's character code, or zero if no key is down (DE is used)", cite: [{ source: "paay", page: "3" }, { source: "decker", page: "12" }, { source: "m3-basic", page: "12/11" }], coined: false },
    { table: "rom-model1", kind: "routine", key: 48, name: "DEBUGRST", length: 1, purpose: "jump through the vector at 400FH, which a disk system uses as its DEBUG entry", cite: [{ source: "paay", page: "3" }, { source: "decker", page: "52" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 51, name: "$VDCHAR", length: 1, purpose: "display the character in A at the cursor, carrying out control codes (DE is used)", cite: [{ source: "paay", page: "3" }, { source: "decker", page: "14" }, { source: "m3-basic", page: "12/20" }], coined: false },
    { table: "rom-model1", kind: "routine", key: 56, name: "INTRST", length: 1, purpose: "jump through the vector at 4012H, which is EI and RET without a disk system", cite: [{ source: "paay", page: "4" }, { source: "decker", page: "52" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 59, name: "$PRCHAR", length: 1, purpose: "send A to the line printer when it is ready; with A zero it only returns the printer status in Z", cite: [{ source: "paay", page: "4" }, { source: "decker", page: "15" }, { source: "m3-basic", page: "12/14" }], coined: false },
    { table: "rom-model1", kind: "routine", key: 64, name: "$KBLINE", length: 1, purpose: "read a line from the keyboard by jumping to the line-input routine at 05D9H", cite: [{ source: "decker", page: "13" }, { source: "m3-basic", page: "12/12" }], coined: false },
    { table: "rom-model1", kind: "routine", key: 73, name: "$KBWAIT", length: 1, purpose: "wait until a key is pressed and return its character in A, by calling 002BH in a loop (DE is used)", cite: [{ source: "paay", page: "4" }, { source: "decker", page: "13" }, { source: "m3-basic", page: "12/12" }], coined: false },
    { table: "rom-model1", kind: "region", key: 80, name: "CTRLCHARTAB", length: 16, purpose: "table of the control codes for ENTER, CLEAR, BREAK, the arrow keys, and space: eight two-byte entries", cite: [{ source: "paay", page: "4" }], coined: true, note: "on the Model III this address is $RSRCV, the RS-232-C receive routine (decker 19)" },
    { table: "rom-model1", kind: "routine", key: 96, name: "$DELAY", length: 1, purpose: "pause set by BC: about 14.66 microseconds a count, and about a second at BC of zero", cite: [{ source: "paay", page: "4" }, { source: "decker", page: "53" }, { source: "m3-basic", page: "12/10" }], coined: false, note: "each count takes about 14.66 microseconds here and about 14.80 on the Model III, whose loop has an extra instruction (decker 53)" },
    { table: "rom-model1", kind: "routine", key: 102, name: "NMIENTRY", length: 1, purpose: "RESET button entry: restart through 0000H if a disk controller is present, else go to BASIC Ready at 06CCH", cite: [{ source: "paay", page: "4" }, { source: "decker", page: "54" }], coined: true, note: "the Model III handler tests port E4H for a disk interrupt instead (decker 54)" },
    { table: "rom-model1", kind: "routine", key: 301, name: "ERR_L3", length: 1, purpose: "raise the L3 ERROR, where the Disk BASIC command vectors from 4152H point when no Disk BASIC is loaded", cite: [{ source: "paay", page: "5" }, { source: "decker", page: "61" }, { source: "decker", page: "72" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 306, name: "BASICPOINT", length: 1, purpose: "BASIC POINT entry point; the SET and RESET entries follow at 0135H and 0138H", cite: [{ source: "paay", page: "5" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 309, name: "BASICSET", length: 1, purpose: "BASIC SET entry point", cite: [{ source: "paay", page: "5" }, { source: "decker", page: "121" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 312, name: "BASICRESET", length: 1, purpose: "BASIC RESET entry point", cite: [{ source: "paay", page: "5" }, { source: "decker", page: "121" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 336, name: "PIXELOP", length: 1, purpose: "pixel routine behind SET, RESET, and POINT: function and X on the stack, Y in A, then JP here", cite: [{ source: "paay", page: "5" }, { source: "decker", page: "15" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 457, name: "$VDCLS", length: 1, purpose: "clear the screen and home the cursor, as BASIC CLS does", cite: [{ source: "paay", page: "5" }, { source: "decker", page: "15" }, { source: "m3-basic", page: "12/21" }], coined: false },
    { table: "rom-model1", kind: "routine", key: 467, name: "BASICRANDOM", length: 1, purpose: "the core of BASIC RANDOM: store the Z80 refresh register in the seed byte at 40ABH and return", cite: [{ source: "paay", page: "6" }, { source: "decker", page: "29" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 473, name: "CASBITOUT", length: 1, purpose: "write one bit to the cassette as pulses with delay loops between them (uses AF, B, and HL)", cite: [{ source: "paay", page: "6" }, { source: "decker", page: "16" }], coined: true, note: "on the Model III this address is $PRSCN, the print-screen routine (decker 16, 80)" },
    { table: "rom-model1", kind: "routine", key: 504, name: "$CSOFF", length: 1, purpose: "turn the cassette motor off", cite: [{ source: "paay", page: "6" }, { source: "decker", page: "16" }, { source: "m3-basic", page: "12/8" }], coined: false },
    { table: "rom-model1", kind: "routine", key: 510, name: "CASDEFDRIVE", length: 1, purpose: "choose the cassette drive from BASIC text (# then -1 or -2 and a comma, else drive 1), then select it", cite: [{ source: "decker", page: "16" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 530, name: "CASDRVSEL", length: 1, purpose: "select the cassette drive named by A (0 first, 1 second) and turn its motor on", cite: [{ source: "paay", page: "6" }, { source: "decker", page: "17" }], coined: true, note: "the Model III keeps this address only as XOR A; RET, so Model I software that calls it still runs (decker 17)" },
    { table: "rom-model1", kind: "routine", key: 533, name: "CASMOTORON", length: 1, purpose: "turn the cassette motor on without selecting a drive, so the drive chosen earlier stays selected", cite: [{ source: "decker", page: "17" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 542, name: "CASINRESET", length: 1, purpose: "reset the cassette input at port FFH (uses AF and HL)", cite: [{ source: "decker", page: "17" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 556, name: "CASBLINK", length: 1, purpose: "blink the right-hand asterisk at the top right of the screen while a tape loads (uses AF)", cite: [{ source: "paay", page: "6" }, { source: "decker", page: "17" }], coined: true, note: "on the Model III this address only jumps to 0212H, which clears A and returns (decker 17)" },
    { table: "rom-model1", kind: "routine", key: 565, name: "$CSIN", length: 1, purpose: "read one byte from the cassette into A, with BC, DE, and HL kept", cite: [{ source: "paay", page: "6" }, { source: "decker", page: "17" }, { source: "m3-basic", page: "12/7" }], coined: false },
    { table: "rom-model1", kind: "routine", key: 577, name: "CASBITIN", length: 1, purpose: "read one bit from the cassette and shift it into A; 0235H calls it eight times for a byte (uses AF and HL)", cite: [{ source: "paay", page: "6" }, { source: "decker", page: "17" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 612, name: "$CSOUT", length: 1, purpose: "write the byte in A to the cassette, with BC, DE, and HL kept", cite: [{ source: "paay", page: "6" }, { source: "decker", page: "17" }, { source: "m3-basic", page: "12/9" }], coined: false },
    { table: "rom-model1", kind: "routine", key: 644, name: "CSHWRSEL", length: 1, purpose: "select the cassette drive through 01FEH and turn the motor on, then write the leader and sync byte at 0287H", cite: [{ source: "decker", page: "17" }], coined: true, note: "on the Model III this address holds only JP 0287H (decker 17)" },
    { table: "rom-model1", kind: "routine", key: 647, name: "$CSHWR", length: 1, purpose: "write the cassette leader and the A5H sync byte; the motor must already be on, which 0284H arranges", cite: [{ source: "paay", page: "6" }, { source: "decker", page: "17" }, { source: "m3-basic", page: "12/7" }], coined: false, note: "unlike the Model III routine at this address, this one does not turn the cassette on (decker 17)" },
    { table: "rom-model1", kind: "routine", key: 659, name: "CSHINSEL", length: 1, purpose: "select the cassette drive through 01FEH and turn the motor on, then look for the leader and sync byte at 0296H", cite: [{ source: "decker", page: "17" }], coined: true, note: "on the Model III this address holds only JP 0243H (decker 17)" },
    { table: "rom-model1", kind: "routine", key: 662, name: "$CSHIN", length: 1, purpose: "read the cassette past the leader and the A5H sync byte, then show two asterisks; the motor must be on", cite: [{ source: "paay", page: "7" }, { source: "decker", page: "17" }, { source: "m3-basic", page: "12/6" }], coined: false, note: "unlike the Model III routine at this address, this one does not turn the cassette on (decker 17)" },
    { table: "rom-model1", kind: "routine", key: 693, name: "BASICSYSTEM", length: 1, purpose: "main routine of the BASIC SYSTEM command, which loads a machine-language tape", cite: [{ source: "paay", page: "7" }], coined: true, note: "BASIC enters the command at 02B2H (decker 121), which calls the DOS link at 41E2H (decker 74) and falls into this address; the Model III code differs inside it, at 02E2H-02E4H, where INC HL and JR NZ,02D1H come in the opposite order (decker 82)" },
    { table: "rom-model1", kind: "routine", key: 788, name: "CSINWORD", length: 1, purpose: "read two bytes from a running cassette into HL, low byte first, as a SYSTEM tape's entry address is read", cite: [{ source: "paay", page: "7" }, { source: "decker", page: "17" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 810, name: "OUTCHAR", length: 1, purpose: "send A to the output device that the flag at 409CH selects: video, printer, or cassette", cite: [{ source: "paay", page: "7" }, { source: "decker", page: "10" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 826, name: "VDCHARCOL", length: 1, purpose: "display A as 0033H does but keep DE, and refresh the cursor column that TAB reads at 40A6H", cite: [{ source: "paay", page: "7" }, { source: "decker", page: "15" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 840, name: "CURCOLUMN", length: 1, purpose: "return the cursor column on its line in A: 0 to 63, or 0 to 31 in 32-character mode", cite: [{ source: "decker", page: "15" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 856, name: "KBSAVEDE", length: 1, purpose: "scan the keyboard like 002BH but keep DE; it first calls the DOS link at 41C4H, which an entry at 035BH skips", cite: [{ source: "decker", page: "13" }], coined: true, note: "Paay (p. 7) lists the same routine at 035BH, just past the DOS link" },
    { table: "rom-model1", kind: "routine", key: 865, name: "KBINBUF", length: 1, purpose: "read a line from the keyboard into the BASIC input buffer with echo, 240 characters at most; carry if BREAK", cite: [{ source: "paay", page: "8" }, { source: "decker", page: "13" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 900, name: "KBWAITDE", length: 1, purpose: "wait for a key like 0049H but keep DE, by calling 0358H in a loop", cite: [{ source: "decker", page: "13" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 907, name: "DEVRESETPRT", length: 1, purpose: "select video as the output device again, first ending a partly printed printer line with a carriage return", cite: [{ source: "decker", page: "11" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 916, name: "PRTCR", length: 1, purpose: "send a carriage return to the printer through 039CH", cite: [{ source: "decker", page: "16" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 924, name: "PRTCHARPOS", length: 1, purpose: "send A to the printer, keeping all registers; counts the line position at 409BH, turns a line feed into CR", cite: [{ source: "paay", page: "8" }, { source: "decker", page: "16" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 962, name: "IODISPATCH", length: 1, purpose: "the I/O driver entry routine behind 0013H and 001BH: runs the driver the control block at DE names", cite: [{ source: "decker", page: "82" }], coined: true, note: "the Model III has its printer driver, PRDRIVER, at this address; its I/O driver entry routine is at 0674H (decker 82)" },
    { table: "rom-model1", kind: "routine", key: 995, name: "KBDRIVER", length: 1, purpose: "the Model I keyboard driver that the keyboard control block points to: scans the keys, returns ASCII in A", cite: [{ source: "paay", page: "8" }, { source: "decker", page: "13" }], coined: true, note: "the Model III keeps its keyboard driver at 3024H (decker 14)" },
    { table: "rom-model1", kind: "routine", key: 1112, name: "VDDRIVER", length: 1, purpose: "the Model I video driver that the video control block points to: shows the character in C, scrolls", cite: [{ source: "paay", page: "8" }, { source: "decker", page: "15" }], coined: true, note: "the Model III keeps its video driver at 0473H (decker 15)" },
    { table: "rom-model1", kind: "routine", key: 1219, name: "VD64MODE", length: 1, purpose: "switch the display to 64-character mode (uses A)", cite: [{ source: "paay", page: "8" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 1270, name: "VD32MODE", length: 1, purpose: "switch the display to 32-character mode (uses A and HL)", cite: [{ source: "paay", page: "8" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 1404, name: "VDCLRTOEND", length: 1, purpose: "clear the screen from the address in HL to the end of video memory (uses DE and A)", cite: [{ source: "paay", page: "8" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 1421, name: "PRDRIVER", length: 1, purpose: "the Model I printer driver, whose address the printer control block holds: it prints the character in C", cite: [{ source: "paay", page: "9" }, { source: "decker", page: "16" }], coined: true, note: "the Model III keeps its printer driver at 03C2H (decker 16)" },
    { table: "rom-model1", kind: "routine", key: 1489, name: "PRTTEST", length: 1, purpose: "read the printer status at 37E8H; Z is set when the printer is ready to take a character (uses AF)", cite: [{ source: "decker", page: "16" }], coined: true, note: "the Model III keeps this routine at 044BH (decker 16)" },
    { table: "rom-model1", kind: "routine", key: 1497, name: "LINEINPUT", length: 1, purpose: "echoing line input into the buffer at HL, B characters at most, ended by ENTER or BREAK; B returns the length", cite: [{ source: "paay", page: "9" }, { source: "decker", page: "13" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 1740, name: "READYREENTRY", length: 1, purpose: "return to BASIC Ready without the false Out of Memory message, by loading BC with 1A18H and jumping to 19AEH", cite: [{ source: "paay", page: "9" }, { source: "decker", page: "54" }], coined: true, note: "on the Model III 06CCH is part of the LIST command and no longer returns to BASIC (decker 54, 82)" },
    { table: "rom-model1", kind: "routine", key: 1970, name: "ERR_OV", length: 1, purpose: "raise the OV ERROR (overflow)", cite: [{ source: "paay", page: "10" }, { source: "decker", page: "61" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 2366, name: "MUL10SNG", length: 1, purpose: "multiply the single-precision accumulator by 10", cite: [{ source: "decker", page: "28" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 2687, name: "CINT", length: 1, purpose: "convert the accumulator to an integer in HL; a USR routine calls this to take its argument", cite: [{ source: "paay", page: "13" }, { source: "decker", page: "31" }, { source: "l2-1979", page: "8-9" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 2714, name: "HLTOACC", length: 1, purpose: "make the integer in HL the accumulator's value; a USR routine jumps here to hand its result back to BASIC", cite: [{ source: "paay", page: "13" }, { source: "decker", page: "33" }, { source: "l2-1979", page: "8-9" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 2804, name: "CHKSTRING", length: 1, purpose: "return if the accumulator holds a string, else raise a type mismatch error (BC, DE, and HL kept)", cite: [{ source: "paay", page: "13" }, { source: "decker", page: "42" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 2806, name: "ERR_TM", length: 1, purpose: "raise the TM ERROR (type mismatch)", cite: [{ source: "paay", page: "13" }, { source: "decker", page: "61" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 3692, name: "ASCTONUM", length: 1, purpose: "read the numeric text at HL into the accumulator, in the smallest number type that holds it", cite: [{ source: "paay", page: "15" }, { source: "decker", page: "34" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 4015, name: "OUTHLDEC", length: 1, purpose: "print the positive integer in HL in decimal on the device that 409CH selects", cite: [{ source: "decker", page: "34" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 6551, name: "ERR_SN", length: 1, purpose: "raise the SN ERROR (syntax error)", cite: [{ source: "paay", page: "15" }, { source: "decker", page: "61" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 6562, name: "BASICERROR", length: 1, purpose: "BASIC error exit: put the even error code, 0 to 2CH, in E and jump here", cite: [{ source: "decker", page: "60" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 6574, name: "READYALT", length: 1, purpose: "return to BASIC Ready without a false Out of Memory message: load BC with 1A18H, then jump here", cite: [{ source: "decker", page: "54" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 6681, name: "$READY", length: 1, purpose: "return to BASIC Ready by jumping here, the entry Radio Shack documents; may leave a false Out of Memory error", cite: [{ source: "paay", page: "16" }, { source: "decker", page: "54" }, { source: "m3-basic", page: "12/15" }], coined: false },
    { table: "rom-model1", kind: "routine", key: 6904, name: "FIXLINEPTRS", length: 1, purpose: "recompute the forward line pointers of the BASIC program, as a renumbering program needs (uses A, HL, DE)", cite: [{ source: "paay", page: "16" }, { source: "decker", page: "56" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 6956, name: "FINDLINE", length: 1, purpose: "find the BASIC line numbered DE: carry if found, BC at that line and HL at the next one (uses AF, BC, and HL)", cite: [{ source: "paay", page: "16" }, { source: "decker", page: "56" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 7091, name: "INPROMPT", length: 1, purpose: "show a question mark and a space, then read a line as 0361H does", cite: [{ source: "paay", page: "16" }, { source: "decker", page: "14" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 7754, name: "ERR_FC", length: 1, purpose: "raise the FC ERROR (illegal function call)", cite: [{ source: "paay", page: "17" }, { source: "decker", page: "61" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 7770, name: "ASCTODE", length: 1, purpose: "read the unsigned decimal number at HL into DE; HL returns at the delimiter", cite: [{ source: "paay", page: "18" }, { source: "decker", page: "35" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 8441, name: "NEWLINE", length: 1, purpose: "send a carriage return to the output device unless the cursor is already at the start of a line", cite: [{ source: "decker", page: "15" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 8446, name: "OUTCR", length: 1, purpose: "send a carriage return to the device that 409CH selects", cite: [{ source: "decker", page: "11" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 8511, name: "TABTO", length: 1, purpose: "BASIC TAB on the device 409CH selects: E is the column, HL the text to print or a zero byte", cite: [{ source: "decker", page: "11" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 8553, name: "DEVRESETCAS", length: 1, purpose: "select video as the output device again, first switching the cassette off if it was in use", cite: [{ source: "decker", page: "11" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 8649, name: "INPUTSTMT", length: 1, purpose: "BASIC INPUT: show the prompt at HL if any, read the line, and assign the variables that follow", cite: [{ source: "decker", page: "14" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 9015, name: "EVALEXPR", length: 1, purpose: "evaluate the BASIC expression at HL into the accumulator; it ends at a zero, comma, ) or colon, where HL returns", cite: [{ source: "paay", page: "19" }, { source: "decker", page: "36" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 9741, name: "FINDVAR", length: 1, purpose: "find or create the BASIC variable named at HL; DE returns its address (a string's three-byte vector)", cite: [{ source: "paay", page: "20" }, { source: "decker", page: "36" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 10407, name: "OUTSTR", length: 1, purpose: "print the string at HL, ended by a zero byte or a quote, on the device 409CH selects, as PRINT does", cite: [{ source: "paay", page: "21" }, { source: "decker", page: "11" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 11013, name: "ACCTODE", length: 1, purpose: "convert the accumulator to an integer in DE; Z is set if the result is 255 or less", cite: [{ source: "paay", page: "22" }, { source: "decker", page: "31" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 11125, name: "OUTSTRZ", length: 1, purpose: "print the zero-terminated string at HL on the device that 409CH selects, through 032AH", cite: [{ source: "decker", page: "11" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 11253, name: "BASICCSAVE", length: 1, purpose: "BASIC CSAVE: save the program to cassette, with HL at the quoted one-character file name", cite: [{ source: "paay", page: "22" }, { source: "decker", page: "17" }], coined: true },
    { table: "rom-model1", kind: "routine", key: 11295, name: "BASICCLOAD", length: 1, purpose: "BASIC CLOAD: load or verify a program from cassette; it ends at BASIC Ready instead of returning", cite: [{ source: "paay", page: "23" }, { source: "decker", page: "18" }], coined: true },
    { table: "rom-model1", kind: "vector", key: 16384, name: "SYNCHKVEC", length: 3, purpose: "jump vector for RST 08H, set at start-up to continue at 1C96H, the syntax-check code", cite: [{ source: "paay", page: "2" }, { source: "paay", page: "24" }, { source: "decker", page: "51" }, { source: "l2-1979", page: "D-1" }], coined: true },
    { table: "rom-model1", kind: "vector", key: 16387, name: "NEXTCHARVEC", length: 3, purpose: "jump vector for RST 10H, set at start-up to continue at 1D78H, the next-character code", cite: [{ source: "paay", page: "2" }, { source: "decker", page: "51" }], coined: true },
    { table: "rom-model1", kind: "vector", key: 16390, name: "CMPHLDEVEC", length: 3, purpose: "jump vector for RST 18H, set at start-up to continue at 1C90H, the HL and DE compare", cite: [{ source: "paay", page: "3" }, { source: "paay", page: "24" }, { source: "decker", page: "52" }], coined: true },
    { table: "rom-model1", kind: "vector", key: 16393, name: "TESTNTFVEC", length: 3, purpose: "jump vector for RST 20H, set at start-up to continue at 25D9H, the number-type test", cite: [{ source: "paay", page: "3" }, { source: "paay", page: "24" }, { source: "decker", page: "52" }], coined: true },
    { table: "rom-model1", kind: "vector", key: 16396, name: "BREAKVEC", length: 3, purpose: "RST 28H's RAM jump vector: a lone RET without a disk system; the keyboard driver calls it on BREAK", cite: [{ source: "paay", page: "3" }, { source: "paay", page: "24" }, { source: "decker", page: "52" }], coined: true },
    { table: "rom-model1", kind: "vector", key: 16399, name: "DEBUGVEC", length: 3, purpose: "jump vector for RST 30H, a lone RET without a disk system; a DOS uses it as its DEBUG entry", cite: [{ source: "paay", page: "3" }, { source: "paay", page: "24" }, { source: "decker", page: "52" }], coined: true },
    { table: "rom-model1", kind: "vector", key: 16402, name: "INTVEC", length: 3, purpose: "RST 38H's RAM jump vector: EI and RET without a disk system, a disk system's interrupt entry with one", cite: [{ source: "paay", page: "4" }, { source: "paay", page: "24" }, { source: "decker", page: "52" }], coined: true },
    { table: "rom-model1", kind: "variable", key: 16405, name: "KBDCB", length: 1, purpose: "start of the 8-byte keyboard control block, its device type byte, normally 1 (read only)", cite: [{ source: "paay", page: "25" }, { source: "decker", page: "8" }, { source: "l2-1979", page: "D-2" }], coined: true, note: "LDOS 5.1 names the whole 8-byte keyboard control block KIDCB$ (4015H-401CH, ldos51 6-29); this table keeps the ROM's own field names" },
    { table: "rom-model1", kind: "variable", key: 16406, name: "KBDRVADDR", length: 2, purpose: "address of the keyboard driver, which the keyboard scan jumps to on each scan", cite: [{ source: "paay", page: "25" }, { source: "decker", page: "8" }, { source: "l2-1979", page: "D-2" }], coined: true },
    { table: "rom-model1", kind: "variable", key: 16413, name: "VDDCB", length: 1, purpose: "start of the 8-byte video control block, its device type byte, normally 7 (read and write)", cite: [{ source: "paay", page: "25" }, { source: "decker", page: "8" }, { source: "l2-1979", page: "D-2" }], coined: true, note: "LDOS 5.1 names the whole 8-byte video control block DODCB$ (401DH-4024H, ldos51 6-29); this table keeps the ROM's own field names" },
    { table: "rom-model1", kind: "variable", key: 16414, name: "VDDRVADDR", length: 2, purpose: "address of the video driver, which the video control block points to", cite: [{ source: "paay", page: "25" }, { source: "decker", page: "8" }, { source: "l2-1979", page: "D-2" }], coined: true },
    { table: "rom-model1", kind: "variable", key: 16416, name: "CURADDR", length: 2, purpose: "address of the cursor in video memory, low byte first, in the range 3C00H to 3FFFH", cite: [{ source: "paay", page: "25" }, { source: "decker", page: "8" }, { source: "l2-1979", page: "D-2" }], coined: true },
    { table: "rom-model1", kind: "variable", key: 16421, name: "PRDCB", length: 1, purpose: "start of the 8-byte printer control block, its device type byte, normally 6 (write only)", cite: [{ source: "paay", page: "25" }, { source: "decker", page: "8" }, { source: "l2-1979", page: "D-2" }], coined: true, note: "LDOS 5.1 names the whole 8-byte printer control block PRDCB$ (4025H-402CH, ldos51 6-29); this table keeps the ROM's own field names" },
    { table: "rom-model1", kind: "variable", key: 16422, name: "PRDRVADDR", length: 2, purpose: "address of the printer driver; pointing it at the video driver sends LPRINT to the screen, and the reverse", cite: [{ source: "paay", page: "25" }, { source: "decker", page: "8" }, { source: "l2-1979", page: "D-2" }], coined: true },
    { table: "rom-model1", kind: "variable", key: 16424, name: "PRTPAGELEN", length: 1, purpose: "lines per page for the printer, 67 at start-up", cite: [{ source: "paay", page: "25" }, { source: "decker", page: "8" }, { source: "decker", page: "9" }, { source: "l2-1979", page: "D-2" }], coined: true, note: "start-up sets 67 on both machines; the Model III counts the page length plus one, so a 66-line form wants 66 here (decker 9)" },
    { table: "rom-model1", kind: "variable", key: 16425, name: "PRTLINECNT", length: 1, purpose: "lines already printed on the current page", cite: [{ source: "paay", page: "25" }, { source: "decker", page: "8" }, { source: "decker", page: "9" }, { source: "l2-1979", page: "D-2" }], coined: true, note: "the Model III holds this count plus one (decker 9)" },
    { table: "rom-model1", kind: "variable", key: 16438, name: "KBROWS", length: 7, purpose: "last state of the seven keyboard rows (3801H-3840H), so a scan can tell a new press from a held key", cite: [{ source: "paay", page: "26" }, { source: "decker", page: "64" }, { source: "decker", page: "65" }], coined: true },
    { table: "rom-model1", kind: "variable", key: 16445, name: "PORTFFBITS", length: 1, purpose: "bits last written to port FFH: bit 3 is 32-character video, bit 2 the cassette relay, bits 1-0 the audio", cite: [{ source: "paay", page: "26" }, { source: "decker", page: "11" }, { source: "decker", page: "12" }, { source: "decker", page: "65" }], coined: true, note: "Paay calls this the print size flag, 0 for 64 characters and F8H for 32; Decker gives it as the bits last sent to port FFH (decker 11); the Model III keeps its port ECH bits at 4210H (decker 12)" },
    { table: "rom-model1", kind: "variable", key: 16526, name: "USRVEC", length: 2, purpose: "address of the USR routine, low byte first; BASIC programs POKE it into 16526 and 16527", cite: [{ source: "paay", page: "26" }, { source: "decker", page: "66" }, { source: "l2-1979", page: "8-8" }], coined: true },
    { table: "rom-model1", kind: "vector", key: 16531, name: "INPORT", length: 3, purpose: "RAM routine IN A,(n) then RET: poke the port number n into its second byte at 4094H before calling it", cite: [{ source: "paay", page: "26" }, { source: "decker", page: "66" }], coined: true },
    { table: "rom-model1", kind: "vector", key: 16534, name: "OUTPORT", length: 3, purpose: "RAM routine OUT (n),A then RET: poke the port number n into its second byte at 4097H before calling it", cite: [{ source: "paay", page: "26" }, { source: "decker", page: "66" }], coined: true },
    { table: "rom-model1", kind: "variable", key: 16537, name: "INKEYBUF", length: 1, purpose: "key buffer for INKEY$: a non-zero value here is returned before the keyboard is scanned", cite: [{ source: "paay", page: "26" }, { source: "decker", page: "66" }], coined: true },
    { table: "rom-model1", kind: "variable", key: 16539, name: "PRTCOLUMN", length: 1, purpose: "number of characters already sent to the printer on the current line, for a TAB that works past column 63", cite: [{ source: "paay", page: "26" }, { source: "decker", page: "66" }], coined: true },
    { table: "rom-model1", kind: "variable", key: 16540, name: "OUTDEVFLAG", length: 1, purpose: "output device for the general output routines: 0 video, 1 printer, 255 cassette", cite: [{ source: "paay", page: "26" }, { source: "decker", page: "67" }], coined: true },
    { table: "rom-model1", kind: "variable", key: 16548, name: "PROGSTART", length: 2, purpose: "pointer to the start of the BASIC program text; the byte just below it must be zero", cite: [{ source: "paay", page: "26" }, { source: "decker", page: "67" }], coined: true },
    { table: "rom-model1", kind: "variable", key: 16550, name: "LINEPOS", length: 1, purpose: "cursor column on the current video line, which TAB and POS read", cite: [{ source: "paay", page: "27" }, { source: "decker", page: "67" }], coined: true },
    { table: "rom-model1", kind: "variable", key: 16551, name: "IOBUFPTR", length: 2, purpose: "pointer to the BASIC input buffer, used by the line-input routines and while BASIC tokenizes a line", cite: [{ source: "paay", page: "27" }, { source: "decker", page: "67" }], coined: true },
    { table: "rom-model1", kind: "variable", key: 16559, name: "NTF", length: 1, purpose: "number type flag for the accumulator: 2 integer, 3 string, 4 single precision, 8 double precision", cite: [{ source: "paay", page: "27" }, { source: "decker", page: "68" }], coined: true },
    { table: "rom-model1", kind: "variable", key: 16561, name: "MEMTOP", length: 2, purpose: "pointer to the last memory address BASIC may use, set from the answer to MEMORY SIZE?", cite: [{ source: "paay", page: "27" }, { source: "decker", page: "68" }], coined: true },
    { table: "rom-model1", kind: "variable", key: 16633, name: "VARSTART", length: 2, purpose: "pointer to the simple variables, which is also the end of the BASIC program", cite: [{ source: "paay", page: "28" }, { source: "decker", page: "70" }], coined: true },
    { table: "rom-model1", kind: "variable", key: 16635, name: "ARRAYSTART", length: 2, purpose: "pointer to the start of the array variables", cite: [{ source: "paay", page: "28" }, { source: "decker", page: "71" }], coined: true },
    { table: "rom-model1", kind: "variable", key: 16637, name: "FREESTART", length: 2, purpose: "pointer to the end of the arrays, where free memory begins", cite: [{ source: "paay", page: "28" }, { source: "decker", page: "71" }], coined: true },
    { table: "rom-model1", kind: "variable", key: 16669, name: "ACC", length: 8, purpose: "the arithmetic accumulator: an integer fills 4121H-4122H, a single 4121H-4124H, and a double all eight bytes", cite: [{ source: "paay", page: "28" }, { source: "decker", page: "26" }], coined: true },
    { table: "rom-model1", kind: "variable", key: 16679, name: "AACC", length: 8, purpose: "the auxiliary accumulator that the double-precision routines use, 4127H to 412EH", cite: [{ source: "paay", page: "28" }, { source: "decker", page: "26" }], coined: true }
  ],
  "rom-model3": [
    { table: "rom-model3", kind: "routine", key: 0, name: "$RESET", length: 1, purpose: "restart the whole system from the Cass? prompt, as at power-on", cite: [{ source: "m3-basic", page: "12/15" }], coined: false },
    { table: "rom-model3", kind: "routine", key: 8, name: "SYNCHK", length: 1, purpose: "check that the byte at HL equals the byte after the call (else syntax error), then advance HL", cite: [{ source: "decker", page: "51" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 11, name: "GETPC", length: 1, purpose: "return with the return address in HL, so relocatable code can find where it sits", cite: [{ source: "decker", page: "53" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 13, name: "DISKBOOT", length: 1, purpose: "warm restart: reload and run the disk operating system without a full re-initialization", cite: [{ source: "decker", page: "53" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 16, name: "NEXTCHAR", length: 1, purpose: "advance HL to the next non-blank BASIC text character; flags show a digit or statement end", cite: [{ source: "decker", page: "51" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 19, name: "GETDEV", length: 1, purpose: "read a byte from the device whose control block DE addresses; Z set when it was ready", cite: [{ source: "decker", page: "10" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 24, name: "CMPHLDE", length: 1, purpose: "compare HL with DE as unsigned numbers; Z if equal, carry if HL is the smaller", cite: [{ source: "decker", page: "52" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 27, name: "PUTDEV", length: 1, purpose: "send the byte in A to the device whose control block DE addresses; Z set when it was ready", cite: [{ source: "decker", page: "10" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 32, name: "TESTNTF", length: 1, purpose: "test the number type flag, setting flags that tell a string, integer, single, or double", cite: [{ source: "decker", page: "52" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 40, name: "BREAKRST", length: 1, purpose: "jump through the BREAK vector at 400CH, which a DOS also uses for overlay calls", cite: [{ source: "decker", page: "52" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 43, name: "$KBCHAR", length: 1, purpose: "scan the keyboard once and return a key if one is down", cite: [{ source: "m3-basic", page: "12/11" }], coined: false },
    { table: "rom-model3", kind: "routine", key: 48, name: "DEBUGRST", length: 1, purpose: "jump through the vector at 400FH, the DEBUG entry under a DOS", cite: [{ source: "decker", page: "52" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 51, name: "$VDCHAR", length: 1, purpose: "display the character in A at the cursor", cite: [{ source: "m3-basic", page: "12/20" }], coined: false },
    { table: "rom-model3", kind: "routine", key: 56, name: "INTRST", length: 1, purpose: "maskable interrupt entry, jumping through the vector at 4012H", cite: [{ source: "decker", page: "52" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 59, name: "$PRCHAR", length: 1, purpose: "send the character in A to the printer, waiting until it is ready or BREAK is pressed", cite: [{ source: "m3-basic", page: "12/14" }], coined: false },
    { table: "rom-model3", kind: "routine", key: 64, name: "$KBLINE", length: 1, purpose: "read a line from the keyboard into a buffer at HL", cite: [{ source: "m3-basic", page: "12/12" }], coined: false },
    { table: "rom-model3", kind: "routine", key: 73, name: "$KBWAIT", length: 1, purpose: "wait for a key and return it in A", cite: [{ source: "m3-basic", page: "12/12" }], coined: false },
    { table: "rom-model3", kind: "routine", key: 80, name: "$RSRCV", length: 1, purpose: "receive a character from the RS-232-C port; zero means none arrived", cite: [{ source: "m3-basic", page: "12/18" }], coined: false },
    { table: "rom-model3", kind: "routine", key: 85, name: "$RSTX", length: 1, purpose: "send a character to the RS-232-C port", cite: [{ source: "m3-basic", page: "12/19" }], coined: false },
    { table: "rom-model3", kind: "routine", key: 90, name: "$RSINIT", length: 1, purpose: "set up the RS-232-C port from the baud rate, format, and wait switches in RAM", cite: [{ source: "m3-basic", page: "12/17" }], coined: false },
    { table: "rom-model3", kind: "routine", key: 96, name: "$DELAY", length: 1, purpose: "pause for a time set by BC", cite: [{ source: "m3-basic", page: "12/10" }], coined: false },
    { table: "rom-model3", kind: "routine", key: 102, name: "NMIENTRY", length: 1, purpose: "non-maskable interrupt entry, taken when the RESET button is pressed", cite: [{ source: "decker", page: "54" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 105, name: "$INITIO", length: 1, purpose: "put every I/O driver and route back to its start-up setting", cite: [{ source: "m3-basic", page: "12/10" }], coined: false },
    { table: "rom-model3", kind: "routine", key: 108, name: "$ROUTE", length: 1, purpose: "reroute one I/O device to another, each named by two letters stored in RAM", cite: [{ source: "m3-basic", page: "12/16" }], coined: false },
    { table: "rom-model3", kind: "routine", key: 301, name: "ERR_L3", length: 1, purpose: "raise the L3 ERROR; the Disk BASIC command vectors, TIME$ aside, jump here until a disk BASIC takes over", cite: [{ source: "decker", page: "61" }, { source: "decker", page: "72" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 309, name: "BASICSET", length: 1, purpose: "entry of the SET statement in BASIC's keyword table", cite: [{ source: "decker", page: "121" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 312, name: "BASICRESET", length: 1, purpose: "entry of the RESET statement in BASIC's keyword table", cite: [{ source: "decker", page: "121" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 336, name: "PIXELOP", length: 1, purpose: "the SET, RESET, and POINT of BASIC; arguments go on the stack and it is jumped to", cite: [{ source: "decker", page: "15" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 457, name: "$VDCLS", length: 1, purpose: "clear the screen", cite: [{ source: "m3-basic", page: "12/21" }], coined: false },
    { table: "rom-model3", kind: "routine", key: 473, name: "$PRSCN", length: 1, purpose: "print the whole screen on the printer", cite: [{ source: "m3-basic", page: "12/14" }], coined: false },
    { table: "rom-model3", kind: "routine", key: 504, name: "$CSOFF", length: 1, purpose: "turn the cassette drive off", cite: [{ source: "m3-basic", page: "12/8" }], coined: false },
    { table: "rom-model3", kind: "routine", key: 530, name: "CASSELECT", length: 1, purpose: "clear A and return; kept so Model I programs that select a cassette drive still run", cite: [{ source: "decker", page: "17" }], coined: true, note: "on the Model I this address selects the cassette drive named by A and starts its motor" },
    { table: "rom-model3", kind: "routine", key: 532, name: "PRTCRRAW", length: 1, purpose: "send a carriage return straight to the printer through $PRCHAR", cite: [{ source: "decker", page: "16" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 539, name: "$VDLINE", length: 1, purpose: "display the text at HL up to a carriage return or an ETX", cite: [{ source: "m3-basic", page: "12/21" }], coined: false },
    { table: "rom-model3", kind: "routine", key: 558, name: "BRKTOREADY", length: 1, purpose: "BREAK exit for cassette and RS-232-C waits: enable interrupts and jump to BASIC Ready", cite: [{ source: "decker", page: "18" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 565, name: "$CSIN", length: 1, purpose: "read one byte from the cassette into A", cite: [{ source: "m3-basic", page: "12/7" }], coined: false },
    { table: "rom-model3", kind: "routine", key: 612, name: "$CSOUT", length: 1, purpose: "write the byte in A to the cassette", cite: [{ source: "m3-basic", page: "12/9" }], coined: false },
    { table: "rom-model3", kind: "routine", key: 647, name: "$CSHWR", length: 1, purpose: "turn the cassette on and write the leader and sync byte", cite: [{ source: "m3-basic", page: "12/7" }], coined: false },
    { table: "rom-model3", kind: "routine", key: 653, name: "$KBBRK", length: 1, purpose: "check only for BREAK, faster than a full keyboard scan", cite: [{ source: "m3-basic", page: "12/13" }], coined: false },
    { table: "rom-model3", kind: "routine", key: 662, name: "$CSHIN", length: 1, purpose: "turn the cassette on and read up to the leader and sync byte", cite: [{ source: "m3-basic", page: "12/6" }], coined: false },
    { table: "rom-model3", kind: "routine", key: 664, name: "$CLKON", length: 1, purpose: "turn the on-screen clock on", cite: [{ source: "m3-basic", page: "12/5" }], coined: false },
    { table: "rom-model3", kind: "routine", key: 673, name: "$CLKOFF", length: 1, purpose: "turn the on-screen clock off", cite: [{ source: "m3-basic", page: "12/5" }], coined: false },
    { table: "rom-model3", kind: "routine", key: 788, name: "CSINWORD", length: 1, purpose: "read two bytes from the cassette into HL, low byte first", cite: [{ source: "decker", page: "17" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 810, name: "OUTCHAR", length: 1, purpose: "send A to the current output device, video, printer, or cassette, as the flag at 409CH says", cite: [{ source: "decker", page: "10" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 826, name: "VDCHARCOL", length: 1, purpose: "display A like $VDCHAR, keep DE, and refresh the cursor column that TAB uses", cite: [{ source: "decker", page: "15" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 840, name: "CURCOLUMN", length: 1, purpose: "return the cursor column on its line in A", cite: [{ source: "decker", page: "15" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 856, name: "KBSAVEDE", length: 1, purpose: "scan the keyboard like $KBCHAR but keep DE", cite: [{ source: "decker", page: "13" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 865, name: "KBINBUF", length: 1, purpose: "read a line into the BASIC input buffer, 240 characters at most; carry set if BREAK", cite: [{ source: "decker", page: "13" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 900, name: "KBWAITDE", length: 1, purpose: "wait for a key like $KBWAIT but keep DE", cite: [{ source: "decker", page: "13" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 907, name: "DEVRESETPRT", length: 1, purpose: "select video output again, first ending a partly printed line on the printer", cite: [{ source: "decker", page: "11" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 916, name: "PRTCR", length: 1, purpose: "send a carriage return to the printer, keeping its line-position count", cite: [{ source: "decker", page: "16" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 924, name: "PRTCHARPOS", length: 1, purpose: "send A to the printer and track the line position; a line feed goes out as a carriage return", cite: [{ source: "decker", page: "16" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 962, name: "PRDRIVER", length: 1, purpose: "the printer driver that the printer control block points to", cite: [{ source: "decker", page: "16" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 1088, name: "PRTWAIT", length: 1, purpose: "wait for the printer to be ready; on BREAK return to the address pushed before the call", cite: [{ source: "decker", page: "16" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 1099, name: "PRTTEST", length: 1, purpose: "read the printer status; Z set when it is ready", cite: [{ source: "decker", page: "16" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 1139, name: "VDDRIVER", length: 1, purpose: "the video driver that the video control block points to", cite: [{ source: "decker", page: "15" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 1497, name: "LINEINPUT", length: 1, purpose: "echoing line input into the buffer at HL, at most B characters; $KBLINE jumps here", cite: [{ source: "decker", page: "13" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 1970, name: "ERR_OV", length: 1, purpose: "jump here to give an OV ERROR (overflow)", cite: [{ source: "decker", page: "61" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 2366, name: "MUL10SNG", length: 1, purpose: "multiply the single-precision accumulator by ten", cite: [{ source: "decker", page: "28" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 2687, name: "CINT", length: 1, purpose: "convert the accumulator to an integer (BASIC CINT); where a USR routine gets its argument", cite: [{ source: "decker", page: "31" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 2714, name: "HLTOACC", length: 1, purpose: "put the integer in HL into the accumulator; where a USR routine hands back its result", cite: [{ source: "decker", page: "33" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 2804, name: "CHKSTRING", length: 1, purpose: "give a type mismatch error unless the accumulator holds a string", cite: [{ source: "decker", page: "42" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 2806, name: "ERR_TM", length: 1, purpose: "jump here to give a TM ERROR (type mismatch)", cite: [{ source: "decker", page: "61" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 3692, name: "ASCTONUM", length: 1, purpose: "read the number text at HL into the accumulator", cite: [{ source: "decker", page: "34" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 4015, name: "OUTHLDEC", length: 1, purpose: "print the positive integer in HL in decimal on the current output device", cite: [{ source: "decker", page: "34" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 6551, name: "ERR_SN", length: 1, purpose: "jump here to give an SN ERROR (syntax error)", cite: [{ source: "decker", page: "61" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 6562, name: "BASICERROR", length: 1, purpose: "BASIC error exit: jump here with the error code in E", cite: [{ source: "decker", page: "60" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 6574, name: "READYALT", length: 1, purpose: "back to BASIC Ready without a false Out of Memory: load BC with 1A18H, then jump here", cite: [{ source: "decker", page: "54" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 6681, name: "$READY", length: 1, purpose: "jump here, do not call, to leave a machine-language program for BASIC Ready", cite: [{ source: "m3-basic", page: "12/15" }], coined: false },
    { table: "rom-model3", kind: "routine", key: 6904, name: "FIXLINEPTRS", length: 1, purpose: "reset each line's forward pointer in the BASIC program to point at the next line (uses AF, DE, HL)", cite: [{ source: "decker", page: "56" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 6956, name: "FINDLINE", length: 1, purpose: "find line number DE in the program: carry if found; BC at that line (or the next larger), HL just after", cite: [{ source: "decker", page: "56" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 7091, name: "INPROMPT", length: 1, purpose: "show a question mark and a space, then read a line as KBINBUF does", cite: [{ source: "decker", page: "14" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 7754, name: "ERR_FC", length: 1, purpose: "jump here to give an FC ERROR (illegal function call)", cite: [{ source: "decker", page: "61" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 7770, name: "ASCTODE", length: 1, purpose: "read a positive integer (a line number, say) from the text at HL into DE; HL ends at the first non-digit", cite: [{ source: "decker", page: "35" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 8441, name: "NEWLINE", length: 1, purpose: "start a new line unless the cursor is already at the start of one", cite: [{ source: "decker", page: "15" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 8446, name: "OUTCR", length: 1, purpose: "send a carriage return to the current output device", cite: [{ source: "decker", page: "11" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 8511, name: "TABTO", length: 1, purpose: "BASIC TAB for the current output device: E is the column, HL the text to show", cite: [{ source: "decker", page: "11" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 8553, name: "DEVRESETCAS", length: 1, purpose: "select video output again, turning the cassette off if it was in use", cite: [{ source: "decker", page: "11" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 8649, name: "INPUTSTMT", length: 1, purpose: "the BASIC INPUT statement: show the prompt, read the line, and assign the variables", cite: [{ source: "decker", page: "14" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 9015, name: "EVALEXPR", length: 1, purpose: "evaluate the BASIC expression at HL into the accumulator", cite: [{ source: "decker", page: "36" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 9741, name: "FINDVAR", length: 1, purpose: "locate the BASIC variable named at HL, creating it if absent; DE returns its address, as VARPTR gives it", cite: [{ source: "decker", page: "36" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 10407, name: "OUTSTR", length: 1, purpose: "send the string at HL, ended by a zero or a quote, to the current output device (PRINT)", cite: [{ source: "decker", page: "11" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 11013, name: "ACCTODE", length: 1, purpose: "turn the accumulator into an integer, also left in DE; Z is set if the value is from 0 to 255", cite: [{ source: "decker", page: "31" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 11125, name: "OUTSTRZ", length: 1, purpose: "send the zero-terminated string at HL to the current output device", cite: [{ source: "decker", page: "11" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 11253, name: "BASICCSAVE", length: 1, purpose: "BASIC CSAVE: save the program to cassette under the one-character name that HL points to", cite: [{ source: "decker", page: "17" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 11295, name: "BASICCLOAD", length: 1, purpose: "BASIC CLOAD: load or check a program from cassette, then end at BASIC Ready", cite: [{ source: "decker", page: "18" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 12288, name: "CSHWR500", length: 1, purpose: "write the 500-baud leader and sync byte and select the slow write routine", cite: [{ source: "decker", page: "18" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 12291, name: "CSHWR1500", length: 1, purpose: "write the 1500-baud leader and sync byte and select the fast write routine", cite: [{ source: "decker", page: "18" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 12294, name: "CSHIN500", length: 1, purpose: "search for the 500-baud leader and sync byte and select the slow read routine", cite: [{ source: "decker", page: "18" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 12297, name: "CSHIN1500", length: 1, purpose: "search for the 1500-baud leader and sync byte and select the fast read routine", cite: [{ source: "decker", page: "18" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 12300, name: "CASOFF", length: 1, purpose: "turn the cassette off; $CSOFF jumps here", cite: [{ source: "decker", page: "18" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 12303, name: "CASON", length: 1, purpose: "turn the cassette on and blank the loading asterisks", cite: [{ source: "decker", page: "18" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 12306, name: "DISKBOOTVEC", length: 1, purpose: "jump to the disk bootstrap routine; DISKBOOT goes through here", cite: [{ source: "decker", page: "53" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 12309, name: "COLDSTART", length: 1, purpose: "cold-start initialization, which RST 00H continues with", cite: [{ source: "decker", page: "51" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 12312, name: "IRQHANDLER", length: 1, purpose: "maskable interrupt handler: reads port E0H and runs the routine for the lowest set bit", cite: [{ source: "decker", page: "52" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 12315, name: "RSINITDRV", length: 1, purpose: "address in the RS-232-C initialization control block; jumps to its driver", cite: [{ source: "decker", page: "19" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 12318, name: "RSINDRV", length: 1, purpose: "address in the RS-232-C input control block; jumps to its driver", cite: [{ source: "decker", page: "19" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 12321, name: "RSOUTDRV", length: 1, purpose: "address in the RS-232-C output control block; jumps to its driver", cite: [{ source: "decker", page: "19" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 12324, name: "KBDRIVER", length: 1, purpose: "address in the keyboard control block; jumps to the keyboard driver", cite: [{ source: "decker", page: "14" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 12327, name: "ROUTEDRV", length: 1, purpose: "address in the I/O router control block; jumps to its driver", cite: [{ source: "decker", page: "20" }], coined: true },
    { table: "rom-model3", kind: "routine", key: 12339, name: "$DATE", length: 1, purpose: "store the date as MO/DA/YR in the eight-byte buffer at HL", cite: [{ source: "m3-basic", page: "12/9" }], coined: false },
    { table: "rom-model3", kind: "routine", key: 12342, name: "$TIME", length: 1, purpose: "store the time as HR:MN:SS in the eight-byte buffer at HL", cite: [{ source: "m3-basic", page: "12/20" }], coined: false },
    { table: "rom-model3", kind: "routine", key: 12354, name: "$SETCAS", length: 1, purpose: "ask the Cass? question and set the cassette baud rate from the answer", cite: [{ source: "m3-basic", page: "12/19" }], coined: false },
    { table: "rom-model3", kind: "vector", key: 16384, name: "SYNCHKVEC", length: 3, purpose: "RAM jump that RST 08H passes through; start-up aims it at the syntax test at 1C96H", cite: [{ source: "decker", page: "51" }], coined: true },
    { table: "rom-model3", kind: "vector", key: 16387, name: "NEXTCHARVEC", length: 3, purpose: "RAM jump that RST 10H passes through; start-up aims it at 1D78H, which fetches the next BASIC text character", cite: [{ source: "decker", page: "51" }], coined: true },
    { table: "rom-model3", kind: "vector", key: 16390, name: "CMPHLDEVEC", length: 3, purpose: "RAM jump that RST 18H passes through; start-up aims it at 1C90H, which compares HL with DE", cite: [{ source: "decker", page: "52" }], coined: true },
    { table: "rom-model3", kind: "vector", key: 16393, name: "TESTNTFVEC", length: 3, purpose: "RAM jump that RST 20H passes through; start-up aims it at 25D9H, which reports the type of the number in the accumulator", cite: [{ source: "decker", page: "52" }], coined: true },
    { table: "rom-model3", kind: "vector", key: 16396, name: "BREAKVEC", length: 3, purpose: "jump vector the keyboard scan takes when BREAK is pressed; a RET at start-up", cite: [{ source: "m3-basic", page: "12/25" }, { source: "m3-basic", page: "12/22" }, { source: "decker", page: "52" }], coined: true },
    { table: "rom-model3", kind: "vector", key: 16399, name: "DEBUGVEC", length: 3, purpose: "RAM jump that RST 30H passes through: just a RET until a DOS puts its DEBUG entry here", cite: [{ source: "decker", page: "52" }], coined: true },
    { table: "rom-model3", kind: "vector", key: 16402, name: "INTVEC", length: 3, purpose: "RAM jump that RST 38H, the maskable interrupt, passes through; the Model III sets it to jump to its interrupt handler at 3018H", cite: [{ source: "decker", page: "52" }], coined: true },
    { table: "rom-model3", kind: "variable", key: 16405, name: "KBDCB", length: 1, purpose: "type byte opening the keyboard's 8-byte control block: 1, an input-only device", cite: [{ source: "decker", page: "8" }], coined: true, note: "LDOS 5.1 names the whole 8-byte keyboard control block KIDCB$ (4015H-401CH, ldos51 6-32); this table keeps the ROM's own field names: KBDRVADDR (4016H), CAPSLOCK (4019H), and CURBLINK (401CH)" },
    { table: "rom-model3", kind: "variable", key: 16406, name: "KBDRVADDR", length: 2, purpose: "keyboard driver address, low byte first; the Model III starts it at its ROM driver, 3024H", cite: [{ source: "decker", page: "8" }, { source: "decker", page: "14" }], coined: true },
    { table: "rom-model3", kind: "variable", key: 16409, name: "CAPSLOCK", length: 1, purpose: "caps lock switch: 0 for upper and lower case, nonzero for capitals only", cite: [{ source: "m3-basic", page: "12/25" }, { source: "decker", page: "8" }], coined: true },
    { table: "rom-model3", kind: "variable", key: 16412, name: "CURBLINK", length: 1, purpose: "cursor blink switch: 0 blinks, nonzero holds steady", cite: [{ source: "m3-basic", page: "12/25" }, { source: "decker", page: "8" }], coined: true },
    { table: "rom-model3", kind: "variable", key: 16413, name: "VDDCB", length: 1, purpose: "type byte opening the video display's 8-byte control block: 7, a device that reads and writes", cite: [{ source: "decker", page: "8" }], coined: true, note: "LDOS 5.1 names the whole 8-byte video control block DODCB$ (401DH-4024H, ldos51 6-32); this table keeps the ROM's own field names: VDDRVADDR (401EH), CURADDR (4020H), and CURCHAR (4023H)" },
    { table: "rom-model3", kind: "variable", key: 16414, name: "VDDRVADDR", length: 2, purpose: "video driver address, low byte first; the Model III starts it at its ROM driver, 0473H", cite: [{ source: "decker", page: "8" }, { source: "decker", page: "15" }], coined: true },
    { table: "rom-model3", kind: "variable", key: 16416, name: "CURADDR", length: 2, purpose: "address of the cursor in video memory, low byte first", cite: [{ source: "m3-basic", page: "12/25" }, { source: "decker", page: "8" }], coined: true },
    { table: "rom-model3", kind: "variable", key: 16419, name: "CURCHAR", length: 1, purpose: "ASCII code of the cursor character, 176 at start-up", cite: [{ source: "m3-basic", page: "12/25" }, { source: "decker", page: "8" }], coined: true },
    { table: "rom-model3", kind: "variable", key: 16421, name: "PRDCB", length: 1, purpose: "type byte opening the printer's 8-byte control block: 6, an output-only device", cite: [{ source: "decker", page: "8" }], coined: true, note: "LDOS 5.1 names the whole 8-byte printer control block PRDCB$ (4025H-402CH, ldos51 6-32); this table keeps the ROM's own field names: PRDRVADDR (4026H), PRTPAGELEN (4028H), PRTLINECNT (4029H), and PRTWIDTH (402BH)" },
    { table: "rom-model3", kind: "variable", key: 16422, name: "PRDRVADDR", length: 2, purpose: "printer driver address, low byte first; the Model III starts it at its ROM driver, 03C2H", cite: [{ source: "decker", page: "8" }, { source: "decker", page: "16" }], coined: true },
    { table: "rom-model3", kind: "variable", key: 16424, name: "PRTPAGELEN", length: 1, purpose: "printer lines per page plus one, 67 at start-up", cite: [{ source: "m3-basic", page: "12/25" }, { source: "decker", page: "8" }, { source: "decker", page: "9" }], coined: true },
    { table: "rom-model3", kind: "variable", key: 16425, name: "PRTLINECNT", length: 1, purpose: "lines printed on the page so far, plus one", cite: [{ source: "m3-basic", page: "12/25" }, { source: "decker", page: "8" }, { source: "decker", page: "9" }], coined: true },
    { table: "rom-model3", kind: "variable", key: 16427, name: "PRTWIDTH", length: 1, purpose: "printer maximum line length less two; 255 means no maximum", cite: [{ source: "m3-basic", page: "12/25" }, { source: "decker", page: "8" }], coined: true },
    { table: "rom-model3", kind: "variable", key: 16438, name: "KBROWS", length: 7, purpose: "one byte per keyboard row, 3801H to 3840H, as last read; the scan compares them to find newly pressed keys", cite: [{ source: "decker", page: "64" }, { source: "decker", page: "65" }, { source: "decker", page: "88" }], coined: true, note: "the Model III's start-up fills all seven bytes with AAH (decker 88)" },
    { table: "rom-model3", kind: "variable", key: 16526, name: "USRVEC", length: 2, purpose: "entry address of the machine-code routine BASIC's USR calls, low byte first", cite: [{ source: "m3-basic", page: "12/2" }, { source: "decker", page: "66" }], coined: true },
    { table: "rom-model3", kind: "vector", key: 16531, name: "INPORT", length: 3, purpose: "three-byte RAM subroutine that reads a port into A and returns; the port number goes in its middle byte, 4094H", cite: [{ source: "decker", page: "66" }], coined: true },
    { table: "rom-model3", kind: "vector", key: 16534, name: "OUTPORT", length: 3, purpose: "three-byte RAM subroutine that writes A to a port and returns; the port number goes in its middle byte, 4097H", cite: [{ source: "decker", page: "66" }], coined: true },
    { table: "rom-model3", kind: "variable", key: 16537, name: "INKEYBUF", length: 1, purpose: "INKEY$'s one-key store: INKEY$ returns a nonzero byte found here and scans the keyboard only when it is 0", cite: [{ source: "decker", page: "66" }], coined: true },
    { table: "rom-model3", kind: "variable", key: 16539, name: "PRTCOLUMN", length: 1, purpose: "the printer's column, as a count of the characters on its current line so far", cite: [{ source: "decker", page: "66" }], coined: true },
    { table: "rom-model3", kind: "variable", key: 16540, name: "OUTDEVFLAG", length: 1, purpose: "where the ROM's output routines send characters: 0 the screen, 1 the printer, FFH the cassette", cite: [{ source: "decker", page: "67" }], coined: true },
    { table: "rom-model3", kind: "variable", key: 16548, name: "PROGSTART", length: 2, purpose: "where the BASIC program's text begins in memory, low byte first", cite: [{ source: "decker", page: "67" }], coined: true },
    { table: "rom-model3", kind: "variable", key: 16550, name: "LINEPOS", length: 1, purpose: "column the cursor is in on its screen line, which POS reports", cite: [{ source: "decker", page: "67" }], coined: true },
    { table: "rom-model3", kind: "variable", key: 16551, name: "IOBUFPTR", length: 2, purpose: "pointer to the line input buffer, which Level II, the Model III, and Disk BASIC each place differently", cite: [{ source: "decker", page: "5" }, { source: "decker", page: "67" }], coined: true },
    { table: "rom-model3", kind: "variable", key: 16559, name: "NTF", length: 1, purpose: "code for the kind of number in the accumulator: 2 integer, 4 single, 8 double precision, 3 string", cite: [{ source: "decker", page: "68" }], coined: true },
    { table: "rom-model3", kind: "variable", key: 16561, name: "MEMTOP", length: 2, purpose: "highest address left to BASIC, low byte first: the Memory Size? answer", cite: [{ source: "decker", page: "68" }], coined: true },
    { table: "rom-model3", kind: "variable", key: 16633, name: "VARSTART", length: 2, purpose: "where the simple variables begin, just past the zero bytes that close the program text", cite: [{ source: "decker", page: "70" }], coined: true },
    { table: "rom-model3", kind: "variable", key: 16635, name: "ARRAYSTART", length: 2, purpose: "where the array variables start, just above the simple ones", cite: [{ source: "decker", page: "71" }], coined: true },
    { table: "rom-model3", kind: "variable", key: 16637, name: "FREESTART", length: 2, purpose: "first byte after the arrays: the bottom of the memory BASIC has left free", cite: [{ source: "decker", page: "71" }], coined: true },
    { table: "rom-model3", kind: "variable", key: 16669, name: "ACC", length: 8, purpose: "primary accumulator, where most arithmetic happens; a double fills all eight bytes, any other type starts at 4121H", cite: [{ source: "decker", page: "26" }, { source: "decker", page: "27" }], coined: true },
    { table: "rom-model3", kind: "variable", key: 16679, name: "AACC", length: 8, purpose: "second accumulator, mostly for double precision; a number in it always starts, low byte first, at 4127H", cite: [{ source: "decker", page: "26" }, { source: "decker", page: "27" }], coined: true },
    { table: "rom-model3", kind: "variable", key: 16872, name: "RSRXBUF", length: 1, purpose: "character $RSRCV received, or 0 if none", cite: [{ source: "m3-basic", page: "12/25" }, { source: "m3-basic", page: "12/18" }, { source: "decker", page: "8" }], coined: true },
    { table: "rom-model3", kind: "variable", key: 16880, name: "RSTXBUF", length: 1, purpose: "character for $RSTX to send; 0 once it has gone", cite: [{ source: "m3-basic", page: "12/25" }, { source: "m3-basic", page: "12/19" }, { source: "decker", page: "9" }], coined: true },
    { table: "rom-model3", kind: "variable", key: 16888, name: "RSBAUD", length: 1, purpose: "RS-232-C baud rate code for $RSINIT: send rate in the high nibble, receive rate in the low", cite: [{ source: "m3-basic", page: "12/25" }, { source: "m3-basic", page: "12/17" }, { source: "decker", page: "9" }], coined: true },
    { table: "rom-model3", kind: "variable", key: 16889, name: "RSFORMAT", length: 1, purpose: "RS-232-C format switches for $RSINIT: parity, word length, stop bits, transmit, DTR, RTS", cite: [{ source: "m3-basic", page: "12/25" }, { source: "m3-basic", page: "12/17" }, { source: "decker", page: "9" }], coined: true },
    { table: "rom-model3", kind: "variable", key: 16890, name: "RSWAIT", length: 1, purpose: "RS-232-C wait switch for $RSINIT: 0 does not wait, nonzero waits", cite: [{ source: "m3-basic", page: "12/25" }, { source: "m3-basic", page: "12/17" }, { source: "decker", page: "9" }], coined: true },
    { table: "rom-model3", kind: "variable", key: 16913, name: "CASBAUD", length: 1, purpose: "cassette baud rate switch: 0 is 500 baud, nonzero is 1500 baud", cite: [{ source: "m3-basic", page: "12/25" }, { source: "decker", page: "76" }], coined: true },
    { table: "rom-model3", kind: "variable", key: 16916, name: "SCROLLPROT", length: 1, purpose: "number of top screen lines protected from scrolling, 0 to 7 (larger values taken modulo 8)", cite: [{ source: "m3-basic", page: "12/26" }, { source: "decker", page: "76" }], coined: true },
    { table: "rom-model3", kind: "variable", key: 16919, name: "TIMEDATE", length: 6, purpose: "clock and calendar bytes: seconds, minutes, hours, year, day, month", cite: [{ source: "m3-basic", page: "12/26" }, { source: "decker", page: "49" }], coined: true, note: "TRSDOS 1.3 names the first three bytes $TIMLOC and the last three $DATLOC (trsdos13 87); LDOS 5.1 names them TIME$ at 4217H and DATE$ at 421AH (ldos51 6-32)" },
    { table: "rom-model3", kind: "variable", key: 16928, name: "ROUTEDST", length: 2, purpose: "two-letter destination device code for $ROUTE", cite: [{ source: "m3-basic", page: "12/26" }, { source: "m3-basic", page: "12/16" }, { source: "decker", page: "19" }], coined: true, note: "LDOS 5.1 gives this word the name JDCB$, storage for a DCB address while JCL runs (ldos51 6-32); this table keeps the ROM's name" },
    { table: "rom-model3", kind: "variable", key: 16930, name: "ROUTESRC", length: 2, purpose: "two-letter source device code for $ROUTE", cite: [{ source: "m3-basic", page: "12/26" }, { source: "m3-basic", page: "12/16" }, { source: "decker", page: "19" }], coined: true, note: "LDOS 5.1 gives this word the name JRET$, storage for a return address while JCL runs (ldos51 6-32); this table keeps the ROM's name" }
  ],
  "hardware-model1": [
    { table: "hardware-model1", kind: "port", key: 255, name: "CASSETTE", length: 1, purpose: "cassette input (in), cassette output, motor, and 32/64 column mode (out)", cite: [{ source: "m1-trh", page: "44" }, { source: "m1-trh", page: "45" }, { source: "m1-trh", page: "50" }], coined: true },
    { table: "hardware-model1", kind: "region", key: 14302, name: "COMSTATUS", length: 1, purpose: "communication interface status", cite: [{ source: "l2-1979", page: "D-2" }, { source: "decker", page: "63" }], coined: true },
    { table: "hardware-model1", kind: "region", key: 14303, name: "COMDATA", length: 1, purpose: "communication interface data", cite: [{ source: "l2-1979", page: "D-2" }, { source: "decker", page: "63" }], coined: true },
    { table: "hardware-model1", kind: "region", key: 14304, name: "INTLATCH", length: 1, purpose: "interrupt latch", cite: [{ source: "l2-1979", page: "D-2" }, { source: "decker", page: "63" }], coined: true },
    { table: "hardware-model1", kind: "region", key: 14305, name: "FDC_DRVSEL", length: 1, purpose: "disk drive select latch", cite: [{ source: "l2-1979", page: "D-2" }, { source: "decker", page: "63" }], coined: true },
    { table: "hardware-model1", kind: "region", key: 14308, name: "CAS_SELECT", length: 1, purpose: "cassette drive select latch", cite: [{ source: "l2-1979", page: "D-2" }, { source: "decker", page: "63" }], coined: true },
    { table: "hardware-model1", kind: "region", key: 14312, name: "PRINTER", length: 1, purpose: "line printer: status (read), data (write)", cite: [{ source: "l2-1979", page: "D-2" }, { source: "decker", page: "63" }, { source: "decker", page: "64" }], coined: true },
    { table: "hardware-model1", kind: "region", key: 14316, name: "FDC_CMDSTAT", length: 1, purpose: "disk controller status (read), command (write)", cite: [{ source: "l2-1979", page: "D-2" }, { source: "decker", page: "63" }], coined: true },
    { table: "hardware-model1", kind: "region", key: 14317, name: "FDC_TRACK", length: 1, purpose: "disk controller track register", cite: [{ source: "decker", page: "63" }, { source: "paay", page: "24" }], coined: true },
    { table: "hardware-model1", kind: "region", key: 14318, name: "FDC_SECTOR", length: 1, purpose: "disk controller sector register", cite: [{ source: "decker", page: "63" }, { source: "paay", page: "24" }], coined: true },
    { table: "hardware-model1", kind: "region", key: 14319, name: "FDC_DATA", length: 1, purpose: "disk controller data register", cite: [{ source: "decker", page: "63" }, { source: "paay", page: "24" }], coined: true },
    { table: "hardware-model1", kind: "region", key: 14336, name: "KEYBOARD", length: 256, purpose: "memory-mapped keyboard", cite: [{ source: "m1-trh", page: "12" }], coined: true, note: "this handbook decodes 3800-38FF; the Model III manual decodes 3800-3BFF" },
    { table: "hardware-model1", kind: "region", key: 15360, name: "VIDEO", length: 1024, purpose: "video display memory, 16 lines of 64 characters", cite: [{ source: "m1-trh", page: "12" }, { source: "m1-trh", page: "33" }], coined: true }
  ],
  "hardware-model3": [
    { table: "hardware-model3", kind: "port", key: 224, name: "INTPORT", length: 1, purpose: "interrupt status (in), interrupt enable mask (out)", cite: [{ source: "m3-trm", page: "21" }, { source: "m3-trm", page: "22" }], coined: true },
    { table: "hardware-model3", kind: "port", key: 228, name: "NMIPORT", length: 1, purpose: "NMI status (in), disk NMI enable mask (out)", cite: [{ source: "m3-trm", page: "21" }], coined: true },
    { table: "hardware-model3", kind: "port", key: 232, name: "RS232_MODEM", length: 1, purpose: "modem status (in), UART master reset (out)", cite: [{ source: "m3-trm", page: "15" }], coined: true },
    { table: "hardware-model3", kind: "port", key: 233, name: "RS232_BAUD", length: 1, purpose: "baud rate register load (out only)", cite: [{ source: "m3-trm", page: "15" }], coined: true },
    { table: "hardware-model3", kind: "port", key: 234, name: "RS232_CTRL", length: 1, purpose: "UART status (in), UART and modem control (out)", cite: [{ source: "m3-trm", page: "15" }], coined: true },
    { table: "hardware-model3", kind: "port", key: 235, name: "RS232_DATA", length: 1, purpose: "UART received data (in), UART transmit data (out)", cite: [{ source: "m3-trm", page: "15" }], coined: true },
    { table: "hardware-model3", kind: "port", key: 236, name: "MODEPORT", length: 1, purpose: "clear clock interrupt (in), video, cassette motor, and I/O bus modes (out)", cite: [{ source: "m3-trm", page: "15" }, { source: "m3-trm", page: "21" }], coined: true },
    { table: "hardware-model3", kind: "port", key: 240, name: "FDC_CMDSTAT", length: 1, purpose: "disk controller status (in), command (out)", cite: [{ source: "m3-trm", page: "15" }], coined: true },
    { table: "hardware-model3", kind: "port", key: 241, name: "FDC_TRACK", length: 1, purpose: "disk controller track register", cite: [{ source: "m3-trm", page: "15" }], coined: true },
    { table: "hardware-model3", kind: "port", key: 242, name: "FDC_SECTOR", length: 1, purpose: "disk controller sector register", cite: [{ source: "m3-trm", page: "15" }], coined: true },
    { table: "hardware-model3", kind: "port", key: 243, name: "FDC_DATA", length: 1, purpose: "disk controller data register", cite: [{ source: "m3-trm", page: "15" }], coined: true },
    { table: "hardware-model3", kind: "port", key: 244, name: "FDC_DRVSEL", length: 1, purpose: "drive and side select, density, wait states, precompensation (out only)", cite: [{ source: "m3-trm", page: "22" }], coined: true },
    { table: "hardware-model3", kind: "port", key: 248, name: "PRINTER", length: 1, purpose: "printer status (in), printer data (out)", cite: [{ source: "m3-trm", page: "15" }], coined: true },
    { table: "hardware-model3", kind: "port", key: 255, name: "CASSETTE", length: 1, purpose: "cassette input (in), cassette output level (out)", cite: [{ source: "m3-trm", page: "21" }, { source: "m3-trm", page: "22" }], coined: true },
    { table: "hardware-model3", kind: "region", key: 14312, name: "$PRSTAT", length: 2, purpose: "printer status read as memory, the same status as port F8", cite: [{ source: "m3-trm", page: "14" }, { source: "m3-basic", page: "12/24" }], coined: false },
    { table: "hardware-model3", kind: "region", key: 14336, name: "KEYBOARD", length: 1024, purpose: "memory-mapped keyboard", cite: [{ source: "m3-trm", page: "14" }], coined: true, note: "this manual decodes 3800-3BFF; the Model I handbook decodes 3800-38FF" },
    { table: "hardware-model3", kind: "region", key: 15360, name: "VIDEO", length: 1024, purpose: "video display memory", cite: [{ source: "m3-trm", page: "14" }], coined: true }
  ],
  "dos-trsdos13": [
    { table: "dos-trsdos13", kind: "routine", key: 16429, name: "$JP2DOS", length: 1, purpose: "return to TRSDOS READY", cite: [{ source: "trsdos13", page: "86" }], coined: false },
    { table: "dos-trsdos13", kind: "variable", key: 16933, name: "$CMDTXT", length: 1, purpose: "start of the buffer holding the last command line typed at TRSDOS READY", cite: [{ source: "trsdos13", page: "89" }], coined: false },
    { table: "dos-trsdos13", kind: "routine", key: 17037, name: "$FILPTR", length: 1, purpose: "get the drive and logical file number of an open file", cite: [{ source: "trsdos13", page: "85" }], coined: false },
    { table: "dos-trsdos13", kind: "routine", key: 17040, name: "$RAMDIR", length: 1, purpose: "copy directory entries, or the free-space figure, into a RAM buffer", cite: [{ source: "trsdos13", page: "84" }], coined: false },
    { table: "dos-trsdos13", kind: "routine", key: 17049, name: "$COMDOS", length: 1, purpose: "run a TRSDOS command line, then return to TRSDOS READY", cite: [{ source: "trsdos13", page: "88" }], coined: false },
    { table: "dos-trsdos13", kind: "routine", key: 17052, name: "$CMDDOS", length: 1, purpose: "run a TRSDOS command line and return to the caller", cite: [{ source: "trsdos13", page: "89" }], coined: false },
    { table: "dos-trsdos13", kind: "routine", key: 17417, name: "$ERRDSP", length: 1, purpose: "display the TRSDOS error message for the code in A", cite: [{ source: "trsdos13", page: "87" }], coined: false },
    { table: "dos-trsdos13", kind: "variable", key: 17425, name: "$MEMEND", length: 2, purpose: "highest memory address available, low byte first; normally the end of RAM", cite: [{ source: "trsdos13", page: "89" }], coined: false },
    { table: "dos-trsdos13", kind: "routine", key: 17433, name: "$DSPDIR", length: 1, purpose: "display the directory of the non-protected files on one drive", cite: [{ source: "trsdos13", page: "88" }], coined: false },
    { table: "dos-trsdos13", kind: "routine", key: 17436, name: "$SYNTAX", length: 1, purpose: "check a file specification and copy it into a DCB", cite: [{ source: "trsdos13", page: "83" }], coined: false },
    { table: "dos-trsdos13", kind: "routine", key: 17440, name: "$INIT", length: 1, purpose: "open a file, creating it if it does not exist", cite: [{ source: "trsdos13", page: "78" }], coined: false },
    { table: "dos-trsdos13", kind: "routine", key: 17444, name: "$OPEN", length: 1, purpose: "open an existing file", cite: [{ source: "trsdos13", page: "79" }], coined: false },
    { table: "dos-trsdos13", kind: "routine", key: 17448, name: "$CLOSE", length: 1, purpose: "close an open file", cite: [{ source: "trsdos13", page: "85" }], coined: false },
    { table: "dos-trsdos13", kind: "routine", key: 17452, name: "$KILL", length: 1, purpose: "delete a file and release its disk space", cite: [{ source: "trsdos13", page: "86" }], coined: false },
    { table: "dos-trsdos13", kind: "routine", key: 17462, name: "$READ", length: 1, purpose: "read a record from an open file", cite: [{ source: "trsdos13", page: "80" }], coined: false },
    { table: "dos-trsdos13", kind: "routine", key: 17465, name: "$WRITE", length: 1, purpose: "write a record to an open file", cite: [{ source: "trsdos13", page: "80" }], coined: false },
    { table: "dos-trsdos13", kind: "routine", key: 17468, name: "$VERF", length: 1, purpose: "write a record, then read it back and compare", cite: [{ source: "trsdos13", page: "81" }], coined: false },
    { table: "dos-trsdos13", kind: "routine", key: 17471, name: "$REWIND", length: 1, purpose: "point a file back at its first record", cite: [{ source: "trsdos13", page: "82" }], coined: false },
    { table: "dos-trsdos13", kind: "routine", key: 17474, name: "$POSN", length: 1, purpose: "position a file at a given logical record", cite: [{ source: "trsdos13", page: "79" }], coined: false },
    { table: "dos-trsdos13", kind: "routine", key: 17477, name: "$BKSPC", length: 1, purpose: "back up one record in a file", cite: [{ source: "trsdos13", page: "82" }], coined: false, note: "the list of routines on page 78 spells this $BACKSPACE; its heading on page 82 and the index entry BKSPC (82) spell it $BKSPC" },
    { table: "dos-trsdos13", kind: "routine", key: 17480, name: "$POSEOF", length: 1, purpose: "point a file at its last record, to extend it", cite: [{ source: "trsdos13", page: "82" }], coined: false },
    { table: "dos-trsdos13", kind: "routine", key: 17483, name: "$PUTEXT", length: 1, purpose: "add an extension to a filename that has none", cite: [{ source: "trsdos13", page: "81" }], coined: false },
    { table: "dos-trsdos13", kind: "routine", key: 17486, name: "$DMULT", length: 1, purpose: "multiply a 16-bit value by an 8-bit multiplier: 24-bit product in H, L, and A", cite: [{ source: "trsdos13", page: "84" }], coined: false },
    { table: "dos-trsdos13", kind: "routine", key: 17489, name: "$DIVIDE", length: 1, purpose: "divide a 16-bit value by an 8-bit divisor: quotient in HL, remainder in A", cite: [{ source: "trsdos13", page: "83" }], coined: false }
  ],
  "dos-ldos51-model1": [
    { table: "dos-ldos51-model1", kind: "routine", key: 16429, name: "@EXIT", length: 1, purpose: "return to LDOS READY", cite: [{ source: "ldos51", page: "6-29" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 16432, name: "@ABORT", length: 1, purpose: "abort the program and return to LDOS", cite: [{ source: "ldos51", page: "6-29" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 16435, name: "@DVRHK", length: 1, purpose: "device-driver hook the ROM reaches for byte-level device I/O", cite: [{ source: "ldos51", page: "6-29" }], coined: false },
    { table: "dos-ldos51-model1", kind: "variable", key: 16446, name: "OSVER$", length: 1, purpose: "version number of the operating system", cite: [{ source: "ldos51", page: "6-29" }], coined: false },
    { table: "dos-ldos51-model1", kind: "variable", key: 16448, name: "TIMER$", length: 1, purpose: "heartbeat that ticks every 25 ms", cite: [{ source: "ldos51", page: "6-29" }], coined: false },
    { table: "dos-ldos51-model1", kind: "variable", key: 16449, name: "TIME$", length: 3, purpose: "time of day", cite: [{ source: "ldos51", page: "6-29" }], coined: false },
    { table: "dos-ldos51-model1", kind: "variable", key: 16452, name: "DATE$", length: 3, purpose: "current month and year", cite: [{ source: "ldos51", page: "6-29" }], coined: false },
    { table: "dos-ldos51-model1", kind: "variable", key: 16455, name: "DAY$", length: 2, purpose: "current day", cite: [{ source: "ldos51", page: "6-29" }], coined: false },
    { table: "dos-ldos51-model1", kind: "variable", key: 16457, name: "HIGH$", length: 2, purpose: "highest RAM address not in use", cite: [{ source: "ldos51", page: "6-29" }], coined: false },
    { table: "dos-ldos51-model1", kind: "variable", key: 16459, name: "INTIM$", length: 1, purpose: "copy of the interrupt latch at 37E0H", cite: [{ source: "ldos51", page: "6-29" }], coined: false },
    { table: "dos-ldos51-model1", kind: "variable", key: 16460, name: "INTMSK$", length: 1, purpose: "interrupt mask storage next to INTIM$; the manual lists it by name and address only", cite: [{ source: "ldos51", page: "6-35" }], coined: false, note: "listed only in the alphabetical listing (6-35); neither memory map carries it" },
    { table: "dos-ldos51-model1", kind: "variable", key: 16461, name: "INTVC$", length: 16, purpose: "interrupt vector table with an entry for each of the latch's eight bits", cite: [{ source: "ldos51", page: "6-29" }], coined: false },
    { table: "dos-ldos51-model1", kind: "variable", key: 16477, name: "DBGSV$", length: 32, purpose: "DEBUG and system storage, not for programs", cite: [{ source: "ldos51", page: "6-29" }], coined: false },
    { table: "dos-ldos51-model1", kind: "variable", key: 16896, name: "SBUFF$", length: 256, purpose: "buffer of 256 bytes the system uses for disk transfers", cite: [{ source: "ldos51", page: "6-29" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 17152, name: "@KITSK", length: 1, purpose: "task-processing entry used while the keyboard is scanned", cite: [{ source: "ldos51", page: "6-29" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 17155, name: "@ICNFG", length: 1, purpose: "initialize the system configuration", cite: [{ source: "ldos51", page: "6-29" }], coined: false },
    { table: "dos-ldos51-model1", kind: "variable", key: 17158, name: "SVDAT1$", length: 1, purpose: "year and day, packed", cite: [{ source: "ldos51", page: "6-29" }], coined: false },
    { table: "dos-ldos51-model1", kind: "variable", key: 17159, name: "SVDAT2$", length: 1, purpose: "month, packed", cite: [{ source: "ldos51", page: "6-29" }], coined: false },
    { table: "dos-ldos51-model1", kind: "variable", key: 17160, name: "LDRV$", length: 1, purpose: "logical number, 0 to 7, of the drive in use", cite: [{ source: "ldos51", page: "6-29" }], coined: false },
    { table: "dos-ldos51-model1", kind: "variable", key: 17161, name: "PDRV$", length: 1, purpose: "physical address of the drive in use: 1, 2, 4, or 8", cite: [{ source: "ldos51", page: "6-29" }], coined: false },
    { table: "dos-ldos51-model1", kind: "variable", key: 17162, name: "JDCB$", length: 2, purpose: "DCB address saved while JCL runs", cite: [{ source: "ldos51", page: "6-29" }], coined: false },
    { table: "dos-ldos51-model1", kind: "variable", key: 17164, name: "JRET$", length: 2, purpose: "return address saved while JCL runs", cite: [{ source: "ldos51", page: "6-29" }], coined: false },
    { table: "dos-ldos51-model1", kind: "variable", key: 17166, name: "OVRLY$", length: 1, purpose: "system overlay now resident", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "variable", key: 17167, name: "SFLAG$", length: 1, purpose: "system flag bits", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "variable", key: 17176, name: "INBUF$", length: 64, purpose: "64-byte buffer for the user's command line", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "variable", key: 17240, name: "JFCB$", length: 32, purpose: "file control block the DO processor uses for JCL", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 17302, name: "@RAMDIR", length: 1, purpose: "load directory records, or the free-space figure, into a RAM buffer", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "variable", key: 17336, name: "KISV$", length: 2, purpose: "saved vector of the KI (keyboard) device", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "variable", key: 17338, name: "DOSV$", length: 2, purpose: "saved vector of the DO (video) device", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "variable", key: 17340, name: "PRSV$", length: 2, purpose: "saved vector of the PR (printer) device", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "variable", key: 17342, name: "KIJCL$", length: 2, purpose: "saved vector of the KIJCL device", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "variable", key: 17344, name: "JLDCB$", length: 8, purpose: "device control block of the job log", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "variable", key: 17352, name: "SIDCB$", length: 8, purpose: "device control block of standard input", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "variable", key: 17360, name: "SODCB$", length: 8, purpose: "device control block of standard output", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "variable", key: 17368, name: "S1DCB$", length: 8, purpose: "spare device control block", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "variable", key: 17376, name: "S2DCB$", length: 8, purpose: "spare device control block", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "variable", key: 17384, name: "S3DCB$", length: 8, purpose: "spare device control block", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "variable", key: 17392, name: "S4DCB$", length: 8, purpose: "spare device control block", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "variable", key: 17400, name: "S5DCB$", length: 8, purpose: "spare device control block", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 17408, name: "@CMD", length: 1, purpose: "prompt for the next command", cite: [{ source: "ldos51", page: "6-30" }], coined: false, note: "the Model III map has @CMD at 4296H (6-35)" },
    { table: "dos-ldos51-model1", kind: "routine", key: 17413, name: "@CMNDI", length: 1, purpose: "jump into the command interpreter", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 17417, name: "@ERROR", length: 1, purpose: "display the message for a DOS error code", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 17421, name: "@DEBUG", length: 1, purpose: "start the DEBUG monitor", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 17424, name: "@ADTSK", length: 1, purpose: "install a task to run at interrupt level", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 17427, name: "@RMTSK", length: 1, purpose: "uninstall an interrupt-level task", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 17430, name: "@RPTSK", length: 1, purpose: "give the task now running a different vector", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 17433, name: "@KLTSK", length: 1, purpose: "drop the task that is running", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 17436, name: "@FSPEC", length: 1, purpose: "parse a file or device specification", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "variable", key: 17439, name: "DFLAG$", length: 1, purpose: "system device flag", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 17440, name: "@INIT", length: 1, purpose: "open a file or device, creating the file if it is new", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "variable", key: 17443, name: "KFLAG$", length: 1, purpose: "system keyboard flag", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 17444, name: "@OPEN", length: 1, purpose: "open an existing file", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 17448, name: "@CLOSE", length: 1, purpose: "close an open file", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 17452, name: "@KILL", length: 1, purpose: "delete a file or device", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "variable", key: 17455, name: "MFLAG$", length: 1, purpose: "flag that marks the machine as a Model I", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 17456, name: "@LOAD", length: 1, purpose: "load a program file into memory", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 17459, name: "@RUN", length: 1, purpose: "load a program file and start it", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 17462, name: "@READ", length: 1, purpose: "read a record from an open file", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 17465, name: "@WRITE", length: 1, purpose: "write a record to an open file", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 17468, name: "@VER", length: 1, purpose: "write a record, then read it back to verify it", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 17471, name: "@REW", length: 1, purpose: "rewind a file to its first record", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 17474, name: "@POSN", length: 1, purpose: "move a file to a chosen logical record", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 17477, name: "@BKSP", length: 1, purpose: "back up one logical record", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 17480, name: "@PEOF", length: 1, purpose: "position a file at its end", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 17483, name: "@CKEOF", length: 1, purpose: "check whether the file is at its end", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 17486, name: "@WEOF", length: 1, purpose: "write an end-of-file mark", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 17492, name: "@RREAD", length: 1, purpose: "read the current sector again", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 17495, name: "@RWRIT", length: 1, purpose: "write the current sector again", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 17498, name: "@LOC", length: 1, purpose: "work out the current logical record number", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 17501, name: "@LOF", length: 1, purpose: "work out the logical record number of the end of the file", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 17504, name: "@SKIP", length: 1, purpose: "skip over the next record", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 17507, name: "@DODIR", length: 1, purpose: "display a directory, or put it in a buffer", cite: [{ source: "ldos51", page: "6-30" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 17511, name: "@DSPLY", length: 1, purpose: "display a line of text on the screen", cite: [{ source: "ldos51", page: "6-31" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 17514, name: "@PRINT", length: 1, purpose: "print a line of text on the printer", cite: [{ source: "ldos51", page: "6-31" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 17517, name: "@TIME", length: 1, purpose: "get the time of day as text, XX:XX:XX", cite: [{ source: "ldos51", page: "6-31" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 17520, name: "@DATE", length: 1, purpose: "get today's date as text, xx/xx/xx", cite: [{ source: "ldos51", page: "6-31" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 17523, name: "@FEXT", length: 1, purpose: "apply a default extension to a file specification", cite: [{ source: "ldos51", page: "6-31" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 17526, name: "@PARAM", length: 1, purpose: "parse the optional parameters after a command", cite: [{ source: "ldos51", page: "6-31" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 17529, name: "@MSG", length: 1, purpose: "route a message line to its output device", cite: [{ source: "ldos51", page: "6-31" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 17531, name: "@LOGOT", length: 1, purpose: "display a message and also write it to the job log", cite: [{ source: "ldos51", page: "6-31" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 17534, name: "@LOGER", length: 1, purpose: "write a message to the job log", cite: [{ source: "ldos51", page: "6-31" }], coined: false },
    { table: "dos-ldos51-model1", kind: "variable", key: 17536, name: "CFCB$", length: 32, purpose: "file control block for commands", cite: [{ source: "ldos51", page: "6-31" }], coined: false },
    { table: "dos-ldos51-model1", kind: "variable", key: 17568, name: "SFCB$", length: 20, purpose: "file control block for loading system overlays", cite: [{ source: "ldos51", page: "6-31" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 17592, name: "@CKDRV", length: 1, purpose: "check that a disk drive is available", cite: [{ source: "ldos51", page: "6-31" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 17595, name: "@FNAME", length: 1, purpose: "fetch a file's name and extension from its directory entry", cite: [{ source: "ldos51", page: "6-31" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 17598, name: "@DOKEY", length: 1, purpose: "vector for keyboard input from JCL while DO is running", cite: [{ source: "ldos51", page: "6-31" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 17601, name: "@MULT", length: 1, purpose: "multiply HL by A", cite: [{ source: "ldos51", page: "6-31" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 17604, name: "@DIV", length: 1, purpose: "divide HL by A", cite: [{ source: "ldos51", page: "6-31" }], coined: false },
    { table: "dos-ldos51-model1", kind: "variable", key: 17664, name: "TCB$", length: 24, purpose: "interrupt task table", cite: [{ source: "ldos51", page: "6-31" }], coined: false },
    { table: "dos-ldos51-model1", kind: "variable", key: 18176, name: "DCT$", length: 80, purpose: "RAM that holds the drive code table", cite: [{ source: "ldos51", page: "6-31" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 18260, name: "SELECT", length: 1, purpose: "select a different drive", cite: [{ source: "ldos51", page: "6-31" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 18265, name: "RSELCT", length: 1, purpose: "test whether the requested drive is busy", cite: [{ source: "ldos51", page: "6-31" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 18270, name: "SEEK", length: 1, purpose: "seek to a cylinder", cite: [{ source: "ldos51", page: "6-31" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 18275, name: "WRSECT", length: 1, purpose: "write a sector", cite: [{ source: "ldos51", page: "6-31" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 18280, name: "WRPROT", length: 1, purpose: "write a system sector", cite: [{ source: "ldos51", page: "6-31" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 18285, name: "WRTRK", length: 1, purpose: "write a cylinder", cite: [{ source: "ldos51", page: "6-31" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 18290, name: "VERSEC", length: 1, purpose: "verify a sector", cite: [{ source: "ldos51", page: "6-31" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 18295, name: "RDSECT", length: 1, purpose: "read a sector", cite: [{ source: "ldos51", page: "6-31" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 18319, name: "GETDCT", length: 1, purpose: "get the address of a drive code table entry", cite: [{ source: "ldos51", page: "6-31" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 18332, name: "DCTBYT", length: 1, purpose: "get one field of a drive code table entry", cite: [{ source: "ldos51", page: "6-31" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 19216, name: "DIRRD", length: 1, purpose: "read a directory record", cite: [{ source: "ldos51", page: "6-31" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 19231, name: "DIRWR", length: 1, purpose: "write a directory record", cite: [{ source: "ldos51", page: "6-31" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 19269, name: "RDSSEC", length: 1, purpose: "read a system sector", cite: [{ source: "ldos51", page: "6-31" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 19301, name: "DIRCYL", length: 1, purpose: "get the directory cylinder number", cite: [{ source: "ldos51", page: "6-31" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 19308, name: "MULTEA", length: 1, purpose: "multiply E by A", cite: [{ source: "ldos51", page: "6-31" }], coined: false },
    { table: "dos-ldos51-model1", kind: "routine", key: 19323, name: "DIVEA", length: 1, purpose: "divide E by A", cite: [{ source: "ldos51", page: "6-31" }], coined: false },
    { table: "dos-ldos51-model1", kind: "variable", key: 19966, name: "USTOR$", length: 2, purpose: "pointer to an 8-byte storage area for user programs", cite: [{ source: "ldos51", page: "6-31" }], coined: false }
  ],
  "dos-ldos51-model3": [
    { table: "dos-ldos51-model3", kind: "routine", key: 16429, name: "@EXIT", length: 1, purpose: "return to LDOS READY", cite: [{ source: "ldos51", page: "6-32" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 16432, name: "@ABORT", length: 1, purpose: "abort the program and return to LDOS", cite: [{ source: "ldos51", page: "6-32" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 16435, name: "@DVRHK", length: 1, purpose: "device-driver hook the ROM reaches for byte-level device I/O", cite: [{ source: "ldos51", page: "6-32" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 16445, name: "@ADTSK", length: 1, purpose: "install a task to run at interrupt level", cite: [{ source: "ldos51", page: "6-32" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 16448, name: "@RMTSK", length: 1, purpose: "uninstall an interrupt-level task", cite: [{ source: "ldos51", page: "6-32" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 16451, name: "@RPTSK", length: 1, purpose: "give the task now running a different vector", cite: [{ source: "ldos51", page: "6-32" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 16454, name: "@KLTSK", length: 1, purpose: "drop the task that is running", cite: [{ source: "ldos51", page: "6-32" }], coined: false },
    { table: "dos-ldos51-model3", kind: "variable", key: 16477, name: "DBGSV$", length: 32, purpose: "DEBUG and system storage, not for programs", cite: [{ source: "ldos51", page: "6-32" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 16905, name: "@CKDRV", length: 1, purpose: "check that a disk drive is available", cite: [{ source: "ldos51", page: "6-32" }], coined: false, note: "the Model III text edition of the manual lists @CKDRV at 4290H and has no @RAMDIR; this edition prints 4209H here and in the alphabetical listing (6-35), and 4290H for @RAMDIR (6-33)" },
    { table: "dos-ldos51-model3", kind: "routine", key: 16925, name: "@ICNFG", length: 1, purpose: "initialize the system configuration", cite: [{ source: "ldos51", page: "6-32" }], coined: false },
    { table: "dos-ldos51-model3", kind: "variable", key: 16933, name: "INBUF$", length: 64, purpose: "64-byte buffer for the user's command line", cite: [{ source: "ldos51", page: "6-32" }], coined: false },
    { table: "dos-ldos51-model3", kind: "variable", key: 16997, name: "JFCB$", length: 1, purpose: "file control block the DO processor uses for JCL", cite: [{ source: "ldos51", page: "6-32" }], coined: false, note: "the map prints only the start address; the Model I map gives the block as 32 bytes (6-30)" },
    { table: "dos-ldos51-model3", kind: "routine", key: 17029, name: "@KITSK", length: 1, purpose: "task-processing entry used while the keyboard is scanned", cite: [{ source: "ldos51", page: "6-32" }], coined: false },
    { table: "dos-ldos51-model3", kind: "variable", key: 17032, name: "TIMER$", length: 1, purpose: "heartbeat that ticks every 33.333 ms", cite: [{ source: "ldos51", page: "6-32" }], coined: false },
    { table: "dos-ldos51-model3", kind: "variable", key: 17033, name: "DFLAG$", length: 1, purpose: "system device flag", cite: [{ source: "ldos51", page: "6-32" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 17034, name: "@LOGOT", length: 1, purpose: "display a message and also write it to the job log", cite: [{ source: "ldos51", page: "6-33" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 17037, name: "@LOGER", length: 1, purpose: "write a message to the job log", cite: [{ source: "ldos51", page: "6-33" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 17040, name: "@RAMDIR", length: 1, purpose: "load directory records, or the free-space figure, into a RAM buffer", cite: [{ source: "ldos51", page: "6-33" }], coined: false, note: "the Model III text edition of the manual has @CKDRV at this address (see @CKDRV); TRSDOS 1.3 also puts its $RAMDIR here (trsdos13 84)" },
    { table: "dos-ldos51-model3", kind: "routine", key: 17043, name: "@FNAME", length: 1, purpose: "fetch a file's name and extension from its directory entry", cite: [{ source: "ldos51", page: "6-33" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 17046, name: "@CMD", length: 1, purpose: "prompt for the next command", cite: [{ source: "ldos51", page: "6-33" }], coined: false, note: "the Model I map has @CMD at 4400H (6-35)" },
    { table: "dos-ldos51-model3", kind: "routine", key: 17049, name: "@CMNDI", length: 1, purpose: "jump into the command interpreter", cite: [{ source: "ldos51", page: "6-33" }], coined: false },
    { table: "dos-ldos51-model3", kind: "variable", key: 17055, name: "KFLAG$", length: 1, purpose: "system keyboard flag", cite: [{ source: "ldos51", page: "6-35" }, { source: "ldos51", page: "6-30" }], coined: false, note: "the Model III map does not list it; the alphabetical listing (6-35) gives this address, as does the text on page 4-3 (X'429F'), and the purpose is the Model I map's for the same label (6-30)" },
    { table: "dos-ldos51-model3", kind: "variable", key: 17057, name: "SFCB$", length: 1, purpose: "file control block for loading system overlays", cite: [{ source: "ldos51", page: "6-33" }], coined: false, note: "the map prints only the start address; the Model I map gives the block as 20 bytes (6-31)" },
    { table: "dos-ldos51-model3", kind: "routine", key: 17077, name: "@DOKEY", length: 1, purpose: "vector for keyboard input from JCL while DO is running", cite: [{ source: "ldos51", page: "6-35" }, { source: "ldos51", page: "6-31" }], coined: false, note: "the Model III map does not list it; the alphabetical listing (6-35) gives this address, and the purpose is the Model I map's for the same label (6-31)" },
    { table: "dos-ldos51-model3", kind: "variable", key: 17080, name: "KISV$", length: 2, purpose: "saved vector of the KI (keyboard) device", cite: [{ source: "ldos51", page: "6-33" }], coined: false },
    { table: "dos-ldos51-model3", kind: "variable", key: 17082, name: "DOSV$", length: 2, purpose: "saved vector of the DO (video) device", cite: [{ source: "ldos51", page: "6-33" }], coined: false },
    { table: "dos-ldos51-model3", kind: "variable", key: 17084, name: "PRSV$", length: 2, purpose: "saved vector of the PR (printer) device", cite: [{ source: "ldos51", page: "6-33" }], coined: false },
    { table: "dos-ldos51-model3", kind: "variable", key: 17086, name: "KIJCL$", length: 2, purpose: "saved vector of the KIJCL device", cite: [{ source: "ldos51", page: "6-33" }], coined: false },
    { table: "dos-ldos51-model3", kind: "variable", key: 17090, name: "JLDCB$", length: 6, purpose: "device control block of the job log", cite: [{ source: "ldos51", page: "6-33" }], coined: false },
    { table: "dos-ldos51-model3", kind: "variable", key: 17096, name: "SIDCB$", length: 6, purpose: "device control block of standard input", cite: [{ source: "ldos51", page: "6-33" }], coined: false },
    { table: "dos-ldos51-model3", kind: "variable", key: 17102, name: "SODCB$", length: 6, purpose: "device control block of standard output", cite: [{ source: "ldos51", page: "6-33" }], coined: false },
    { table: "dos-ldos51-model3", kind: "variable", key: 17108, name: "S1DCB$", length: 6, purpose: "spare device control block", cite: [{ source: "ldos51", page: "6-33" }], coined: false },
    { table: "dos-ldos51-model3", kind: "variable", key: 17114, name: "S2DCB$", length: 6, purpose: "spare device control block", cite: [{ source: "ldos51", page: "6-33" }], coined: false },
    { table: "dos-ldos51-model3", kind: "variable", key: 17120, name: "S3DCB$", length: 6, purpose: "spare device control block", cite: [{ source: "ldos51", page: "6-33" }], coined: false },
    { table: "dos-ldos51-model3", kind: "variable", key: 17126, name: "S4DCB$", length: 6, purpose: "spare device control block", cite: [{ source: "ldos51", page: "6-33" }], coined: false },
    { table: "dos-ldos51-model3", kind: "variable", key: 17152, name: "SBUFF$", length: 256, purpose: "buffer of 256 bytes the system uses for disk transfers", cite: [{ source: "ldos51", page: "6-33" }], coined: false },
    { table: "dos-ldos51-model3", kind: "variable", key: 17408, name: "EXTDBG$", length: 1, purpose: "vector to the extended DEBUG", cite: [{ source: "ldos51", page: "6-33" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 17410, name: "@MSG", length: 1, purpose: "route a message line to its output device", cite: [{ source: "ldos51", page: "6-33" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 17413, name: "@DBGHK", length: 1, purpose: "hook used by DEBUG, off limits to programs", cite: [{ source: "ldos51", page: "6-33" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 17417, name: "@ERROR", length: 1, purpose: "display the message for a DOS error code", cite: [{ source: "ldos51", page: "6-33" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 17421, name: "@DEBUG", length: 1, purpose: "start the DEBUG monitor", cite: [{ source: "ldos51", page: "6-33" }], coined: false },
    { table: "dos-ldos51-model3", kind: "variable", key: 17425, name: "HIGH$", length: 2, purpose: "highest RAM address not in use", cite: [{ source: "ldos51", page: "6-33" }], coined: false },
    { table: "dos-ldos51-model3", kind: "variable", key: 17428, name: "OVRLY$", length: 1, purpose: "system overlay now resident", cite: [{ source: "ldos51", page: "6-33" }], coined: false },
    { table: "dos-ldos51-model3", kind: "variable", key: 17431, name: "DAY$", length: 2, purpose: "day of the year", cite: [{ source: "ldos51", page: "6-33" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 17433, name: "@DODIR", length: 1, purpose: "display a directory, or put it in a buffer", cite: [{ source: "ldos51", page: "6-33" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 17436, name: "@FSPEC", length: 1, purpose: "parse a file or device specification", cite: [{ source: "ldos51", page: "6-33" }], coined: false },
    { table: "dos-ldos51-model3", kind: "variable", key: 17439, name: "OSVER$", length: 1, purpose: "version number of the operating system", cite: [{ source: "ldos51", page: "6-33" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 17440, name: "@INIT", length: 1, purpose: "open a file or device, creating the file if it is new", cite: [{ source: "ldos51", page: "6-33" }], coined: false },
    { table: "dos-ldos51-model3", kind: "variable", key: 17443, name: "PDRV$", length: 1, purpose: "physical address of the drive in use: 1, 2, 4, or 8", cite: [{ source: "ldos51", page: "6-33" }], coined: false, note: "the Model III text edition of the manual spells it PDRIV$" },
    { table: "dos-ldos51-model3", kind: "routine", key: 17444, name: "@OPEN", length: 1, purpose: "open an existing file", cite: [{ source: "ldos51", page: "6-33" }], coined: false },
    { table: "dos-ldos51-model3", kind: "variable", key: 17447, name: "LDRV$", length: 1, purpose: "logical number, 0 to 7, of the drive in use", cite: [{ source: "ldos51", page: "6-33" }], coined: false, note: "the Model III text edition of the manual spells it LDRIV$" },
    { table: "dos-ldos51-model3", kind: "routine", key: 17448, name: "@CLOSE", length: 1, purpose: "close an open file", cite: [{ source: "ldos51", page: "6-33" }], coined: false },
    { table: "dos-ldos51-model3", kind: "variable", key: 17451, name: "SFLAG$", length: 1, purpose: "system flag bits", cite: [{ source: "ldos51", page: "6-33" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 17452, name: "@KILL", length: 1, purpose: "delete a file or device", cite: [{ source: "ldos51", page: "6-33" }], coined: false },
    { table: "dos-ldos51-model3", kind: "variable", key: 17455, name: "SVDAT1$", length: 1, purpose: "year and day, packed", cite: [{ source: "ldos51", page: "6-35" }, { source: "ldos51", page: "6-29" }], coined: false, note: "the Model III map does not list it; the alphabetical listing (6-35) gives this address, and the purpose is the Model I map's for the same label (6-29)" },
    { table: "dos-ldos51-model3", kind: "routine", key: 17456, name: "@LOAD", length: 1, purpose: "load a program file into memory", cite: [{ source: "ldos51", page: "6-33" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 17459, name: "@RUN", length: 1, purpose: "load a program file and start it", cite: [{ source: "ldos51", page: "6-33" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 17462, name: "@READ", length: 1, purpose: "read a record from an open file", cite: [{ source: "ldos51", page: "6-33" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 17465, name: "@WRITE", length: 1, purpose: "write a record to an open file", cite: [{ source: "ldos51", page: "6-33" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 17468, name: "@VER", length: 1, purpose: "write a record, then read it back to verify it", cite: [{ source: "ldos51", page: "6-33" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 17471, name: "@REW", length: 1, purpose: "rewind a file to its first record", cite: [{ source: "ldos51", page: "6-33" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 17474, name: "@POSN", length: 1, purpose: "move a file to a chosen logical record", cite: [{ source: "ldos51", page: "6-34" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 17477, name: "@BKSP", length: 1, purpose: "back up one logical record", cite: [{ source: "ldos51", page: "6-34" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 17480, name: "@PEOF", length: 1, purpose: "position a file at its end", cite: [{ source: "ldos51", page: "6-34" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 17483, name: "@FEXT", length: 1, purpose: "apply a default extension to a file specification", cite: [{ source: "ldos51", page: "6-34" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 17486, name: "@MULT", length: 1, purpose: "multiply HL by A", cite: [{ source: "ldos51", page: "6-34" }], coined: false, note: "the Model III text edition of the manual spells it MULT" },
    { table: "dos-ldos51-model3", kind: "routine", key: 17489, name: "@DIV", length: 1, purpose: "divide HL by A", cite: [{ source: "ldos51", page: "6-34" }], coined: false, note: "the Model III text edition of the manual spells it DIVIDE" },
    { table: "dos-ldos51-model3", kind: "routine", key: 17492, name: "@PARAM", length: 1, purpose: "parse the optional parameters after a command", cite: [{ source: "ldos51", page: "6-34" }], coined: false },
    { table: "dos-ldos51-model3", kind: "variable", key: 17495, name: "SVDAT2$", length: 1, purpose: "month, packed", cite: [{ source: "ldos51", page: "6-35" }, { source: "ldos51", page: "6-29" }], coined: false, note: "the Model III map does not list it; the alphabetical listing (6-35) gives this address, and the purpose is the Model I map's for the same label (6-29)" },
    { table: "dos-ldos51-model3", kind: "routine", key: 17496, name: "@CKEOF", length: 1, purpose: "check whether the file is at its end", cite: [{ source: "ldos51", page: "6-34" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 17499, name: "@WEOF", length: 1, purpose: "write an end-of-file mark", cite: [{ source: "ldos51", page: "6-34" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 17502, name: "@RREAD", length: 1, purpose: "read the current sector again", cite: [{ source: "ldos51", page: "6-34" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 17505, name: "@RWRIT", length: 1, purpose: "write the current sector again", cite: [{ source: "ldos51", page: "6-34" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 17508, name: "@SKIP", length: 1, purpose: "skip over the next record", cite: [{ source: "ldos51", page: "6-34" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 17511, name: "@DSPLY", length: 1, purpose: "display a line of text on the screen", cite: [{ source: "ldos51", page: "6-34" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 17514, name: "@PRINT", length: 1, purpose: "print a line of text on the printer", cite: [{ source: "ldos51", page: "6-34" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 17517, name: "@LOC", length: 1, purpose: "work out the current logical record number", cite: [{ source: "ldos51", page: "6-34" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 17520, name: "@LOF", length: 1, purpose: "work out the logical record number of the end of the file", cite: [{ source: "ldos51", page: "6-34" }], coined: false },
    { table: "dos-ldos51-model3", kind: "variable", key: 17523, name: "INTIM$", length: 1, purpose: "copy of the interrupt latch", cite: [{ source: "ldos51", page: "6-34" }], coined: false },
    { table: "dos-ldos51-model3", kind: "variable", key: 17524, name: "INTMSK$", length: 1, purpose: "interrupt mask storage next to INTIM$; the manual lists it by name and address only", cite: [{ source: "ldos51", page: "6-35" }], coined: false, note: "listed only in the alphabetical listing (6-35); neither memory map carries it" },
    { table: "dos-ldos51-model3", kind: "variable", key: 17525, name: "INTVC$", length: 1, purpose: "interrupt vector table with an entry for each of the latch's eight bits", cite: [{ source: "ldos51", page: "6-34" }], coined: false, note: "the Model III text edition of the manual spells it INTVCT$; the map prints only the start address; the Model I map gives the area as 16 bytes (6-29)" },
    { table: "dos-ldos51-model3", kind: "variable", key: 17541, name: "CFCB$", length: 32, purpose: "file control block for commands", cite: [{ source: "ldos51", page: "6-34" }], coined: false },
    { table: "dos-ldos51-model3", kind: "variable", key: 17664, name: "TCB$", length: 24, purpose: "interrupt task table", cite: [{ source: "ldos51", page: "6-34" }], coined: false },
    { table: "dos-ldos51-model3", kind: "variable", key: 18176, name: "DCT$", length: 80, purpose: "RAM that holds the drive code table", cite: [{ source: "ldos51", page: "6-34" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 18260, name: "SELECT", length: 1, purpose: "select a different drive", cite: [{ source: "ldos51", page: "6-34" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 18265, name: "RSELCT", length: 1, purpose: "test whether the requested drive is busy", cite: [{ source: "ldos51", page: "6-34" }], coined: false, note: "the Model III text edition of the manual spells it TSTBSY" },
    { table: "dos-ldos51-model3", kind: "routine", key: 18270, name: "SEEK", length: 1, purpose: "seek to a cylinder", cite: [{ source: "ldos51", page: "6-34" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 18275, name: "WRSECT", length: 1, purpose: "write a sector", cite: [{ source: "ldos51", page: "6-34" }], coined: false, note: "the Model III text edition of the manual spells it WRSEC" },
    { table: "dos-ldos51-model3", kind: "routine", key: 18280, name: "WRPROT", length: 1, purpose: "write a system sector", cite: [{ source: "ldos51", page: "6-34" }], coined: false, note: "the Model III text edition of the manual spells it WRSYS" },
    { table: "dos-ldos51-model3", kind: "routine", key: 18285, name: "WRTRK", length: 1, purpose: "write a cylinder", cite: [{ source: "ldos51", page: "6-34" }], coined: false, note: "the Model III text edition of the manual spells it WRCYL" },
    { table: "dos-ldos51-model3", kind: "routine", key: 18290, name: "VERSEC", length: 1, purpose: "verify a sector", cite: [{ source: "ldos51", page: "6-34" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 18295, name: "RDSECT", length: 1, purpose: "read a sector", cite: [{ source: "ldos51", page: "6-34" }], coined: false, note: "the Model III text edition of the manual spells it RDSEC" },
    { table: "dos-ldos51-model3", kind: "routine", key: 18319, name: "GETDCT", length: 1, purpose: "get the address of a drive code table entry", cite: [{ source: "ldos51", page: "6-34" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 18332, name: "DCTBYT", length: 1, purpose: "get one field of a drive code table entry", cite: [{ source: "ldos51", page: "6-34" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 19216, name: "DIRRD", length: 1, purpose: "read a directory record", cite: [{ source: "ldos51", page: "6-34" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 19231, name: "DIRWR", length: 1, purpose: "write a directory record", cite: [{ source: "ldos51", page: "6-34" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 19269, name: "RDSSEC", length: 1, purpose: "read a system sector", cite: [{ source: "ldos51", page: "6-34" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 19300, name: "DIRCYL", length: 1, purpose: "get the directory cylinder number", cite: [{ source: "ldos51", page: "6-34" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 19307, name: "MULTEA", length: 1, purpose: "multiply E by A", cite: [{ source: "ldos51", page: "6-34" }], coined: false },
    { table: "dos-ldos51-model3", kind: "routine", key: 19322, name: "DIVEA", length: 1, purpose: "divide E by A", cite: [{ source: "ldos51", page: "6-34" }], coined: false },
    { table: "dos-ldos51-model3", kind: "variable", key: 19966, name: "USTOR$", length: 2, purpose: "pointer to an 8-byte storage area for user programs", cite: [{ source: "ldos51", page: "6-34" }], coined: false }
  ],
  "svc-lsdos6": [
    { table: "svc-lsdos6", kind: "svc", key: 0, name: "@IPL", length: 1, purpose: "reboot the system", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "331" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 1, name: "@KEY", length: 1, purpose: "wait for a key and return its character", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 2, name: "@DSP", length: 1, purpose: "send one character to the video display", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 3, name: "@GET", length: 1, purpose: "read one byte from a device or file", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 4, name: "@PUT", length: 1, purpose: "write one byte to a device or file", cite: [{ source: "soltoff", page: "102" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "335" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 5, name: "@CTL", length: 1, purpose: "send a control request to a device", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 6, name: "@PRT", length: 1, purpose: "send one character to the printer", cite: [{ source: "soltoff", page: "102" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "335" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 7, name: "@WHERE", length: 1, purpose: "find the address the calling code is running at", cite: [{ source: "soltoff", page: "102" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "335" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 8, name: "@KBD", length: 1, purpose: "scan the keyboard and return a key if one is pressed", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 9, name: "@KEYIN", length: 1, purpose: "read a line of text from the keyboard", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 10, name: "@DSPLY", length: 1, purpose: "display a line of text on the screen", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 11, name: "@LOGER", length: 1, purpose: "write a message to the job log", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 12, name: "@LOGOT", length: 1, purpose: "display a message and also write it to the job log", cite: [{ source: "soltoff", page: "102" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 13, name: "@MSG", length: 1, purpose: "route a message line to its output device", cite: [{ source: "soltoff", page: "102" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 14, name: "@PRINT", length: 1, purpose: "print a line of text on the printer", cite: [{ source: "soltoff", page: "102" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "335" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 15, name: "@VDCTL", length: 1, purpose: "perform a video control function such as cursor positioning", cite: [{ source: "soltoff", page: "102" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "335" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 16, name: "@PAUSE", length: 1, purpose: "wait for a given length of time", cite: [{ source: "soltoff", page: "102" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "335" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 17, name: "@PARAM", length: 1, purpose: "parse the parameters of a command line", cite: [{ source: "soltoff", page: "102" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "335" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 18, name: "@DATE", length: 1, purpose: "get the system date as text", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 19, name: "@TIME", length: 1, purpose: "get the system time as text", cite: [{ source: "soltoff", page: "102" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "335" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 20, name: "@CHNIO", length: 1, purpose: "used by a device filter to pass an I/O request on to the module chained after it", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 21, name: "@ABORT", length: 1, purpose: "end the program abnormally and return to the system", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 22, name: "@EXIT", length: 1, purpose: "end the program and return to the system with a return code in HL", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 24, name: "@CMNDI", length: 1, purpose: "run a command line and go on to the system command prompt", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 25, name: "@CMNDR", length: 1, purpose: "run a command line and come back to the caller", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 26, name: "@ERROR", length: 1, purpose: "display the message for an error code", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 27, name: "@DEBUG", length: 1, purpose: "enter the DEBUG monitor", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 28, name: "@CKTSK", length: 1, purpose: "test whether an interrupt task slot is free", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 29, name: "@ADTSK", length: 1, purpose: "add an interrupt-level task", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 30, name: "@RMTSK", length: 1, purpose: "remove a task from its slot", cite: [{ source: "soltoff", page: "102" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "335" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 31, name: "@RPTSK", length: 1, purpose: "replace the vector of the task now running", cite: [{ source: "soltoff", page: "102" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "335" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 32, name: "@KLTSK", length: 1, purpose: "remove the task now running", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 33, name: "@CKDRV", length: 1, purpose: "check that a disk drive is available, logging it", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 34, name: "@DODIR", length: 1, purpose: "display directory data, or put it in a buffer", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 35, name: "@RAMDIR", length: 1, purpose: "load directory entries, or the free-space figure, into a RAM buffer", cite: [{ source: "soltoff", page: "102" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "335" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 40, name: "@DCSTAT", length: 1, purpose: "test the status of a disk controller", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 41, name: "@SLCT", length: 1, purpose: "select a disk drive", cite: [{ source: "soltoff", page: "102" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "335" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 42, name: "@DCINIT", length: 1, purpose: "initialize a disk controller", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 43, name: "@DCRES", length: 1, purpose: "reset a disk controller", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 44, name: "@RSTOR", length: 1, purpose: "restore a drive to cylinder 0", cite: [{ source: "soltoff", page: "102" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "335" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 45, name: "@STEPI", length: 1, purpose: "step the head one track inward", cite: [{ source: "soltoff", page: "102" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "335" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 46, name: "@SEEK", length: 1, purpose: "seek to a disk cylinder", cite: [{ source: "soltoff", page: "102" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "335" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 47, name: "@RSLCT", length: 1, purpose: "reselect a busy drive, waiting until it is free", cite: [{ source: "soltoff", page: "102" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "335" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 48, name: "@RDHDR", length: 1, purpose: "read a sector ID field, where the controller supports it", cite: [{ source: "soltoff", page: "102" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "335" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 49, name: "@RDSEC", length: 1, purpose: "read one disk sector", cite: [{ source: "soltoff", page: "102" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "335" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 50, name: "@VRSEC", length: 1, purpose: "check that a disk sector can be read", cite: [{ source: "soltoff", page: "102" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "335" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 51, name: "@RDTRK", length: 1, purpose: "read a whole track, where the controller supports it", cite: [{ source: "soltoff", page: "102" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "335" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 52, name: "@HDFMT", length: 1, purpose: "pass a format-device command to the controller", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "103" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 53, name: "@WRSEC", length: 1, purpose: "write one disk sector", cite: [{ source: "soltoff", page: "102" }, { source: "soltoff", page: "104" }, { source: "m4-trm", page: "335" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 54, name: "@WRSSC", length: 1, purpose: "write a directory sector", cite: [{ source: "soltoff", page: "102" }, { source: "soltoff", page: "104" }, { source: "m4-trm", page: "335" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 55, name: "@WRTRK", length: 1, purpose: "write a whole track of format data", cite: [{ source: "soltoff", page: "102" }, { source: "soltoff", page: "104" }, { source: "m4-trm", page: "335" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 56, name: "@RENAM", length: 1, purpose: "rename a file", cite: [{ source: "soltoff", page: "102" }, { source: "soltoff", page: "104" }, { source: "m4-trm", page: "335" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 57, name: "@REMOV", length: 1, purpose: "remove a file from the disk", cite: [{ source: "soltoff", page: "102" }, { source: "soltoff", page: "104" }, { source: "m4-trm", page: "335" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 58, name: "@INIT", length: 1, purpose: "open a file, creating it if it is new", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "104" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 59, name: "@OPEN", length: 1, purpose: "open an existing file", cite: [{ source: "soltoff", page: "102" }, { source: "soltoff", page: "104" }, { source: "m4-trm", page: "335" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 60, name: "@CLOSE", length: 1, purpose: "close an open file", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "104" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 61, name: "@BKSP", length: 1, purpose: "back up one record in a file", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "104" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 62, name: "@CKEOF", length: 1, purpose: "check whether a file is at its end", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "104" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 63, name: "@LOC", length: 1, purpose: "get a file's current record number", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "104" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 64, name: "@LOF", length: 1, purpose: "get the number of a file's last record", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "104" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 65, name: "@PEOF", length: 1, purpose: "position a file at its end", cite: [{ source: "soltoff", page: "102" }, { source: "soltoff", page: "104" }, { source: "m4-trm", page: "335" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 66, name: "@POSN", length: 1, purpose: "position a file at a given record", cite: [{ source: "soltoff", page: "102" }, { source: "soltoff", page: "104" }, { source: "m4-trm", page: "335" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 67, name: "@READ", length: 1, purpose: "read a record from a file", cite: [{ source: "soltoff", page: "102" }, { source: "soltoff", page: "104" }, { source: "m4-trm", page: "335" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 68, name: "@REW", length: 1, purpose: "rewind a file to its first record", cite: [{ source: "soltoff", page: "102" }, { source: "soltoff", page: "104" }, { source: "m4-trm", page: "335" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 69, name: "@RREAD", length: 1, purpose: "read the last sector again", cite: [{ source: "soltoff", page: "102" }, { source: "soltoff", page: "104" }, { source: "m4-trm", page: "335" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 70, name: "@RWRIT", length: 1, purpose: "write the last sector again", cite: [{ source: "soltoff", page: "102" }, { source: "soltoff", page: "104" }, { source: "m4-trm", page: "335" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 71, name: "@SEEKSC", length: 1, purpose: "seek to the cylinder and sector of a file record", cite: [{ source: "soltoff", page: "102" }, { source: "soltoff", page: "104" }, { source: "m4-trm", page: "335" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 72, name: "@SKIP", length: 1, purpose: "skip over the next record of a file", cite: [{ source: "soltoff", page: "102" }, { source: "soltoff", page: "104" }, { source: "m4-trm", page: "335" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 73, name: "@VER", length: 1, purpose: "write a record, then read it back to verify it", cite: [{ source: "soltoff", page: "102" }, { source: "soltoff", page: "104" }, { source: "m4-trm", page: "335" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 74, name: "@WEOF", length: 1, purpose: "update the directory's end-of-file for a file", cite: [{ source: "soltoff", page: "102" }, { source: "soltoff", page: "104" }, { source: "m4-trm", page: "335" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 75, name: "@WRITE", length: 1, purpose: "write a record to a file", cite: [{ source: "soltoff", page: "102" }, { source: "soltoff", page: "104" }, { source: "m4-trm", page: "335" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 76, name: "@LOAD", length: 1, purpose: "load a program file into memory", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "104" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 77, name: "@RUN", length: 1, purpose: "load a program given its file specification and start it", cite: [{ source: "soltoff", page: "102" }, { source: "soltoff", page: "104" }, { source: "m4-trm", page: "335" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 78, name: "@FSPEC", length: 1, purpose: "parse a file or device specification into a file control block", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "104" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 79, name: "@FEXT", length: 1, purpose: "supply a default extension for a file specification", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "104" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 80, name: "@FNAME", length: 1, purpose: "get a file specification from a directory entry code and a drive", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "104" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 81, name: "@GTDCT", length: 1, purpose: "get the drive code table pointer for a drive", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "104" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 82, name: "@GTDCB", length: 1, purpose: "get the device control block pointer for a device name", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "104" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 83, name: "@GTMOD", length: 1, purpose: "get the entry point of a module from its name", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "104" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 85, name: "@RDSSC", length: 1, purpose: "read a directory sector of a disk", cite: [{ source: "soltoff", page: "102" }, { source: "soltoff", page: "104" }, { source: "m4-trm", page: "335" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 87, name: "@DIRRD", length: 1, purpose: "read a directory entry record", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "104" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 88, name: "@DIRWR", length: 1, purpose: "write a directory entry record", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "104" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 90, name: "@MUL8", length: 1, purpose: "multiply two 8-bit numbers", cite: [{ source: "soltoff", page: "102" }, { source: "soltoff", page: "104" }, { source: "m4-trm", page: "335" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 91, name: "@MUL16", length: 1, purpose: "multiply a 16-bit number by an 8-bit number, giving 24 bits", cite: [{ source: "soltoff", page: "102" }, { source: "soltoff", page: "104" }, { source: "m4-trm", page: "335" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 93, name: "@DIV8", length: 1, purpose: "divide an 8-bit number by an 8-bit number", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "104" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 94, name: "@DIV16", length: 1, purpose: "divide a 16-bit number by an 8-bit number", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "104" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 96, name: "@DECHEX", length: 1, purpose: "convert decimal text to a binary number", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "104" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 97, name: "@HEXDEC", length: 1, purpose: "convert a 16-bit number to decimal text", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "104" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 98, name: "@HEX8", length: 1, purpose: "convert a byte to two hex digits", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "104" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 99, name: "@HEX16", length: 1, purpose: "convert a 16-bit number to four hex digits", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "104" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 100, name: "@HIGH$", length: 1, purpose: "get or change the highest and lowest free memory addresses", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "104" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 101, name: "@FLAGS$", length: 1, purpose: "get a pointer to the system flag table", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "104" }, { source: "m4-trm", page: "334" }], coined: false, note: "the Model 4 technical reference spells it @FLAGS (m4-trm 334)" },
    { table: "svc-lsdos6", kind: "svc", key: 102, name: "@BANK", length: 1, purpose: "switch RAM banks", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "104" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 103, name: "@BREAK", length: 1, purpose: "set the BREAK key vector", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "104" }, { source: "m4-trm", page: "334" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 104, name: "@SOUND", length: 1, purpose: "make a tone with the sound hardware", cite: [{ source: "soltoff", page: "102" }, { source: "soltoff", page: "104" }, { source: "m4-trm", page: "335" }], coined: false },
    { table: "svc-lsdos6", kind: "svc", key: 105, name: "@CLS", length: 1, purpose: "clear the video screen", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "104" }], coined: false, note: "Soltoff's numerical list (104) gives @CLS and @CKBRKC each other's description; the alphabetical list (101), the function-group list (108), and the entry on page 112 agree with the description used here" },
    { table: "svc-lsdos6", kind: "svc", key: 106, name: "@CKBRKC", length: 1, purpose: "check for a keyboard BREAK", cite: [{ source: "soltoff", page: "101" }, { source: "soltoff", page: "104" }], coined: false, note: "Soltoff's numerical list (104) gives @CKBRKC and @CLS each other's description, and the text on pages 120 and 148 calls it SVC-105; the alphabetical list (101), the function-group list (107), and the entry on page 111 give 106" }
  ]
};
var ROM_COMPARISON = {
  "0000": "shared",
  "0008": "shared",
  "000B": "shared",
  "000D": "shared",
  "0010": "shared",
  "0013": "shared",
  "0018": "shared",
  "001B": "shared",
  "0020": "shared",
  "0028": "shared",
  "002B": "shared",
  "0030": "shared",
  "0033": "shared",
  "0038": "shared",
  "003B": "shared",
  "0040": "shared",
  "0049": "shared",
  "0050": "different",
  "0055": "model3-only",
  "005A": "model3-only",
  "0060": "shared",
  "0066": "shared",
  "0069": "model3-only",
  "006C": "model3-only",
  "012D": "shared",
  "0132": "model1-only",
  "0135": "shared",
  "0138": "shared",
  "0150": "shared",
  "01C9": "shared",
  "01D3": "model1-only",
  "01D9": "different",
  "01F8": "shared",
  "01FE": "model1-only",
  "0212": "different",
  "0214": "model3-only",
  "0215": "model1-only",
  "021B": "model3-only",
  "021E": "model1-only",
  "022C": "model1-only",
  "022E": "model3-only",
  "0235": "shared",
  "0241": "model1-only",
  "0264": "shared",
  "0284": "model1-only",
  "0287": "shared",
  "028D": "model3-only",
  "0293": "model1-only",
  "0296": "shared",
  "0298": "model3-only",
  "02A1": "model3-only",
  "02B5": "model1-only",
  "0314": "shared",
  "032A": "shared",
  "033A": "shared",
  "0348": "shared",
  "0358": "shared",
  "0361": "shared",
  "0384": "shared",
  "038B": "shared",
  "0394": "shared",
  "039C": "shared",
  "03C2": "different",
  "03E3": "model1-only",
  "0440": "model3-only",
  "044B": "model3-only",
  "0458": "model1-only",
  "0473": "model3-only",
  "04C3": "model1-only",
  "04F6": "model1-only",
  "057C": "model1-only",
  "058D": "model1-only",
  "05D1": "model1-only",
  "05D9": "shared",
  "06CC": "model1-only",
  "07B2": "shared",
  "093E": "shared",
  "0A7F": "shared",
  "0A9A": "shared",
  "0AF4": "shared",
  "0AF6": "shared",
  "0E6C": "shared",
  "0FAF": "shared",
  "1997": "shared",
  "19A2": "shared",
  "19AE": "shared",
  "1A19": "shared",
  "1AF8": "shared",
  "1B2C": "shared",
  "1BB3": "shared",
  "1E4A": "shared",
  "1E5A": "shared",
  "20F9": "shared",
  "20FE": "shared",
  "213F": "shared",
  "2169": "shared",
  "21C9": "shared",
  "2337": "shared",
  "260D": "shared",
  "28A7": "shared",
  "2B05": "shared",
  "2B75": "shared",
  "2BF5": "shared",
  "2C1F": "shared",
  "3000": "model3-only",
  "3003": "model3-only",
  "3006": "model3-only",
  "3009": "model3-only",
  "300C": "model3-only",
  "300F": "model3-only",
  "3012": "model3-only",
  "3015": "model3-only",
  "3018": "model3-only",
  "301B": "model3-only",
  "301E": "model3-only",
  "3021": "model3-only",
  "3024": "model3-only",
  "3027": "model3-only",
  "3033": "model3-only",
  "3036": "model3-only",
  "3042": "model3-only",
  "4000": "shared",
  "4003": "shared",
  "4006": "shared",
  "4009": "shared",
  "400C": "shared",
  "400F": "shared",
  "4012": "shared",
  "4015": "shared",
  "4016": "shared",
  "4019": "model3-only",
  "401C": "model3-only",
  "401D": "shared",
  "401E": "shared",
  "4020": "shared",
  "4023": "model3-only",
  "4025": "shared",
  "4026": "shared",
  "4028": "shared",
  "4029": "shared",
  "402B": "model3-only",
  "4036": "shared",
  "403D": "model1-only",
  "408E": "shared",
  "4093": "shared",
  "4096": "shared",
  "4099": "shared",
  "409B": "shared",
  "409C": "shared",
  "40A4": "shared",
  "40A6": "shared",
  "40A7": "shared",
  "40AF": "shared",
  "40B1": "shared",
  "40F9": "shared",
  "40FB": "shared",
  "40FD": "shared",
  "411D": "shared",
  "4127": "shared",
  "41E8": "model3-only",
  "41F0": "model3-only",
  "41F8": "model3-only",
  "41F9": "model3-only",
  "41FA": "model3-only",
  "4211": "model3-only",
  "4214": "model3-only",
  "4217": "model3-only",
  "4220": "model3-only",
  "4222": "model3-only"
};

// node_modules/@fugloy/disasm/dist/symbols/select.js
var SelectionError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "SelectionError";
  }
};
var orList = (words) => words.length < 3 ? words.join(" or ") : `${words.slice(0, -1).join(", ")}, or ${words.at(-1)}`;
function validPairs() {
  const doses = /* @__PURE__ */ new Map();
  for (const { machine, dos } of SELECTIONS)
    doses.set(machine, [...doses.get(machine) ?? [], dos]);
  return [...doses].map(([machine, list2]) => `machine ${machine} with ${orList(list2)}`).join("; ");
}
function rowFor(sel) {
  const row = SELECTIONS.find((s) => s.machine === sel.machine && s.dos === sel.dos);
  if (row === void 0)
    throw new SelectionError(`machine ${sel.machine} with DOS ${sel.dos} has no symbol tables; the valid pairs are ${validPairs()}`);
  return row;
}
function tablesFor(sel) {
  return [...rowFor(sel).tables];
}
var CODE_KINDS = ["routine", "vector"];
var DATA_KINDS = ["variable", "vector", "region"];
var ROM_TAGS = { "rom-model1": "[Model I]", "rom-model3": "[Model III]" };
function addFirst(map, e) {
  if (!map.has(e.key))
    map.set(e.key, e);
}
var SymbolSet = class {
  /** `entries` are the selection's tables in order; `comparison` classes each ROM address across the two machines. Use `selectSymbols`. */
  constructor(selection, entries, comparison) {
    __publicField(this, "selection");
    __publicField(this, "all");
    __publicField(this, "comparison");
    __publicField(this, "codeAt", /* @__PURE__ */ new Map());
    __publicField(this, "portAt", /* @__PURE__ */ new Map());
    __publicField(this, "svcAt", /* @__PURE__ */ new Map());
    /** The entries a data operand can fall inside, by address. Memory entries do not overlap (validation), so the last one starting at or below an address is the only one that can cover it. */
    __publicField(this, "spans");
    this.selection = { machine: selection.machine, dos: selection.dos };
    this.all = entries;
    this.comparison = comparison;
    for (const e of entries) {
      if (CODE_KINDS.includes(e.kind))
        addFirst(this.codeAt, e);
      else if (e.kind === "port")
        addFirst(this.portAt, e);
      else if (e.kind === "svc")
        addFirst(this.svcAt, e);
    }
    this.spans = entries.filter((e) => DATA_KINDS.includes(e.kind)).sort((a, b) => a.key - b.key);
  }
  /** Every entry of the selection's tables, in table order. */
  entries() {
    return this.all;
  }
  /** The routine or vector at exactly `addr`, which is what a jump or call target can name. */
  code(addr) {
    return this.codeAt.get(addr);
  }
  /** The variable, vector, or region that covers `addr`, with `addr`'s offset into it. */
  data(addr) {
    let low = 0;
    let high = this.spans.length;
    while (low < high) {
      const mid = low + high >> 1;
      if (this.spans[mid].key <= addr)
        low = mid + 1;
      else
        high = mid;
    }
    const entry2 = this.spans[low - 1];
    if (entry2 === void 0 || addr >= entry2.key + entry2.length)
      return void 0;
    return { entry: entry2, offset: addr - entry2.key };
  }
  /** The entry for port `n`; the first in table order, since IN and OUT can mean different things. */
  port(n) {
    return this.portAt.get(n);
  }
  /** The service call numbered `n`. */
  svc(n) {
    return this.svcAt.get(n);
  }
  /**
   * `[Model III]` or `[Model I]` for a ROM name whose address the comparison
   * does not class as shared (an address it does not list is not known to be
   * shared), so a listing can say which machine it assumed; undefined for every
   * other entry.
   */
  machineTag(entry2) {
    const tag = ROM_TAGS[entry2.table];
    return tag !== void 0 && this.comparison[hex4(entry2.key)] !== "shared" ? tag : void 0;
  }
};
function selectSymbols(sel, tables = TABLES2, comparison = ROM_COMPARISON) {
  return new SymbolSet(sel, tablesFor(sel).flatMap((id) => tables[id]), comparison);
}

// node_modules/@fugloy/asm/dist/names.js
var REGISTERS = /* @__PURE__ */ new Set([
  "A",
  "B",
  "C",
  "D",
  "E",
  "H",
  "L",
  "I",
  "R",
  "F",
  "IXH",
  "IXL",
  "IYH",
  "IYL",
  "AF",
  "BC",
  "DE",
  "HL",
  "SP",
  "IX",
  "IY",
  "AF'"
]);
var CONDITIONS = /* @__PURE__ */ new Set(["NZ", "Z", "NC", "PO", "PE", "P", "M"]);
var INDIRECT = /* @__PURE__ */ new Set(["HL", "BC", "DE", "SP", "C", "IX", "IY"]);
var OPERATOR_WORDS = /* @__PURE__ */ new Set(["HIGH", "LOW", "MOD", "SHL", "SHR"]);
var DIRECTIVES = ["ORG", "EQU", "DEFL", "=", "DB", "DEFB", "DEFM", "DW", "DEFW", "DS", "DEFS", ".PHASE", ".DEPHASE", "END"];
var MNEMONICS = new Set(mnemonics());
var DIRECTIVE_SET = new Set(DIRECTIVES);
var isMnemonic = (upper) => MNEMONICS.has(upper);
var isKeyword = (upper) => MNEMONICS.has(upper) || DIRECTIVE_SET.has(upper);
var isDefiner = (upper) => upper === "EQU" || upper === "DEFL" || upper === "=";

// node_modules/@fugloy/asm/dist/expr.js
var ExprError = class extends Error {
  constructor(sentence, col, end2, fix) {
    super(sentence ?? "reported already");
    __publicField(this, "sentence");
    __publicField(this, "col");
    __publicField(this, "end");
    __publicField(this, "fix");
    this.sentence = sentence;
    this.col = col;
    this.end = end2;
    this.fix = fix;
  }
};
var LEVELS = [["|"], ["^"], ["&"], ["<<", ">>", "SHL", "SHR"], ["+", "-"], ["*", "/", "%", "MOD"]];
var UNARY = /* @__PURE__ */ new Set(["+", "-", "~", "HIGH", "LOW"]);
function opName(t) {
  if (t === void 0)
    return void 0;
  if (t.kind === "op")
    return t.text;
  if (t.kind === "ident") {
    const up = t.text.toUpperCase();
    if (OPERATOR_WORDS.has(up))
      return up;
  }
  return void 0;
}
function parseExpr(tokens, from, to) {
  let i = from;
  const peek = () => i < to ? tokens[i] : void 0;
  const lastEnd = () => to > from ? tokens[to - 1].end : 1;
  function binary(level) {
    if (level === LEVELS.length)
      return unary();
    let left = binary(level + 1);
    for (; ; ) {
      const op = opName(peek());
      if (op === void 0 || !LEVELS[level].includes(op))
        return left;
      i++;
      const right = binary(level + 1);
      left = { k: "bin", op, left, right, col: left.col, end: right.end };
    }
  }
  function unary() {
    const t = peek();
    const op = opName(t);
    if (t !== void 0 && op !== void 0 && UNARY.has(op)) {
      i++;
      const arg = unary();
      return { k: "un", op, arg, col: t.col, end: arg.end };
    }
    return primary();
  }
  function primary() {
    const t = peek();
    if (t === void 0) {
      const prev = i > from ? tokens[i - 1] : void 0;
      if (prev !== void 0)
        throw new ExprError(`The expression ends after ${prev.text}; a number or a name should follow it.`, prev.col, prev.end);
      throw new ExprError("A value is missing here.", lastEnd(), lastEnd());
    }
    i++;
    switch (t.kind) {
      case "number":
        return { k: "num", value: t.value, col: t.col, end: t.end };
      case "string":
        return { k: "str", chars: t.chars, text: t.text, col: t.col, end: t.end };
      case "ident": {
        const up = t.text.toUpperCase();
        if (REGISTERS.has(up))
          throw new ExprError(`${up} is a register; it cannot be part of an expression.`, t.col, t.end);
        if (CONDITIONS.has(up))
          throw new ExprError(`${up} is a condition; it cannot be part of an expression.`, t.col, t.end);
        if (OPERATOR_WORDS.has(up))
          throw new ExprError(`${up} needs a value on its ${up === "HIGH" || up === "LOW" ? "right" : "left"}.`, t.col, t.end);
        return { k: "sym", name: t.text, col: t.col, end: t.end };
      }
      case "op": {
        if (t.text === "$")
          return { k: "here", col: t.col, end: t.end };
        if (t.text === "(") {
          const inner = binary(0);
          const close = peek();
          if (close === void 0 || close.text !== ")")
            throw new ExprError("This ( has no matching ).", t.col, t.end);
          i++;
          return { ...inner, col: t.col, end: close.end };
        }
        const next = peek();
        if (t.text === "%" && next !== void 0 && next.kind === "number" && /^[01]+$/.test(next.text)) {
          throw new ExprError(`zmac reads % as MOD, so %${next.text} is not a binary number; write ${next.text}B.`, t.col, next.end, `${next.text}B`);
        }
        if (t.text === ")")
          throw new ExprError("This ) has no matching (.", t.col, t.end);
        throw new ExprError(`${t.text} cannot start a value.`, t.col, t.end);
      }
    }
  }
  const expr = binary(0);
  const extra = peek();
  if (extra !== void 0) {
    if (extra.text === ")")
      throw new ExprError("This ) has no matching (.", extra.col, extra.end);
    throw new ExprError(`${extra.text} does not belong after the value; an operator such as + should come between them.`, extra.col, extra.end);
  }
  return expr;
}
function stringValue(node) {
  const c = node.chars;
  if (c.length > 2)
    throw new ExprError(`${node.text} has ${c.length} characters; as a number a string can have at most 2.`, node.col, node.end);
  return (c[0] ?? 0) | (c[1] ?? 0) << 8;
}
function evaluate(node, ctx) {
  switch (node.k) {
    case "num":
      return node.value;
    case "here":
      return ctx.here;
    case "sym":
      return ctx.lookup(node);
    case "str":
      return stringValue(node);
    case "un": {
      const v = evaluate(node.arg, ctx);
      switch (node.op) {
        case "-":
          return -v | 0;
        case "~":
          return ~v;
        case "HIGH":
          return v >> 8 & 255;
        case "LOW":
          return v & 255;
        default:
          return v;
      }
    }
    case "bin": {
      const l = evaluate(node.left, ctx);
      const r = evaluate(node.right, ctx);
      switch (node.op) {
        case "|":
          return l | r;
        case "^":
          return l ^ r;
        case "&":
          return l & r;
        case "<<":
        case "SHL":
        case ">>":
        case "SHR": {
          if (r < 0 || r > 31)
            throw new ExprError(`A shift count runs from 0 to 31; ${r} is out of range.`, node.right.col, node.right.end);
          return node.op === "<<" || node.op === "SHL" ? l << r : l >>> r | 0;
        }
        case "+":
          return l + r | 0;
        case "-":
          return l - r | 0;
        case "*":
          return Math.imul(l, r);
        case "/":
        case "%":
        case "MOD":
          if (r === 0)
            throw new ExprError("This expression divides by zero.", node.col, node.end);
          if (l === -2147483648 && r === -1) {
            throw new ExprError("This division overflows 32 bits (-80000000H divided by -1), and zmac gives no defined result for it.", node.col, node.end);
          }
          return node.op === "/" ? Math.trunc(l / r) | 0 : l % r | 0;
        default:
          throw new ExprError(`${node.op} is not an operator Fugl\xF8y knows.`, node.col, node.end);
      }
    }
  }
}
var loneSymbol = (node) => node.k === "sym" ? node.name : void 0;

// node_modules/@fugloy/asm/dist/directives.js
var DATA_BYTES = /* @__PURE__ */ new Set(["DB", "DEFB", "DEFM"]);
var DATA_WORDS = /* @__PURE__ */ new Set(["DW", "DEFW"]);
var RESERVE = /* @__PURE__ */ new Set(["DS", "DEFS"]);
var REDEFINERS = /* @__PURE__ */ new Set(["DEFL", "="]);
function countProblem(name, count) {
  if (count >= 0 && count <= 65535)
    return void 0;
  return `${name} reserves 0 to 65535 bytes; ${show(count)} is out of range.`;
}
function fillProblem(name, fill) {
  if (fill >= 0 && fill <= 127)
    return void 0;
  let message = `${name} fills with a byte from 0 to 127, as zmac requires; ${show(fill)} is out of range.`;
  if (fill >= -128 && fill <= 255)
    message += " Write the bytes with DB instead.";
  return message;
}
function addressProblem(name, value) {
  if (value >= 0 && value <= 65535)
    return void 0;
  return `${name} takes an address, 0 to 65535; ${show(value)} is out of range.`;
}
var address2 = (value) => `$${(value & 65535).toString(16).toUpperCase().padStart(4, "0")}`;
function registerWords(o) {
  if (o.kind === "reg")
    return `${o.reg} is a ${CONDITIONS.has(o.reg) ? "condition" : "register"}`;
  return `${o.text} is a register`;
}
function spanOf(stmt) {
  const from = stmt.op ?? stmt.label;
  const last = stmt.operands[stmt.operands.length - 1];
  return { col: from?.col ?? 1, end: last?.end ?? from?.end ?? Math.max(2, stmt.text.length + 1) };
}
function org(asm, stmt, item) {
  const op = stmt.op;
  item.failed = true;
  asm.sawOrg = true;
  if (asm.phase !== null)
    return asm.error(stmt.line, op.col, op.end, `ORG cannot be used inside .PHASE (line ${asm.phase}). End it with .DEPHASE first.`);
  const value = asm.addressOperand(stmt, "ORG");
  if (value === void 0)
    return;
  item.failed = false;
  const label = stmt.label;
  const sym = label === void 0 ? void 0 : asm.syms.get(label.name.toUpperCase());
  if (label !== void 0 && sym !== void 0 && sym.line === stmt.line && sym.kind === "label") {
    asm.report("warning", stmt.line, label.col, label.end, `${sym.name} is ${address2(sym.value)}, the address before this ORG, as in zmac. To name ${address2(value)}, put ${sym.name} on the line after the ORG.`);
  }
  asm.pc = value;
  asm.load = value;
}
function startPhase(asm, stmt, item) {
  const op = stmt.op;
  item.failed = true;
  if (asm.phase !== null)
    return asm.error(stmt.line, op.col, op.end, `.PHASE is already in effect since line ${asm.phase}. End it with .DEPHASE first.`);
  asm.phase = stmt.line;
  const value = asm.addressOperand(stmt, ".PHASE");
  if (value === void 0)
    return;
  item.failed = false;
  asm.pc = value;
}
function endPhase(asm, stmt, item) {
  const op = stmt.op;
  item.failed = true;
  if (asm.phase === null)
    return asm.error(stmt.line, op.col, op.end, ".DEPHASE has no .PHASE to end.");
  if (stmt.operands.length > 0)
    return asm.error(stmt.line, op.col, spanOf(stmt).end, ".DEPHASE takes no operands.");
  item.failed = false;
  asm.phase = null;
  asm.pc = asm.load;
}
function end(asm, stmt, item) {
  const [operand2, ...rest] = stmt.operands;
  if (operand2 === void 0)
    return;
  if (rest.length > 0) {
    item.failed = true;
    return asm.error(stmt.line, stmt.op.col, spanOf(stmt).end, "END takes at most one entry address.");
  }
  if (operand2.kind === "reg" || operand2.kind === "ind" || operand2.kind === "index") {
    item.failed = true;
    return asm.error(stmt.line, operand2.col, operand2.end, `END needs an entry address; ${registerWords(operand2)}.`);
  }
  asm.endItem = item;
}
function reserve(asm, stmt, item) {
  const op = stmt.op;
  const name = op.name;
  const [count, fill, ...rest] = stmt.operands;
  item.failed = true;
  if (count === void 0)
    return asm.error(stmt.line, op.col, op.end, `${name} needs a count after it, as in ${name} 10.`);
  if (rest.length > 0)
    return asm.error(stmt.line, op.col, spanOf(stmt).end, `${name} takes a count and at most one fill byte, as in ${name} 10 or ${name} 10,0.`);
  for (const [o, what] of [[count, "a count"], [fill, "a fill byte"]]) {
    if (o !== void 0 && (o.kind === "reg" || o.kind === "ind" || o.kind === "index"))
      return asm.error(stmt.line, o.col, o.end, `${name} needs ${what}; ${registerWords(o)}.`);
  }
  let length;
  try {
    length = asm.evaluateNow(count.expr, stmt.line, name);
  } catch (e) {
    return asm.exprError(stmt.line, e);
  }
  const problem = countProblem(name, length);
  if (problem !== void 0)
    return asm.error(stmt.line, count.col, count.end, problem);
  item.failed = false;
  item.length = length;
  if (fill !== void 0)
    item.fill = fill;
  asm.place(item, fill !== void 0 || asm.phase !== null ? "fill" : "space");
}

// node_modules/@fugloy/asm/dist/lex.js
var IDENT_START = /[A-Za-z_.@?]/;
var IDENT_PART = /[A-Za-z0-9_.$@?]/;
var WORD_PART = /[A-Za-z0-9_]/;
var OPS2 = ["<<", ">>"];
var OPS1 = "(),:+-*/%&|^~=$";
var NUMBER_FORMS = "Write decimal 255, hex 0FFH, $FF, or 0xFF, binary 1010B, or octal 17O.";
function bounded(text, digits, radix) {
  const value = parseInt(digits, radix);
  if (value > 4294967295)
    return `${text} is too large: numbers have 32 bits, at most 0FFFFFFFFH (4294967295).`;
  return value | 0;
}
function readNumber(text) {
  let m;
  if (m = /^0[xX]([0-9A-Fa-f]+)$/.exec(text))
    return bounded(text, m[1], 16);
  if (m = /^([0-9][0-9A-Fa-f]*)[hH]$/.exec(text))
    return bounded(text, m[1], 16);
  if (m = /^([01]+)[bB]$/.exec(text))
    return bounded(text, m[1], 2);
  if (m = /^([0-7]+)[oOqQ]$/.exec(text))
    return bounded(text, m[1], 8);
  if (m = /^([0-9]+)[dD]?$/.exec(text))
    return bounded(text, m[1], 10);
  if (m = /^0[bB]([01]+)$/.exec(text))
    return `${text} is not a number; write binary as ${m[1]}B.`;
  return `${text} is not a number. ${NUMBER_FORMS}`;
}
function lex(line) {
  const tokens = [];
  let i = 0;
  const fail = (message, from, to, fix) => ({ tokens, error: fix === void 0 ? { message, col: from + 1, end: to + 1 } : { message, col: from + 1, end: to + 1, fix } });
  while (i < line.length) {
    const c = line[i];
    if (c === " " || c === "	") {
      i++;
      continue;
    }
    if (c === ";")
      break;
    const start = i;
    if (IDENT_START.test(c)) {
      while (i < line.length && IDENT_PART.test(line[i]))
        i++;
      if (line.slice(start, i).toUpperCase() === "AF" && line[i] === "'")
        i++;
      tokens.push({ kind: "ident", text: line.slice(start, i), col: start + 1, end: i + 1 });
      continue;
    }
    if (/[0-9]/.test(c)) {
      while (i < line.length && WORD_PART.test(line[i]))
        i++;
      const text = line.slice(start, i);
      const value = readNumber(text);
      if (typeof value === "string")
        return fail(value, start, i, /^0[bB][01]+$/.test(text) ? `${text.slice(2)}B` : void 0);
      tokens.push({ kind: "number", text, col: start + 1, end: i + 1, value });
      continue;
    }
    if (c === "$" && i + 1 < line.length && IDENT_PART.test(line[i + 1])) {
      i++;
      while (i < line.length && IDENT_PART.test(line[i]))
        i++;
      const text = line.slice(start, i);
      if (/^\$[0-9A-Fa-f?]*\?[0-9A-Fa-f?]*$/.test(text)) {
        return fail(`${text} is neither a name nor a number: after $, zmac reads ? as the hex digit F. Write the number as $${text.slice(1).replace(/\?/g, "F").toUpperCase()}, or choose a name with a letter from G to Z in it.`, start, i);
      }
      if (!/^\$[0-9A-Fa-f]+$/.test(text)) {
        tokens.push({ kind: "ident", text, col: start + 1, end: i + 1 });
        continue;
      }
      const value = bounded(text, text.slice(1), 16);
      if (typeof value === "string")
        return fail(value, start, i);
      tokens.push({ kind: "number", text, col: start + 1, end: i + 1, value });
      continue;
    }
    if (c === "'" || c === '"') {
      const chars = [];
      i++;
      for (; ; ) {
        if (i >= line.length)
          return fail(`This string has no closing ${c}.`, start, line.length);
        const ch = line[i];
        if (ch === c) {
          if (line[i + 1] === c) {
            chars.push(c.charCodeAt(0));
            i += 2;
            continue;
          }
          i++;
          break;
        }
        const code = line.codePointAt(i);
        if (code > 127)
          return fail(`This string holds ${String.fromCodePoint(code)}, which is not plain ASCII; write its code as a number instead.`, i, i + (code > 65535 ? 2 : 1));
        chars.push(code);
        i++;
      }
      tokens.push({ kind: "string", text: line.slice(start, i), col: start + 1, end: i + 1, chars });
      continue;
    }
    const two = line.slice(i, i + 2);
    if (OPS2.includes(two)) {
      i += 2;
      tokens.push({ kind: "op", text: two, col: start + 1, end: i + 1 });
      continue;
    }
    if (OPS1.includes(c)) {
      i++;
      tokens.push({ kind: "op", text: c, col: start + 1, end: i + 1 });
      continue;
    }
    const cp = line.codePointAt(start);
    return fail(`${String.fromCodePoint(cp)} has no meaning here.`, start, start + (cp > 65535 ? 2 : 1));
  }
  return { tokens };
}

// node_modules/@fugloy/asm/dist/parse.js
var isOp = (t, text) => t !== void 0 && t.kind === "op" && t.text === text;
var isDefinerToken = (t) => t !== void 0 && (t.kind === "ident" && isDefiner(t.text.toUpperCase()) || isOp(t, "="));
function closing(tokens, open, to) {
  let depth = 0;
  for (let i = open; i < to; i++) {
    const t = tokens[i];
    if (isOp(t, "("))
      depth++;
    else if (isOp(t, ")") && --depth === 0)
      return i;
  }
  return -1;
}
var BINARY_WORDS = /* @__PURE__ */ new Set(["MOD", "SHL", "SHR"]);
var BINARY_OPS = /* @__PURE__ */ new Set(["+", "-", "*", "/", "%", "&", "|", "^", "<<", ">>"]);
function missingComma(line, tokens, from, to) {
  const first = tokens[from];
  let last = -1;
  if (first.kind === "ident" && (REGISTERS.has(first.text.toUpperCase()) || CONDITIONS.has(first.text.toUpperCase())))
    last = from;
  else if (isOp(first, "("))
    last = closing(tokens, from, to);
  if (last < 0 || last + 1 >= to)
    return;
  const next = tokens[last + 1];
  const isBinary = next.kind === "op" && BINARY_OPS.has(next.text) || next.kind === "ident" && BINARY_WORDS.has(next.text.toUpperCase());
  if (isBinary || isOp(next, ")"))
    return;
  const before = line.slice(first.col - 1, tokens[last].end - 1);
  throw new ExprError(`A comma is missing between ${before} and ${next.text}.`, first.col, next.end);
}
function operand(line, tokens, from, to) {
  const first = tokens[from];
  const last = tokens[to - 1];
  const span = { col: first.col, end: last.end, text: line.slice(first.col - 1, last.end - 1) };
  const count = to - from;
  missingComma(line, tokens, from, to);
  if (count === 1 && first.kind === "ident" && REGISTERS.has(first.text.toUpperCase()))
    return { ...span, kind: "reg", reg: first.text.toUpperCase() };
  if (count === 1 && first.kind === "ident" && isConditionName(first.text))
    return { ...span, kind: "reg", reg: first.text.toUpperCase() };
  if (count === 1 && first.kind === "string")
    return { ...span, kind: "str", chars: first.chars, expr: parseExpr(tokens, from, to) };
  if (isOp(first, "(") && closing(tokens, from, to) === to - 1) {
    const a = from + 1;
    const b = to - 1;
    const head = tokens[a];
    const up = head?.kind === "ident" ? head.text.toUpperCase() : "";
    if (b - a === 1 && INDIRECT.has(up))
      return { ...span, kind: "ind", reg: up };
    if ((up === "IX" || up === "IY") && b - a > 1 && (isOp(tokens[a + 1], "+") || isOp(tokens[a + 1], "-"))) {
      return { ...span, kind: "index", reg: up, expr: parseExpr(tokens, a + 1, b) };
    }
    if (b === a)
      throw new ExprError("These parentheses are empty.", first.col, last.end);
    const inner = line.slice(tokens[a].col - 1, tokens[b - 1].end - 1);
    return { ...span, kind: "mem", expr: parseExpr(tokens, a, b), inner };
  }
  return { ...span, kind: "imm", expr: parseExpr(tokens, from, to) };
}
var isConditionName = (text) => CONDITIONS.has(text.toUpperCase());
function parseLine(text, line) {
  const lexed = lex(text);
  const stmt = structure(text, line, lexed.tokens, lexed.error !== void 0);
  if (lexed.error !== void 0 && stmt.error === void 0)
    stmt.error = lexed.error;
  return stmt;
}
function structure(text, line, t, partial) {
  const stmt = { line, text, operands: [] };
  if (t.length === 0)
    return stmt;
  const fail = (message, col, end2, fix) => {
    stmt.error = fix === void 0 ? { message, col, end: end2 } : { message, col, end: end2, fix };
    return stmt;
  };
  let i = 0;
  const first = t[0];
  if (first.kind === "ident") {
    const up = first.text.toUpperCase();
    const label = (next) => {
      stmt.label = { name: first.text, col: first.col, end: first.end };
      i = next;
    };
    if (isOp(t[1], ":"))
      label(isOp(t[2], ":") ? 3 : 2);
    else if (isDefinerToken(t[1]))
      label(1);
    else if (first.col === 1) {
      if (!isKeyword(up))
        label(1);
      else if (t.length > 1)
        return fail(`${up} starts in column 1, where a word is a label. Put a space or tab before it.`, first.col, first.end, `	${first.text}`);
    }
  } else if (first.kind === "number" && first.text.startsWith("$")) {
    return fail(`${first.text} is the hex number ${first.text.slice(1).toUpperCase()}H, so it cannot be a name. Rename it, for example ${first.text.slice(1).toUpperCase()}_ or X${first.text.slice(1).toUpperCase()}.`, first.col, first.end);
  } else if (!isOp(first, "=")) {
    return fail(`A line starts with a label or an instruction; ${first.text} is neither.`, first.col, first.end);
  }
  if (i >= t.length)
    return stmt;
  if (partial && t[i].kind !== "ident")
    return stmt;
  const opTok = t[i];
  if (opTok.kind !== "ident" && !isOp(opTok, "="))
    return fail(`${opTok.text} is not an instruction; an instruction or directive name should come here.`, opTok.col, opTok.end);
  stmt.op = { name: opTok.text.toUpperCase(), written: opTok.text, col: opTok.col, end: opTok.end };
  if (partial)
    return stmt;
  const start = i + 1;
  if (start >= t.length)
    return stmt;
  const parts = [];
  let depth = 0;
  let from = start;
  for (let j = start; j < t.length; j++) {
    const tok = t[j];
    if (isOp(tok, "("))
      depth++;
    else if (isOp(tok, ")"))
      depth--;
    else if (depth === 0 && isOp(tok, ",")) {
      parts.push([from, j]);
      from = j + 1;
    }
  }
  parts.push([from, t.length]);
  for (let p = 0; p < parts.length; p++) {
    const [a, b] = parts[p];
    if (a === b) {
      const comma = p === 0 ? t[b] : t[a - 1];
      return fail(p === 0 ? "An operand is missing before the comma." : "An operand is missing after the comma.", comma.col, comma.end);
    }
    try {
      stmt.operands.push(operand(text, t, a, b));
    } catch (e) {
      if (e instanceof ExprError)
        return fail(e.sentence ?? "This operand cannot be read.", e.col, e.end, e.fix);
      throw e;
    }
  }
  return stmt;
}

// node_modules/@fugloy/asm/dist/suggest.js
var rows = [new Int32Array(32), new Int32Array(32), new Int32Array(32)];
function distance(a, b) {
  const n = b.length;
  if (rows[0].length <= n)
    rows = [new Int32Array(n + 1), new Int32Array(n + 1), new Int32Array(n + 1)];
  let [before, prev, cur] = rows;
  for (let j = 0; j <= n; j++)
    prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        v = Math.min(v, before[j - 2] + 1);
      cur[j] = v;
    }
    [before, prev, cur] = [prev, cur, before];
  }
  return prev[n];
}
function orList2(items) {
  if (items.length <= 2)
    return items.join(" or ");
  return `${items.slice(0, -1).join(", ")}, or ${items[items.length - 1]}`;
}
function nearest(word3, candidates2) {
  const w = word3.toUpperCase();
  const limit = w.length <= 3 ? 1 : 2;
  let best = [];
  for (const name of candidates2) {
    if (Math.abs(name.length - w.length) > limit)
      continue;
    const d = distance(w, name.toUpperCase());
    if (d === 0 || d > limit)
      continue;
    const len = Math.abs(name.length - w.length);
    const top = best[0];
    if (top === void 0 || d < top.d || d === top.d && len < top.len)
      best = [{ name, d, len }];
    else if (d === top.d && len === top.len)
      best.push({ name, d, len });
  }
  return best.map((b) => b.name).sort().slice(0, 3);
}
var MNEMONICS_LONGEST_FIRST = mnemonics().sort((a, b) => b.length - a.length);
function suggestOperation(upper) {
  for (const m of MNEMONICS_LONGEST_FIRST) {
    if (!upper.startsWith(m) || upper.length === m.length)
      continue;
    const rest = upper.slice(m.length);
    if (!REGISTERS.has(rest))
      continue;
    const fs = forms(m);
    if (fs.some((f) => f.startsWith(`${rest},`)))
      return `${m} ${rest},\u2026`;
    if (fs.includes(rest))
      return `${m} ${rest}`;
  }
  const near = nearest(upper, [...mnemonics(), ...DIRECTIVES.filter((d) => d !== "=")]);
  return near.length > 0 ? orList2(near) : void 0;
}
var core = (name) => name.toUpperCase().replace(/^[$@]/, "");
function nearestRomName(word3, names) {
  const w = core(word3);
  const limit = w.length <= 5 ? 1 : 2;
  const lengths = w.length >= 4 ? [w.length - 1, w.length, w.length + 1] : [w.length, w.length + 1];
  let best = [];
  for (const name of names) {
    const c = core(name);
    if (c === w && name.toUpperCase() === word3.toUpperCase())
      continue;
    let score = Math.abs(c.length - w.length) > limit ? Infinity : distance(w, c);
    if (score > limit) {
      score = Infinity;
      if (w.length >= 3 && (c.includes(w[0]) || c.includes(w[w.length - 1]))) {
        for (const n of lengths) {
          for (let i = 0; i + n <= c.length; i++) {
            const d = distance(w, c.slice(i, i + n));
            if (d <= 1)
              score = Math.min(score, limit + 1 + d + Math.abs(c.length - w.length) / 100);
          }
        }
      }
    }
    if (score === Infinity)
      continue;
    const top = best[0];
    if (top === void 0 || score < top.score)
      best = [{ name, score }];
    else if (score === top.score)
      best.push({ name, score });
  }
  return best.map((b) => b.name).sort().slice(0, 3);
}

// node_modules/@fugloy/asm/dist/symbols.js
var DEFAULT_MODEL = 3;
var MACHINE_TEXT = { 1: "Model I", 3: "Model III", 4: "Model 4" };
var machineText = (model) => MACHINE_TEXT[model];
var DOSES = ["trsdos", "ldos", "none"];
function selectionProblem(model, dos) {
  if (model !== 1 && model !== 3 && model !== 4)
    return `The model is 1, 3, or 4, not ${String(model)}.`;
  if (dos === void 0)
    return void 0;
  if (!DOSES.includes(dos))
    return `The DOS is trsdos, ldos, or none, not ${String(dos)}.`;
  if (model === 4 && dos !== "none")
    return "The Model 4 has no DOS names to choose: its names are the LS-DOS 6 service calls and the Model III ROM. Leave the DOS out.";
  if (model === 1 && dos === "trsdos")
    return "TRSDOS 1.3 is the Model III DOS; for the Model I choose ldos or none.";
  return void 0;
}
var cache = /* @__PURE__ */ new Map();
var valueOf = (e) => e.key;
function romNames(model, dos = "none") {
  const key = `${model}/${dos}`;
  const hit = cache.get(key);
  if (hit !== void 0)
    return hit;
  const sets = model === 4 ? [selectSymbols({ machine: 4, dos: "none" }), selectSymbols({ machine: 3, dos: "none" })] : [selectSymbols({ machine: model, dos })];
  const out = /* @__PURE__ */ new Map();
  for (const set of sets) {
    for (const entry2 of set.entries()) {
      const up = entry2.name.toUpperCase();
      if (!out.has(up))
        out.set(up, { name: entry2.name, value: valueOf(entry2), entry: entry2 });
    }
  }
  cache.set(key, out);
  return out;
}
var TABLE_TEXT = {
  "rom-model1": "Model I ROM",
  "rom-model3": "Model III ROM",
  "hardware-model1": "Model I hardware",
  "hardware-model3": "Model III hardware",
  "dos-trsdos13": "TRSDOS 1.3",
  "dos-ldos51-model1": "LDOS 5.1",
  "dos-ldos51-model3": "LDOS 5.1",
  "svc-lsdos6": "LS-DOS 6"
};
var bare = (name) => name.toUpperCase().replace(/^[$@]/, "");
function nameElsewhere(model, dos, name) {
  const want = bare(name);
  if ([...romNames(model, dos).keys()].some((k) => bare(k) === want))
    return void 0;
  for (const id of Object.keys(TABLES2)) {
    const entry2 = TABLES2[id].find((e) => bare(e.name) === want);
    if (entry2 !== void 0)
      return entry2;
  }
  return void 0;
}
function romDifference(address3) {
  if (ROM_COMPARISON[hex4(address3 & 65535)] !== "different")
    return void 0;
  const model1 = TABLES2["rom-model1"].find((e) => e.key === address3);
  const model3 = TABLES2["rom-model3"].find((e) => e.key === address3);
  return model1 === void 0 || model3 === void 0 ? void 0 : { model1, model3 };
}

// node_modules/@fugloy/asm/dist/assemble.js
var DEFAULT_ORIGIN = 20992;
var RELATIVE = /* @__PURE__ */ new Set(["JR", "DJNZ"]);
var GOES2 = /* @__PURE__ */ new Set(["JP", "CALL", "JR", "DJNZ"]);
var UNSUPPORTED = (() => {
  const out = {};
  const conditional = "Fugl\xF8y does not support conditional assembly (IF, ELSE, ENDIF) yet; keep the lines you want and delete the rest.";
  for (const d of ["IF", "IFDEF", "IFNDEF", "IFEQ", "IFNE", "IFLT", "IFGT", "ELSE", "ENDIF", "COND", "ENDC"])
    out[d] = conditional.replace("(IF, ELSE, ENDIF)", `(${d})`);
  const macros = "Fugl\xF8y does not support macros yet; write the instructions out where they are used.";
  for (const d of ["MACRO", "ENDM", "REPT", "IRP", "IRPC", "EXITM"])
    out[d] = macros.replace("macros", `macros (${d})`);
  for (const d of ["INCLUDE", "MACLIB", "INCBIN"])
    out[d] = `Fugl\xF8y does not support ${d} yet; put the whole program in one file.`;
  return out;
})();
function shapeOf(o) {
  switch (o.kind) {
    case "reg":
      return o.reg;
    case "ind":
      return `(${o.reg})`;
    case "index":
      return o.reg === "IX" ? "(IX+d)" : "(IY+d)";
    case "mem":
      return "(nn)";
    case "imm":
    case "str":
      return "nn";
  }
}
var A_OPTIONAL = /* @__PURE__ */ new Set(["SUB", "AND", "OR", "XOR", "CP"]);
var A_IMPLIED = /* @__PURE__ */ new Set(["ADD", "ADC", "SBC"]);
function withOptionalA(mn, ops, op) {
  const fits2 = (list2) => {
    const shapes = list2.map(shapeOf);
    return lengthOf(mn, shapes) !== null || lengthOf(mn, list2.map((o) => o.kind === "mem" ? "nn" : shapeOf(o))) !== null;
  };
  if (A_OPTIONAL.has(mn) && ops.length === 2 && ops[0].kind === "reg" && ops[0].reg === "A") {
    const rest = ops.slice(1);
    if (fits2(rest))
      return rest;
  }
  if (A_IMPLIED.has(mn) && ops.length === 1) {
    const withA = [{ kind: "reg", reg: "A", text: "A", col: op.col, end: op.end }, ops[0]];
    if (fits2(withA))
      return withA;
  }
  return [...ops];
}
var SINGLE = /* @__PURE__ */ new Set(["B", "C", "D", "E", "H", "L", "I", "R", "IXH", "IXL", "IYH", "IYL"]);
var byteplace = (o) => o.kind === "reg" && SINGLE.has(o.reg) || o.kind === "ind" && o.reg === "HL" || o.kind === "index";
function loadThroughA(mn, ops) {
  if (mn !== "LD" || ops.length !== 2)
    return void 0;
  const [dst, src] = ops;
  if (byteplace(dst) && src.kind === "mem")
    return `Only A can be loaded from an address; use LD A,${src.text} then LD ${dst.text},A.`;
  if (dst.kind === "mem" && byteplace(src))
    return `Only A can be stored at an address from a single register; use LD A,${src.text} then LD ${dst.text},A.`;
  return void 0;
}
function versionAt(sym, line) {
  const versions = sym.versions;
  let seen;
  for (const v of versions)
    if (v.line < line)
      seen = v;
  return seen ?? versions[versions.length - 1];
}
var Assembly = class _Assembly {
  constructor(model, dos = "none") {
    /** The machine the program is for, and the names its tables predefine (upper case). */
    __publicField(this, "model");
    __publicField(this, "rom");
    __publicField(this, "dos");
    /** Whether the caller named the model (the Model I/III note is then info, not a warning). */
    __publicField(this, "modelGiven");
    /** The predefined names the source used without defining them. */
    __publicField(this, "romUsed", /* @__PURE__ */ new Map());
    __publicField(this, "diagnostics", []);
    __publicField(this, "syms", /* @__PURE__ */ new Map());
    __publicField(this, "items", []);
    __publicField(this, "repeats", []);
    /** Every statement up to END, for definedLater. */
    __publicField(this, "pending", []);
    /** The run address ($). */
    __publicField(this, "pc", DEFAULT_ORIGIN);
    /** The load address; it moves with pc and differs from it only under .PHASE. */
    __publicField(this, "load", DEFAULT_ORIGIN);
    /** The open .PHASE's line, or null. */
    __publicField(this, "phase", null);
    __publicField(this, "sawOrg", false);
    /** Whether an ORG appears anywhere before END; if so, zmac starts at 0, and code before it is an error here. */
    __publicField(this, "orgLater", false);
    /** Whether a line took an address before any ORG. */
    __publicField(this, "usedDefault", false);
    /** The END line, if it has an entry to evaluate. */
    __publicField(this, "endItem", null);
    __publicField(this, "entry", null);
    /** Whether every line has been through pass 1, so the symbols are all known and messages can be kept. */
    __publicField(this, "placed", false);
    /** undefinedMessage's answers once `placed`, by name and context: a deleted label used 60 times costs one search, not 60. */
    __publicField(this, "undefinedMessages", /* @__PURE__ */ new Map());
    this.modelGiven = model !== void 0;
    model ?? (model = DEFAULT_MODEL);
    this.model = model;
    this.dos = dos;
    this.rom = romNames(model, dos);
  }
  /** A predefined name the source does not define, noted as used; undefined when the tables lack it too. */
  romValue(name) {
    const up = name.toUpperCase();
    const hit = this.rom.get(up);
    if (hit === void 0)
      return void 0;
    this.romUsed.set(up, hit);
    return hit.value;
  }
  report(severity, line, column, endColumn, message, code, fix) {
    const d = { line, column, endColumn, severity, message };
    if (code !== void 0)
      d.code = code;
    if (fix !== void 0)
      d.fix = fix;
    this.diagnostics.push(d);
  }
  error(line, column, endColumn, message, fix) {
    this.report("error", line, column, endColumn, message, void 0, fix);
  }
  /** Reports an ExprError at `line`, unless it was reported already. */
  exprError(line, e) {
    if (!(e instanceof ExprError))
      throw e;
    if (e.sentence !== null)
      this.error(line, e.col, e.end, e.sentence, e.fix === void 0 ? void 0 : { line, column: e.col, endColumn: e.end, replacement: e.fix });
  }
  // ---- pass 1 -------------------------------------------------------------
  pass1(stmt) {
    const item = { stmt, address: null, load: null, length: 0, emit: "none", operands: stmt.operands, shapes: [], failed: false, bytes: [] };
    this.items.push(item);
    const { line } = stmt;
    const op = stmt.op;
    const name = op?.name;
    const kind = name === "EQU" ? "equ" : name !== void 0 && REDEFINERS.has(name) ? "defl" : "label";
    if (stmt.error !== void 0) {
      const { col, end: end2, message, fix } = stmt.error;
      this.error(line, col, end2, message, fix === void 0 ? void 0 : { line, column: col, endColumn: end2, replacement: fix });
      item.failed = true;
      if (stmt.label !== void 0)
        this.define(stmt, kind, true);
      return item;
    }
    if (stmt.label !== void 0)
      this.define(stmt, kind);
    if (op === void 0 || name === void 0)
      return item;
    if (name === "ORG") {
      org(this, stmt, item);
      return item;
    }
    if (name === "EQU" || REDEFINERS.has(name)) {
      if (stmt.label === void 0) {
        const example = name === "EQU" ? "SCREEN EQU 3C00H" : `COUNT ${name} 0`;
        this.error(line, op.col, op.end, `${name} needs a name in front of it, as in ${example}.`);
        item.failed = true;
      }
      return item;
    }
    if (name === ".PHASE") {
      startPhase(this, stmt, item);
      return item;
    }
    if (name === ".DEPHASE") {
      endPhase(this, stmt, item);
      return item;
    }
    if (name === "END") {
      end(this, stmt, item);
      return item;
    }
    if (RESERVE.has(name)) {
      reserve(this, stmt, item);
      return item;
    }
    if (DATA_BYTES.has(name) || DATA_WORDS.has(name)) {
      if (stmt.operands.length === 0) {
        this.error(line, op.col, op.end, `${name} needs at least one value.`);
        item.failed = true;
        return item;
      }
      const size = DATA_WORDS.has(name) ? 2 : 1;
      item.length = stmt.operands.reduce((n, o) => n + (o.kind === "str" && size === 1 ? o.chars.length : size), 0);
      this.place(item, "data");
      return item;
    }
    if (!isMnemonic(name)) {
      this.unknown(stmt);
      item.failed = true;
      return item;
    }
    this.sizeInstruction(stmt, item);
    return item;
  }
  /** Gives an item its addresses and moves past it. Before the first ORG, when one comes later, that is an error (zmac would use 0). */
  place(item, emit) {
    if (!this.sawOrg) {
      if (this.orgLater) {
        const { col, end: end2 } = spanOf(item.stmt);
        this.error(item.stmt.line, col, end2, `This line comes before the first ORG, so zmac would put it at ${address2(this.pc)}. Put the ORG first.`);
        item.failed = true;
      } else
        this.usedDefault = true;
    }
    item.emit = emit;
    item.address = this.pc;
    item.load = this.load;
    this.pc = this.pc + item.length & 65535;
    this.load = this.load + item.length & 65535;
  }
  /** Defines the statement's label; `broken` defines an EQU or DEFL as failed without a further message. */
  define(stmt, kind, broken = false) {
    const label = stmt.label;
    const up = label.name.toUpperCase();
    const line = stmt.line;
    if (REGISTERS.has(up))
      return this.error(line, label.col, label.end, `${up} is a register name, so it cannot be a label.`);
    if (CONDITIONS.has(up))
      return this.error(line, label.col, label.end, `${up} is a condition name, so it cannot be a label.`);
    if (OPERATOR_WORDS.has(up))
      return this.error(line, label.col, label.end, `${up} is an operator in expressions, so it cannot be a label.`);
    if (kind === "label" && !this.sawOrg && !this.orgLater)
      this.usedDefault = true;
    const sym = { name: label.name, line, kind, col: label.col, end: label.end, here: this.pc, state: "done" };
    if (kind === "label")
      sym.value = this.pc;
    else if (broken)
      sym.state = "failed";
    else
      this.valueOf(stmt, sym);
    const earlier = this.syms.get(up);
    if (earlier !== void 0) {
      if (kind === "defl" && earlier.kind === "defl") {
        earlier.versions.push(sym);
        return;
      }
      if (kind === "equ" && earlier.kind === "equ") {
        if (!broken)
          this.repeats.push({ sym, first: earlier });
        return;
      }
      return this.error(line, label.col, label.end, `${earlier.name} is defined twice, on lines ${earlier.line} and ${line}. Rename one of them.`);
    }
    if (kind === "defl")
      sym.versions = [sym];
    this.syms.set(up, sym);
  }
  /** Takes an EQU's or DEFL's expression, or reports why there is none. */
  valueOf(stmt, sym) {
    const op = stmt.op;
    const operand2 = stmt.operands[0];
    if (stmt.operands.length !== 1 || operand2 === void 0 || operand2.kind === "reg" || operand2.kind === "ind" || operand2.kind === "index") {
      const message = stmt.operands.length === 0 ? `${op.name} needs a value after it.` : stmt.operands.length > 1 ? `${op.name} takes one value.` : `${op.name} needs a value; ${registerWords(operand2)}.`;
      this.error(stmt.line, op.col, operand2?.end ?? op.end, message);
      sym.state = "failed";
      return;
    }
    sym.expr = operand2.expr;
    sym.state = "pending";
  }
  /**
   * The value of an ORG's or .PHASE's single address operand, evaluated now
   * (only names above count), or undefined after reporting why not.
   */
  addressOperand(stmt, what) {
    const op = stmt.op;
    const [operand2, ...rest] = stmt.operands;
    if (operand2 === void 0)
      return void this.error(stmt.line, op.col, op.end, `${what} needs an address after it.`);
    if (rest.length > 0)
      return void this.error(stmt.line, op.col, stmt.operands[stmt.operands.length - 1].end, `${what} takes one address.`);
    if (operand2.kind === "reg" || operand2.kind === "ind" || operand2.kind === "index")
      return void this.error(stmt.line, operand2.col, operand2.end, `${what} needs an address; ${registerWords(operand2)}.`);
    let value;
    try {
      value = this.evaluateNow(operand2.expr, stmt.line, what);
    } catch (e) {
      return void this.exprError(stmt.line, e);
    }
    const problem = addressProblem(what, value);
    if (problem !== void 0)
      return void this.error(stmt.line, operand2.col, operand2.end, problem);
    return value;
  }
  /** Evaluates during pass 1, where only names defined above `line` count. */
  evaluateNow(expr, line, what) {
    return evaluate(expr, { here: this.pc, lookup: (n) => this.lookupBefore(n, line, what, /* @__PURE__ */ new Set()) });
  }
  /**
   * A symbol's value while pass 1 is still placing lines: only names defined
   * above `line` count, since what follows depends on the answer. `at` is the
   * line whose view of a DEFL name is wanted.
   */
  lookupBefore(node, line, what, seen, via) {
    const first = this.syms.get(node.name.toUpperCase());
    if (first === void 0 || first.line >= line) {
      if (first === void 0 && !this.definedLater(node.name, line)) {
        const rom = this.romValue(node.name);
        if (rom !== void 0)
          return rom;
        throw this.undefinedError(node);
      }
      throw new ExprError(`${what} cannot use ${node.name} before ${node.name} is defined, because the addresses after this line depend on it. Define ${node.name} above the ${what}.`, node.col, node.end);
    }
    let sym = first;
    if (first.versions !== void 0) {
      const at2 = via?.line ?? line;
      const above = first.versions.filter((v) => v.line < at2);
      if (above.length === 0) {
        throw new ExprError(`${what} cannot use ${via.name} here: ${via.name} uses ${first.name} on line ${at2}, before ${first.name} is defined on line ${first.line}, and the addresses after this line depend on it. Define ${first.name} above line ${at2}.`, node.col, node.end);
      }
      sym = above[above.length - 1];
    }
    if (sym.state === "failed")
      throw new ExprError(null, node.col, node.end);
    if (sym.value !== void 0)
      return sym.value;
    if (seen.has(sym))
      throw new ExprError(`${sym.name} is defined in terms of itself.`, node.col, node.end);
    seen.add(sym);
    try {
      return evaluate(sym.expr, { here: sym.here, lookup: (n) => this.lookupBefore(n, line, what, seen, sym) });
    } catch (e) {
      if (e instanceof ExprError)
        throw new ExprError(e.sentence, node.col, node.end);
      throw e;
    } finally {
      seen.delete(sym);
    }
  }
  /** Whether a line below `line` defines `name` (pass 1 has not reached it yet). */
  definedLater(name, line) {
    const up = name.toUpperCase();
    return this.pending.some((s) => s.line > line && s.label !== void 0 && s.label.name.toUpperCase() === up);
  }
  unknown(stmt) {
    const op = stmt.op;
    const unsupported = UNSUPPORTED[op.name];
    if (unsupported !== void 0)
      return this.error(stmt.line, op.col, op.end, unsupported);
    if (op.name === "MOV" || op.name === "MVI") {
      const operands = stmt.operands.map((o) => o.text.toUpperCase() === "M" ? "(HL)" : o.text).join(",");
      const rewrite = `LD${operands === "" ? "" : ` ${operands}`}`;
      const last = stmt.operands[stmt.operands.length - 1];
      const end2 = last?.end ?? op.end;
      const fix = operands === "" ? void 0 : { line: stmt.line, column: op.col, endColumn: end2, replacement: rewrite };
      return this.error(stmt.line, op.col, end2, `${op.name} is the 8080's name for what the Z80 calls LD${operands === "" ? "." : `: write ${rewrite}.`}`, fix);
    }
    const guess = suggestOperation(op.name);
    let message = `Unknown instruction ${op.name}.`;
    if (guess !== void 0)
      message += ` Did you mean ${guess}?`;
    const first = stmt.operands[0];
    const looksLikeLabel = stmt.operands.length === 0 || stmt.operands.length === 1 && first !== void 0 && isKeyword(first.text.split(/\s/)[0].toUpperCase());
    if (guess === void 0 && looksLikeLabel && stmt.label === void 0)
      message += ` If ${op.name} is a label, start it in column 1 or end it with a colon.`;
    this.error(stmt.line, op.col, op.end, message);
  }
  sizeInstruction(stmt, item) {
    const op = stmt.op;
    const mn = op.name;
    const ops = withOptionalA(mn, stmt.operands, op);
    item.operands = ops;
    let shapes = ops.map(shapeOf);
    let length = lengthOf(mn, shapes);
    if (length === null && mn !== "LD" && ops.some((o) => o.kind === "mem")) {
      const alt = ops.map((o) => o.kind === "mem" ? "nn" : shapeOf(o));
      const altLength = lengthOf(mn, alt);
      if (altLength !== null) {
        const mem = ops.find((o) => o.kind === "mem");
        if (mn === "JP" && ops.length === 1) {
          this.error(stmt.line, mem.col, mem.end, `JP ${mem.text} jumps to ${mem.inner}; it does not read an address from memory there. Write JP ${mem.inner}.`, {
            line: stmt.line,
            column: mem.col,
            endColumn: mem.end,
            replacement: mem.inner
          });
          item.failed = true;
        } else {
          const written = `${mn} ${stmt.operands.map((o) => o.text).join(",")}`;
          const meant = `${mn} ${stmt.operands.map((o) => o.kind === "mem" ? o.inner : o.text).join(",")}`;
          let message = `${written} reads as ${meant}: ${mn} has no form that reads memory there, so the parentheses only group. Write ${meant} to say so.`;
          const viaHl = lengthOf(mn, alt.map((sh) => sh === "nn" ? "(HL)" : sh));
          if (viaHl !== null) {
            const form = ops.map((o) => o.kind === "mem" ? "(HL)" : o.text).join(",");
            message += ` To use the byte at address ${mem.inner}, point HL at it: LD HL,${mem.inner} then ${mn} ${form}.`;
          }
          const lastOp = stmt.operands[stmt.operands.length - 1];
          this.report("warning", stmt.line, mem.col, mem.end, message, void 0, { line: stmt.line, column: op.col, endColumn: lastOp.end, replacement: meant });
        }
        shapes = alt;
        length = altLength;
      }
    }
    item.shapes = shapes;
    item.length = length ?? 0;
    this.place(item, "instr");
  }
  // ---- between the passes -------------------------------------------------
  /** Resolves every EQU and DEFL in line order, then checks each repeated EQU against the first. */
  resolveAll() {
    for (const sym of this.definitions()) {
      if (sym.state !== "pending")
        continue;
      try {
        this.resolve(sym, []);
      } catch (e) {
        if (!(e instanceof ExprError))
          throw e;
      }
    }
    for (const { sym, first } of this.repeats) {
      if (sym.state !== "done" || first.state !== "done" || sym.value === first.value)
        continue;
      this.error(sym.line, sym.col, sym.end, `${first.name} is defined twice with different values, ${show(first.value)} on line ${first.line} and ${show(sym.value)} on line ${sym.line}. Rename one of them.`);
    }
  }
  /** An EQU's or DEFL's value, resolving what it depends on; errors are reported at its line. */
  resolve(sym, chain) {
    if (sym.state === "done")
      return sym.value;
    if (sym.state === "failed")
      throw new ExprError(null, sym.col, sym.end);
    if (sym.state === "resolving") {
      const loop = [...chain.slice(chain.indexOf(sym)), sym];
      this.error(sym.line, sym.col, sym.end, `${sym.name} is defined in terms of itself: ${loop.map((s) => s.name).join(" \u2192 ")}.`);
      for (const s of loop)
        s.state = "failed";
      throw new ExprError(null, sym.col, sym.end);
    }
    sym.state = "resolving";
    chain.push(sym);
    try {
      const value = evaluate(sym.expr, { here: sym.here, lookup: (n) => this.lookup(n, sym.line, chain) });
      sym.value = value;
      sym.state = "done";
      return value;
    } catch (e) {
      if (sym.state !== "failed") {
        sym.state = "failed";
        this.exprError(sym.line, e);
      }
      throw new ExprError(null, sym.col, sym.end);
    } finally {
      chain.pop();
    }
  }
  /** A symbol's value as `line` sees it (which matters only for a DEFL name). */
  /**
   * A symbol's value as `line` sees it (which matters only for a DEFL name).
   * `place` says whether the name is a jump or call target, a memory
   * address, or a plain value, for the message when it is not defined.
   */
  lookup(node, line, chain = [], place = "value") {
    const sym = this.syms.get(node.name.toUpperCase());
    if (sym === void 0) {
      const rom = this.romValue(node.name);
      if (rom !== void 0)
        return rom;
      throw this.undefinedError(node, place);
    }
    return this.resolve(sym.versions === void 0 ? sym : versionAt(sym, line), chain);
  }
  /** The error for a name nothing defines, with the hex rewrite as a fix where there is one. */
  undefinedError(node, place = "value") {
    const { name } = node;
    let fix;
    if (/^[A-F][0-9A-F]*H$/i.test(name))
      fix = `0${name}`;
    else if (/^\$[0-9A-F]+H$/i.test(name))
      fix = name.slice(0, -1);
    return new ExprError(this.undefinedMessage(name, place), node.col, node.end, fix);
  }
  undefinedMessage(name, place = "value") {
    if (!this.placed)
      return this.findUndefinedMessage(name, place);
    const key = `${place} ${name}`;
    let message = this.undefinedMessages.get(key);
    if (message === void 0) {
      message = this.findUndefinedMessage(name, place);
      this.undefinedMessages.set(key, message);
    }
    return message;
  }
  findUndefinedMessage(name, place) {
    if (/^[A-F][0-9A-F]*H$/i.test(name))
      return `${name} is not defined. A hex number must start with a digit: write 0${name}.`;
    if (/^\$[0-9A-F]+H$/i.test(name))
      return `${name} is not defined. A hex number takes $ or H, not both: write ${name.slice(0, -1)} or 0${name.slice(1)}.`;
    if (isMnemonic(name.toUpperCase()))
      return `${name.toUpperCase()} is an instruction, not a value; put one instruction per line.`;
    const near = nearest(name, [...this.syms.values()].map((s) => s.name));
    if (near.length > 0)
      return `${name} is not defined. Did you mean ${near.join(" or ")}?`;
    const machine = machineText(this.model);
    const names = [...this.rom.values()];
    const fits2 = (r) => place === "go" ? r.entry.kind === "routine" || r.entry.kind === "vector" : r.entry.kind !== "svc" && r.entry.kind !== "port";
    const places = names.filter(fits2).map((r) => r.name);
    const placeText = (rom2) => rom2.length === 1 ? `${rom2[0]}, ${describeName(this.rom.get(rom2[0].toUpperCase()))}` : orList2(rom2);
    const elsewhere = nameElsewhere(this.model, this.dos, name);
    if (elsewhere !== void 0) {
      let message = `${name} is not defined. ${elsewhereText(elsewhere, machine)}`;
      if (elsewhere.table === "svc-lsdos6" && place === "go") {
        const want = elsewhere.name.toUpperCase().replace(/^[$@]/, "");
        const rom2 = places.filter((n) => n.toUpperCase().replace(/^[$@]/, "").includes(want)).sort((a, b) => a.length - b.length || (a < b ? -1 : 1)).slice(0, 3);
        if (rom2.length > 0)
          message += ` On the ${machine}, did you mean ${placeText(rom2)}?`;
      }
      return message;
    }
    if (place !== "value") {
      const rom2 = nearestRomName(name, places);
      const core2 = name.toUpperCase().replace(/^[$@]/, "");
      const svc = names.filter((r) => r.entry.kind === "svc" && distance(core2, r.name.toUpperCase().replace(/^[$@]/, "")) <= 1).map((r) => r.name);
      const call = svc.length > 0 ? `${svc[0]} is an LS-DOS 6 service call number, not an address: to use it, write LD A,${svc[0]} then RST 28H.` : "";
      if (rom2.length > 0)
        return `${name} is not defined. Did you mean ${placeText(rom2)}?${call === "" ? "" : ` (${call})`}`;
      if (call !== "")
        return `${name} is not defined. ${call}`;
    }
    const rom = nearestRomName(name, names.map((r) => r.name));
    if (rom.length > 0)
      return `${name} is not defined. Did you mean ${placeText(rom)}?`;
    return `${name} is not defined.`;
  }
  /**
   * Notes once for a line whose instruction uses an address the Model I and
   * Model III ROM tables give different meanings: a CALL or JP target, or a
   * memory address in parentheses (not an IN or OUT port). A predefined ROM
   * name is never noted, since it comes from the chosen model's table and
   * so already says which machine it means. With no model given the note is
   * a warning (the address may have been copied from the other machine's
   * listing); with a model given it is an info note with the same code.
   */
  romWarning(item, operands) {
    const { stmt } = item;
    const mn = stmt.op.name;
    if (mn === "IN" || mn === "OUT")
      return;
    for (let i = 0; i < operands.length; i++) {
      const { shape, value } = operands[i];
      const node = item.operands[i];
      if (value === void 0 || !("expr" in node))
        continue;
      const name = loneSymbol(node.expr);
      if (name !== void 0 && !this.syms.has(name.toUpperCase()) && this.rom.has(name.toUpperCase()))
        continue;
      if (!(shape === "(nn)" || shape === "nn" && (mn === "CALL" || mn === "JP")))
        continue;
      const diff = romDifference(value & 65535);
      if (diff === void 0)
        continue;
      const [mine, theirs, machine, other] = this.model === 1 ? [diff.model1, diff.model3, "Model I", "Model III"] : [diff.model3, diff.model1, "Model III", "Model I"];
      const head = `${address2(value)} means different things in the two ROMs: on the ${machine} it is ${mine.name} (${mine.purpose}), on the ${other} ${theirs.name} (${theirs.purpose}).`;
      if (this.modelGiven)
        this.report("info", stmt.line, node.col, node.end, `${head} This line is right for the ${machine} only.`, "rom-difference");
      else {
        this.report("warning", stmt.line, node.col, node.end, `${head} No model was chosen, so the program is assembled for the ${machine}, and this line is right for it only; choose the model the program is for.`, "rom-difference");
      }
      return;
    }
  }
  // ---- pass 2 -------------------------------------------------------------
  pass2(item) {
    if (item === this.endItem)
      return this.entryOf(item);
    if (item.failed || item.emit === "none" || item.emit === "space")
      return;
    const { stmt } = item;
    const ctx = { here: item.address, lookup: (n) => this.lookup(n, stmt.line) };
    try {
      item.bytes = item.emit === "instr" ? this.encodeInstruction(item, ctx) : item.emit === "fill" ? this.encodeFill(item, ctx) : this.encodeData(item, ctx);
    } catch (e) {
      this.exprError(stmt.line, e);
      item.bytes = [];
      item.failed = true;
      return;
    }
    if (item.failed)
      item.bytes = [];
    else if (item.bytes.length !== item.length) {
      throw new Error(`internal: line ${stmt.line} sized ${item.length} in pass 1 but encoded ${item.bytes.length} bytes`);
    }
  }
  /**
   * zmac lets a later line write over bytes already placed, and the later
   * bytes win; say so once for each pair of lines, with the range.
   */
  checkOverlaps() {
    const owner = new Uint32Array(65536);
    for (const item of this.items) {
      if (item.bytes.length === 0)
        continue;
      const hit = /* @__PURE__ */ new Map();
      item.bytes.forEach((_, k) => {
        const a = item.load + k & 65535;
        const earlier = owner[a];
        if (earlier !== 0 && earlier !== item.stmt.line) {
          const range = hit.get(earlier);
          if (range === void 0)
            hit.set(earlier, [a, a]);
          else
            range[1] = a;
        }
        owner[a] = item.stmt.line;
      });
      const { col, end: end2 } = spanOf(item.stmt);
      for (const [earlier, [lo2, hi2]] of hit) {
        const where = lo2 === hi2 ? address2(lo2) : `${address2(lo2)} to ${address2(hi2)}`;
        this.report("warning", item.stmt.line, col, end2, `Line ${item.stmt.line} writes over ${where}, which line ${earlier} already filled; the later bytes win, as in zmac.`);
      }
    }
  }
  /** Every definition in line order: each label and EQU, every DEFL version, and every repeated EQU. */
  definitions() {
    const all = [];
    for (const sym of this.syms.values())
      all.push(...sym.versions ?? [sym]);
    all.push(...this.repeats.map((r) => r.sym));
    return all.sort((a, b) => a.line - b.line);
  }
  /** The value each EQU, DEFL, and = line defines, by line, for the listing. */
  definedValues() {
    const out = /* @__PURE__ */ new Map();
    for (const sym of this.definitions())
      if (sym.kind !== "label" && sym.value !== void 0)
        out.set(sym.line, sym.value & 65535);
    return out;
  }
  /** END's entry address. */
  entryOf(item) {
    const { stmt } = item;
    const operand2 = stmt.operands[0];
    try {
      const value = evaluate(operand2.expr, { here: this.pc, lookup: (n) => this.lookup(n, stmt.line) });
      const problem = addressProblem("END", value);
      if (problem !== void 0)
        return this.error(stmt.line, operand2.col, operand2.end, problem);
      this.entry = value;
    } catch (e) {
      this.exprError(stmt.line, e);
    }
  }
  /** A DS's bytes: its fill (0 to 127), or zeros under .PHASE. */
  encodeFill(item, ctx) {
    const { stmt } = item;
    const fill = item.fill;
    let value = 0;
    if (fill !== void 0) {
      value = evaluate(fill.expr, ctx);
      const problem = fillProblem(stmt.op.name, value);
      if (problem !== void 0) {
        this.error(stmt.line, fill.col, fill.end, problem);
        item.failed = true;
        return [];
      }
    }
    return new Array(item.length).fill(value & 255);
  }
  /** Whether operand `i` of an instruction is where to go or a memory address (not an IN or OUT port). */
  static isPlace(mn, shape, i, count) {
    return _Assembly.placeOf(mn, shape, i, count) !== "value";
  }
  /** What operand `i` of an instruction names: where to go, a memory address (not an IN or OUT port), or a plain value. */
  static placeOf(mn, shape, i, count) {
    if (shape === "(nn)")
      return mn === "IN" || mn === "OUT" ? "value" : "memory";
    return GOES2.has(mn) && i === count - 1 && (shape === "nn" || shape === "e" || shape === "n") ? "go" : "value";
  }
  encodeInstruction(item, ctx) {
    const { stmt } = item;
    const op = stmt.op;
    const nodes = item.operands;
    const operands = nodes.map((o, i) => {
      const shape = item.shapes[i];
      if (o.kind === "reg" || o.kind === "ind")
        return { shape };
      const place = _Assembly.placeOf(op.name, shape, i, nodes.length);
      return { shape, value: evaluate(o.expr, place === "value" ? ctx : { here: ctx.here, lookup: (n) => this.lookup(n, stmt.line, [], place) }) };
    });
    const first = stmt.operands[0];
    const last = stmt.operands[stmt.operands.length - 1];
    const fail = (message2, at2, rewrite) => {
      const fix = rewrite === void 0 ? void 0 : { line: stmt.line, column: op.col, endColumn: last?.end ?? op.end, replacement: rewrite };
      this.error(stmt.line, at2?.col ?? first?.col ?? op.col, at2?.end ?? last?.end ?? op.end, message2, fix);
      item.failed = true;
      return [];
    };
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (!("expr" in node) || !_Assembly.isPlace(op.name, operands[i].shape, i, nodes.length))
        continue;
      const name = loneSymbol(node.expr);
      if (name === void 0 || this.syms.has(name.toUpperCase()))
        continue;
      const entry2 = this.rom.get(name.toUpperCase())?.entry;
      if (entry2?.kind === "svc")
        return fail(`${name} is an LS-DOS 6 service call number (${entry2.key}), not an address: to make the call, write LD A,${name} then RST 28H.`, node);
      if (entry2?.kind === "port")
        return fail(`${name} is a port number (${show(entry2.key)}), not an address: read it with IN A,(${name}) or write it with OUT (${name}),A.`, node);
    }
    const ld = loadThroughA(op.name, nodes);
    if (ld !== void 0)
      return fail(ld);
    const options = { written: stmt.operands.map((o) => o.text) };
    const target = nodes[nodes.length - 1];
    if (RELATIVE.has(op.name) && target !== void 0 && "expr" in target) {
      const name = loneSymbol(target.expr);
      if (name !== void 0)
        options.target = name;
    }
    const out = encode(op.name, operands, item.address, options);
    if ("bytes" in out) {
      this.romWarning(item, operands);
      return out.bytes;
    }
    let message = out.error;
    const v = operands[0]?.value;
    if (op.name === "RST" && v !== void 0 && v >= 1 && v <= 7) {
      message += ` zmac reads RST ${v} as RST ${asSource(v * 8)}; write RST ${asSource(v * 8)} if that is what you mean.`;
    }
    const culprit = out.operand === void 0 ? void 0 : nodes[out.operand];
    return fail(message, culprit, out.rewrite);
  }
  encodeData(item, ctx) {
    const { stmt } = item;
    const name = stmt.op.name;
    const words = DATA_WORDS.has(name);
    const out = [];
    for (const o of stmt.operands) {
      if (o.kind === "reg" || o.kind === "ind" || o.kind === "index") {
        this.error(stmt.line, o.col, o.end, `${name} takes values; ${registerWords(o)}.`);
        item.failed = true;
        return [];
      }
      if (o.kind === "str" && !words) {
        out.push(...o.chars);
        continue;
      }
      const value = evaluate(o.expr, { ...ctx, here: ctx.here + out.length & 65535 });
      const [lo2, hi2, what] = words ? [-32768, 65535, "words"] : [-128, 255, "bytes"];
      if (value < lo2 || value > hi2) {
        this.error(stmt.line, o.col, o.end, `${name} takes ${what}, ${lo2} to ${hi2}; ${show(value)} is out of range.`);
        item.failed = true;
        return [];
      }
      out.push(value & 255);
      if (words)
        out.push(value >> 8 & 255);
    }
    return out;
  }
};
function sourceLines(source) {
  const lines = source.split(/\r?\n/);
  if (lines.length > 1 && lines[lines.length - 1] === "")
    lines.pop();
  return lines;
}
function assemble(source, options = {}) {
  const problem = selectionProblem(options.model ?? DEFAULT_MODEL, options.dos);
  if (problem !== void 0)
    throw new RangeError(problem);
  const asm = new Assembly(options.model, options.dos);
  const lines = sourceLines(source);
  const statements = [];
  for (let i = 0; i < lines.length; i++) {
    const stmt = parseLine(lines[i], i + 1);
    statements.push(stmt);
    if (stmt.op?.name === "END")
      break;
  }
  asm.pending = statements;
  asm.orgLater = statements.some((s) => s.op?.name === "ORG");
  if (asm.orgLater) {
    asm.pc = 0;
    asm.load = 0;
  }
  for (const stmt of statements)
    asm.pass1(stmt);
  asm.placed = true;
  asm.resolveAll();
  for (const item of asm.items)
    asm.pass2(item);
  for (let i = statements.length; i < lines.length; i++) {
    asm.items.push({ stmt: { line: i + 1, text: lines[i], operands: [] }, address: null, load: null, length: 0, emit: "none", operands: [], shapes: [], failed: false, bytes: [] });
  }
  asm.checkOverlaps();
  const firstPlaced = asm.items.find((i) => i.bytes.length > 0);
  if (asm.entry === null && asm.endItem === null && firstPlaced !== void 0 && firstPlaced.address !== firstPlaced.load) {
    const { col, end: end2 } = spanOf(firstPlaced.stmt);
    asm.report("info", firstPlaced.stmt.line, col, end2, `There is no END entry, so a .CMD of this program starts at its first byte, ${address2(firstPlaced.load)}, where this line loads; but it is assembled to run at ${address2(firstPlaced.address)}. Name the start with END, as in END START.`);
  }
  if (!asm.orgLater && asm.usedDefault) {
    asm.report("info", 1, 1, Math.max(2, (lines[0]?.length ?? 0) + 1), `There is no ORG, so the program starts at ${address2(DEFAULT_ORIGIN)}.`);
  }
  const diagnostics = asm.diagnostics.map((d, i) => ({ d, i })).sort((a, b) => a.d.line - b.d.line || a.i - b.i).map(({ d }) => d);
  const ok = !diagnostics.some((d) => d.severity === "error");
  const lineAt = /* @__PURE__ */ new Map();
  const byLine = /* @__PURE__ */ new Map();
  const valueAt = asm.definedValues();
  const listing = asm.items.map((item) => {
    const { line, text } = item.stmt;
    const addrs = [];
    item.bytes.forEach((_, k) => {
      const a = item.address + k & 65535;
      addrs.push(a);
      const here = lineAt.get(a);
      if (here === void 0)
        lineAt.set(a, [{ item, k }]);
      else
        here.push({ item, k });
    });
    byLine.set(line, addrs);
    const placed = item.emit !== "none";
    const entry2 = { line, address: placed ? item.address : null, load: placed ? item.load : null, bytes: item.bytes, text };
    const value = valueAt.get(line);
    if (value !== void 0)
      entry2.value = value;
    return entry2;
  });
  const sourceMap = {
    lineOf: (a) => lineAt.get(a & 65535)?.[0]?.item.stmt.line ?? null,
    linesOf: (a) => (lineAt.get(a & 65535) ?? []).map(({ item, k }) => ({ line: item.stmt.line, bytes: item.bytes.slice(k) })),
    addressesOf: (line) => [...byLine.get(line) ?? []]
  };
  let image = null;
  if (ok) {
    image = new MemoryImage();
    let start = -1;
    let block = [];
    const flush = () => {
      if (block.length > 0)
        image.load(start, block);
      block = [];
    };
    for (const item of asm.items) {
      if (item.bytes.length === 0)
        continue;
      if (block.length === 0 || (start + block.length & 65535) !== item.load) {
        flush();
        start = item.load;
      }
      block.push(...item.bytes);
    }
    flush();
  }
  const symbols = /* @__PURE__ */ new Map();
  for (const sym of asm.syms.values()) {
    const last = sym.versions === void 0 ? sym : sym.versions[sym.versions.length - 1];
    if (last.value !== void 0)
      symbols.set(sym.name, { value: last.value & 65535, line: last.line, kind: sym.kind });
  }
  for (const r of asm.romUsed.values())
    symbols.set(r.name, { value: r.value, line: 0, kind: "rom" });
  const byUpper = /* @__PURE__ */ new Map();
  for (const [name, info] of symbols)
    byUpper.set(name.toUpperCase(), info);
  const symbol = (name) => byUpper.get(name.toUpperCase());
  return { ok, image, entry: ok ? asm.entry : null, symbols, symbol, sourceMap, listing, diagnostics };
}
function elsewhereText(entry2, machine) {
  const from = TABLE_TEXT[entry2.table];
  if (entry2.table.startsWith("dos-"))
    return `${entry2.name} is a ${from} name; choose ${from} as the DOS to use it.`;
  if (entry2.table === "svc-lsdos6")
    return `${entry2.name} is an LS-DOS 6 service call, which only the Model 4 has.`;
  return `${entry2.name} is a ${from} name, and this program is assembled for the ${machine}.`;
}
function describeName(r) {
  const { entry: entry2 } = r;
  const from = TABLE_TEXT[entry2.table];
  if (entry2.kind === "port")
    return `the ${from} port ${show(entry2.key)} (${entry2.purpose})`;
  if (entry2.kind === "svc")
    return `the ${from} service call ${entry2.key} (${entry2.purpose})`;
  return `the ${from} ${entry2.kind} at ${address2(entry2.key)} (${entry2.purpose})`;
}

// node_modules/z80-base/dist/Register.js
var BYTE_REG_ARRAY = ["a", "f", "b", "c", "d", "e", "h", "l", "ixh", "ixl", "iyh", "iyl", "i", "r"];
var BYTE_REG_SET = new Set(BYTE_REG_ARRAY);
var WORD_REG_ARRAY = [
  "af",
  "bc",
  "de",
  "hl",
  "afPrime",
  "bcPrime",
  "dePrime",
  "hlPrime",
  "ix",
  "iy",
  "sp",
  "pc"
];
var WORD_REG_SET = new Set(WORD_REG_ARRAY);
var WORD_REG_PRIME_ARRAY = WORD_REG_ARRAY.map((reg2) => reg2.replace("Prime", "'"));
var WORD_REG_PRIME_SET = new Set(WORD_REG_PRIME_ARRAY);
var INTERNAL_REG_ARRAY = ["memptr", "i", "r", "iff1", "iff2", "im", "halted"];
var INTERNAL_REG_SET = new Set(INTERNAL_REG_ARRAY);

// node_modules/z80-base/dist/Utils.js
function toHex(value, digits) {
  return value.toString(16).toUpperCase().padStart(digits, "0");
}
function hi(value) {
  return value >> 8 & 255;
}
function lo(value) {
  return value & 255;
}
function word2(highByte, lowByte) {
  return (highByte & 255) << 8 | lowByte & 255;
}
function inc8(value) {
  return add8(value, 1);
}
function inc16(value) {
  return add16(value, 1);
}
function dec8(value) {
  return sub8(value, 1);
}
function dec16(value) {
  return sub16(value, 1);
}
function add8(a, b) {
  return a + b & 255;
}
function add16(a, b) {
  return a + b & 65535;
}
function sub8(a, b) {
  return a - b & 255;
}
function sub16(a, b) {
  return a - b & 65535;
}
function signedByte(value) {
  return value >= 128 ? value - 256 : value;
}

// node_modules/z80-base/dist/RegisterSet.js
var RegisterSet = class {
  constructor() {
    this.af = 0;
    this.bc = 0;
    this.de = 0;
    this.hl = 0;
    this.afPrime = 0;
    this.bcPrime = 0;
    this.dePrime = 0;
    this.hlPrime = 0;
    this.ix = 0;
    this.iy = 0;
    this.sp = 0;
    this.pc = 0;
    this.memptr = 0;
    this.i = 0;
    this.r = 0;
    this.r7 = 0;
    this.iff1 = 0;
    this.iff2 = 0;
    this.im = 0;
    this.halted = 0;
  }
  get a() {
    return hi(this.af);
  }
  set a(value) {
    this.af = word2(value, this.f);
  }
  get f() {
    return lo(this.af);
  }
  set f(value) {
    this.af = word2(this.a, value);
  }
  get b() {
    return hi(this.bc);
  }
  set b(value) {
    this.bc = word2(value, this.c);
  }
  get c() {
    return lo(this.bc);
  }
  set c(value) {
    this.bc = word2(this.b, value);
  }
  get d() {
    return hi(this.de);
  }
  set d(value) {
    this.de = word2(value, this.e);
  }
  get e() {
    return lo(this.de);
  }
  set e(value) {
    this.de = word2(this.d, value);
  }
  get h() {
    return hi(this.hl);
  }
  set h(value) {
    this.hl = word2(value, this.l);
  }
  get l() {
    return lo(this.hl);
  }
  set l(value) {
    this.hl = word2(this.h, value);
  }
  get ixh() {
    return hi(this.ix);
  }
  set ixh(value) {
    this.ix = word2(value, this.ixl);
  }
  get ixl() {
    return lo(this.ix);
  }
  set ixl(value) {
    this.ix = word2(this.ixh, value);
  }
  get iyh() {
    return hi(this.iy);
  }
  set iyh(value) {
    this.iy = word2(value, this.iyl);
  }
  get iyl() {
    return lo(this.iy);
  }
  set iyl(value) {
    this.iy = word2(this.iyh, value);
  }
  /**
   * Combine the two R parts together.
   */
  get rCombined() {
    return this.r7 & 128 | this.r & 247;
  }
  /**
   * Get a register by name.
   */
  getValue(registerName) {
    return this[registerName];
  }
};

// node_modules/z80-base/dist/Flag.js
var Flag;
(function(Flag2) {
  Flag2[Flag2["C"] = 1] = "C";
  Flag2[Flag2["N"] = 2] = "N";
  Flag2[Flag2["P"] = 4] = "P";
  Flag2[Flag2["V"] = 4] = "V";
  Flag2[Flag2["X3"] = 8] = "X3";
  Flag2[Flag2["H"] = 16] = "H";
  Flag2[Flag2["X5"] = 32] = "X5";
  Flag2[Flag2["Z"] = 64] = "Z";
  Flag2[Flag2["S"] = 128] = "S";
})(Flag || (Flag = {}));

// node_modules/z80-emulator/dist/Decode.js
var halfCarryAddTable = [0, Flag.H, Flag.H, Flag.H, 0, 0, 0, Flag.H];
var halfCarrySubTable = [0, 0, Flag.H, 0, Flag.H, 0, Flag.H, Flag.H];
var overflowAddTable = [0, 0, 0, Flag.V, Flag.V, 0, 0, 0];
var overflowSubTable = [0, Flag.V, 0, 0, 0, 0, Flag.V, 0];
var decodeMapBASE = /* @__PURE__ */ new Map();
decodeMapBASE.set(0, (z80) => {
});
decodeMapBASE.set(1, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  value = word2(z80.readByte(z80.regs.pc), value);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.bc = value;
});
decodeMapBASE.set(2, (z80) => {
  let value;
  value = z80.regs.a;
  z80.regs.memptr = word2(z80.regs.a, inc16(z80.regs.bc));
  z80.writeByte(z80.regs.bc, value);
});
decodeMapBASE.set(3, (z80) => {
  let value;
  value = z80.regs.bc;
  const oldValue = value;
  z80.incTStateCount(2);
  value = inc16(value);
  z80.regs.bc = value;
});
decodeMapBASE.set(4, (z80) => {
  let value;
  value = z80.regs.b;
  const oldValue = value;
  value = inc8(value);
  z80.regs.f = z80.regs.f & Flag.C | (value === 128 ? Flag.V : 0) | ((value & 15) !== 0 ? 0 : Flag.H) | z80.sz53Table[value];
  z80.regs.b = value;
});
decodeMapBASE.set(5, (z80) => {
  let value;
  value = z80.regs.b;
  const oldValue = value;
  value = dec8(value);
  z80.regs.f = z80.regs.f & Flag.C | (value === 127 ? Flag.V : 0) | ((oldValue & 15) !== 0 ? 0 : Flag.H) | Flag.N | z80.sz53Table[value];
  z80.regs.b = value;
});
decodeMapBASE.set(6, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.b = value;
});
decodeMapBASE.set(7, (z80) => {
  const oldA = z80.regs.a;
  z80.regs.a = (z80.regs.a >> 7 | z80.regs.a << 1) & 255;
  z80.regs.f = z80.regs.f & (Flag.P | Flag.Z | Flag.S) | z80.regs.a & (Flag.X3 | Flag.X5) | ((oldA & 128) !== 0 ? Flag.C : 0);
});
decodeMapBASE.set(8, (z80) => {
  const rightValue = z80.regs.afPrime;
  z80.regs.afPrime = z80.regs.af;
  z80.regs.af = rightValue;
});
decodeMapBASE.set(9, (z80) => {
  let value;
  z80.incTStateCount(7);
  value = z80.regs.bc;
  let result = z80.regs.hl + value;
  const lookup = ((z80.regs.hl & 2048) >> 11 | (value & 2048) >> 10 | (result & 2048) >> 9) & 255;
  z80.regs.memptr = inc16(z80.regs.hl);
  z80.regs.hl = result & 65535;
  z80.regs.f = z80.regs.f & (Flag.V | Flag.Z | Flag.S) | ((result & 65536) !== 0 ? Flag.C : 0) | result >> 8 & (Flag.X3 | Flag.X5) | halfCarryAddTable[lookup];
});
decodeMapBASE.set(10, (z80) => {
  let value;
  z80.regs.memptr = inc16(z80.regs.bc);
  value = z80.readByte(z80.regs.bc);
  z80.regs.a = value;
});
decodeMapBASE.set(11, (z80) => {
  let value;
  value = z80.regs.bc;
  const oldValue = value;
  z80.incTStateCount(2);
  value = dec16(value);
  z80.regs.bc = value;
});
decodeMapBASE.set(12, (z80) => {
  let value;
  value = z80.regs.c;
  const oldValue = value;
  value = inc8(value);
  z80.regs.f = z80.regs.f & Flag.C | (value === 128 ? Flag.V : 0) | ((value & 15) !== 0 ? 0 : Flag.H) | z80.sz53Table[value];
  z80.regs.c = value;
});
decodeMapBASE.set(13, (z80) => {
  let value;
  value = z80.regs.c;
  const oldValue = value;
  value = dec8(value);
  z80.regs.f = z80.regs.f & Flag.C | (value === 127 ? Flag.V : 0) | ((oldValue & 15) !== 0 ? 0 : Flag.H) | Flag.N | z80.sz53Table[value];
  z80.regs.c = value;
});
decodeMapBASE.set(14, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.c = value;
});
decodeMapBASE.set(15, (z80) => {
  const oldA = z80.regs.a;
  z80.regs.a = (z80.regs.a >> 1 | z80.regs.a << 7) & 255;
  z80.regs.f = z80.regs.f & (Flag.P | Flag.Z | Flag.S) | z80.regs.a & (Flag.X3 | Flag.X5) | ((oldA & 1) !== 0 ? Flag.C : 0);
});
decodeMapBASE.set(16, (z80) => {
  z80.incTStateCount(1);
  z80.regs.b = dec8(z80.regs.b);
  if (z80.regs.b !== 0) {
    const offset = z80.readByte(z80.regs.pc);
    z80.incTStateCount(5);
    z80.regs.pc = add16(z80.regs.pc, signedByte(offset));
    z80.regs.pc = inc16(z80.regs.pc);
    z80.regs.memptr = z80.regs.pc;
  } else {
    z80.incTStateCount(3);
    z80.regs.pc = inc16(z80.regs.pc);
  }
});
decodeMapBASE.set(17, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  value = word2(z80.readByte(z80.regs.pc), value);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.de = value;
});
decodeMapBASE.set(18, (z80) => {
  let value;
  value = z80.regs.a;
  z80.regs.memptr = word2(z80.regs.a, inc16(z80.regs.de));
  z80.writeByte(z80.regs.de, value);
});
decodeMapBASE.set(19, (z80) => {
  let value;
  value = z80.regs.de;
  const oldValue = value;
  z80.incTStateCount(2);
  value = inc16(value);
  z80.regs.de = value;
});
decodeMapBASE.set(20, (z80) => {
  let value;
  value = z80.regs.d;
  const oldValue = value;
  value = inc8(value);
  z80.regs.f = z80.regs.f & Flag.C | (value === 128 ? Flag.V : 0) | ((value & 15) !== 0 ? 0 : Flag.H) | z80.sz53Table[value];
  z80.regs.d = value;
});
decodeMapBASE.set(21, (z80) => {
  let value;
  value = z80.regs.d;
  const oldValue = value;
  value = dec8(value);
  z80.regs.f = z80.regs.f & Flag.C | (value === 127 ? Flag.V : 0) | ((oldValue & 15) !== 0 ? 0 : Flag.H) | Flag.N | z80.sz53Table[value];
  z80.regs.d = value;
});
decodeMapBASE.set(22, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.d = value;
});
decodeMapBASE.set(23, (z80) => {
  const oldA = z80.regs.a;
  z80.regs.a = (z80.regs.a << 1 | ((z80.regs.f & Flag.C) !== 0 ? 1 : 0)) & 255;
  z80.regs.f = z80.regs.f & (Flag.P | Flag.Z | Flag.S) | z80.regs.a & (Flag.X3 | Flag.X5) | ((oldA & 128) !== 0 ? Flag.C : 0);
});
decodeMapBASE.set(24, (z80) => {
  const offset = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = add16(z80.regs.pc, signedByte(offset));
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = z80.regs.pc;
});
decodeMapBASE.set(25, (z80) => {
  let value;
  z80.incTStateCount(7);
  value = z80.regs.de;
  let result = z80.regs.hl + value;
  const lookup = ((z80.regs.hl & 2048) >> 11 | (value & 2048) >> 10 | (result & 2048) >> 9) & 255;
  z80.regs.memptr = inc16(z80.regs.hl);
  z80.regs.hl = result & 65535;
  z80.regs.f = z80.regs.f & (Flag.V | Flag.Z | Flag.S) | ((result & 65536) !== 0 ? Flag.C : 0) | result >> 8 & (Flag.X3 | Flag.X5) | halfCarryAddTable[lookup];
});
decodeMapBASE.set(26, (z80) => {
  let value;
  z80.regs.memptr = inc16(z80.regs.de);
  value = z80.readByte(z80.regs.de);
  z80.regs.a = value;
});
decodeMapBASE.set(27, (z80) => {
  let value;
  value = z80.regs.de;
  const oldValue = value;
  z80.incTStateCount(2);
  value = dec16(value);
  z80.regs.de = value;
});
decodeMapBASE.set(28, (z80) => {
  let value;
  value = z80.regs.e;
  const oldValue = value;
  value = inc8(value);
  z80.regs.f = z80.regs.f & Flag.C | (value === 128 ? Flag.V : 0) | ((value & 15) !== 0 ? 0 : Flag.H) | z80.sz53Table[value];
  z80.regs.e = value;
});
decodeMapBASE.set(29, (z80) => {
  let value;
  value = z80.regs.e;
  const oldValue = value;
  value = dec8(value);
  z80.regs.f = z80.regs.f & Flag.C | (value === 127 ? Flag.V : 0) | ((oldValue & 15) !== 0 ? 0 : Flag.H) | Flag.N | z80.sz53Table[value];
  z80.regs.e = value;
});
decodeMapBASE.set(30, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.e = value;
});
decodeMapBASE.set(31, (z80) => {
  const oldA = z80.regs.a;
  z80.regs.a = z80.regs.a >> 1 | ((z80.regs.f & Flag.C) !== 0 ? 128 : 0);
  z80.regs.f = z80.regs.f & (Flag.P | Flag.Z | Flag.S) | z80.regs.a & (Flag.X3 | Flag.X5) | ((oldA & 1) !== 0 ? Flag.C : 0);
});
decodeMapBASE.set(32, (z80) => {
  if ((z80.regs.f & Flag.Z) === 0) {
    const offset = z80.readByte(z80.regs.pc);
    z80.incTStateCount(5);
    z80.regs.pc = add16(z80.regs.pc, signedByte(offset));
    z80.regs.pc = inc16(z80.regs.pc);
    z80.regs.memptr = z80.regs.pc;
  } else {
    z80.incTStateCount(3);
    z80.regs.pc = inc16(z80.regs.pc);
  }
});
decodeMapBASE.set(33, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  value = word2(z80.readByte(z80.regs.pc), value);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.hl = value;
});
decodeMapBASE.set(34, (z80) => {
  let value;
  value = z80.regs.hl;
  let addr = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  addr = word2(z80.readByte(z80.regs.pc), addr);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.writeByte(addr, lo(value));
  addr = inc16(addr);
  z80.regs.memptr = addr;
  z80.writeByte(addr, hi(value));
});
decodeMapBASE.set(35, (z80) => {
  let value;
  value = z80.regs.hl;
  const oldValue = value;
  z80.incTStateCount(2);
  value = inc16(value);
  z80.regs.hl = value;
});
decodeMapBASE.set(36, (z80) => {
  let value;
  value = z80.regs.h;
  const oldValue = value;
  value = inc8(value);
  z80.regs.f = z80.regs.f & Flag.C | (value === 128 ? Flag.V : 0) | ((value & 15) !== 0 ? 0 : Flag.H) | z80.sz53Table[value];
  z80.regs.h = value;
});
decodeMapBASE.set(37, (z80) => {
  let value;
  value = z80.regs.h;
  const oldValue = value;
  value = dec8(value);
  z80.regs.f = z80.regs.f & Flag.C | (value === 127 ? Flag.V : 0) | ((oldValue & 15) !== 0 ? 0 : Flag.H) | Flag.N | z80.sz53Table[value];
  z80.regs.h = value;
});
decodeMapBASE.set(38, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.h = value;
});
decodeMapBASE.set(39, (z80) => {
  let value = 0;
  let carry = z80.regs.f & Flag.C;
  if ((z80.regs.f & Flag.H) !== 0 || (z80.regs.a & 15) > 9) {
    value = 6;
  }
  if (carry !== 0 || z80.regs.a > 153) {
    value |= 96;
  }
  if (z80.regs.a > 153) {
    carry = Flag.C;
  }
  if ((z80.regs.f & Flag.N) !== 0) {
    let result = sub16(z80.regs.a, value);
    const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
    z80.regs.a = result & 255;
    z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | Flag.N | halfCarrySubTable[lookup & 7] | overflowSubTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
  } else {
    let result = add16(z80.regs.a, value);
    const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
    z80.regs.a = result & 255;
    z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | halfCarryAddTable[lookup & 7] | overflowAddTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
  }
  z80.regs.f = z80.regs.f & ~(Flag.C | Flag.P) | carry | z80.parityTable[z80.regs.a];
});
decodeMapBASE.set(40, (z80) => {
  if ((z80.regs.f & Flag.Z) !== 0) {
    const offset = z80.readByte(z80.regs.pc);
    z80.incTStateCount(5);
    z80.regs.pc = add16(z80.regs.pc, signedByte(offset));
    z80.regs.pc = inc16(z80.regs.pc);
    z80.regs.memptr = z80.regs.pc;
  } else {
    z80.incTStateCount(3);
    z80.regs.pc = inc16(z80.regs.pc);
  }
});
decodeMapBASE.set(41, (z80) => {
  let value;
  z80.incTStateCount(7);
  value = z80.regs.hl;
  let result = z80.regs.hl + value;
  const lookup = ((z80.regs.hl & 2048) >> 11 | (value & 2048) >> 10 | (result & 2048) >> 9) & 255;
  z80.regs.memptr = inc16(z80.regs.hl);
  z80.regs.hl = result & 65535;
  z80.regs.f = z80.regs.f & (Flag.V | Flag.Z | Flag.S) | ((result & 65536) !== 0 ? Flag.C : 0) | result >> 8 & (Flag.X3 | Flag.X5) | halfCarryAddTable[lookup];
});
decodeMapBASE.set(42, (z80) => {
  let value;
  let addr = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  addr = word2(z80.readByte(z80.regs.pc), addr);
  z80.regs.pc = inc16(z80.regs.pc);
  value = z80.readByte(addr);
  z80.regs.memptr = inc16(addr);
  value = word2(z80.readByte(z80.regs.memptr), value);
  z80.regs.hl = value;
});
decodeMapBASE.set(43, (z80) => {
  let value;
  value = z80.regs.hl;
  const oldValue = value;
  z80.incTStateCount(2);
  value = dec16(value);
  z80.regs.hl = value;
});
decodeMapBASE.set(44, (z80) => {
  let value;
  value = z80.regs.l;
  const oldValue = value;
  value = inc8(value);
  z80.regs.f = z80.regs.f & Flag.C | (value === 128 ? Flag.V : 0) | ((value & 15) !== 0 ? 0 : Flag.H) | z80.sz53Table[value];
  z80.regs.l = value;
});
decodeMapBASE.set(45, (z80) => {
  let value;
  value = z80.regs.l;
  const oldValue = value;
  value = dec8(value);
  z80.regs.f = z80.regs.f & Flag.C | (value === 127 ? Flag.V : 0) | ((oldValue & 15) !== 0 ? 0 : Flag.H) | Flag.N | z80.sz53Table[value];
  z80.regs.l = value;
});
decodeMapBASE.set(46, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.l = value;
});
decodeMapBASE.set(47, (z80) => {
  z80.regs.a ^= 255;
  z80.regs.f = z80.regs.f & (Flag.C | Flag.P | Flag.Z | Flag.S) | z80.regs.a & (Flag.X3 | Flag.X5) | Flag.N | Flag.H;
});
decodeMapBASE.set(48, (z80) => {
  if ((z80.regs.f & Flag.C) === 0) {
    const offset = z80.readByte(z80.regs.pc);
    z80.incTStateCount(5);
    z80.regs.pc = add16(z80.regs.pc, signedByte(offset));
    z80.regs.pc = inc16(z80.regs.pc);
    z80.regs.memptr = z80.regs.pc;
  } else {
    z80.incTStateCount(3);
    z80.regs.pc = inc16(z80.regs.pc);
  }
});
decodeMapBASE.set(49, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  value = word2(z80.readByte(z80.regs.pc), value);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.sp = value;
});
decodeMapBASE.set(50, (z80) => {
  let value;
  value = z80.regs.a;
  value = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  value = word2(z80.readByte(z80.regs.pc), value);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = word2(z80.regs.a, inc16(value));
  z80.writeByte(value, z80.regs.a);
});
decodeMapBASE.set(51, (z80) => {
  let value;
  value = z80.regs.sp;
  const oldValue = value;
  z80.incTStateCount(2);
  value = inc16(value);
  z80.regs.sp = value;
});
decodeMapBASE.set(52, (z80) => {
  let value;
  value = z80.readByte(z80.regs.hl);
  z80.incTStateCount(1);
  const oldValue = value;
  value = inc8(value);
  z80.regs.f = z80.regs.f & Flag.C | (value === 128 ? Flag.V : 0) | ((value & 15) !== 0 ? 0 : Flag.H) | z80.sz53Table[value];
  z80.writeByte(z80.regs.hl, value);
});
decodeMapBASE.set(53, (z80) => {
  let value;
  value = z80.readByte(z80.regs.hl);
  z80.incTStateCount(1);
  const oldValue = value;
  value = dec8(value);
  z80.regs.f = z80.regs.f & Flag.C | (value === 127 ? Flag.V : 0) | ((oldValue & 15) !== 0 ? 0 : Flag.H) | Flag.N | z80.sz53Table[value];
  z80.writeByte(z80.regs.hl, value);
});
decodeMapBASE.set(54, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.writeByte(z80.regs.hl, value);
});
decodeMapBASE.set(55, (z80) => {
  z80.regs.f = z80.regs.f & (Flag.P | Flag.Z | Flag.S) | Flag.C | z80.regs.a & (Flag.X3 | Flag.X5);
});
decodeMapBASE.set(56, (z80) => {
  if ((z80.regs.f & Flag.C) !== 0) {
    const offset = z80.readByte(z80.regs.pc);
    z80.incTStateCount(5);
    z80.regs.pc = add16(z80.regs.pc, signedByte(offset));
    z80.regs.pc = inc16(z80.regs.pc);
    z80.regs.memptr = z80.regs.pc;
  } else {
    z80.incTStateCount(3);
    z80.regs.pc = inc16(z80.regs.pc);
  }
});
decodeMapBASE.set(57, (z80) => {
  let value;
  z80.incTStateCount(7);
  value = z80.regs.sp;
  let result = z80.regs.hl + value;
  const lookup = ((z80.regs.hl & 2048) >> 11 | (value & 2048) >> 10 | (result & 2048) >> 9) & 255;
  z80.regs.memptr = inc16(z80.regs.hl);
  z80.regs.hl = result & 65535;
  z80.regs.f = z80.regs.f & (Flag.V | Flag.Z | Flag.S) | ((result & 65536) !== 0 ? Flag.C : 0) | result >> 8 & (Flag.X3 | Flag.X5) | halfCarryAddTable[lookup];
});
decodeMapBASE.set(58, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  value = word2(z80.readByte(z80.regs.pc), value);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = inc16(value);
  value = z80.readByte(value);
  z80.regs.a = value;
});
decodeMapBASE.set(59, (z80) => {
  let value;
  value = z80.regs.sp;
  const oldValue = value;
  z80.incTStateCount(2);
  value = dec16(value);
  z80.regs.sp = value;
});
decodeMapBASE.set(60, (z80) => {
  let value;
  value = z80.regs.a;
  const oldValue = value;
  value = inc8(value);
  z80.regs.f = z80.regs.f & Flag.C | (value === 128 ? Flag.V : 0) | ((value & 15) !== 0 ? 0 : Flag.H) | z80.sz53Table[value];
  z80.regs.a = value;
});
decodeMapBASE.set(61, (z80) => {
  let value;
  value = z80.regs.a;
  const oldValue = value;
  value = dec8(value);
  z80.regs.f = z80.regs.f & Flag.C | (value === 127 ? Flag.V : 0) | ((oldValue & 15) !== 0 ? 0 : Flag.H) | Flag.N | z80.sz53Table[value];
  z80.regs.a = value;
});
decodeMapBASE.set(62, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.a = value;
});
decodeMapBASE.set(63, (z80) => {
  z80.regs.f = z80.regs.f & (Flag.P | Flag.Z | Flag.S) | ((z80.regs.f & Flag.C) !== 0 ? Flag.H : Flag.C) | z80.regs.a & (Flag.X3 | Flag.X5);
});
decodeMapBASE.set(64, (z80) => {
  let value;
  value = z80.regs.b;
  z80.regs.b = value;
});
decodeMapBASE.set(65, (z80) => {
  let value;
  value = z80.regs.c;
  z80.regs.b = value;
});
decodeMapBASE.set(66, (z80) => {
  let value;
  value = z80.regs.d;
  z80.regs.b = value;
});
decodeMapBASE.set(67, (z80) => {
  let value;
  value = z80.regs.e;
  z80.regs.b = value;
});
decodeMapBASE.set(68, (z80) => {
  let value;
  value = z80.regs.h;
  z80.regs.b = value;
});
decodeMapBASE.set(69, (z80) => {
  let value;
  value = z80.regs.l;
  z80.regs.b = value;
});
decodeMapBASE.set(70, (z80) => {
  let value;
  value = z80.readByte(z80.regs.hl);
  z80.regs.b = value;
});
decodeMapBASE.set(71, (z80) => {
  let value;
  value = z80.regs.a;
  z80.regs.b = value;
});
decodeMapBASE.set(72, (z80) => {
  let value;
  value = z80.regs.b;
  z80.regs.c = value;
});
decodeMapBASE.set(73, (z80) => {
  let value;
  value = z80.regs.c;
  z80.regs.c = value;
});
decodeMapBASE.set(74, (z80) => {
  let value;
  value = z80.regs.d;
  z80.regs.c = value;
});
decodeMapBASE.set(75, (z80) => {
  let value;
  value = z80.regs.e;
  z80.regs.c = value;
});
decodeMapBASE.set(76, (z80) => {
  let value;
  value = z80.regs.h;
  z80.regs.c = value;
});
decodeMapBASE.set(77, (z80) => {
  let value;
  value = z80.regs.l;
  z80.regs.c = value;
});
decodeMapBASE.set(78, (z80) => {
  let value;
  value = z80.readByte(z80.regs.hl);
  z80.regs.c = value;
});
decodeMapBASE.set(79, (z80) => {
  let value;
  value = z80.regs.a;
  z80.regs.c = value;
});
decodeMapBASE.set(80, (z80) => {
  let value;
  value = z80.regs.b;
  z80.regs.d = value;
});
decodeMapBASE.set(81, (z80) => {
  let value;
  value = z80.regs.c;
  z80.regs.d = value;
});
decodeMapBASE.set(82, (z80) => {
  let value;
  value = z80.regs.d;
  z80.regs.d = value;
});
decodeMapBASE.set(83, (z80) => {
  let value;
  value = z80.regs.e;
  z80.regs.d = value;
});
decodeMapBASE.set(84, (z80) => {
  let value;
  value = z80.regs.h;
  z80.regs.d = value;
});
decodeMapBASE.set(85, (z80) => {
  let value;
  value = z80.regs.l;
  z80.regs.d = value;
});
decodeMapBASE.set(86, (z80) => {
  let value;
  value = z80.readByte(z80.regs.hl);
  z80.regs.d = value;
});
decodeMapBASE.set(87, (z80) => {
  let value;
  value = z80.regs.a;
  z80.regs.d = value;
});
decodeMapBASE.set(88, (z80) => {
  let value;
  value = z80.regs.b;
  z80.regs.e = value;
});
decodeMapBASE.set(89, (z80) => {
  let value;
  value = z80.regs.c;
  z80.regs.e = value;
});
decodeMapBASE.set(90, (z80) => {
  let value;
  value = z80.regs.d;
  z80.regs.e = value;
});
decodeMapBASE.set(91, (z80) => {
  let value;
  value = z80.regs.e;
  z80.regs.e = value;
});
decodeMapBASE.set(92, (z80) => {
  let value;
  value = z80.regs.h;
  z80.regs.e = value;
});
decodeMapBASE.set(93, (z80) => {
  let value;
  value = z80.regs.l;
  z80.regs.e = value;
});
decodeMapBASE.set(94, (z80) => {
  let value;
  value = z80.readByte(z80.regs.hl);
  z80.regs.e = value;
});
decodeMapBASE.set(95, (z80) => {
  let value;
  value = z80.regs.a;
  z80.regs.e = value;
});
decodeMapBASE.set(96, (z80) => {
  let value;
  value = z80.regs.b;
  z80.regs.h = value;
});
decodeMapBASE.set(97, (z80) => {
  let value;
  value = z80.regs.c;
  z80.regs.h = value;
});
decodeMapBASE.set(98, (z80) => {
  let value;
  value = z80.regs.d;
  z80.regs.h = value;
});
decodeMapBASE.set(99, (z80) => {
  let value;
  value = z80.regs.e;
  z80.regs.h = value;
});
decodeMapBASE.set(100, (z80) => {
  let value;
  value = z80.regs.h;
  z80.regs.h = value;
});
decodeMapBASE.set(101, (z80) => {
  let value;
  value = z80.regs.l;
  z80.regs.h = value;
});
decodeMapBASE.set(102, (z80) => {
  let value;
  value = z80.readByte(z80.regs.hl);
  z80.regs.h = value;
});
decodeMapBASE.set(103, (z80) => {
  let value;
  value = z80.regs.a;
  z80.regs.h = value;
});
decodeMapBASE.set(104, (z80) => {
  let value;
  value = z80.regs.b;
  z80.regs.l = value;
});
decodeMapBASE.set(105, (z80) => {
  let value;
  value = z80.regs.c;
  z80.regs.l = value;
});
decodeMapBASE.set(106, (z80) => {
  let value;
  value = z80.regs.d;
  z80.regs.l = value;
});
decodeMapBASE.set(107, (z80) => {
  let value;
  value = z80.regs.e;
  z80.regs.l = value;
});
decodeMapBASE.set(108, (z80) => {
  let value;
  value = z80.regs.h;
  z80.regs.l = value;
});
decodeMapBASE.set(109, (z80) => {
  let value;
  value = z80.regs.l;
  z80.regs.l = value;
});
decodeMapBASE.set(110, (z80) => {
  let value;
  value = z80.readByte(z80.regs.hl);
  z80.regs.l = value;
});
decodeMapBASE.set(111, (z80) => {
  let value;
  value = z80.regs.a;
  z80.regs.l = value;
});
decodeMapBASE.set(112, (z80) => {
  let value;
  value = z80.regs.b;
  z80.writeByte(z80.regs.hl, value);
});
decodeMapBASE.set(113, (z80) => {
  let value;
  value = z80.regs.c;
  z80.writeByte(z80.regs.hl, value);
});
decodeMapBASE.set(114, (z80) => {
  let value;
  value = z80.regs.d;
  z80.writeByte(z80.regs.hl, value);
});
decodeMapBASE.set(115, (z80) => {
  let value;
  value = z80.regs.e;
  z80.writeByte(z80.regs.hl, value);
});
decodeMapBASE.set(116, (z80) => {
  let value;
  value = z80.regs.h;
  z80.writeByte(z80.regs.hl, value);
});
decodeMapBASE.set(117, (z80) => {
  let value;
  value = z80.regs.l;
  z80.writeByte(z80.regs.hl, value);
});
decodeMapBASE.set(118, (z80) => {
  z80.regs.halted = 1;
  z80.regs.pc = dec16(z80.regs.pc);
});
decodeMapBASE.set(119, (z80) => {
  let value;
  value = z80.regs.a;
  z80.writeByte(z80.regs.hl, value);
});
decodeMapBASE.set(120, (z80) => {
  let value;
  value = z80.regs.b;
  z80.regs.a = value;
});
decodeMapBASE.set(121, (z80) => {
  let value;
  value = z80.regs.c;
  z80.regs.a = value;
});
decodeMapBASE.set(122, (z80) => {
  let value;
  value = z80.regs.d;
  z80.regs.a = value;
});
decodeMapBASE.set(123, (z80) => {
  let value;
  value = z80.regs.e;
  z80.regs.a = value;
});
decodeMapBASE.set(124, (z80) => {
  let value;
  value = z80.regs.h;
  z80.regs.a = value;
});
decodeMapBASE.set(125, (z80) => {
  let value;
  value = z80.regs.l;
  z80.regs.a = value;
});
decodeMapBASE.set(126, (z80) => {
  let value;
  value = z80.readByte(z80.regs.hl);
  z80.regs.a = value;
});
decodeMapBASE.set(127, (z80) => {
  let value;
  value = z80.regs.a;
  z80.regs.a = value;
});
decodeMapBASE.set(128, (z80) => {
  let value;
  value = z80.regs.b;
  let result = add16(z80.regs.a, value);
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | halfCarryAddTable[lookup & 7] | overflowAddTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapBASE.set(129, (z80) => {
  let value;
  value = z80.regs.c;
  let result = add16(z80.regs.a, value);
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | halfCarryAddTable[lookup & 7] | overflowAddTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapBASE.set(130, (z80) => {
  let value;
  value = z80.regs.d;
  let result = add16(z80.regs.a, value);
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | halfCarryAddTable[lookup & 7] | overflowAddTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapBASE.set(131, (z80) => {
  let value;
  value = z80.regs.e;
  let result = add16(z80.regs.a, value);
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | halfCarryAddTable[lookup & 7] | overflowAddTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapBASE.set(132, (z80) => {
  let value;
  value = z80.regs.h;
  let result = add16(z80.regs.a, value);
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | halfCarryAddTable[lookup & 7] | overflowAddTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapBASE.set(133, (z80) => {
  let value;
  value = z80.regs.l;
  let result = add16(z80.regs.a, value);
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | halfCarryAddTable[lookup & 7] | overflowAddTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapBASE.set(134, (z80) => {
  let value;
  value = z80.readByte(z80.regs.hl);
  let result = add16(z80.regs.a, value);
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | halfCarryAddTable[lookup & 7] | overflowAddTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapBASE.set(135, (z80) => {
  let value;
  value = z80.regs.a;
  let result = add16(z80.regs.a, value);
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | halfCarryAddTable[lookup & 7] | overflowAddTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapBASE.set(136, (z80) => {
  let value;
  value = z80.regs.b;
  let result = add16(z80.regs.a, value);
  if ((z80.regs.f & Flag.C) !== 0) {
    result = inc16(result);
  }
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | halfCarryAddTable[lookup & 7] | overflowAddTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapBASE.set(137, (z80) => {
  let value;
  value = z80.regs.c;
  let result = add16(z80.regs.a, value);
  if ((z80.regs.f & Flag.C) !== 0) {
    result = inc16(result);
  }
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | halfCarryAddTable[lookup & 7] | overflowAddTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapBASE.set(138, (z80) => {
  let value;
  value = z80.regs.d;
  let result = add16(z80.regs.a, value);
  if ((z80.regs.f & Flag.C) !== 0) {
    result = inc16(result);
  }
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | halfCarryAddTable[lookup & 7] | overflowAddTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapBASE.set(139, (z80) => {
  let value;
  value = z80.regs.e;
  let result = add16(z80.regs.a, value);
  if ((z80.regs.f & Flag.C) !== 0) {
    result = inc16(result);
  }
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | halfCarryAddTable[lookup & 7] | overflowAddTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapBASE.set(140, (z80) => {
  let value;
  value = z80.regs.h;
  let result = add16(z80.regs.a, value);
  if ((z80.regs.f & Flag.C) !== 0) {
    result = inc16(result);
  }
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | halfCarryAddTable[lookup & 7] | overflowAddTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapBASE.set(141, (z80) => {
  let value;
  value = z80.regs.l;
  let result = add16(z80.regs.a, value);
  if ((z80.regs.f & Flag.C) !== 0) {
    result = inc16(result);
  }
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | halfCarryAddTable[lookup & 7] | overflowAddTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapBASE.set(142, (z80) => {
  let value;
  value = z80.readByte(z80.regs.hl);
  let result = add16(z80.regs.a, value);
  if ((z80.regs.f & Flag.C) !== 0) {
    result = inc16(result);
  }
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | halfCarryAddTable[lookup & 7] | overflowAddTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapBASE.set(143, (z80) => {
  let value;
  value = z80.regs.a;
  let result = add16(z80.regs.a, value);
  if ((z80.regs.f & Flag.C) !== 0) {
    result = inc16(result);
  }
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | halfCarryAddTable[lookup & 7] | overflowAddTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapBASE.set(144, (z80) => {
  let value;
  value = z80.regs.b;
  let result = sub16(z80.regs.a, value);
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | Flag.N | halfCarrySubTable[lookup & 7] | overflowSubTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapBASE.set(145, (z80) => {
  let value;
  value = z80.regs.c;
  let result = sub16(z80.regs.a, value);
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | Flag.N | halfCarrySubTable[lookup & 7] | overflowSubTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapBASE.set(146, (z80) => {
  let value;
  value = z80.regs.d;
  let result = sub16(z80.regs.a, value);
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | Flag.N | halfCarrySubTable[lookup & 7] | overflowSubTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapBASE.set(147, (z80) => {
  let value;
  value = z80.regs.e;
  let result = sub16(z80.regs.a, value);
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | Flag.N | halfCarrySubTable[lookup & 7] | overflowSubTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapBASE.set(148, (z80) => {
  let value;
  value = z80.regs.h;
  let result = sub16(z80.regs.a, value);
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | Flag.N | halfCarrySubTable[lookup & 7] | overflowSubTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapBASE.set(149, (z80) => {
  let value;
  value = z80.regs.l;
  let result = sub16(z80.regs.a, value);
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | Flag.N | halfCarrySubTable[lookup & 7] | overflowSubTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapBASE.set(150, (z80) => {
  let value;
  value = z80.readByte(z80.regs.hl);
  let result = sub16(z80.regs.a, value);
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | Flag.N | halfCarrySubTable[lookup & 7] | overflowSubTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapBASE.set(151, (z80) => {
  let value;
  value = z80.regs.a;
  let result = sub16(z80.regs.a, value);
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | Flag.N | halfCarrySubTable[lookup & 7] | overflowSubTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapBASE.set(152, (z80) => {
  let value;
  value = z80.regs.b;
  let result = sub16(z80.regs.a, value);
  if ((z80.regs.f & Flag.C) !== 0) {
    result = dec16(result);
  }
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | Flag.N | halfCarrySubTable[lookup & 7] | overflowSubTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapBASE.set(153, (z80) => {
  let value;
  value = z80.regs.c;
  let result = sub16(z80.regs.a, value);
  if ((z80.regs.f & Flag.C) !== 0) {
    result = dec16(result);
  }
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | Flag.N | halfCarrySubTable[lookup & 7] | overflowSubTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapBASE.set(154, (z80) => {
  let value;
  value = z80.regs.d;
  let result = sub16(z80.regs.a, value);
  if ((z80.regs.f & Flag.C) !== 0) {
    result = dec16(result);
  }
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | Flag.N | halfCarrySubTable[lookup & 7] | overflowSubTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapBASE.set(155, (z80) => {
  let value;
  value = z80.regs.e;
  let result = sub16(z80.regs.a, value);
  if ((z80.regs.f & Flag.C) !== 0) {
    result = dec16(result);
  }
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | Flag.N | halfCarrySubTable[lookup & 7] | overflowSubTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapBASE.set(156, (z80) => {
  let value;
  value = z80.regs.h;
  let result = sub16(z80.regs.a, value);
  if ((z80.regs.f & Flag.C) !== 0) {
    result = dec16(result);
  }
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | Flag.N | halfCarrySubTable[lookup & 7] | overflowSubTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapBASE.set(157, (z80) => {
  let value;
  value = z80.regs.l;
  let result = sub16(z80.regs.a, value);
  if ((z80.regs.f & Flag.C) !== 0) {
    result = dec16(result);
  }
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | Flag.N | halfCarrySubTable[lookup & 7] | overflowSubTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapBASE.set(158, (z80) => {
  let value;
  value = z80.readByte(z80.regs.hl);
  let result = sub16(z80.regs.a, value);
  if ((z80.regs.f & Flag.C) !== 0) {
    result = dec16(result);
  }
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | Flag.N | halfCarrySubTable[lookup & 7] | overflowSubTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapBASE.set(159, (z80) => {
  let value;
  value = z80.regs.a;
  let result = sub16(z80.regs.a, value);
  if ((z80.regs.f & Flag.C) !== 0) {
    result = dec16(result);
  }
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | Flag.N | halfCarrySubTable[lookup & 7] | overflowSubTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapBASE.set(160, (z80) => {
  let value;
  value = z80.regs.b;
  z80.regs.a &= value;
  z80.regs.f = z80.sz53pTable[z80.regs.a];
  z80.regs.f |= Flag.H;
});
decodeMapBASE.set(161, (z80) => {
  let value;
  value = z80.regs.c;
  z80.regs.a &= value;
  z80.regs.f = z80.sz53pTable[z80.regs.a];
  z80.regs.f |= Flag.H;
});
decodeMapBASE.set(162, (z80) => {
  let value;
  value = z80.regs.d;
  z80.regs.a &= value;
  z80.regs.f = z80.sz53pTable[z80.regs.a];
  z80.regs.f |= Flag.H;
});
decodeMapBASE.set(163, (z80) => {
  let value;
  value = z80.regs.e;
  z80.regs.a &= value;
  z80.regs.f = z80.sz53pTable[z80.regs.a];
  z80.regs.f |= Flag.H;
});
decodeMapBASE.set(164, (z80) => {
  let value;
  value = z80.regs.h;
  z80.regs.a &= value;
  z80.regs.f = z80.sz53pTable[z80.regs.a];
  z80.regs.f |= Flag.H;
});
decodeMapBASE.set(165, (z80) => {
  let value;
  value = z80.regs.l;
  z80.regs.a &= value;
  z80.regs.f = z80.sz53pTable[z80.regs.a];
  z80.regs.f |= Flag.H;
});
decodeMapBASE.set(166, (z80) => {
  let value;
  value = z80.readByte(z80.regs.hl);
  z80.regs.a &= value;
  z80.regs.f = z80.sz53pTable[z80.regs.a];
  z80.regs.f |= Flag.H;
});
decodeMapBASE.set(167, (z80) => {
  let value;
  value = z80.regs.a;
  z80.regs.a &= value;
  z80.regs.f = z80.sz53pTable[z80.regs.a];
  z80.regs.f |= Flag.H;
});
decodeMapBASE.set(168, (z80) => {
  let value;
  value = z80.regs.b;
  z80.regs.a ^= value;
  z80.regs.f = z80.sz53pTable[z80.regs.a];
});
decodeMapBASE.set(169, (z80) => {
  let value;
  value = z80.regs.c;
  z80.regs.a ^= value;
  z80.regs.f = z80.sz53pTable[z80.regs.a];
});
decodeMapBASE.set(170, (z80) => {
  let value;
  value = z80.regs.d;
  z80.regs.a ^= value;
  z80.regs.f = z80.sz53pTable[z80.regs.a];
});
decodeMapBASE.set(171, (z80) => {
  let value;
  value = z80.regs.e;
  z80.regs.a ^= value;
  z80.regs.f = z80.sz53pTable[z80.regs.a];
});
decodeMapBASE.set(172, (z80) => {
  let value;
  value = z80.regs.h;
  z80.regs.a ^= value;
  z80.regs.f = z80.sz53pTable[z80.regs.a];
});
decodeMapBASE.set(173, (z80) => {
  let value;
  value = z80.regs.l;
  z80.regs.a ^= value;
  z80.regs.f = z80.sz53pTable[z80.regs.a];
});
decodeMapBASE.set(174, (z80) => {
  let value;
  value = z80.readByte(z80.regs.hl);
  z80.regs.a ^= value;
  z80.regs.f = z80.sz53pTable[z80.regs.a];
});
decodeMapBASE.set(175, (z80) => {
  let value;
  value = z80.regs.a;
  z80.regs.a ^= value;
  z80.regs.f = z80.sz53pTable[z80.regs.a];
});
decodeMapBASE.set(176, (z80) => {
  let value;
  value = z80.regs.b;
  z80.regs.a |= value;
  z80.regs.f = z80.sz53pTable[z80.regs.a];
});
decodeMapBASE.set(177, (z80) => {
  let value;
  value = z80.regs.c;
  z80.regs.a |= value;
  z80.regs.f = z80.sz53pTable[z80.regs.a];
});
decodeMapBASE.set(178, (z80) => {
  let value;
  value = z80.regs.d;
  z80.regs.a |= value;
  z80.regs.f = z80.sz53pTable[z80.regs.a];
});
decodeMapBASE.set(179, (z80) => {
  let value;
  value = z80.regs.e;
  z80.regs.a |= value;
  z80.regs.f = z80.sz53pTable[z80.regs.a];
});
decodeMapBASE.set(180, (z80) => {
  let value;
  value = z80.regs.h;
  z80.regs.a |= value;
  z80.regs.f = z80.sz53pTable[z80.regs.a];
});
decodeMapBASE.set(181, (z80) => {
  let value;
  value = z80.regs.l;
  z80.regs.a |= value;
  z80.regs.f = z80.sz53pTable[z80.regs.a];
});
decodeMapBASE.set(182, (z80) => {
  let value;
  value = z80.readByte(z80.regs.hl);
  z80.regs.a |= value;
  z80.regs.f = z80.sz53pTable[z80.regs.a];
});
decodeMapBASE.set(183, (z80) => {
  let value;
  value = z80.regs.a;
  z80.regs.a |= value;
  z80.regs.f = z80.sz53pTable[z80.regs.a];
});
decodeMapBASE.set(184, (z80) => {
  let value;
  value = z80.regs.b;
  const diff = z80.regs.a - value & 65535;
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (diff & 136) >> 1) & 255;
  let f = Flag.N;
  if ((diff & 256) != 0)
    f |= Flag.C;
  if (diff == 0)
    f |= Flag.Z;
  f |= halfCarrySubTable[lookup & 7];
  f |= overflowSubTable[lookup >> 4];
  f |= value & (Flag.X3 | Flag.X5);
  f |= diff & Flag.S;
  z80.regs.af = word2(z80.regs.a, f);
});
decodeMapBASE.set(185, (z80) => {
  let value;
  value = z80.regs.c;
  const diff = z80.regs.a - value & 65535;
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (diff & 136) >> 1) & 255;
  let f = Flag.N;
  if ((diff & 256) != 0)
    f |= Flag.C;
  if (diff == 0)
    f |= Flag.Z;
  f |= halfCarrySubTable[lookup & 7];
  f |= overflowSubTable[lookup >> 4];
  f |= value & (Flag.X3 | Flag.X5);
  f |= diff & Flag.S;
  z80.regs.af = word2(z80.regs.a, f);
});
decodeMapBASE.set(186, (z80) => {
  let value;
  value = z80.regs.d;
  const diff = z80.regs.a - value & 65535;
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (diff & 136) >> 1) & 255;
  let f = Flag.N;
  if ((diff & 256) != 0)
    f |= Flag.C;
  if (diff == 0)
    f |= Flag.Z;
  f |= halfCarrySubTable[lookup & 7];
  f |= overflowSubTable[lookup >> 4];
  f |= value & (Flag.X3 | Flag.X5);
  f |= diff & Flag.S;
  z80.regs.af = word2(z80.regs.a, f);
});
decodeMapBASE.set(187, (z80) => {
  let value;
  value = z80.regs.e;
  const diff = z80.regs.a - value & 65535;
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (diff & 136) >> 1) & 255;
  let f = Flag.N;
  if ((diff & 256) != 0)
    f |= Flag.C;
  if (diff == 0)
    f |= Flag.Z;
  f |= halfCarrySubTable[lookup & 7];
  f |= overflowSubTable[lookup >> 4];
  f |= value & (Flag.X3 | Flag.X5);
  f |= diff & Flag.S;
  z80.regs.af = word2(z80.regs.a, f);
});
decodeMapBASE.set(188, (z80) => {
  let value;
  value = z80.regs.h;
  const diff = z80.regs.a - value & 65535;
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (diff & 136) >> 1) & 255;
  let f = Flag.N;
  if ((diff & 256) != 0)
    f |= Flag.C;
  if (diff == 0)
    f |= Flag.Z;
  f |= halfCarrySubTable[lookup & 7];
  f |= overflowSubTable[lookup >> 4];
  f |= value & (Flag.X3 | Flag.X5);
  f |= diff & Flag.S;
  z80.regs.af = word2(z80.regs.a, f);
});
decodeMapBASE.set(189, (z80) => {
  let value;
  value = z80.regs.l;
  const diff = z80.regs.a - value & 65535;
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (diff & 136) >> 1) & 255;
  let f = Flag.N;
  if ((diff & 256) != 0)
    f |= Flag.C;
  if (diff == 0)
    f |= Flag.Z;
  f |= halfCarrySubTable[lookup & 7];
  f |= overflowSubTable[lookup >> 4];
  f |= value & (Flag.X3 | Flag.X5);
  f |= diff & Flag.S;
  z80.regs.af = word2(z80.regs.a, f);
});
decodeMapBASE.set(190, (z80) => {
  let value;
  value = z80.readByte(z80.regs.hl);
  const diff = z80.regs.a - value & 65535;
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (diff & 136) >> 1) & 255;
  let f = Flag.N;
  if ((diff & 256) != 0)
    f |= Flag.C;
  if (diff == 0)
    f |= Flag.Z;
  f |= halfCarrySubTable[lookup & 7];
  f |= overflowSubTable[lookup >> 4];
  f |= value & (Flag.X3 | Flag.X5);
  f |= diff & Flag.S;
  z80.regs.af = word2(z80.regs.a, f);
});
decodeMapBASE.set(191, (z80) => {
  let value;
  value = z80.regs.a;
  const diff = z80.regs.a - value & 65535;
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (diff & 136) >> 1) & 255;
  let f = Flag.N;
  if ((diff & 256) != 0)
    f |= Flag.C;
  if (diff == 0)
    f |= Flag.Z;
  f |= halfCarrySubTable[lookup & 7];
  f |= overflowSubTable[lookup >> 4];
  f |= value & (Flag.X3 | Flag.X5);
  f |= diff & Flag.S;
  z80.regs.af = word2(z80.regs.a, f);
});
decodeMapBASE.set(192, (z80) => {
  z80.incTStateCount(1);
  if ((z80.regs.f & Flag.Z) === 0) {
    z80.regs.pc = z80.popWord();
    z80.regs.memptr = z80.regs.pc;
  }
});
decodeMapBASE.set(193, (z80) => {
  z80.regs.bc = z80.popWord();
});
decodeMapBASE.set(194, (z80) => {
  z80.regs.memptr = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = word2(z80.readByte(z80.regs.pc), z80.regs.memptr);
  z80.regs.pc = inc16(z80.regs.pc);
  if ((z80.regs.f & Flag.Z) === 0) {
    z80.regs.pc = z80.regs.memptr;
  }
});
decodeMapBASE.set(195, (z80) => {
  z80.regs.memptr = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = word2(z80.readByte(z80.regs.pc), z80.regs.memptr);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.pc = z80.regs.memptr;
});
decodeMapBASE.set(196, (z80) => {
  z80.regs.memptr = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = word2(z80.readByte(z80.regs.pc), z80.regs.memptr);
  z80.regs.pc = inc16(z80.regs.pc);
  if ((z80.regs.f & Flag.Z) === 0) {
    z80.incTStateCount(1);
    z80.pushWord(z80.regs.pc);
    z80.regs.pc = z80.regs.memptr;
  }
});
decodeMapBASE.set(197, (z80) => {
  z80.incTStateCount(1);
  z80.pushWord(z80.regs.bc);
});
decodeMapBASE.set(198, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  let result = add16(z80.regs.a, value);
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | halfCarryAddTable[lookup & 7] | overflowAddTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapBASE.set(199, (z80) => {
  z80.incTStateCount(1);
  z80.pushWord(z80.regs.pc);
  z80.regs.pc = 0;
  z80.regs.memptr = z80.regs.pc;
});
decodeMapBASE.set(200, (z80) => {
  z80.incTStateCount(1);
  if ((z80.regs.f & Flag.Z) !== 0) {
    z80.regs.pc = z80.popWord();
    z80.regs.memptr = z80.regs.pc;
  }
});
decodeMapBASE.set(201, (z80) => {
  z80.regs.pc = z80.popWord();
  z80.regs.memptr = z80.regs.pc;
});
decodeMapBASE.set(202, (z80) => {
  z80.regs.memptr = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = word2(z80.readByte(z80.regs.pc), z80.regs.memptr);
  z80.regs.pc = inc16(z80.regs.pc);
  if ((z80.regs.f & Flag.Z) !== 0) {
    z80.regs.pc = z80.regs.memptr;
  }
});
decodeMapBASE.set(203, (z80) => {
  decodeCB(z80);
});
decodeMapBASE.set(204, (z80) => {
  z80.regs.memptr = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = word2(z80.readByte(z80.regs.pc), z80.regs.memptr);
  z80.regs.pc = inc16(z80.regs.pc);
  if ((z80.regs.f & Flag.Z) !== 0) {
    z80.incTStateCount(1);
    z80.pushWord(z80.regs.pc);
    z80.regs.pc = z80.regs.memptr;
  }
});
decodeMapBASE.set(205, (z80) => {
  z80.regs.memptr = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = word2(z80.readByte(z80.regs.pc), z80.regs.memptr);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.incTStateCount(1);
  z80.pushWord(z80.regs.pc);
  z80.regs.pc = z80.regs.memptr;
});
decodeMapBASE.set(206, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  let result = add16(z80.regs.a, value);
  if ((z80.regs.f & Flag.C) !== 0) {
    result = inc16(result);
  }
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | halfCarryAddTable[lookup & 7] | overflowAddTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapBASE.set(207, (z80) => {
  z80.incTStateCount(1);
  z80.pushWord(z80.regs.pc);
  z80.regs.pc = 8;
  z80.regs.memptr = z80.regs.pc;
});
decodeMapBASE.set(208, (z80) => {
  z80.incTStateCount(1);
  if ((z80.regs.f & Flag.C) === 0) {
    z80.regs.pc = z80.popWord();
    z80.regs.memptr = z80.regs.pc;
  }
});
decodeMapBASE.set(209, (z80) => {
  z80.regs.de = z80.popWord();
});
decodeMapBASE.set(210, (z80) => {
  z80.regs.memptr = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = word2(z80.readByte(z80.regs.pc), z80.regs.memptr);
  z80.regs.pc = inc16(z80.regs.pc);
  if ((z80.regs.f & Flag.C) === 0) {
    z80.regs.pc = z80.regs.memptr;
  }
});
decodeMapBASE.set(211, (z80) => {
  const port = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = word2(z80.regs.a, inc8(port));
  z80.writePort(word2(z80.regs.a, port), z80.regs.a);
});
decodeMapBASE.set(212, (z80) => {
  z80.regs.memptr = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = word2(z80.readByte(z80.regs.pc), z80.regs.memptr);
  z80.regs.pc = inc16(z80.regs.pc);
  if ((z80.regs.f & Flag.C) === 0) {
    z80.incTStateCount(1);
    z80.pushWord(z80.regs.pc);
    z80.regs.pc = z80.regs.memptr;
  }
});
decodeMapBASE.set(213, (z80) => {
  z80.incTStateCount(1);
  z80.pushWord(z80.regs.de);
});
decodeMapBASE.set(214, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  let result = sub16(z80.regs.a, value);
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | Flag.N | halfCarrySubTable[lookup & 7] | overflowSubTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapBASE.set(215, (z80) => {
  z80.incTStateCount(1);
  z80.pushWord(z80.regs.pc);
  z80.regs.pc = 16;
  z80.regs.memptr = z80.regs.pc;
});
decodeMapBASE.set(216, (z80) => {
  z80.incTStateCount(1);
  if ((z80.regs.f & Flag.C) !== 0) {
    z80.regs.pc = z80.popWord();
    z80.regs.memptr = z80.regs.pc;
  }
});
decodeMapBASE.set(217, (z80) => {
  let tmp;
  tmp = z80.regs.bc;
  z80.regs.bc = z80.regs.bcPrime;
  z80.regs.bcPrime = tmp;
  tmp = z80.regs.de;
  z80.regs.de = z80.regs.dePrime;
  z80.regs.dePrime = tmp;
  tmp = z80.regs.hl;
  z80.regs.hl = z80.regs.hlPrime;
  z80.regs.hlPrime = tmp;
});
decodeMapBASE.set(218, (z80) => {
  z80.regs.memptr = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = word2(z80.readByte(z80.regs.pc), z80.regs.memptr);
  z80.regs.pc = inc16(z80.regs.pc);
  if ((z80.regs.f & Flag.C) !== 0) {
    z80.regs.pc = z80.regs.memptr;
  }
});
decodeMapBASE.set(219, (z80) => {
  const port = word2(z80.regs.a, z80.readByte(z80.regs.pc));
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.a = z80.readPort(port);
  z80.regs.memptr = inc16(port);
});
decodeMapBASE.set(220, (z80) => {
  z80.regs.memptr = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = word2(z80.readByte(z80.regs.pc), z80.regs.memptr);
  z80.regs.pc = inc16(z80.regs.pc);
  if ((z80.regs.f & Flag.C) !== 0) {
    z80.incTStateCount(1);
    z80.pushWord(z80.regs.pc);
    z80.regs.pc = z80.regs.memptr;
  }
});
decodeMapBASE.set(221, (z80) => {
  decodeDD(z80);
});
decodeMapBASE.set(222, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  let result = sub16(z80.regs.a, value);
  if ((z80.regs.f & Flag.C) !== 0) {
    result = dec16(result);
  }
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | Flag.N | halfCarrySubTable[lookup & 7] | overflowSubTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapBASE.set(223, (z80) => {
  z80.incTStateCount(1);
  z80.pushWord(z80.regs.pc);
  z80.regs.pc = 24;
  z80.regs.memptr = z80.regs.pc;
});
decodeMapBASE.set(224, (z80) => {
  z80.incTStateCount(1);
  if ((z80.regs.f & Flag.P) === 0) {
    z80.regs.pc = z80.popWord();
    z80.regs.memptr = z80.regs.pc;
  }
});
decodeMapBASE.set(225, (z80) => {
  z80.regs.hl = z80.popWord();
});
decodeMapBASE.set(226, (z80) => {
  z80.regs.memptr = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = word2(z80.readByte(z80.regs.pc), z80.regs.memptr);
  z80.regs.pc = inc16(z80.regs.pc);
  if ((z80.regs.f & Flag.P) === 0) {
    z80.regs.pc = z80.regs.memptr;
  }
});
decodeMapBASE.set(227, (z80) => {
  const rightValue = z80.regs.hl;
  const leftValueL = z80.readByte(z80.regs.sp);
  const leftValueH = z80.readByte(inc16(z80.regs.sp));
  z80.incTStateCount(1);
  z80.writeByte(inc16(z80.regs.sp), hi(rightValue));
  z80.writeByte(z80.regs.sp, lo(rightValue));
  z80.incTStateCount(2);
  z80.regs.memptr = word2(leftValueH, leftValueL);
  z80.regs.hl = word2(leftValueH, leftValueL);
});
decodeMapBASE.set(228, (z80) => {
  z80.regs.memptr = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = word2(z80.readByte(z80.regs.pc), z80.regs.memptr);
  z80.regs.pc = inc16(z80.regs.pc);
  if ((z80.regs.f & Flag.P) === 0) {
    z80.incTStateCount(1);
    z80.pushWord(z80.regs.pc);
    z80.regs.pc = z80.regs.memptr;
  }
});
decodeMapBASE.set(229, (z80) => {
  z80.incTStateCount(1);
  z80.pushWord(z80.regs.hl);
});
decodeMapBASE.set(230, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.a &= value;
  z80.regs.f = z80.sz53pTable[z80.regs.a];
  z80.regs.f |= Flag.H;
});
decodeMapBASE.set(231, (z80) => {
  z80.incTStateCount(1);
  z80.pushWord(z80.regs.pc);
  z80.regs.pc = 32;
  z80.regs.memptr = z80.regs.pc;
});
decodeMapBASE.set(232, (z80) => {
  z80.incTStateCount(1);
  if ((z80.regs.f & Flag.P) !== 0) {
    z80.regs.pc = z80.popWord();
    z80.regs.memptr = z80.regs.pc;
  }
});
decodeMapBASE.set(233, (z80) => {
  z80.regs.pc = z80.regs.hl;
});
decodeMapBASE.set(234, (z80) => {
  z80.regs.memptr = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = word2(z80.readByte(z80.regs.pc), z80.regs.memptr);
  z80.regs.pc = inc16(z80.regs.pc);
  if ((z80.regs.f & Flag.P) !== 0) {
    z80.regs.pc = z80.regs.memptr;
  }
});
decodeMapBASE.set(235, (z80) => {
  const rightValue = z80.regs.hl;
  z80.regs.hl = z80.regs.de;
  z80.regs.de = rightValue;
});
decodeMapBASE.set(236, (z80) => {
  z80.regs.memptr = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = word2(z80.readByte(z80.regs.pc), z80.regs.memptr);
  z80.regs.pc = inc16(z80.regs.pc);
  if ((z80.regs.f & Flag.P) !== 0) {
    z80.incTStateCount(1);
    z80.pushWord(z80.regs.pc);
    z80.regs.pc = z80.regs.memptr;
  }
});
decodeMapBASE.set(237, (z80) => {
  decodeED(z80);
});
decodeMapBASE.set(238, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.a ^= value;
  z80.regs.f = z80.sz53pTable[z80.regs.a];
});
decodeMapBASE.set(239, (z80) => {
  z80.incTStateCount(1);
  z80.pushWord(z80.regs.pc);
  z80.regs.pc = 40;
  z80.regs.memptr = z80.regs.pc;
});
decodeMapBASE.set(240, (z80) => {
  z80.incTStateCount(1);
  if ((z80.regs.f & Flag.S) === 0) {
    z80.regs.pc = z80.popWord();
    z80.regs.memptr = z80.regs.pc;
  }
});
decodeMapBASE.set(241, (z80) => {
  z80.regs.af = z80.popWord();
});
decodeMapBASE.set(242, (z80) => {
  z80.regs.memptr = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = word2(z80.readByte(z80.regs.pc), z80.regs.memptr);
  z80.regs.pc = inc16(z80.regs.pc);
  if ((z80.regs.f & Flag.S) === 0) {
    z80.regs.pc = z80.regs.memptr;
  }
});
decodeMapBASE.set(243, (z80) => {
  z80.regs.iff1 = 0;
  z80.regs.iff2 = 0;
});
decodeMapBASE.set(244, (z80) => {
  z80.regs.memptr = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = word2(z80.readByte(z80.regs.pc), z80.regs.memptr);
  z80.regs.pc = inc16(z80.regs.pc);
  if ((z80.regs.f & Flag.S) === 0) {
    z80.incTStateCount(1);
    z80.pushWord(z80.regs.pc);
    z80.regs.pc = z80.regs.memptr;
  }
});
decodeMapBASE.set(245, (z80) => {
  z80.incTStateCount(1);
  z80.pushWord(z80.regs.af);
});
decodeMapBASE.set(246, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.a |= value;
  z80.regs.f = z80.sz53pTable[z80.regs.a];
});
decodeMapBASE.set(247, (z80) => {
  z80.incTStateCount(1);
  z80.pushWord(z80.regs.pc);
  z80.regs.pc = 48;
  z80.regs.memptr = z80.regs.pc;
});
decodeMapBASE.set(248, (z80) => {
  z80.incTStateCount(1);
  if ((z80.regs.f & Flag.S) !== 0) {
    z80.regs.pc = z80.popWord();
    z80.regs.memptr = z80.regs.pc;
  }
});
decodeMapBASE.set(249, (z80) => {
  let value;
  value = z80.regs.hl;
  z80.incTStateCount(2);
  z80.regs.sp = value;
});
decodeMapBASE.set(250, (z80) => {
  z80.regs.memptr = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = word2(z80.readByte(z80.regs.pc), z80.regs.memptr);
  z80.regs.pc = inc16(z80.regs.pc);
  if ((z80.regs.f & Flag.S) !== 0) {
    z80.regs.pc = z80.regs.memptr;
  }
});
decodeMapBASE.set(251, (z80) => {
  z80.regs.iff1 = 1;
  z80.regs.iff2 = 1;
});
decodeMapBASE.set(252, (z80) => {
  z80.regs.memptr = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = word2(z80.readByte(z80.regs.pc), z80.regs.memptr);
  z80.regs.pc = inc16(z80.regs.pc);
  if ((z80.regs.f & Flag.S) !== 0) {
    z80.incTStateCount(1);
    z80.pushWord(z80.regs.pc);
    z80.regs.pc = z80.regs.memptr;
  }
});
decodeMapBASE.set(253, (z80) => {
  decodeFD(z80);
});
decodeMapBASE.set(254, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  const diff = z80.regs.a - value & 65535;
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (diff & 136) >> 1) & 255;
  let f = Flag.N;
  if ((diff & 256) != 0)
    f |= Flag.C;
  if (diff == 0)
    f |= Flag.Z;
  f |= halfCarrySubTable[lookup & 7];
  f |= overflowSubTable[lookup >> 4];
  f |= value & (Flag.X3 | Flag.X5);
  f |= diff & Flag.S;
  z80.regs.af = word2(z80.regs.a, f);
});
decodeMapBASE.set(255, (z80) => {
  z80.incTStateCount(1);
  z80.pushWord(z80.regs.pc);
  z80.regs.pc = 56;
  z80.regs.memptr = z80.regs.pc;
});
var decodeMapCB = /* @__PURE__ */ new Map();
decodeMapCB.set(0, (z80) => {
  let value;
  value = z80.regs.b;
  const oldValue = value;
  value = (value << 1 | value >> 7) & 255;
  z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.b = value;
});
decodeMapCB.set(1, (z80) => {
  let value;
  value = z80.regs.c;
  const oldValue = value;
  value = (value << 1 | value >> 7) & 255;
  z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.c = value;
});
decodeMapCB.set(2, (z80) => {
  let value;
  value = z80.regs.d;
  const oldValue = value;
  value = (value << 1 | value >> 7) & 255;
  z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.d = value;
});
decodeMapCB.set(3, (z80) => {
  let value;
  value = z80.regs.e;
  const oldValue = value;
  value = (value << 1 | value >> 7) & 255;
  z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.e = value;
});
decodeMapCB.set(4, (z80) => {
  let value;
  value = z80.regs.h;
  const oldValue = value;
  value = (value << 1 | value >> 7) & 255;
  z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.h = value;
});
decodeMapCB.set(5, (z80) => {
  let value;
  value = z80.regs.l;
  const oldValue = value;
  value = (value << 1 | value >> 7) & 255;
  z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.l = value;
});
decodeMapCB.set(6, (z80) => {
  let value;
  value = z80.readByte(z80.regs.hl);
  z80.incTStateCount(1);
  const oldValue = value;
  value = (value << 1 | value >> 7) & 255;
  z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.writeByte(z80.regs.hl, value);
});
decodeMapCB.set(7, (z80) => {
  let value;
  value = z80.regs.a;
  const oldValue = value;
  value = (value << 1 | value >> 7) & 255;
  z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.a = value;
});
decodeMapCB.set(8, (z80) => {
  let value;
  value = z80.regs.b;
  const oldValue = value;
  value = (value >> 1 | value << 7) & 255;
  z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.b = value;
});
decodeMapCB.set(9, (z80) => {
  let value;
  value = z80.regs.c;
  const oldValue = value;
  value = (value >> 1 | value << 7) & 255;
  z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.c = value;
});
decodeMapCB.set(10, (z80) => {
  let value;
  value = z80.regs.d;
  const oldValue = value;
  value = (value >> 1 | value << 7) & 255;
  z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.d = value;
});
decodeMapCB.set(11, (z80) => {
  let value;
  value = z80.regs.e;
  const oldValue = value;
  value = (value >> 1 | value << 7) & 255;
  z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.e = value;
});
decodeMapCB.set(12, (z80) => {
  let value;
  value = z80.regs.h;
  const oldValue = value;
  value = (value >> 1 | value << 7) & 255;
  z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.h = value;
});
decodeMapCB.set(13, (z80) => {
  let value;
  value = z80.regs.l;
  const oldValue = value;
  value = (value >> 1 | value << 7) & 255;
  z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.l = value;
});
decodeMapCB.set(14, (z80) => {
  let value;
  value = z80.readByte(z80.regs.hl);
  z80.incTStateCount(1);
  const oldValue = value;
  value = (value >> 1 | value << 7) & 255;
  z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.writeByte(z80.regs.hl, value);
});
decodeMapCB.set(15, (z80) => {
  let value;
  value = z80.regs.a;
  const oldValue = value;
  value = (value >> 1 | value << 7) & 255;
  z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.a = value;
});
decodeMapCB.set(16, (z80) => {
  let value;
  value = z80.regs.b;
  const oldValue = value;
  value = (value << 1 | ((z80.regs.f & Flag.C) !== 0 ? 1 : 0)) & 255;
  z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.b = value;
});
decodeMapCB.set(17, (z80) => {
  let value;
  value = z80.regs.c;
  const oldValue = value;
  value = (value << 1 | ((z80.regs.f & Flag.C) !== 0 ? 1 : 0)) & 255;
  z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.c = value;
});
decodeMapCB.set(18, (z80) => {
  let value;
  value = z80.regs.d;
  const oldValue = value;
  value = (value << 1 | ((z80.regs.f & Flag.C) !== 0 ? 1 : 0)) & 255;
  z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.d = value;
});
decodeMapCB.set(19, (z80) => {
  let value;
  value = z80.regs.e;
  const oldValue = value;
  value = (value << 1 | ((z80.regs.f & Flag.C) !== 0 ? 1 : 0)) & 255;
  z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.e = value;
});
decodeMapCB.set(20, (z80) => {
  let value;
  value = z80.regs.h;
  const oldValue = value;
  value = (value << 1 | ((z80.regs.f & Flag.C) !== 0 ? 1 : 0)) & 255;
  z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.h = value;
});
decodeMapCB.set(21, (z80) => {
  let value;
  value = z80.regs.l;
  const oldValue = value;
  value = (value << 1 | ((z80.regs.f & Flag.C) !== 0 ? 1 : 0)) & 255;
  z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.l = value;
});
decodeMapCB.set(22, (z80) => {
  let value;
  value = z80.readByte(z80.regs.hl);
  z80.incTStateCount(1);
  const oldValue = value;
  value = (value << 1 | ((z80.regs.f & Flag.C) !== 0 ? 1 : 0)) & 255;
  z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.writeByte(z80.regs.hl, value);
});
decodeMapCB.set(23, (z80) => {
  let value;
  value = z80.regs.a;
  const oldValue = value;
  value = (value << 1 | ((z80.regs.f & Flag.C) !== 0 ? 1 : 0)) & 255;
  z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.a = value;
});
decodeMapCB.set(24, (z80) => {
  let value;
  value = z80.regs.b;
  const oldValue = value;
  value = value >> 1 | ((z80.regs.f & Flag.C) !== 0 ? 128 : 0);
  z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.b = value;
});
decodeMapCB.set(25, (z80) => {
  let value;
  value = z80.regs.c;
  const oldValue = value;
  value = value >> 1 | ((z80.regs.f & Flag.C) !== 0 ? 128 : 0);
  z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.c = value;
});
decodeMapCB.set(26, (z80) => {
  let value;
  value = z80.regs.d;
  const oldValue = value;
  value = value >> 1 | ((z80.regs.f & Flag.C) !== 0 ? 128 : 0);
  z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.d = value;
});
decodeMapCB.set(27, (z80) => {
  let value;
  value = z80.regs.e;
  const oldValue = value;
  value = value >> 1 | ((z80.regs.f & Flag.C) !== 0 ? 128 : 0);
  z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.e = value;
});
decodeMapCB.set(28, (z80) => {
  let value;
  value = z80.regs.h;
  const oldValue = value;
  value = value >> 1 | ((z80.regs.f & Flag.C) !== 0 ? 128 : 0);
  z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.h = value;
});
decodeMapCB.set(29, (z80) => {
  let value;
  value = z80.regs.l;
  const oldValue = value;
  value = value >> 1 | ((z80.regs.f & Flag.C) !== 0 ? 128 : 0);
  z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.l = value;
});
decodeMapCB.set(30, (z80) => {
  let value;
  value = z80.readByte(z80.regs.hl);
  z80.incTStateCount(1);
  const oldValue = value;
  value = value >> 1 | ((z80.regs.f & Flag.C) !== 0 ? 128 : 0);
  z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.writeByte(z80.regs.hl, value);
});
decodeMapCB.set(31, (z80) => {
  let value;
  value = z80.regs.a;
  const oldValue = value;
  value = value >> 1 | ((z80.regs.f & Flag.C) !== 0 ? 128 : 0);
  z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.a = value;
});
decodeMapCB.set(32, (z80) => {
  let value;
  value = z80.regs.b;
  const oldValue = value;
  value = value << 1 & 255;
  z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.b = value;
});
decodeMapCB.set(33, (z80) => {
  let value;
  value = z80.regs.c;
  const oldValue = value;
  value = value << 1 & 255;
  z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.c = value;
});
decodeMapCB.set(34, (z80) => {
  let value;
  value = z80.regs.d;
  const oldValue = value;
  value = value << 1 & 255;
  z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.d = value;
});
decodeMapCB.set(35, (z80) => {
  let value;
  value = z80.regs.e;
  const oldValue = value;
  value = value << 1 & 255;
  z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.e = value;
});
decodeMapCB.set(36, (z80) => {
  let value;
  value = z80.regs.h;
  const oldValue = value;
  value = value << 1 & 255;
  z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.h = value;
});
decodeMapCB.set(37, (z80) => {
  let value;
  value = z80.regs.l;
  const oldValue = value;
  value = value << 1 & 255;
  z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.l = value;
});
decodeMapCB.set(38, (z80) => {
  let value;
  value = z80.readByte(z80.regs.hl);
  z80.incTStateCount(1);
  const oldValue = value;
  value = value << 1 & 255;
  z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.writeByte(z80.regs.hl, value);
});
decodeMapCB.set(39, (z80) => {
  let value;
  value = z80.regs.a;
  const oldValue = value;
  value = value << 1 & 255;
  z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.a = value;
});
decodeMapCB.set(40, (z80) => {
  let value;
  value = z80.regs.b;
  const oldValue = value;
  value = value & 128 | value >> 1;
  z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.b = value;
});
decodeMapCB.set(41, (z80) => {
  let value;
  value = z80.regs.c;
  const oldValue = value;
  value = value & 128 | value >> 1;
  z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.c = value;
});
decodeMapCB.set(42, (z80) => {
  let value;
  value = z80.regs.d;
  const oldValue = value;
  value = value & 128 | value >> 1;
  z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.d = value;
});
decodeMapCB.set(43, (z80) => {
  let value;
  value = z80.regs.e;
  const oldValue = value;
  value = value & 128 | value >> 1;
  z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.e = value;
});
decodeMapCB.set(44, (z80) => {
  let value;
  value = z80.regs.h;
  const oldValue = value;
  value = value & 128 | value >> 1;
  z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.h = value;
});
decodeMapCB.set(45, (z80) => {
  let value;
  value = z80.regs.l;
  const oldValue = value;
  value = value & 128 | value >> 1;
  z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.l = value;
});
decodeMapCB.set(46, (z80) => {
  let value;
  value = z80.readByte(z80.regs.hl);
  z80.incTStateCount(1);
  const oldValue = value;
  value = value & 128 | value >> 1;
  z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.writeByte(z80.regs.hl, value);
});
decodeMapCB.set(47, (z80) => {
  let value;
  value = z80.regs.a;
  const oldValue = value;
  value = value & 128 | value >> 1;
  z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.a = value;
});
decodeMapCB.set(48, (z80) => {
  let value;
  value = z80.regs.b;
  const oldValue = value;
  value = (value << 1 | 1) & 255;
  z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.b = value;
});
decodeMapCB.set(49, (z80) => {
  let value;
  value = z80.regs.c;
  const oldValue = value;
  value = (value << 1 | 1) & 255;
  z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.c = value;
});
decodeMapCB.set(50, (z80) => {
  let value;
  value = z80.regs.d;
  const oldValue = value;
  value = (value << 1 | 1) & 255;
  z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.d = value;
});
decodeMapCB.set(51, (z80) => {
  let value;
  value = z80.regs.e;
  const oldValue = value;
  value = (value << 1 | 1) & 255;
  z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.e = value;
});
decodeMapCB.set(52, (z80) => {
  let value;
  value = z80.regs.h;
  const oldValue = value;
  value = (value << 1 | 1) & 255;
  z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.h = value;
});
decodeMapCB.set(53, (z80) => {
  let value;
  value = z80.regs.l;
  const oldValue = value;
  value = (value << 1 | 1) & 255;
  z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.l = value;
});
decodeMapCB.set(54, (z80) => {
  let value;
  value = z80.readByte(z80.regs.hl);
  z80.incTStateCount(1);
  const oldValue = value;
  value = (value << 1 | 1) & 255;
  z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.writeByte(z80.regs.hl, value);
});
decodeMapCB.set(55, (z80) => {
  let value;
  value = z80.regs.a;
  const oldValue = value;
  value = (value << 1 | 1) & 255;
  z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.a = value;
});
decodeMapCB.set(56, (z80) => {
  let value;
  value = z80.regs.b;
  const oldValue = value;
  value = value >> 1;
  z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.b = value;
});
decodeMapCB.set(57, (z80) => {
  let value;
  value = z80.regs.c;
  const oldValue = value;
  value = value >> 1;
  z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.c = value;
});
decodeMapCB.set(58, (z80) => {
  let value;
  value = z80.regs.d;
  const oldValue = value;
  value = value >> 1;
  z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.d = value;
});
decodeMapCB.set(59, (z80) => {
  let value;
  value = z80.regs.e;
  const oldValue = value;
  value = value >> 1;
  z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.e = value;
});
decodeMapCB.set(60, (z80) => {
  let value;
  value = z80.regs.h;
  const oldValue = value;
  value = value >> 1;
  z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.h = value;
});
decodeMapCB.set(61, (z80) => {
  let value;
  value = z80.regs.l;
  const oldValue = value;
  value = value >> 1;
  z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.l = value;
});
decodeMapCB.set(62, (z80) => {
  let value;
  value = z80.readByte(z80.regs.hl);
  z80.incTStateCount(1);
  const oldValue = value;
  value = value >> 1;
  z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.writeByte(z80.regs.hl, value);
});
decodeMapCB.set(63, (z80) => {
  let value;
  value = z80.regs.a;
  const oldValue = value;
  value = value >> 1;
  z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.regs.a = value;
});
decodeMapCB.set(64, (z80) => {
  const value = z80.regs.b;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 1) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(65, (z80) => {
  const value = z80.regs.c;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 1) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(66, (z80) => {
  const value = z80.regs.d;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 1) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(67, (z80) => {
  const value = z80.regs.e;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 1) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(68, (z80) => {
  const value = z80.regs.h;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 1) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(69, (z80) => {
  const value = z80.regs.l;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 1) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(70, (z80) => {
  const value = z80.readByte(z80.regs.hl);
  const hiddenValue = hi(z80.regs.memptr);
  z80.incTStateCount(1);
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 1) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(71, (z80) => {
  const value = z80.regs.a;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 1) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(72, (z80) => {
  const value = z80.regs.b;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 2) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(73, (z80) => {
  const value = z80.regs.c;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 2) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(74, (z80) => {
  const value = z80.regs.d;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 2) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(75, (z80) => {
  const value = z80.regs.e;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 2) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(76, (z80) => {
  const value = z80.regs.h;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 2) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(77, (z80) => {
  const value = z80.regs.l;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 2) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(78, (z80) => {
  const value = z80.readByte(z80.regs.hl);
  const hiddenValue = hi(z80.regs.memptr);
  z80.incTStateCount(1);
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 2) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(79, (z80) => {
  const value = z80.regs.a;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 2) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(80, (z80) => {
  const value = z80.regs.b;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 4) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(81, (z80) => {
  const value = z80.regs.c;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 4) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(82, (z80) => {
  const value = z80.regs.d;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 4) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(83, (z80) => {
  const value = z80.regs.e;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 4) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(84, (z80) => {
  const value = z80.regs.h;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 4) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(85, (z80) => {
  const value = z80.regs.l;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 4) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(86, (z80) => {
  const value = z80.readByte(z80.regs.hl);
  const hiddenValue = hi(z80.regs.memptr);
  z80.incTStateCount(1);
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 4) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(87, (z80) => {
  const value = z80.regs.a;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 4) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(88, (z80) => {
  const value = z80.regs.b;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 8) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(89, (z80) => {
  const value = z80.regs.c;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 8) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(90, (z80) => {
  const value = z80.regs.d;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 8) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(91, (z80) => {
  const value = z80.regs.e;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 8) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(92, (z80) => {
  const value = z80.regs.h;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 8) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(93, (z80) => {
  const value = z80.regs.l;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 8) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(94, (z80) => {
  const value = z80.readByte(z80.regs.hl);
  const hiddenValue = hi(z80.regs.memptr);
  z80.incTStateCount(1);
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 8) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(95, (z80) => {
  const value = z80.regs.a;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 8) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(96, (z80) => {
  const value = z80.regs.b;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 16) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(97, (z80) => {
  const value = z80.regs.c;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 16) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(98, (z80) => {
  const value = z80.regs.d;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 16) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(99, (z80) => {
  const value = z80.regs.e;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 16) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(100, (z80) => {
  const value = z80.regs.h;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 16) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(101, (z80) => {
  const value = z80.regs.l;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 16) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(102, (z80) => {
  const value = z80.readByte(z80.regs.hl);
  const hiddenValue = hi(z80.regs.memptr);
  z80.incTStateCount(1);
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 16) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(103, (z80) => {
  const value = z80.regs.a;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 16) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(104, (z80) => {
  const value = z80.regs.b;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 32) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(105, (z80) => {
  const value = z80.regs.c;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 32) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(106, (z80) => {
  const value = z80.regs.d;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 32) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(107, (z80) => {
  const value = z80.regs.e;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 32) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(108, (z80) => {
  const value = z80.regs.h;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 32) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(109, (z80) => {
  const value = z80.regs.l;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 32) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(110, (z80) => {
  const value = z80.readByte(z80.regs.hl);
  const hiddenValue = hi(z80.regs.memptr);
  z80.incTStateCount(1);
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 32) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(111, (z80) => {
  const value = z80.regs.a;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 32) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(112, (z80) => {
  const value = z80.regs.b;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 64) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(113, (z80) => {
  const value = z80.regs.c;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 64) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(114, (z80) => {
  const value = z80.regs.d;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 64) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(115, (z80) => {
  const value = z80.regs.e;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 64) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(116, (z80) => {
  const value = z80.regs.h;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 64) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(117, (z80) => {
  const value = z80.regs.l;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 64) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(118, (z80) => {
  const value = z80.readByte(z80.regs.hl);
  const hiddenValue = hi(z80.regs.memptr);
  z80.incTStateCount(1);
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 64) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(119, (z80) => {
  const value = z80.regs.a;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 64) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapCB.set(120, (z80) => {
  const value = z80.regs.b;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 128) === 0) {
    f |= Flag.P | Flag.Z;
  }
  if ((value & 128) !== 0) {
    f |= Flag.S;
  }
  z80.regs.f = f;
});
decodeMapCB.set(121, (z80) => {
  const value = z80.regs.c;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 128) === 0) {
    f |= Flag.P | Flag.Z;
  }
  if ((value & 128) !== 0) {
    f |= Flag.S;
  }
  z80.regs.f = f;
});
decodeMapCB.set(122, (z80) => {
  const value = z80.regs.d;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 128) === 0) {
    f |= Flag.P | Flag.Z;
  }
  if ((value & 128) !== 0) {
    f |= Flag.S;
  }
  z80.regs.f = f;
});
decodeMapCB.set(123, (z80) => {
  const value = z80.regs.e;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 128) === 0) {
    f |= Flag.P | Flag.Z;
  }
  if ((value & 128) !== 0) {
    f |= Flag.S;
  }
  z80.regs.f = f;
});
decodeMapCB.set(124, (z80) => {
  const value = z80.regs.h;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 128) === 0) {
    f |= Flag.P | Flag.Z;
  }
  if ((value & 128) !== 0) {
    f |= Flag.S;
  }
  z80.regs.f = f;
});
decodeMapCB.set(125, (z80) => {
  const value = z80.regs.l;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 128) === 0) {
    f |= Flag.P | Flag.Z;
  }
  if ((value & 128) !== 0) {
    f |= Flag.S;
  }
  z80.regs.f = f;
});
decodeMapCB.set(126, (z80) => {
  const value = z80.readByte(z80.regs.hl);
  const hiddenValue = hi(z80.regs.memptr);
  z80.incTStateCount(1);
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 128) === 0) {
    f |= Flag.P | Flag.Z;
  }
  if ((value & 128) !== 0) {
    f |= Flag.S;
  }
  z80.regs.f = f;
});
decodeMapCB.set(127, (z80) => {
  const value = z80.regs.a;
  const hiddenValue = value;
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 128) === 0) {
    f |= Flag.P | Flag.Z;
  }
  if ((value & 128) !== 0) {
    f |= Flag.S;
  }
  z80.regs.f = f;
});
decodeMapCB.set(128, (z80) => {
  z80.regs.b &= 254;
});
decodeMapCB.set(129, (z80) => {
  z80.regs.c &= 254;
});
decodeMapCB.set(130, (z80) => {
  z80.regs.d &= 254;
});
decodeMapCB.set(131, (z80) => {
  z80.regs.e &= 254;
});
decodeMapCB.set(132, (z80) => {
  z80.regs.h &= 254;
});
decodeMapCB.set(133, (z80) => {
  z80.regs.l &= 254;
});
decodeMapCB.set(134, (z80) => {
  const value = z80.readByte(z80.regs.hl);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.hl, value & 254);
});
decodeMapCB.set(135, (z80) => {
  z80.regs.a &= 254;
});
decodeMapCB.set(136, (z80) => {
  z80.regs.b &= 253;
});
decodeMapCB.set(137, (z80) => {
  z80.regs.c &= 253;
});
decodeMapCB.set(138, (z80) => {
  z80.regs.d &= 253;
});
decodeMapCB.set(139, (z80) => {
  z80.regs.e &= 253;
});
decodeMapCB.set(140, (z80) => {
  z80.regs.h &= 253;
});
decodeMapCB.set(141, (z80) => {
  z80.regs.l &= 253;
});
decodeMapCB.set(142, (z80) => {
  const value = z80.readByte(z80.regs.hl);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.hl, value & 253);
});
decodeMapCB.set(143, (z80) => {
  z80.regs.a &= 253;
});
decodeMapCB.set(144, (z80) => {
  z80.regs.b &= 251;
});
decodeMapCB.set(145, (z80) => {
  z80.regs.c &= 251;
});
decodeMapCB.set(146, (z80) => {
  z80.regs.d &= 251;
});
decodeMapCB.set(147, (z80) => {
  z80.regs.e &= 251;
});
decodeMapCB.set(148, (z80) => {
  z80.regs.h &= 251;
});
decodeMapCB.set(149, (z80) => {
  z80.regs.l &= 251;
});
decodeMapCB.set(150, (z80) => {
  const value = z80.readByte(z80.regs.hl);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.hl, value & 251);
});
decodeMapCB.set(151, (z80) => {
  z80.regs.a &= 251;
});
decodeMapCB.set(152, (z80) => {
  z80.regs.b &= 247;
});
decodeMapCB.set(153, (z80) => {
  z80.regs.c &= 247;
});
decodeMapCB.set(154, (z80) => {
  z80.regs.d &= 247;
});
decodeMapCB.set(155, (z80) => {
  z80.regs.e &= 247;
});
decodeMapCB.set(156, (z80) => {
  z80.regs.h &= 247;
});
decodeMapCB.set(157, (z80) => {
  z80.regs.l &= 247;
});
decodeMapCB.set(158, (z80) => {
  const value = z80.readByte(z80.regs.hl);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.hl, value & 247);
});
decodeMapCB.set(159, (z80) => {
  z80.regs.a &= 247;
});
decodeMapCB.set(160, (z80) => {
  z80.regs.b &= 239;
});
decodeMapCB.set(161, (z80) => {
  z80.regs.c &= 239;
});
decodeMapCB.set(162, (z80) => {
  z80.regs.d &= 239;
});
decodeMapCB.set(163, (z80) => {
  z80.regs.e &= 239;
});
decodeMapCB.set(164, (z80) => {
  z80.regs.h &= 239;
});
decodeMapCB.set(165, (z80) => {
  z80.regs.l &= 239;
});
decodeMapCB.set(166, (z80) => {
  const value = z80.readByte(z80.regs.hl);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.hl, value & 239);
});
decodeMapCB.set(167, (z80) => {
  z80.regs.a &= 239;
});
decodeMapCB.set(168, (z80) => {
  z80.regs.b &= 223;
});
decodeMapCB.set(169, (z80) => {
  z80.regs.c &= 223;
});
decodeMapCB.set(170, (z80) => {
  z80.regs.d &= 223;
});
decodeMapCB.set(171, (z80) => {
  z80.regs.e &= 223;
});
decodeMapCB.set(172, (z80) => {
  z80.regs.h &= 223;
});
decodeMapCB.set(173, (z80) => {
  z80.regs.l &= 223;
});
decodeMapCB.set(174, (z80) => {
  const value = z80.readByte(z80.regs.hl);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.hl, value & 223);
});
decodeMapCB.set(175, (z80) => {
  z80.regs.a &= 223;
});
decodeMapCB.set(176, (z80) => {
  z80.regs.b &= 191;
});
decodeMapCB.set(177, (z80) => {
  z80.regs.c &= 191;
});
decodeMapCB.set(178, (z80) => {
  z80.regs.d &= 191;
});
decodeMapCB.set(179, (z80) => {
  z80.regs.e &= 191;
});
decodeMapCB.set(180, (z80) => {
  z80.regs.h &= 191;
});
decodeMapCB.set(181, (z80) => {
  z80.regs.l &= 191;
});
decodeMapCB.set(182, (z80) => {
  const value = z80.readByte(z80.regs.hl);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.hl, value & 191);
});
decodeMapCB.set(183, (z80) => {
  z80.regs.a &= 191;
});
decodeMapCB.set(184, (z80) => {
  z80.regs.b &= 127;
});
decodeMapCB.set(185, (z80) => {
  z80.regs.c &= 127;
});
decodeMapCB.set(186, (z80) => {
  z80.regs.d &= 127;
});
decodeMapCB.set(187, (z80) => {
  z80.regs.e &= 127;
});
decodeMapCB.set(188, (z80) => {
  z80.regs.h &= 127;
});
decodeMapCB.set(189, (z80) => {
  z80.regs.l &= 127;
});
decodeMapCB.set(190, (z80) => {
  const value = z80.readByte(z80.regs.hl);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.hl, value & 127);
});
decodeMapCB.set(191, (z80) => {
  z80.regs.a &= 127;
});
decodeMapCB.set(192, (z80) => {
  z80.regs.b |= 1;
});
decodeMapCB.set(193, (z80) => {
  z80.regs.c |= 1;
});
decodeMapCB.set(194, (z80) => {
  z80.regs.d |= 1;
});
decodeMapCB.set(195, (z80) => {
  z80.regs.e |= 1;
});
decodeMapCB.set(196, (z80) => {
  z80.regs.h |= 1;
});
decodeMapCB.set(197, (z80) => {
  z80.regs.l |= 1;
});
decodeMapCB.set(198, (z80) => {
  const value = z80.readByte(z80.regs.hl);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.hl, value | 1);
});
decodeMapCB.set(199, (z80) => {
  z80.regs.a |= 1;
});
decodeMapCB.set(200, (z80) => {
  z80.regs.b |= 2;
});
decodeMapCB.set(201, (z80) => {
  z80.regs.c |= 2;
});
decodeMapCB.set(202, (z80) => {
  z80.regs.d |= 2;
});
decodeMapCB.set(203, (z80) => {
  z80.regs.e |= 2;
});
decodeMapCB.set(204, (z80) => {
  z80.regs.h |= 2;
});
decodeMapCB.set(205, (z80) => {
  z80.regs.l |= 2;
});
decodeMapCB.set(206, (z80) => {
  const value = z80.readByte(z80.regs.hl);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.hl, value | 2);
});
decodeMapCB.set(207, (z80) => {
  z80.regs.a |= 2;
});
decodeMapCB.set(208, (z80) => {
  z80.regs.b |= 4;
});
decodeMapCB.set(209, (z80) => {
  z80.regs.c |= 4;
});
decodeMapCB.set(210, (z80) => {
  z80.regs.d |= 4;
});
decodeMapCB.set(211, (z80) => {
  z80.regs.e |= 4;
});
decodeMapCB.set(212, (z80) => {
  z80.regs.h |= 4;
});
decodeMapCB.set(213, (z80) => {
  z80.regs.l |= 4;
});
decodeMapCB.set(214, (z80) => {
  const value = z80.readByte(z80.regs.hl);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.hl, value | 4);
});
decodeMapCB.set(215, (z80) => {
  z80.regs.a |= 4;
});
decodeMapCB.set(216, (z80) => {
  z80.regs.b |= 8;
});
decodeMapCB.set(217, (z80) => {
  z80.regs.c |= 8;
});
decodeMapCB.set(218, (z80) => {
  z80.regs.d |= 8;
});
decodeMapCB.set(219, (z80) => {
  z80.regs.e |= 8;
});
decodeMapCB.set(220, (z80) => {
  z80.regs.h |= 8;
});
decodeMapCB.set(221, (z80) => {
  z80.regs.l |= 8;
});
decodeMapCB.set(222, (z80) => {
  const value = z80.readByte(z80.regs.hl);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.hl, value | 8);
});
decodeMapCB.set(223, (z80) => {
  z80.regs.a |= 8;
});
decodeMapCB.set(224, (z80) => {
  z80.regs.b |= 16;
});
decodeMapCB.set(225, (z80) => {
  z80.regs.c |= 16;
});
decodeMapCB.set(226, (z80) => {
  z80.regs.d |= 16;
});
decodeMapCB.set(227, (z80) => {
  z80.regs.e |= 16;
});
decodeMapCB.set(228, (z80) => {
  z80.regs.h |= 16;
});
decodeMapCB.set(229, (z80) => {
  z80.regs.l |= 16;
});
decodeMapCB.set(230, (z80) => {
  const value = z80.readByte(z80.regs.hl);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.hl, value | 16);
});
decodeMapCB.set(231, (z80) => {
  z80.regs.a |= 16;
});
decodeMapCB.set(232, (z80) => {
  z80.regs.b |= 32;
});
decodeMapCB.set(233, (z80) => {
  z80.regs.c |= 32;
});
decodeMapCB.set(234, (z80) => {
  z80.regs.d |= 32;
});
decodeMapCB.set(235, (z80) => {
  z80.regs.e |= 32;
});
decodeMapCB.set(236, (z80) => {
  z80.regs.h |= 32;
});
decodeMapCB.set(237, (z80) => {
  z80.regs.l |= 32;
});
decodeMapCB.set(238, (z80) => {
  const value = z80.readByte(z80.regs.hl);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.hl, value | 32);
});
decodeMapCB.set(239, (z80) => {
  z80.regs.a |= 32;
});
decodeMapCB.set(240, (z80) => {
  z80.regs.b |= 64;
});
decodeMapCB.set(241, (z80) => {
  z80.regs.c |= 64;
});
decodeMapCB.set(242, (z80) => {
  z80.regs.d |= 64;
});
decodeMapCB.set(243, (z80) => {
  z80.regs.e |= 64;
});
decodeMapCB.set(244, (z80) => {
  z80.regs.h |= 64;
});
decodeMapCB.set(245, (z80) => {
  z80.regs.l |= 64;
});
decodeMapCB.set(246, (z80) => {
  const value = z80.readByte(z80.regs.hl);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.hl, value | 64);
});
decodeMapCB.set(247, (z80) => {
  z80.regs.a |= 64;
});
decodeMapCB.set(248, (z80) => {
  z80.regs.b |= 128;
});
decodeMapCB.set(249, (z80) => {
  z80.regs.c |= 128;
});
decodeMapCB.set(250, (z80) => {
  z80.regs.d |= 128;
});
decodeMapCB.set(251, (z80) => {
  z80.regs.e |= 128;
});
decodeMapCB.set(252, (z80) => {
  z80.regs.h |= 128;
});
decodeMapCB.set(253, (z80) => {
  z80.regs.l |= 128;
});
decodeMapCB.set(254, (z80) => {
  const value = z80.readByte(z80.regs.hl);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.hl, value | 128);
});
decodeMapCB.set(255, (z80) => {
  z80.regs.a |= 128;
});
var decodeMapDD = /* @__PURE__ */ new Map();
decodeMapDD.set(9, (z80) => {
  let value;
  z80.incTStateCount(7);
  value = z80.regs.bc;
  let result = z80.regs.ix + value;
  const lookup = ((z80.regs.ix & 2048) >> 11 | (value & 2048) >> 10 | (result & 2048) >> 9) & 255;
  z80.regs.memptr = inc16(z80.regs.ix);
  z80.regs.ix = result & 65535;
  z80.regs.f = z80.regs.f & (Flag.V | Flag.Z | Flag.S) | ((result & 65536) !== 0 ? Flag.C : 0) | result >> 8 & (Flag.X3 | Flag.X5) | halfCarryAddTable[lookup];
});
decodeMapDD.set(25, (z80) => {
  let value;
  z80.incTStateCount(7);
  value = z80.regs.de;
  let result = z80.regs.ix + value;
  const lookup = ((z80.regs.ix & 2048) >> 11 | (value & 2048) >> 10 | (result & 2048) >> 9) & 255;
  z80.regs.memptr = inc16(z80.regs.ix);
  z80.regs.ix = result & 65535;
  z80.regs.f = z80.regs.f & (Flag.V | Flag.Z | Flag.S) | ((result & 65536) !== 0 ? Flag.C : 0) | result >> 8 & (Flag.X3 | Flag.X5) | halfCarryAddTable[lookup];
});
decodeMapDD.set(33, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  value = word2(z80.readByte(z80.regs.pc), value);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.ix = value;
});
decodeMapDD.set(34, (z80) => {
  let value;
  value = z80.regs.ix;
  let addr = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  addr = word2(z80.readByte(z80.regs.pc), addr);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.writeByte(addr, lo(value));
  addr = inc16(addr);
  z80.regs.memptr = addr;
  z80.writeByte(addr, hi(value));
});
decodeMapDD.set(35, (z80) => {
  let value;
  value = z80.regs.ix;
  const oldValue = value;
  z80.incTStateCount(2);
  value = inc16(value);
  z80.regs.ix = value;
});
decodeMapDD.set(36, (z80) => {
  let value;
  value = z80.regs.ixh;
  const oldValue = value;
  value = inc8(value);
  z80.regs.f = z80.regs.f & Flag.C | (value === 128 ? Flag.V : 0) | ((value & 15) !== 0 ? 0 : Flag.H) | z80.sz53Table[value];
  z80.regs.ixh = value;
});
decodeMapDD.set(37, (z80) => {
  let value;
  value = z80.regs.ixh;
  const oldValue = value;
  value = dec8(value);
  z80.regs.f = z80.regs.f & Flag.C | (value === 127 ? Flag.V : 0) | ((oldValue & 15) !== 0 ? 0 : Flag.H) | Flag.N | z80.sz53Table[value];
  z80.regs.ixh = value;
});
decodeMapDD.set(38, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.ixh = value;
});
decodeMapDD.set(41, (z80) => {
  let value;
  z80.incTStateCount(7);
  value = z80.regs.ix;
  let result = z80.regs.ix + value;
  const lookup = ((z80.regs.ix & 2048) >> 11 | (value & 2048) >> 10 | (result & 2048) >> 9) & 255;
  z80.regs.memptr = inc16(z80.regs.ix);
  z80.regs.ix = result & 65535;
  z80.regs.f = z80.regs.f & (Flag.V | Flag.Z | Flag.S) | ((result & 65536) !== 0 ? Flag.C : 0) | result >> 8 & (Flag.X3 | Flag.X5) | halfCarryAddTable[lookup];
});
decodeMapDD.set(42, (z80) => {
  let value;
  let addr = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  addr = word2(z80.readByte(z80.regs.pc), addr);
  z80.regs.pc = inc16(z80.regs.pc);
  value = z80.readByte(addr);
  z80.regs.memptr = inc16(addr);
  value = word2(z80.readByte(z80.regs.memptr), value);
  z80.regs.ix = value;
});
decodeMapDD.set(43, (z80) => {
  let value;
  value = z80.regs.ix;
  const oldValue = value;
  z80.incTStateCount(2);
  value = dec16(value);
  z80.regs.ix = value;
});
decodeMapDD.set(44, (z80) => {
  let value;
  value = z80.regs.ixl;
  const oldValue = value;
  value = inc8(value);
  z80.regs.f = z80.regs.f & Flag.C | (value === 128 ? Flag.V : 0) | ((value & 15) !== 0 ? 0 : Flag.H) | z80.sz53Table[value];
  z80.regs.ixl = value;
});
decodeMapDD.set(45, (z80) => {
  let value;
  value = z80.regs.ixl;
  const oldValue = value;
  value = dec8(value);
  z80.regs.f = z80.regs.f & Flag.C | (value === 127 ? Flag.V : 0) | ((oldValue & 15) !== 0 ? 0 : Flag.H) | Flag.N | z80.sz53Table[value];
  z80.regs.ixl = value;
});
decodeMapDD.set(46, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.ixl = value;
});
decodeMapDD.set(52, (z80) => {
  let value;
  const offset = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = add16(z80.regs.ix, signedByte(offset));
  value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  const oldValue = value;
  value = inc8(value);
  z80.regs.f = z80.regs.f & Flag.C | (value === 128 ? Flag.V : 0) | ((value & 15) !== 0 ? 0 : Flag.H) | z80.sz53Table[value];
  z80.writeByte(z80.regs.memptr, value);
});
decodeMapDD.set(53, (z80) => {
  let value;
  const offset = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = add16(z80.regs.ix, signedByte(offset));
  value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  const oldValue = value;
  value = dec8(value);
  z80.regs.f = z80.regs.f & Flag.C | (value === 127 ? Flag.V : 0) | ((oldValue & 15) !== 0 ? 0 : Flag.H) | Flag.N | z80.sz53Table[value];
  z80.writeByte(z80.regs.memptr, value);
});
decodeMapDD.set(54, (z80) => {
  const dd = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.incTStateCount(2);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = z80.regs.ix + signedByte(dd) & 65535;
  z80.writeByte(z80.regs.memptr, value);
});
decodeMapDD.set(57, (z80) => {
  let value;
  z80.incTStateCount(7);
  value = z80.regs.sp;
  let result = z80.regs.ix + value;
  const lookup = ((z80.regs.ix & 2048) >> 11 | (value & 2048) >> 10 | (result & 2048) >> 9) & 255;
  z80.regs.memptr = inc16(z80.regs.ix);
  z80.regs.ix = result & 65535;
  z80.regs.f = z80.regs.f & (Flag.V | Flag.Z | Flag.S) | ((result & 65536) !== 0 ? Flag.C : 0) | result >> 8 & (Flag.X3 | Flag.X5) | halfCarryAddTable[lookup];
});
decodeMapDD.set(68, (z80) => {
  let value;
  value = z80.regs.ixh;
  z80.regs.b = value;
});
decodeMapDD.set(69, (z80) => {
  let value;
  value = z80.regs.ixl;
  z80.regs.b = value;
});
decodeMapDD.set(70, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = z80.regs.ix + signedByte(value) & 65535;
  value = z80.readByte(z80.regs.memptr);
  z80.regs.b = value;
});
decodeMapDD.set(76, (z80) => {
  let value;
  value = z80.regs.ixh;
  z80.regs.c = value;
});
decodeMapDD.set(77, (z80) => {
  let value;
  value = z80.regs.ixl;
  z80.regs.c = value;
});
decodeMapDD.set(78, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = z80.regs.ix + signedByte(value) & 65535;
  value = z80.readByte(z80.regs.memptr);
  z80.regs.c = value;
});
decodeMapDD.set(84, (z80) => {
  let value;
  value = z80.regs.ixh;
  z80.regs.d = value;
});
decodeMapDD.set(85, (z80) => {
  let value;
  value = z80.regs.ixl;
  z80.regs.d = value;
});
decodeMapDD.set(86, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = z80.regs.ix + signedByte(value) & 65535;
  value = z80.readByte(z80.regs.memptr);
  z80.regs.d = value;
});
decodeMapDD.set(92, (z80) => {
  let value;
  value = z80.regs.ixh;
  z80.regs.e = value;
});
decodeMapDD.set(93, (z80) => {
  let value;
  value = z80.regs.ixl;
  z80.regs.e = value;
});
decodeMapDD.set(94, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = z80.regs.ix + signedByte(value) & 65535;
  value = z80.readByte(z80.regs.memptr);
  z80.regs.e = value;
});
decodeMapDD.set(96, (z80) => {
  let value;
  value = z80.regs.b;
  z80.regs.ixh = value;
});
decodeMapDD.set(97, (z80) => {
  let value;
  value = z80.regs.c;
  z80.regs.ixh = value;
});
decodeMapDD.set(98, (z80) => {
  let value;
  value = z80.regs.d;
  z80.regs.ixh = value;
});
decodeMapDD.set(99, (z80) => {
  let value;
  value = z80.regs.e;
  z80.regs.ixh = value;
});
decodeMapDD.set(100, (z80) => {
  let value;
  value = z80.regs.ixh;
  z80.regs.ixh = value;
});
decodeMapDD.set(101, (z80) => {
  let value;
  value = z80.regs.ixl;
  z80.regs.ixh = value;
});
decodeMapDD.set(102, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = z80.regs.ix + signedByte(value) & 65535;
  value = z80.readByte(z80.regs.memptr);
  z80.regs.h = value;
});
decodeMapDD.set(103, (z80) => {
  let value;
  value = z80.regs.a;
  z80.regs.ixh = value;
});
decodeMapDD.set(104, (z80) => {
  let value;
  value = z80.regs.b;
  z80.regs.ixl = value;
});
decodeMapDD.set(105, (z80) => {
  let value;
  value = z80.regs.c;
  z80.regs.ixl = value;
});
decodeMapDD.set(106, (z80) => {
  let value;
  value = z80.regs.d;
  z80.regs.ixl = value;
});
decodeMapDD.set(107, (z80) => {
  let value;
  value = z80.regs.e;
  z80.regs.ixl = value;
});
decodeMapDD.set(108, (z80) => {
  let value;
  value = z80.regs.ixh;
  z80.regs.ixl = value;
});
decodeMapDD.set(109, (z80) => {
  let value;
  value = z80.regs.ixl;
  z80.regs.ixl = value;
});
decodeMapDD.set(110, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = z80.regs.ix + signedByte(value) & 65535;
  value = z80.readByte(z80.regs.memptr);
  z80.regs.l = value;
});
decodeMapDD.set(111, (z80) => {
  let value;
  value = z80.regs.a;
  z80.regs.ixl = value;
});
decodeMapDD.set(112, (z80) => {
  const dd = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  let value;
  value = z80.regs.b;
  z80.regs.memptr = z80.regs.ix + signedByte(dd) & 65535;
  z80.writeByte(z80.regs.memptr, value);
});
decodeMapDD.set(113, (z80) => {
  const dd = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  let value;
  value = z80.regs.c;
  z80.regs.memptr = z80.regs.ix + signedByte(dd) & 65535;
  z80.writeByte(z80.regs.memptr, value);
});
decodeMapDD.set(114, (z80) => {
  const dd = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  let value;
  value = z80.regs.d;
  z80.regs.memptr = z80.regs.ix + signedByte(dd) & 65535;
  z80.writeByte(z80.regs.memptr, value);
});
decodeMapDD.set(115, (z80) => {
  const dd = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  let value;
  value = z80.regs.e;
  z80.regs.memptr = z80.regs.ix + signedByte(dd) & 65535;
  z80.writeByte(z80.regs.memptr, value);
});
decodeMapDD.set(116, (z80) => {
  const dd = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  let value;
  value = z80.regs.h;
  z80.regs.memptr = z80.regs.ix + signedByte(dd) & 65535;
  z80.writeByte(z80.regs.memptr, value);
});
decodeMapDD.set(117, (z80) => {
  const dd = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  let value;
  value = z80.regs.l;
  z80.regs.memptr = z80.regs.ix + signedByte(dd) & 65535;
  z80.writeByte(z80.regs.memptr, value);
});
decodeMapDD.set(119, (z80) => {
  const dd = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  let value;
  value = z80.regs.a;
  z80.regs.memptr = z80.regs.ix + signedByte(dd) & 65535;
  z80.writeByte(z80.regs.memptr, value);
});
decodeMapDD.set(124, (z80) => {
  let value;
  value = z80.regs.ixh;
  z80.regs.a = value;
});
decodeMapDD.set(125, (z80) => {
  let value;
  value = z80.regs.ixl;
  z80.regs.a = value;
});
decodeMapDD.set(126, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = z80.regs.ix + signedByte(value) & 65535;
  value = z80.readByte(z80.regs.memptr);
  z80.regs.a = value;
});
decodeMapDD.set(132, (z80) => {
  let value;
  value = z80.regs.ixh;
  let result = add16(z80.regs.a, value);
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | halfCarryAddTable[lookup & 7] | overflowAddTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapDD.set(133, (z80) => {
  let value;
  value = z80.regs.ixl;
  let result = add16(z80.regs.a, value);
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | halfCarryAddTable[lookup & 7] | overflowAddTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapDD.set(134, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = z80.regs.ix + signedByte(value) & 65535;
  value = z80.readByte(z80.regs.memptr);
  let result = add16(z80.regs.a, value);
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | halfCarryAddTable[lookup & 7] | overflowAddTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapDD.set(140, (z80) => {
  let value;
  value = z80.regs.ixh;
  let result = add16(z80.regs.a, value);
  if ((z80.regs.f & Flag.C) !== 0) {
    result = inc16(result);
  }
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | halfCarryAddTable[lookup & 7] | overflowAddTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapDD.set(141, (z80) => {
  let value;
  value = z80.regs.ixl;
  let result = add16(z80.regs.a, value);
  if ((z80.regs.f & Flag.C) !== 0) {
    result = inc16(result);
  }
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | halfCarryAddTable[lookup & 7] | overflowAddTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapDD.set(142, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = z80.regs.ix + signedByte(value) & 65535;
  value = z80.readByte(z80.regs.memptr);
  let result = add16(z80.regs.a, value);
  if ((z80.regs.f & Flag.C) !== 0) {
    result = inc16(result);
  }
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | halfCarryAddTable[lookup & 7] | overflowAddTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapDD.set(148, (z80) => {
  let value;
  value = z80.regs.ixh;
  let result = sub16(z80.regs.a, value);
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | Flag.N | halfCarrySubTable[lookup & 7] | overflowSubTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapDD.set(149, (z80) => {
  let value;
  value = z80.regs.ixl;
  let result = sub16(z80.regs.a, value);
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | Flag.N | halfCarrySubTable[lookup & 7] | overflowSubTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapDD.set(150, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = z80.regs.ix + signedByte(value) & 65535;
  value = z80.readByte(z80.regs.memptr);
  let result = sub16(z80.regs.a, value);
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | Flag.N | halfCarrySubTable[lookup & 7] | overflowSubTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapDD.set(156, (z80) => {
  let value;
  value = z80.regs.ixh;
  let result = sub16(z80.regs.a, value);
  if ((z80.regs.f & Flag.C) !== 0) {
    result = dec16(result);
  }
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | Flag.N | halfCarrySubTable[lookup & 7] | overflowSubTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapDD.set(157, (z80) => {
  let value;
  value = z80.regs.ixl;
  let result = sub16(z80.regs.a, value);
  if ((z80.regs.f & Flag.C) !== 0) {
    result = dec16(result);
  }
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | Flag.N | halfCarrySubTable[lookup & 7] | overflowSubTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapDD.set(158, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = z80.regs.ix + signedByte(value) & 65535;
  value = z80.readByte(z80.regs.memptr);
  let result = sub16(z80.regs.a, value);
  if ((z80.regs.f & Flag.C) !== 0) {
    result = dec16(result);
  }
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | Flag.N | halfCarrySubTable[lookup & 7] | overflowSubTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapDD.set(164, (z80) => {
  let value;
  value = z80.regs.ixh;
  z80.regs.a &= value;
  z80.regs.f = z80.sz53pTable[z80.regs.a];
  z80.regs.f |= Flag.H;
});
decodeMapDD.set(165, (z80) => {
  let value;
  value = z80.regs.ixl;
  z80.regs.a &= value;
  z80.regs.f = z80.sz53pTable[z80.regs.a];
  z80.regs.f |= Flag.H;
});
decodeMapDD.set(166, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = z80.regs.ix + signedByte(value) & 65535;
  value = z80.readByte(z80.regs.memptr);
  z80.regs.a &= value;
  z80.regs.f = z80.sz53pTable[z80.regs.a];
  z80.regs.f |= Flag.H;
});
decodeMapDD.set(172, (z80) => {
  let value;
  value = z80.regs.ixh;
  z80.regs.a ^= value;
  z80.regs.f = z80.sz53pTable[z80.regs.a];
});
decodeMapDD.set(173, (z80) => {
  let value;
  value = z80.regs.ixl;
  z80.regs.a ^= value;
  z80.regs.f = z80.sz53pTable[z80.regs.a];
});
decodeMapDD.set(174, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = z80.regs.ix + signedByte(value) & 65535;
  value = z80.readByte(z80.regs.memptr);
  z80.regs.a ^= value;
  z80.regs.f = z80.sz53pTable[z80.regs.a];
});
decodeMapDD.set(180, (z80) => {
  let value;
  value = z80.regs.ixh;
  z80.regs.a |= value;
  z80.regs.f = z80.sz53pTable[z80.regs.a];
});
decodeMapDD.set(181, (z80) => {
  let value;
  value = z80.regs.ixl;
  z80.regs.a |= value;
  z80.regs.f = z80.sz53pTable[z80.regs.a];
});
decodeMapDD.set(182, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = z80.regs.ix + signedByte(value) & 65535;
  value = z80.readByte(z80.regs.memptr);
  z80.regs.a |= value;
  z80.regs.f = z80.sz53pTable[z80.regs.a];
});
decodeMapDD.set(188, (z80) => {
  let value;
  value = z80.regs.ixh;
  const diff = z80.regs.a - value & 65535;
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (diff & 136) >> 1) & 255;
  let f = Flag.N;
  if ((diff & 256) != 0)
    f |= Flag.C;
  if (diff == 0)
    f |= Flag.Z;
  f |= halfCarrySubTable[lookup & 7];
  f |= overflowSubTable[lookup >> 4];
  f |= value & (Flag.X3 | Flag.X5);
  f |= diff & Flag.S;
  z80.regs.af = word2(z80.regs.a, f);
});
decodeMapDD.set(189, (z80) => {
  let value;
  value = z80.regs.ixl;
  const diff = z80.regs.a - value & 65535;
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (diff & 136) >> 1) & 255;
  let f = Flag.N;
  if ((diff & 256) != 0)
    f |= Flag.C;
  if (diff == 0)
    f |= Flag.Z;
  f |= halfCarrySubTable[lookup & 7];
  f |= overflowSubTable[lookup >> 4];
  f |= value & (Flag.X3 | Flag.X5);
  f |= diff & Flag.S;
  z80.regs.af = word2(z80.regs.a, f);
});
decodeMapDD.set(190, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = z80.regs.ix + signedByte(value) & 65535;
  value = z80.readByte(z80.regs.memptr);
  const diff = z80.regs.a - value & 65535;
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (diff & 136) >> 1) & 255;
  let f = Flag.N;
  if ((diff & 256) != 0)
    f |= Flag.C;
  if (diff == 0)
    f |= Flag.Z;
  f |= halfCarrySubTable[lookup & 7];
  f |= overflowSubTable[lookup >> 4];
  f |= value & (Flag.X3 | Flag.X5);
  f |= diff & Flag.S;
  z80.regs.af = word2(z80.regs.a, f);
});
decodeMapDD.set(203, (z80) => {
  decodeDDCB(z80);
});
decodeMapDD.set(225, (z80) => {
  z80.regs.ix = z80.popWord();
});
decodeMapDD.set(227, (z80) => {
  const rightValue = z80.regs.ix;
  const leftValueL = z80.readByte(z80.regs.sp);
  const leftValueH = z80.readByte(inc16(z80.regs.sp));
  z80.incTStateCount(1);
  z80.writeByte(inc16(z80.regs.sp), hi(rightValue));
  z80.writeByte(z80.regs.sp, lo(rightValue));
  z80.incTStateCount(2);
  z80.regs.memptr = word2(leftValueH, leftValueL);
  z80.regs.ix = word2(leftValueH, leftValueL);
});
decodeMapDD.set(229, (z80) => {
  z80.incTStateCount(1);
  z80.pushWord(z80.regs.ix);
});
decodeMapDD.set(233, (z80) => {
  z80.regs.pc = z80.regs.ix;
});
decodeMapDD.set(249, (z80) => {
  let value;
  value = z80.regs.ix;
  z80.incTStateCount(2);
  z80.regs.sp = value;
});
var decodeMapDDCB = /* @__PURE__ */ new Map();
decodeMapDDCB.set(0, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.b;
    const oldValue = value;
    value = (value << 1 | value >> 7) & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.b = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapDDCB.set(1, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.c;
    const oldValue = value;
    value = (value << 1 | value >> 7) & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.c = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapDDCB.set(2, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.d;
    const oldValue = value;
    value = (value << 1 | value >> 7) & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.d = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapDDCB.set(3, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.e;
    const oldValue = value;
    value = (value << 1 | value >> 7) & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.e = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapDDCB.set(4, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.h;
    const oldValue = value;
    value = (value << 1 | value >> 7) & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.h = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapDDCB.set(5, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.l;
    const oldValue = value;
    value = (value << 1 | value >> 7) & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.l = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapDDCB.set(6, (z80) => {
  let value;
  value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  const oldValue = value;
  value = (value << 1 | value >> 7) & 255;
  z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.writeByte(z80.regs.memptr, value);
});
decodeMapDDCB.set(7, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.a;
    const oldValue = value;
    value = (value << 1 | value >> 7) & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.a = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
decodeMapDDCB.set(8, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.b;
    const oldValue = value;
    value = (value >> 1 | value << 7) & 255;
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.b = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapDDCB.set(9, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.c;
    const oldValue = value;
    value = (value >> 1 | value << 7) & 255;
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.c = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapDDCB.set(10, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.d;
    const oldValue = value;
    value = (value >> 1 | value << 7) & 255;
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.d = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapDDCB.set(11, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.e;
    const oldValue = value;
    value = (value >> 1 | value << 7) & 255;
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.e = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapDDCB.set(12, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.h;
    const oldValue = value;
    value = (value >> 1 | value << 7) & 255;
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.h = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapDDCB.set(13, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.l;
    const oldValue = value;
    value = (value >> 1 | value << 7) & 255;
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.l = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapDDCB.set(14, (z80) => {
  let value;
  value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  const oldValue = value;
  value = (value >> 1 | value << 7) & 255;
  z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.writeByte(z80.regs.memptr, value);
});
decodeMapDDCB.set(15, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.a;
    const oldValue = value;
    value = (value >> 1 | value << 7) & 255;
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.a = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
decodeMapDDCB.set(16, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.b;
    const oldValue = value;
    value = (value << 1 | ((z80.regs.f & Flag.C) !== 0 ? 1 : 0)) & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.b = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapDDCB.set(17, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.c;
    const oldValue = value;
    value = (value << 1 | ((z80.regs.f & Flag.C) !== 0 ? 1 : 0)) & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.c = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapDDCB.set(18, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.d;
    const oldValue = value;
    value = (value << 1 | ((z80.regs.f & Flag.C) !== 0 ? 1 : 0)) & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.d = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapDDCB.set(19, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.e;
    const oldValue = value;
    value = (value << 1 | ((z80.regs.f & Flag.C) !== 0 ? 1 : 0)) & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.e = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapDDCB.set(20, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.h;
    const oldValue = value;
    value = (value << 1 | ((z80.regs.f & Flag.C) !== 0 ? 1 : 0)) & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.h = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapDDCB.set(21, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.l;
    const oldValue = value;
    value = (value << 1 | ((z80.regs.f & Flag.C) !== 0 ? 1 : 0)) & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.l = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapDDCB.set(22, (z80) => {
  let value;
  value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  const oldValue = value;
  value = (value << 1 | ((z80.regs.f & Flag.C) !== 0 ? 1 : 0)) & 255;
  z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.writeByte(z80.regs.memptr, value);
});
decodeMapDDCB.set(23, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.a;
    const oldValue = value;
    value = (value << 1 | ((z80.regs.f & Flag.C) !== 0 ? 1 : 0)) & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.a = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
decodeMapDDCB.set(24, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.b;
    const oldValue = value;
    value = value >> 1 | ((z80.regs.f & Flag.C) !== 0 ? 128 : 0);
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.b = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapDDCB.set(25, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.c;
    const oldValue = value;
    value = value >> 1 | ((z80.regs.f & Flag.C) !== 0 ? 128 : 0);
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.c = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapDDCB.set(26, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.d;
    const oldValue = value;
    value = value >> 1 | ((z80.regs.f & Flag.C) !== 0 ? 128 : 0);
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.d = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapDDCB.set(27, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.e;
    const oldValue = value;
    value = value >> 1 | ((z80.regs.f & Flag.C) !== 0 ? 128 : 0);
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.e = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapDDCB.set(28, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.h;
    const oldValue = value;
    value = value >> 1 | ((z80.regs.f & Flag.C) !== 0 ? 128 : 0);
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.h = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapDDCB.set(29, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.l;
    const oldValue = value;
    value = value >> 1 | ((z80.regs.f & Flag.C) !== 0 ? 128 : 0);
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.l = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapDDCB.set(30, (z80) => {
  let value;
  value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  const oldValue = value;
  value = value >> 1 | ((z80.regs.f & Flag.C) !== 0 ? 128 : 0);
  z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.writeByte(z80.regs.memptr, value);
});
decodeMapDDCB.set(31, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.a;
    const oldValue = value;
    value = value >> 1 | ((z80.regs.f & Flag.C) !== 0 ? 128 : 0);
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.a = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
decodeMapDDCB.set(32, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.b;
    const oldValue = value;
    value = value << 1 & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.b = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapDDCB.set(33, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.c;
    const oldValue = value;
    value = value << 1 & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.c = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapDDCB.set(34, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.d;
    const oldValue = value;
    value = value << 1 & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.d = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapDDCB.set(35, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.e;
    const oldValue = value;
    value = value << 1 & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.e = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapDDCB.set(36, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.h;
    const oldValue = value;
    value = value << 1 & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.h = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapDDCB.set(37, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.l;
    const oldValue = value;
    value = value << 1 & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.l = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapDDCB.set(38, (z80) => {
  let value;
  value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  const oldValue = value;
  value = value << 1 & 255;
  z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.writeByte(z80.regs.memptr, value);
});
decodeMapDDCB.set(39, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.a;
    const oldValue = value;
    value = value << 1 & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.a = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
decodeMapDDCB.set(40, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.b;
    const oldValue = value;
    value = value & 128 | value >> 1;
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.b = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapDDCB.set(41, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.c;
    const oldValue = value;
    value = value & 128 | value >> 1;
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.c = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapDDCB.set(42, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.d;
    const oldValue = value;
    value = value & 128 | value >> 1;
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.d = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapDDCB.set(43, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.e;
    const oldValue = value;
    value = value & 128 | value >> 1;
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.e = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapDDCB.set(44, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.h;
    const oldValue = value;
    value = value & 128 | value >> 1;
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.h = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapDDCB.set(45, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.l;
    const oldValue = value;
    value = value & 128 | value >> 1;
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.l = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapDDCB.set(46, (z80) => {
  let value;
  value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  const oldValue = value;
  value = value & 128 | value >> 1;
  z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.writeByte(z80.regs.memptr, value);
});
decodeMapDDCB.set(47, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.a;
    const oldValue = value;
    value = value & 128 | value >> 1;
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.a = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
decodeMapDDCB.set(48, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.b;
    const oldValue = value;
    value = (value << 1 | 1) & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.b = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapDDCB.set(49, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.c;
    const oldValue = value;
    value = (value << 1 | 1) & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.c = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapDDCB.set(50, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.d;
    const oldValue = value;
    value = (value << 1 | 1) & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.d = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapDDCB.set(51, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.e;
    const oldValue = value;
    value = (value << 1 | 1) & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.e = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapDDCB.set(52, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.h;
    const oldValue = value;
    value = (value << 1 | 1) & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.h = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapDDCB.set(53, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.l;
    const oldValue = value;
    value = (value << 1 | 1) & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.l = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapDDCB.set(54, (z80) => {
  let value;
  value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  const oldValue = value;
  value = (value << 1 | 1) & 255;
  z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.writeByte(z80.regs.memptr, value);
});
decodeMapDDCB.set(55, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.a;
    const oldValue = value;
    value = (value << 1 | 1) & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.a = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
decodeMapDDCB.set(56, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.b;
    const oldValue = value;
    value = value >> 1;
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.b = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapDDCB.set(57, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.c;
    const oldValue = value;
    value = value >> 1;
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.c = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapDDCB.set(58, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.d;
    const oldValue = value;
    value = value >> 1;
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.d = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapDDCB.set(59, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.e;
    const oldValue = value;
    value = value >> 1;
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.e = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapDDCB.set(60, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.h;
    const oldValue = value;
    value = value >> 1;
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.h = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapDDCB.set(61, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.l;
    const oldValue = value;
    value = value >> 1;
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.l = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapDDCB.set(62, (z80) => {
  let value;
  value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  const oldValue = value;
  value = value >> 1;
  z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.writeByte(z80.regs.memptr, value);
});
decodeMapDDCB.set(63, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.a;
    const oldValue = value;
    value = value >> 1;
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.a = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
decodeMapDDCB.set(71, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  const hiddenValue = hi(z80.regs.memptr);
  z80.incTStateCount(1);
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 1) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapDDCB.set(64, decodeMapDDCB.get(71));
decodeMapDDCB.set(65, decodeMapDDCB.get(71));
decodeMapDDCB.set(66, decodeMapDDCB.get(71));
decodeMapDDCB.set(67, decodeMapDDCB.get(71));
decodeMapDDCB.set(68, decodeMapDDCB.get(71));
decodeMapDDCB.set(69, decodeMapDDCB.get(71));
decodeMapDDCB.set(70, decodeMapDDCB.get(71));
decodeMapDDCB.set(79, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  const hiddenValue = hi(z80.regs.memptr);
  z80.incTStateCount(1);
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 2) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapDDCB.set(72, decodeMapDDCB.get(79));
decodeMapDDCB.set(73, decodeMapDDCB.get(79));
decodeMapDDCB.set(74, decodeMapDDCB.get(79));
decodeMapDDCB.set(75, decodeMapDDCB.get(79));
decodeMapDDCB.set(76, decodeMapDDCB.get(79));
decodeMapDDCB.set(77, decodeMapDDCB.get(79));
decodeMapDDCB.set(78, decodeMapDDCB.get(79));
decodeMapDDCB.set(87, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  const hiddenValue = hi(z80.regs.memptr);
  z80.incTStateCount(1);
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 4) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapDDCB.set(80, decodeMapDDCB.get(87));
decodeMapDDCB.set(81, decodeMapDDCB.get(87));
decodeMapDDCB.set(82, decodeMapDDCB.get(87));
decodeMapDDCB.set(83, decodeMapDDCB.get(87));
decodeMapDDCB.set(84, decodeMapDDCB.get(87));
decodeMapDDCB.set(85, decodeMapDDCB.get(87));
decodeMapDDCB.set(86, decodeMapDDCB.get(87));
decodeMapDDCB.set(95, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  const hiddenValue = hi(z80.regs.memptr);
  z80.incTStateCount(1);
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 8) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapDDCB.set(88, decodeMapDDCB.get(95));
decodeMapDDCB.set(89, decodeMapDDCB.get(95));
decodeMapDDCB.set(90, decodeMapDDCB.get(95));
decodeMapDDCB.set(91, decodeMapDDCB.get(95));
decodeMapDDCB.set(92, decodeMapDDCB.get(95));
decodeMapDDCB.set(93, decodeMapDDCB.get(95));
decodeMapDDCB.set(94, decodeMapDDCB.get(95));
decodeMapDDCB.set(103, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  const hiddenValue = hi(z80.regs.memptr);
  z80.incTStateCount(1);
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 16) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapDDCB.set(96, decodeMapDDCB.get(103));
decodeMapDDCB.set(97, decodeMapDDCB.get(103));
decodeMapDDCB.set(98, decodeMapDDCB.get(103));
decodeMapDDCB.set(99, decodeMapDDCB.get(103));
decodeMapDDCB.set(100, decodeMapDDCB.get(103));
decodeMapDDCB.set(101, decodeMapDDCB.get(103));
decodeMapDDCB.set(102, decodeMapDDCB.get(103));
decodeMapDDCB.set(111, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  const hiddenValue = hi(z80.regs.memptr);
  z80.incTStateCount(1);
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 32) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapDDCB.set(104, decodeMapDDCB.get(111));
decodeMapDDCB.set(105, decodeMapDDCB.get(111));
decodeMapDDCB.set(106, decodeMapDDCB.get(111));
decodeMapDDCB.set(107, decodeMapDDCB.get(111));
decodeMapDDCB.set(108, decodeMapDDCB.get(111));
decodeMapDDCB.set(109, decodeMapDDCB.get(111));
decodeMapDDCB.set(110, decodeMapDDCB.get(111));
decodeMapDDCB.set(119, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  const hiddenValue = hi(z80.regs.memptr);
  z80.incTStateCount(1);
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 64) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapDDCB.set(112, decodeMapDDCB.get(119));
decodeMapDDCB.set(113, decodeMapDDCB.get(119));
decodeMapDDCB.set(114, decodeMapDDCB.get(119));
decodeMapDDCB.set(115, decodeMapDDCB.get(119));
decodeMapDDCB.set(116, decodeMapDDCB.get(119));
decodeMapDDCB.set(117, decodeMapDDCB.get(119));
decodeMapDDCB.set(118, decodeMapDDCB.get(119));
decodeMapDDCB.set(127, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  const hiddenValue = hi(z80.regs.memptr);
  z80.incTStateCount(1);
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 128) === 0) {
    f |= Flag.P | Flag.Z;
  }
  if ((value & 128) !== 0) {
    f |= Flag.S;
  }
  z80.regs.f = f;
});
decodeMapDDCB.set(120, decodeMapDDCB.get(127));
decodeMapDDCB.set(121, decodeMapDDCB.get(127));
decodeMapDDCB.set(122, decodeMapDDCB.get(127));
decodeMapDDCB.set(123, decodeMapDDCB.get(127));
decodeMapDDCB.set(124, decodeMapDDCB.get(127));
decodeMapDDCB.set(125, decodeMapDDCB.get(127));
decodeMapDDCB.set(126, decodeMapDDCB.get(127));
decodeMapDDCB.set(128, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr) & 254;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapDDCB.set(129, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr) & 254;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapDDCB.set(130, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr) & 254;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapDDCB.set(131, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr) & 254;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapDDCB.set(132, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr) & 254;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapDDCB.set(133, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr) & 254;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapDDCB.set(134, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, value & 254);
});
decodeMapDDCB.set(135, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr) & 254;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
decodeMapDDCB.set(136, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr) & 253;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapDDCB.set(137, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr) & 253;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapDDCB.set(138, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr) & 253;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapDDCB.set(139, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr) & 253;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapDDCB.set(140, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr) & 253;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapDDCB.set(141, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr) & 253;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapDDCB.set(142, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, value & 253);
});
decodeMapDDCB.set(143, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr) & 253;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
decodeMapDDCB.set(144, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr) & 251;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapDDCB.set(145, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr) & 251;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapDDCB.set(146, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr) & 251;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapDDCB.set(147, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr) & 251;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapDDCB.set(148, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr) & 251;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapDDCB.set(149, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr) & 251;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapDDCB.set(150, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, value & 251);
});
decodeMapDDCB.set(151, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr) & 251;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
decodeMapDDCB.set(152, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr) & 247;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapDDCB.set(153, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr) & 247;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapDDCB.set(154, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr) & 247;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapDDCB.set(155, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr) & 247;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapDDCB.set(156, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr) & 247;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapDDCB.set(157, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr) & 247;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapDDCB.set(158, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, value & 247);
});
decodeMapDDCB.set(159, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr) & 247;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
decodeMapDDCB.set(160, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr) & 239;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapDDCB.set(161, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr) & 239;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapDDCB.set(162, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr) & 239;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapDDCB.set(163, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr) & 239;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapDDCB.set(164, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr) & 239;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapDDCB.set(165, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr) & 239;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapDDCB.set(166, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, value & 239);
});
decodeMapDDCB.set(167, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr) & 239;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
decodeMapDDCB.set(168, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr) & 223;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapDDCB.set(169, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr) & 223;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapDDCB.set(170, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr) & 223;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapDDCB.set(171, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr) & 223;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapDDCB.set(172, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr) & 223;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapDDCB.set(173, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr) & 223;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapDDCB.set(174, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, value & 223);
});
decodeMapDDCB.set(175, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr) & 223;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
decodeMapDDCB.set(176, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr) & 191;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapDDCB.set(177, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr) & 191;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapDDCB.set(178, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr) & 191;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapDDCB.set(179, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr) & 191;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapDDCB.set(180, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr) & 191;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapDDCB.set(181, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr) & 191;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapDDCB.set(182, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, value & 191);
});
decodeMapDDCB.set(183, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr) & 191;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
decodeMapDDCB.set(184, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr) & 127;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapDDCB.set(185, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr) & 127;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapDDCB.set(186, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr) & 127;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapDDCB.set(187, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr) & 127;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapDDCB.set(188, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr) & 127;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapDDCB.set(189, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr) & 127;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapDDCB.set(190, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, value & 127);
});
decodeMapDDCB.set(191, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr) & 127;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
decodeMapDDCB.set(192, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr) | 1;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapDDCB.set(193, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr) | 1;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapDDCB.set(194, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr) | 1;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapDDCB.set(195, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr) | 1;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapDDCB.set(196, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr) | 1;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapDDCB.set(197, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr) | 1;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapDDCB.set(198, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, value | 1);
});
decodeMapDDCB.set(199, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr) | 1;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
decodeMapDDCB.set(200, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr) | 2;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapDDCB.set(201, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr) | 2;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapDDCB.set(202, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr) | 2;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapDDCB.set(203, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr) | 2;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapDDCB.set(204, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr) | 2;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapDDCB.set(205, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr) | 2;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapDDCB.set(206, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, value | 2);
});
decodeMapDDCB.set(207, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr) | 2;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
decodeMapDDCB.set(208, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr) | 4;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapDDCB.set(209, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr) | 4;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapDDCB.set(210, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr) | 4;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapDDCB.set(211, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr) | 4;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapDDCB.set(212, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr) | 4;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapDDCB.set(213, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr) | 4;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapDDCB.set(214, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, value | 4);
});
decodeMapDDCB.set(215, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr) | 4;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
decodeMapDDCB.set(216, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr) | 8;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapDDCB.set(217, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr) | 8;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapDDCB.set(218, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr) | 8;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapDDCB.set(219, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr) | 8;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapDDCB.set(220, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr) | 8;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapDDCB.set(221, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr) | 8;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapDDCB.set(222, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, value | 8);
});
decodeMapDDCB.set(223, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr) | 8;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
decodeMapDDCB.set(224, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr) | 16;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapDDCB.set(225, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr) | 16;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapDDCB.set(226, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr) | 16;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapDDCB.set(227, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr) | 16;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapDDCB.set(228, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr) | 16;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapDDCB.set(229, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr) | 16;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapDDCB.set(230, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, value | 16);
});
decodeMapDDCB.set(231, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr) | 16;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
decodeMapDDCB.set(232, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr) | 32;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapDDCB.set(233, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr) | 32;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapDDCB.set(234, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr) | 32;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapDDCB.set(235, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr) | 32;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapDDCB.set(236, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr) | 32;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapDDCB.set(237, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr) | 32;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapDDCB.set(238, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, value | 32);
});
decodeMapDDCB.set(239, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr) | 32;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
decodeMapDDCB.set(240, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr) | 64;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapDDCB.set(241, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr) | 64;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapDDCB.set(242, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr) | 64;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapDDCB.set(243, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr) | 64;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapDDCB.set(244, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr) | 64;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapDDCB.set(245, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr) | 64;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapDDCB.set(246, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, value | 64);
});
decodeMapDDCB.set(247, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr) | 64;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
decodeMapDDCB.set(248, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr) | 128;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapDDCB.set(249, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr) | 128;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapDDCB.set(250, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr) | 128;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapDDCB.set(251, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr) | 128;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapDDCB.set(252, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr) | 128;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapDDCB.set(253, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr) | 128;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapDDCB.set(254, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, value | 128);
});
decodeMapDDCB.set(255, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr) | 128;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
var decodeMapED = /* @__PURE__ */ new Map();
decodeMapED.set(64, (z80) => {
  z80.regs.memptr = inc16(z80.regs.bc);
  z80.regs.b = z80.readPort(z80.regs.bc);
  z80.regs.f = z80.regs.f & Flag.C | z80.sz53pTable[z80.regs.b];
});
decodeMapED.set(65, (z80) => {
  z80.writePort(z80.regs.bc, z80.regs.b);
  z80.regs.memptr = inc16(z80.regs.bc);
});
decodeMapED.set(66, (z80) => {
  let value;
  z80.incTStateCount(7);
  value = z80.regs.bc;
  let result = z80.regs.hl - value;
  if ((z80.regs.f & Flag.C) !== 0) {
    result -= 1;
  }
  const lookup = ((z80.regs.hl & 34816) >> 11 | (value & 34816) >> 10 | (result & 34816) >> 9) & 255;
  z80.regs.memptr = inc16(z80.regs.hl);
  z80.regs.hl = result & 65535;
  z80.regs.f = ((result & 65536) !== 0 ? Flag.C : 0) | Flag.N | overflowSubTable[lookup >> 4] | result >> 8 & (Flag.X3 | Flag.X5 | Flag.S) | halfCarrySubTable[lookup & 7] | (result !== 0 ? 0 : Flag.Z);
});
decodeMapED.set(67, (z80) => {
  let value;
  value = z80.regs.bc;
  let addr = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  addr = word2(z80.readByte(z80.regs.pc), addr);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.writeByte(addr, lo(value));
  addr = inc16(addr);
  z80.regs.memptr = addr;
  z80.writeByte(addr, hi(value));
});
decodeMapED.set(124, (z80) => {
  const value = z80.regs.a;
  z80.regs.a = 0;
  const diff = sub16(z80.regs.a, value);
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (diff & 136) >> 1) & 255;
  z80.regs.a = diff;
  let f = Flag.N;
  if ((diff & 256) != 0)
    f |= Flag.C;
  f |= halfCarrySubTable[lookup & 7];
  f |= overflowSubTable[lookup >> 4];
  f |= z80.sz53Table[z80.regs.a];
  z80.regs.f = f;
});
decodeMapED.set(68, decodeMapED.get(124));
decodeMapED.set(76, decodeMapED.get(124));
decodeMapED.set(84, decodeMapED.get(124));
decodeMapED.set(92, decodeMapED.get(124));
decodeMapED.set(100, decodeMapED.get(124));
decodeMapED.set(108, decodeMapED.get(124));
decodeMapED.set(116, decodeMapED.get(124));
decodeMapED.set(125, (z80) => {
  z80.regs.iff1 = z80.regs.iff2;
  z80.regs.pc = z80.popWord();
  z80.regs.memptr = z80.regs.pc;
});
decodeMapED.set(69, decodeMapED.get(125));
decodeMapED.set(85, decodeMapED.get(125));
decodeMapED.set(93, decodeMapED.get(125));
decodeMapED.set(101, decodeMapED.get(125));
decodeMapED.set(109, decodeMapED.get(125));
decodeMapED.set(117, decodeMapED.get(125));
decodeMapED.set(110, (z80) => {
  z80.regs.im = 0;
});
decodeMapED.set(70, decodeMapED.get(110));
decodeMapED.set(78, decodeMapED.get(110));
decodeMapED.set(102, decodeMapED.get(110));
decodeMapED.set(71, (z80) => {
  let value;
  value = z80.regs.a;
  z80.incTStateCount(1);
  z80.regs.i = value;
});
decodeMapED.set(72, (z80) => {
  z80.regs.memptr = inc16(z80.regs.bc);
  z80.regs.c = z80.readPort(z80.regs.bc);
  z80.regs.f = z80.regs.f & Flag.C | z80.sz53pTable[z80.regs.c];
});
decodeMapED.set(73, (z80) => {
  z80.writePort(z80.regs.bc, z80.regs.c);
  z80.regs.memptr = inc16(z80.regs.bc);
});
decodeMapED.set(74, (z80) => {
  let value;
  z80.incTStateCount(7);
  value = z80.regs.bc;
  let result = z80.regs.hl + value;
  if ((z80.regs.f & Flag.C) !== 0) {
    result += 1;
  }
  const lookup = ((z80.regs.hl & 34816) >> 11 | (value & 34816) >> 10 | (result & 34816) >> 9) & 255;
  z80.regs.memptr = inc16(z80.regs.hl);
  z80.regs.hl = result & 65535;
  z80.regs.f = ((result & 65536) !== 0 ? Flag.C : 0) | overflowAddTable[lookup >> 4] | result >> 8 & (Flag.X3 | Flag.X5 | Flag.S) | halfCarryAddTable[lookup & 7] | (result !== 0 ? 0 : Flag.Z);
});
decodeMapED.set(75, (z80) => {
  let value;
  let addr = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  addr = word2(z80.readByte(z80.regs.pc), addr);
  z80.regs.pc = inc16(z80.regs.pc);
  value = z80.readByte(addr);
  z80.regs.memptr = inc16(addr);
  value = word2(z80.readByte(z80.regs.memptr), value);
  z80.regs.bc = value;
});
decodeMapED.set(77, (z80) => {
  z80.regs.iff1 = z80.regs.iff2;
  z80.regs.pc = z80.popWord();
  z80.regs.memptr = z80.regs.pc;
});
decodeMapED.set(79, (z80) => {
  let value;
  value = z80.regs.a;
  z80.incTStateCount(1);
  z80.regs.r = value;
});
decodeMapED.set(80, (z80) => {
  z80.regs.memptr = inc16(z80.regs.bc);
  z80.regs.d = z80.readPort(z80.regs.bc);
  z80.regs.f = z80.regs.f & Flag.C | z80.sz53pTable[z80.regs.d];
});
decodeMapED.set(81, (z80) => {
  z80.writePort(z80.regs.bc, z80.regs.d);
  z80.regs.memptr = inc16(z80.regs.bc);
});
decodeMapED.set(82, (z80) => {
  let value;
  z80.incTStateCount(7);
  value = z80.regs.de;
  let result = z80.regs.hl - value;
  if ((z80.regs.f & Flag.C) !== 0) {
    result -= 1;
  }
  const lookup = ((z80.regs.hl & 34816) >> 11 | (value & 34816) >> 10 | (result & 34816) >> 9) & 255;
  z80.regs.memptr = inc16(z80.regs.hl);
  z80.regs.hl = result & 65535;
  z80.regs.f = ((result & 65536) !== 0 ? Flag.C : 0) | Flag.N | overflowSubTable[lookup >> 4] | result >> 8 & (Flag.X3 | Flag.X5 | Flag.S) | halfCarrySubTable[lookup & 7] | (result !== 0 ? 0 : Flag.Z);
});
decodeMapED.set(83, (z80) => {
  let value;
  value = z80.regs.de;
  let addr = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  addr = word2(z80.readByte(z80.regs.pc), addr);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.writeByte(addr, lo(value));
  addr = inc16(addr);
  z80.regs.memptr = addr;
  z80.writeByte(addr, hi(value));
});
decodeMapED.set(118, (z80) => {
  z80.regs.im = 1;
});
decodeMapED.set(86, decodeMapED.get(118));
decodeMapED.set(87, (z80) => {
  let value;
  value = z80.regs.i;
  z80.incTStateCount(1);
  z80.regs.a = value;
  z80.regs.f = z80.regs.f & Flag.C | z80.sz53Table[z80.regs.a] | (z80.regs.iff2 ? Flag.V : 0);
});
decodeMapED.set(88, (z80) => {
  z80.regs.memptr = inc16(z80.regs.bc);
  z80.regs.e = z80.readPort(z80.regs.bc);
  z80.regs.f = z80.regs.f & Flag.C | z80.sz53pTable[z80.regs.e];
});
decodeMapED.set(89, (z80) => {
  z80.writePort(z80.regs.bc, z80.regs.e);
  z80.regs.memptr = inc16(z80.regs.bc);
});
decodeMapED.set(90, (z80) => {
  let value;
  z80.incTStateCount(7);
  value = z80.regs.de;
  let result = z80.regs.hl + value;
  if ((z80.regs.f & Flag.C) !== 0) {
    result += 1;
  }
  const lookup = ((z80.regs.hl & 34816) >> 11 | (value & 34816) >> 10 | (result & 34816) >> 9) & 255;
  z80.regs.memptr = inc16(z80.regs.hl);
  z80.regs.hl = result & 65535;
  z80.regs.f = ((result & 65536) !== 0 ? Flag.C : 0) | overflowAddTable[lookup >> 4] | result >> 8 & (Flag.X3 | Flag.X5 | Flag.S) | halfCarryAddTable[lookup & 7] | (result !== 0 ? 0 : Flag.Z);
});
decodeMapED.set(91, (z80) => {
  let value;
  let addr = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  addr = word2(z80.readByte(z80.regs.pc), addr);
  z80.regs.pc = inc16(z80.regs.pc);
  value = z80.readByte(addr);
  z80.regs.memptr = inc16(addr);
  value = word2(z80.readByte(z80.regs.memptr), value);
  z80.regs.de = value;
});
decodeMapED.set(126, (z80) => {
  z80.regs.im = 2;
});
decodeMapED.set(94, decodeMapED.get(126));
decodeMapED.set(95, (z80) => {
  let value;
  value = z80.regs.rCombined;
  z80.incTStateCount(1);
  z80.regs.a = value;
  z80.regs.f = z80.regs.f & Flag.C | z80.sz53Table[z80.regs.a] | (z80.regs.iff2 ? Flag.V : 0);
});
decodeMapED.set(96, (z80) => {
  z80.regs.memptr = inc16(z80.regs.bc);
  z80.regs.h = z80.readPort(z80.regs.bc);
  z80.regs.f = z80.regs.f & Flag.C | z80.sz53pTable[z80.regs.h];
});
decodeMapED.set(97, (z80) => {
  z80.writePort(z80.regs.bc, z80.regs.h);
  z80.regs.memptr = inc16(z80.regs.bc);
});
decodeMapED.set(98, (z80) => {
  let value;
  z80.incTStateCount(7);
  value = z80.regs.hl;
  let result = z80.regs.hl - value;
  if ((z80.regs.f & Flag.C) !== 0) {
    result -= 1;
  }
  const lookup = ((z80.regs.hl & 34816) >> 11 | (value & 34816) >> 10 | (result & 34816) >> 9) & 255;
  z80.regs.memptr = inc16(z80.regs.hl);
  z80.regs.hl = result & 65535;
  z80.regs.f = ((result & 65536) !== 0 ? Flag.C : 0) | Flag.N | overflowSubTable[lookup >> 4] | result >> 8 & (Flag.X3 | Flag.X5 | Flag.S) | halfCarrySubTable[lookup & 7] | (result !== 0 ? 0 : Flag.Z);
});
decodeMapED.set(99, (z80) => {
  let value;
  value = z80.regs.hl;
  let addr = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  addr = word2(z80.readByte(z80.regs.pc), addr);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.writeByte(addr, lo(value));
  addr = inc16(addr);
  z80.regs.memptr = addr;
  z80.writeByte(addr, hi(value));
});
decodeMapED.set(103, (z80) => {
  const tmp = z80.readByte(z80.regs.hl);
  z80.incTStateCount(4);
  z80.writeByte(z80.regs.hl, (z80.regs.a << 4 | tmp >> 4) & 255);
  z80.regs.a = z80.regs.a & 240 | tmp & 15;
  z80.regs.f = z80.regs.f & Flag.C | z80.sz53pTable[z80.regs.a];
  z80.regs.memptr = inc16(z80.regs.hl);
});
decodeMapED.set(104, (z80) => {
  z80.regs.memptr = inc16(z80.regs.bc);
  z80.regs.l = z80.readPort(z80.regs.bc);
  z80.regs.f = z80.regs.f & Flag.C | z80.sz53pTable[z80.regs.l];
});
decodeMapED.set(105, (z80) => {
  z80.writePort(z80.regs.bc, z80.regs.l);
  z80.regs.memptr = inc16(z80.regs.bc);
});
decodeMapED.set(106, (z80) => {
  let value;
  z80.incTStateCount(7);
  value = z80.regs.hl;
  let result = z80.regs.hl + value;
  if ((z80.regs.f & Flag.C) !== 0) {
    result += 1;
  }
  const lookup = ((z80.regs.hl & 34816) >> 11 | (value & 34816) >> 10 | (result & 34816) >> 9) & 255;
  z80.regs.memptr = inc16(z80.regs.hl);
  z80.regs.hl = result & 65535;
  z80.regs.f = ((result & 65536) !== 0 ? Flag.C : 0) | overflowAddTable[lookup >> 4] | result >> 8 & (Flag.X3 | Flag.X5 | Flag.S) | halfCarryAddTable[lookup & 7] | (result !== 0 ? 0 : Flag.Z);
});
decodeMapED.set(107, (z80) => {
  let value;
  let addr = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  addr = word2(z80.readByte(z80.regs.pc), addr);
  z80.regs.pc = inc16(z80.regs.pc);
  value = z80.readByte(addr);
  z80.regs.memptr = inc16(addr);
  value = word2(z80.readByte(z80.regs.memptr), value);
  z80.regs.hl = value;
});
decodeMapED.set(111, (z80) => {
  const tmp = z80.readByte(z80.regs.hl);
  z80.incTStateCount(4);
  z80.writeByte(z80.regs.hl, (tmp << 4 | z80.regs.a & 15) & 255);
  z80.regs.a = z80.regs.a & 240 | tmp >> 4;
  z80.regs.f = z80.regs.f & Flag.C | z80.sz53pTable[z80.regs.a];
  z80.regs.memptr = inc16(z80.regs.hl);
});
decodeMapED.set(112, (z80) => {
  z80.regs.memptr = inc16(z80.regs.bc);
  z80.regs.f = z80.readPort(z80.regs.bc);
  z80.regs.f = z80.regs.f & Flag.C | z80.sz53pTable[z80.regs.f];
});
decodeMapED.set(113, (z80) => {
  z80.writePort(z80.regs.bc, 0);
  z80.regs.memptr = inc16(z80.regs.bc);
});
decodeMapED.set(114, (z80) => {
  let value;
  z80.incTStateCount(7);
  value = z80.regs.sp;
  let result = z80.regs.hl - value;
  if ((z80.regs.f & Flag.C) !== 0) {
    result -= 1;
  }
  const lookup = ((z80.regs.hl & 34816) >> 11 | (value & 34816) >> 10 | (result & 34816) >> 9) & 255;
  z80.regs.memptr = inc16(z80.regs.hl);
  z80.regs.hl = result & 65535;
  z80.regs.f = ((result & 65536) !== 0 ? Flag.C : 0) | Flag.N | overflowSubTable[lookup >> 4] | result >> 8 & (Flag.X3 | Flag.X5 | Flag.S) | halfCarrySubTable[lookup & 7] | (result !== 0 ? 0 : Flag.Z);
});
decodeMapED.set(115, (z80) => {
  let value;
  value = z80.regs.sp;
  let addr = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  addr = word2(z80.readByte(z80.regs.pc), addr);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.writeByte(addr, lo(value));
  addr = inc16(addr);
  z80.regs.memptr = addr;
  z80.writeByte(addr, hi(value));
});
decodeMapED.set(120, (z80) => {
  z80.regs.memptr = inc16(z80.regs.bc);
  z80.regs.a = z80.readPort(z80.regs.bc);
  z80.regs.f = z80.regs.f & Flag.C | z80.sz53pTable[z80.regs.a];
});
decodeMapED.set(121, (z80) => {
  z80.writePort(z80.regs.bc, z80.regs.a);
  z80.regs.memptr = inc16(z80.regs.bc);
});
decodeMapED.set(122, (z80) => {
  let value;
  z80.incTStateCount(7);
  value = z80.regs.sp;
  let result = z80.regs.hl + value;
  if ((z80.regs.f & Flag.C) !== 0) {
    result += 1;
  }
  const lookup = ((z80.regs.hl & 34816) >> 11 | (value & 34816) >> 10 | (result & 34816) >> 9) & 255;
  z80.regs.memptr = inc16(z80.regs.hl);
  z80.regs.hl = result & 65535;
  z80.regs.f = ((result & 65536) !== 0 ? Flag.C : 0) | overflowAddTable[lookup >> 4] | result >> 8 & (Flag.X3 | Flag.X5 | Flag.S) | halfCarryAddTable[lookup & 7] | (result !== 0 ? 0 : Flag.Z);
});
decodeMapED.set(123, (z80) => {
  let value;
  let addr = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  addr = word2(z80.readByte(z80.regs.pc), addr);
  z80.regs.pc = inc16(z80.regs.pc);
  value = z80.readByte(addr);
  z80.regs.memptr = inc16(addr);
  value = word2(z80.readByte(z80.regs.memptr), value);
  z80.regs.sp = value;
});
decodeMapED.set(160, (z80) => {
  let value = z80.readByte(z80.regs.hl);
  z80.writeByte(z80.regs.de, value);
  z80.incTStateCount(2);
  z80.regs.bc = dec16(z80.regs.bc);
  value = add16(value, z80.regs.a);
  z80.regs.f = z80.regs.f & (Flag.C | Flag.Z | Flag.S) | (z80.regs.bc !== 0 ? Flag.V : 0) | value & Flag.X3 | ((value & 2) !== 0 ? Flag.X5 : 0);
  z80.regs.hl = inc16(z80.regs.hl);
  z80.regs.de = inc16(z80.regs.de);
});
decodeMapED.set(161, (z80) => {
  const value = z80.readByte(z80.regs.hl);
  let diff = z80.regs.a - value & 255;
  const lookup = (z80.regs.a & 8) >> 3 | (value & 8) >> 2 | (diff & 8) >> 1;
  z80.incTStateCount(5);
  z80.regs.bc = dec16(z80.regs.bc);
  z80.regs.f = z80.regs.f & Flag.C | (z80.regs.bc !== 0 ? Flag.V : 0) | Flag.N | halfCarrySubTable[lookup] | (diff !== 0 ? 0 : Flag.Z) | diff & Flag.S;
  if ((z80.regs.f & Flag.H) !== 0)
    diff = dec8(diff);
  z80.regs.f |= diff & Flag.X3 | ((diff & 2) !== 0 ? Flag.X5 : 0);
  z80.regs.memptr = inc16(z80.regs.memptr);
  z80.regs.hl = inc16(z80.regs.hl);
});
decodeMapED.set(162, (z80) => {
  z80.incTStateCount(1);
  const value = z80.readPort(z80.regs.bc);
  z80.writeByte(z80.regs.hl, value);
  z80.regs.memptr = inc16(z80.regs.bc);
  z80.regs.b = dec8(z80.regs.b);
  const other = inc8(add8(value, z80.regs.c));
  z80.regs.f = (value & 128 ? Flag.N : 0) | (other < value ? Flag.H | Flag.C : 0) | (z80.parityTable[other & 7 ^ z80.regs.b] ? Flag.P : 0) | z80.sz53Table[z80.regs.b];
  z80.regs.hl = inc16(z80.regs.hl);
});
decodeMapED.set(163, (z80) => {
  z80.incTStateCount(1);
  const value = z80.readByte(z80.regs.hl);
  z80.regs.b = dec8(z80.regs.b);
  z80.regs.memptr = inc16(z80.regs.bc);
  z80.writePort(z80.regs.bc, value);
  z80.regs.hl = inc16(z80.regs.hl);
  const other = add8(value, z80.regs.l);
  z80.regs.f = (value & 128 ? Flag.N : 0) | (other < value ? Flag.H | Flag.C : 0) | (z80.parityTable[other & 7 ^ z80.regs.b] ? Flag.P : 0) | z80.sz53Table[z80.regs.b];
});
decodeMapED.set(168, (z80) => {
  let value = z80.readByte(z80.regs.hl);
  z80.writeByte(z80.regs.de, value);
  z80.incTStateCount(2);
  z80.regs.bc = dec16(z80.regs.bc);
  value = add16(value, z80.regs.a);
  z80.regs.f = z80.regs.f & (Flag.C | Flag.Z | Flag.S) | (z80.regs.bc !== 0 ? Flag.V : 0) | value & Flag.X3 | ((value & 2) !== 0 ? Flag.X5 : 0);
  z80.regs.hl = dec16(z80.regs.hl);
  z80.regs.de = dec16(z80.regs.de);
});
decodeMapED.set(169, (z80) => {
  const value = z80.readByte(z80.regs.hl);
  let diff = z80.regs.a - value & 255;
  const lookup = (z80.regs.a & 8) >> 3 | (value & 8) >> 2 | (diff & 8) >> 1;
  z80.incTStateCount(5);
  z80.regs.bc = dec16(z80.regs.bc);
  z80.regs.f = z80.regs.f & Flag.C | (z80.regs.bc !== 0 ? Flag.V : 0) | Flag.N | halfCarrySubTable[lookup] | (diff !== 0 ? 0 : Flag.Z) | diff & Flag.S;
  if ((z80.regs.f & Flag.H) !== 0)
    diff = dec8(diff);
  z80.regs.f |= diff & Flag.X3 | ((diff & 2) !== 0 ? Flag.X5 : 0);
  z80.regs.memptr = dec16(z80.regs.memptr);
  z80.regs.hl = dec16(z80.regs.hl);
});
decodeMapED.set(170, (z80) => {
  z80.incTStateCount(1);
  const value = z80.readPort(z80.regs.bc);
  z80.writeByte(z80.regs.hl, value);
  z80.regs.memptr = dec16(z80.regs.bc);
  z80.regs.b = dec8(z80.regs.b);
  const other = dec8(add8(value, z80.regs.c));
  z80.regs.f = (value & 128 ? Flag.N : 0) | (other < value ? Flag.H | Flag.C : 0) | (z80.parityTable[other & 7 ^ z80.regs.b] ? Flag.P : 0) | z80.sz53Table[z80.regs.b];
  z80.regs.hl = dec16(z80.regs.hl);
});
decodeMapED.set(171, (z80) => {
  z80.incTStateCount(1);
  const value = z80.readByte(z80.regs.hl);
  z80.regs.b = dec8(z80.regs.b);
  z80.regs.memptr = dec16(z80.regs.bc);
  z80.writePort(z80.regs.bc, value);
  z80.regs.hl = dec16(z80.regs.hl);
  const other = add8(value, z80.regs.l);
  z80.regs.f = (value & 128 ? Flag.N : 0) | (other < value ? Flag.H | Flag.C : 0) | (z80.parityTable[other & 7 ^ z80.regs.b] ? Flag.P : 0) | z80.sz53Table[z80.regs.b];
});
decodeMapED.set(176, (z80) => {
  let value = z80.readByte(z80.regs.hl);
  z80.writeByte(z80.regs.de, value);
  z80.incTStateCount(2);
  z80.regs.bc = dec16(z80.regs.bc);
  value = add16(value, z80.regs.a);
  z80.regs.f = z80.regs.f & (Flag.C | Flag.Z | Flag.S) | (z80.regs.bc !== 0 ? Flag.V : 0) | value & Flag.X3 | ((value & 2) !== 0 ? Flag.X5 : 0);
  if (z80.regs.bc !== 0) {
    z80.incTStateCount(5);
    z80.regs.pc = add16(z80.regs.pc, -2);
    z80.regs.memptr = add16(z80.regs.pc, 1);
  }
  z80.regs.hl = inc16(z80.regs.hl);
  z80.regs.de = inc16(z80.regs.de);
});
decodeMapED.set(177, (z80) => {
  const value = z80.readByte(z80.regs.hl);
  let diff = z80.regs.a - value & 255;
  const lookup = (z80.regs.a & 8) >> 3 | (value & 8) >> 2 | (diff & 8) >> 1;
  z80.incTStateCount(5);
  z80.regs.bc = dec16(z80.regs.bc);
  z80.regs.f = z80.regs.f & Flag.C | (z80.regs.bc !== 0 ? Flag.V : 0) | Flag.N | halfCarrySubTable[lookup] | (diff !== 0 ? 0 : Flag.Z) | diff & Flag.S;
  if ((z80.regs.f & Flag.H) !== 0)
    diff = dec8(diff);
  z80.regs.f |= diff & Flag.X3 | ((diff & 2) !== 0 ? Flag.X5 : 0);
  if ((z80.regs.f & (Flag.V | Flag.Z)) === Flag.V) {
    z80.incTStateCount(5);
    z80.regs.pc = add16(z80.regs.pc, -2);
    z80.regs.memptr = add16(z80.regs.pc, 1);
  } else {
    z80.regs.memptr = inc16(z80.regs.memptr);
  }
  z80.regs.hl = inc16(z80.regs.hl);
});
decodeMapED.set(178, (z80) => {
  z80.incTStateCount(1);
  const value = z80.readPort(z80.regs.bc);
  z80.writeByte(z80.regs.hl, value);
  z80.regs.memptr = inc16(z80.regs.bc);
  z80.regs.b = dec8(z80.regs.b);
  const other = inc8(add8(value, z80.regs.c));
  z80.regs.f = (value & 128 ? Flag.N : 0) | (other < value ? Flag.H | Flag.C : 0) | (z80.parityTable[other & 7 ^ z80.regs.b] ? Flag.P : 0) | z80.sz53Table[z80.regs.b];
  if (z80.regs.b > 0) {
    z80.incTStateCount(5);
    z80.regs.pc = add16(z80.regs.pc, -2);
  }
  z80.regs.hl = inc16(z80.regs.hl);
});
decodeMapED.set(179, (z80) => {
  z80.incTStateCount(1);
  const value = z80.readByte(z80.regs.hl);
  z80.regs.b = dec8(z80.regs.b);
  z80.regs.memptr = inc16(z80.regs.bc);
  z80.writePort(z80.regs.bc, value);
  z80.regs.hl = inc16(z80.regs.hl);
  const other = add8(value, z80.regs.l);
  z80.regs.f = (value & 128 ? Flag.N : 0) | (other < value ? Flag.H | Flag.C : 0) | (z80.parityTable[other & 7 ^ z80.regs.b] ? Flag.P : 0) | z80.sz53Table[z80.regs.b];
  if (z80.regs.b > 0) {
    z80.incTStateCount(5);
    z80.regs.pc = add16(z80.regs.pc, -2);
  }
});
decodeMapED.set(184, (z80) => {
  let value = z80.readByte(z80.regs.hl);
  z80.writeByte(z80.regs.de, value);
  z80.incTStateCount(2);
  z80.regs.bc = dec16(z80.regs.bc);
  value = add16(value, z80.regs.a);
  z80.regs.f = z80.regs.f & (Flag.C | Flag.Z | Flag.S) | (z80.regs.bc !== 0 ? Flag.V : 0) | value & Flag.X3 | ((value & 2) !== 0 ? Flag.X5 : 0);
  if (z80.regs.bc !== 0) {
    z80.incTStateCount(5);
    z80.regs.pc = add16(z80.regs.pc, -2);
    z80.regs.memptr = add16(z80.regs.pc, 1);
  }
  z80.regs.hl = dec16(z80.regs.hl);
  z80.regs.de = dec16(z80.regs.de);
});
decodeMapED.set(185, (z80) => {
  const value = z80.readByte(z80.regs.hl);
  let diff = z80.regs.a - value & 255;
  const lookup = (z80.regs.a & 8) >> 3 | (value & 8) >> 2 | (diff & 8) >> 1;
  z80.incTStateCount(5);
  z80.regs.bc = dec16(z80.regs.bc);
  z80.regs.f = z80.regs.f & Flag.C | (z80.regs.bc !== 0 ? Flag.V : 0) | Flag.N | halfCarrySubTable[lookup] | (diff !== 0 ? 0 : Flag.Z) | diff & Flag.S;
  if ((z80.regs.f & Flag.H) !== 0)
    diff = dec8(diff);
  z80.regs.f |= diff & Flag.X3 | ((diff & 2) !== 0 ? Flag.X5 : 0);
  if ((z80.regs.f & (Flag.V | Flag.Z)) === Flag.V) {
    z80.incTStateCount(5);
    z80.regs.pc = add16(z80.regs.pc, -2);
    z80.regs.memptr = add16(z80.regs.pc, 1);
  } else {
    z80.regs.memptr = dec16(z80.regs.memptr);
  }
  z80.regs.hl = dec16(z80.regs.hl);
});
decodeMapED.set(186, (z80) => {
  z80.incTStateCount(1);
  const value = z80.readPort(z80.regs.bc);
  z80.writeByte(z80.regs.hl, value);
  z80.regs.memptr = dec16(z80.regs.bc);
  z80.regs.b = dec8(z80.regs.b);
  const other = dec8(add8(value, z80.regs.c));
  z80.regs.f = (value & 128 ? Flag.N : 0) | (other < value ? Flag.H | Flag.C : 0) | (z80.parityTable[other & 7 ^ z80.regs.b] ? Flag.P : 0) | z80.sz53Table[z80.regs.b];
  if (z80.regs.b > 0) {
    z80.incTStateCount(5);
    z80.regs.pc = add16(z80.regs.pc, -2);
  }
  z80.regs.hl = dec16(z80.regs.hl);
});
decodeMapED.set(187, (z80) => {
  z80.incTStateCount(1);
  const value = z80.readByte(z80.regs.hl);
  z80.regs.b = dec8(z80.regs.b);
  z80.regs.memptr = dec16(z80.regs.bc);
  z80.writePort(z80.regs.bc, value);
  z80.regs.hl = dec16(z80.regs.hl);
  const other = add8(value, z80.regs.l);
  z80.regs.f = (value & 128 ? Flag.N : 0) | (other < value ? Flag.H | Flag.C : 0) | (z80.parityTable[other & 7 ^ z80.regs.b] ? Flag.P : 0) | z80.sz53Table[z80.regs.b];
  if (z80.regs.b > 0) {
    z80.incTStateCount(5);
    z80.regs.pc = add16(z80.regs.pc, -2);
  }
});
var decodeMapFD = /* @__PURE__ */ new Map();
decodeMapFD.set(9, (z80) => {
  let value;
  z80.incTStateCount(7);
  value = z80.regs.bc;
  let result = z80.regs.iy + value;
  const lookup = ((z80.regs.iy & 2048) >> 11 | (value & 2048) >> 10 | (result & 2048) >> 9) & 255;
  z80.regs.memptr = inc16(z80.regs.iy);
  z80.regs.iy = result & 65535;
  z80.regs.f = z80.regs.f & (Flag.V | Flag.Z | Flag.S) | ((result & 65536) !== 0 ? Flag.C : 0) | result >> 8 & (Flag.X3 | Flag.X5) | halfCarryAddTable[lookup];
});
decodeMapFD.set(25, (z80) => {
  let value;
  z80.incTStateCount(7);
  value = z80.regs.de;
  let result = z80.regs.iy + value;
  const lookup = ((z80.regs.iy & 2048) >> 11 | (value & 2048) >> 10 | (result & 2048) >> 9) & 255;
  z80.regs.memptr = inc16(z80.regs.iy);
  z80.regs.iy = result & 65535;
  z80.regs.f = z80.regs.f & (Flag.V | Flag.Z | Flag.S) | ((result & 65536) !== 0 ? Flag.C : 0) | result >> 8 & (Flag.X3 | Flag.X5) | halfCarryAddTable[lookup];
});
decodeMapFD.set(33, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  value = word2(z80.readByte(z80.regs.pc), value);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.iy = value;
});
decodeMapFD.set(34, (z80) => {
  let value;
  value = z80.regs.iy;
  let addr = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  addr = word2(z80.readByte(z80.regs.pc), addr);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.writeByte(addr, lo(value));
  addr = inc16(addr);
  z80.regs.memptr = addr;
  z80.writeByte(addr, hi(value));
});
decodeMapFD.set(35, (z80) => {
  let value;
  value = z80.regs.iy;
  const oldValue = value;
  z80.incTStateCount(2);
  value = inc16(value);
  z80.regs.iy = value;
});
decodeMapFD.set(36, (z80) => {
  let value;
  value = z80.regs.iyh;
  const oldValue = value;
  value = inc8(value);
  z80.regs.f = z80.regs.f & Flag.C | (value === 128 ? Flag.V : 0) | ((value & 15) !== 0 ? 0 : Flag.H) | z80.sz53Table[value];
  z80.regs.iyh = value;
});
decodeMapFD.set(37, (z80) => {
  let value;
  value = z80.regs.iyh;
  const oldValue = value;
  value = dec8(value);
  z80.regs.f = z80.regs.f & Flag.C | (value === 127 ? Flag.V : 0) | ((oldValue & 15) !== 0 ? 0 : Flag.H) | Flag.N | z80.sz53Table[value];
  z80.regs.iyh = value;
});
decodeMapFD.set(38, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.iyh = value;
});
decodeMapFD.set(41, (z80) => {
  let value;
  z80.incTStateCount(7);
  value = z80.regs.iy;
  let result = z80.regs.iy + value;
  const lookup = ((z80.regs.iy & 2048) >> 11 | (value & 2048) >> 10 | (result & 2048) >> 9) & 255;
  z80.regs.memptr = inc16(z80.regs.iy);
  z80.regs.iy = result & 65535;
  z80.regs.f = z80.regs.f & (Flag.V | Flag.Z | Flag.S) | ((result & 65536) !== 0 ? Flag.C : 0) | result >> 8 & (Flag.X3 | Flag.X5) | halfCarryAddTable[lookup];
});
decodeMapFD.set(42, (z80) => {
  let value;
  let addr = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  addr = word2(z80.readByte(z80.regs.pc), addr);
  z80.regs.pc = inc16(z80.regs.pc);
  value = z80.readByte(addr);
  z80.regs.memptr = inc16(addr);
  value = word2(z80.readByte(z80.regs.memptr), value);
  z80.regs.iy = value;
});
decodeMapFD.set(43, (z80) => {
  let value;
  value = z80.regs.iy;
  const oldValue = value;
  z80.incTStateCount(2);
  value = dec16(value);
  z80.regs.iy = value;
});
decodeMapFD.set(44, (z80) => {
  let value;
  value = z80.regs.iyl;
  const oldValue = value;
  value = inc8(value);
  z80.regs.f = z80.regs.f & Flag.C | (value === 128 ? Flag.V : 0) | ((value & 15) !== 0 ? 0 : Flag.H) | z80.sz53Table[value];
  z80.regs.iyl = value;
});
decodeMapFD.set(45, (z80) => {
  let value;
  value = z80.regs.iyl;
  const oldValue = value;
  value = dec8(value);
  z80.regs.f = z80.regs.f & Flag.C | (value === 127 ? Flag.V : 0) | ((oldValue & 15) !== 0 ? 0 : Flag.H) | Flag.N | z80.sz53Table[value];
  z80.regs.iyl = value;
});
decodeMapFD.set(46, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.iyl = value;
});
decodeMapFD.set(52, (z80) => {
  let value;
  const offset = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = add16(z80.regs.iy, signedByte(offset));
  value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  const oldValue = value;
  value = inc8(value);
  z80.regs.f = z80.regs.f & Flag.C | (value === 128 ? Flag.V : 0) | ((value & 15) !== 0 ? 0 : Flag.H) | z80.sz53Table[value];
  z80.writeByte(z80.regs.memptr, value);
});
decodeMapFD.set(53, (z80) => {
  let value;
  const offset = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = add16(z80.regs.iy, signedByte(offset));
  value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  const oldValue = value;
  value = dec8(value);
  z80.regs.f = z80.regs.f & Flag.C | (value === 127 ? Flag.V : 0) | ((oldValue & 15) !== 0 ? 0 : Flag.H) | Flag.N | z80.sz53Table[value];
  z80.writeByte(z80.regs.memptr, value);
});
decodeMapFD.set(54, (z80) => {
  const dd = z80.readByte(z80.regs.pc);
  z80.regs.pc = inc16(z80.regs.pc);
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.incTStateCount(2);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = z80.regs.iy + signedByte(dd) & 65535;
  z80.writeByte(z80.regs.memptr, value);
});
decodeMapFD.set(57, (z80) => {
  let value;
  z80.incTStateCount(7);
  value = z80.regs.sp;
  let result = z80.regs.iy + value;
  const lookup = ((z80.regs.iy & 2048) >> 11 | (value & 2048) >> 10 | (result & 2048) >> 9) & 255;
  z80.regs.memptr = inc16(z80.regs.iy);
  z80.regs.iy = result & 65535;
  z80.regs.f = z80.regs.f & (Flag.V | Flag.Z | Flag.S) | ((result & 65536) !== 0 ? Flag.C : 0) | result >> 8 & (Flag.X3 | Flag.X5) | halfCarryAddTable[lookup];
});
decodeMapFD.set(68, (z80) => {
  let value;
  value = z80.regs.iyh;
  z80.regs.b = value;
});
decodeMapFD.set(69, (z80) => {
  let value;
  value = z80.regs.iyl;
  z80.regs.b = value;
});
decodeMapFD.set(70, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = z80.regs.iy + signedByte(value) & 65535;
  value = z80.readByte(z80.regs.memptr);
  z80.regs.b = value;
});
decodeMapFD.set(76, (z80) => {
  let value;
  value = z80.regs.iyh;
  z80.regs.c = value;
});
decodeMapFD.set(77, (z80) => {
  let value;
  value = z80.regs.iyl;
  z80.regs.c = value;
});
decodeMapFD.set(78, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = z80.regs.iy + signedByte(value) & 65535;
  value = z80.readByte(z80.regs.memptr);
  z80.regs.c = value;
});
decodeMapFD.set(84, (z80) => {
  let value;
  value = z80.regs.iyh;
  z80.regs.d = value;
});
decodeMapFD.set(85, (z80) => {
  let value;
  value = z80.regs.iyl;
  z80.regs.d = value;
});
decodeMapFD.set(86, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = z80.regs.iy + signedByte(value) & 65535;
  value = z80.readByte(z80.regs.memptr);
  z80.regs.d = value;
});
decodeMapFD.set(92, (z80) => {
  let value;
  value = z80.regs.iyh;
  z80.regs.e = value;
});
decodeMapFD.set(93, (z80) => {
  let value;
  value = z80.regs.iyl;
  z80.regs.e = value;
});
decodeMapFD.set(94, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = z80.regs.iy + signedByte(value) & 65535;
  value = z80.readByte(z80.regs.memptr);
  z80.regs.e = value;
});
decodeMapFD.set(96, (z80) => {
  let value;
  value = z80.regs.b;
  z80.regs.iyh = value;
});
decodeMapFD.set(97, (z80) => {
  let value;
  value = z80.regs.c;
  z80.regs.iyh = value;
});
decodeMapFD.set(98, (z80) => {
  let value;
  value = z80.regs.d;
  z80.regs.iyh = value;
});
decodeMapFD.set(99, (z80) => {
  let value;
  value = z80.regs.e;
  z80.regs.iyh = value;
});
decodeMapFD.set(100, (z80) => {
  let value;
  value = z80.regs.iyh;
  z80.regs.iyh = value;
});
decodeMapFD.set(101, (z80) => {
  let value;
  value = z80.regs.iyl;
  z80.regs.iyh = value;
});
decodeMapFD.set(102, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = z80.regs.iy + signedByte(value) & 65535;
  value = z80.readByte(z80.regs.memptr);
  z80.regs.h = value;
});
decodeMapFD.set(103, (z80) => {
  let value;
  value = z80.regs.a;
  z80.regs.iyh = value;
});
decodeMapFD.set(104, (z80) => {
  let value;
  value = z80.regs.b;
  z80.regs.iyl = value;
});
decodeMapFD.set(105, (z80) => {
  let value;
  value = z80.regs.c;
  z80.regs.iyl = value;
});
decodeMapFD.set(106, (z80) => {
  let value;
  value = z80.regs.d;
  z80.regs.iyl = value;
});
decodeMapFD.set(107, (z80) => {
  let value;
  value = z80.regs.e;
  z80.regs.iyl = value;
});
decodeMapFD.set(108, (z80) => {
  let value;
  value = z80.regs.iyh;
  z80.regs.iyl = value;
});
decodeMapFD.set(109, (z80) => {
  let value;
  value = z80.regs.iyl;
  z80.regs.iyl = value;
});
decodeMapFD.set(110, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = z80.regs.iy + signedByte(value) & 65535;
  value = z80.readByte(z80.regs.memptr);
  z80.regs.l = value;
});
decodeMapFD.set(111, (z80) => {
  let value;
  value = z80.regs.a;
  z80.regs.iyl = value;
});
decodeMapFD.set(112, (z80) => {
  const dd = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  let value;
  value = z80.regs.b;
  z80.regs.memptr = z80.regs.iy + signedByte(dd) & 65535;
  z80.writeByte(z80.regs.memptr, value);
});
decodeMapFD.set(113, (z80) => {
  const dd = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  let value;
  value = z80.regs.c;
  z80.regs.memptr = z80.regs.iy + signedByte(dd) & 65535;
  z80.writeByte(z80.regs.memptr, value);
});
decodeMapFD.set(114, (z80) => {
  const dd = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  let value;
  value = z80.regs.d;
  z80.regs.memptr = z80.regs.iy + signedByte(dd) & 65535;
  z80.writeByte(z80.regs.memptr, value);
});
decodeMapFD.set(115, (z80) => {
  const dd = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  let value;
  value = z80.regs.e;
  z80.regs.memptr = z80.regs.iy + signedByte(dd) & 65535;
  z80.writeByte(z80.regs.memptr, value);
});
decodeMapFD.set(116, (z80) => {
  const dd = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  let value;
  value = z80.regs.h;
  z80.regs.memptr = z80.regs.iy + signedByte(dd) & 65535;
  z80.writeByte(z80.regs.memptr, value);
});
decodeMapFD.set(117, (z80) => {
  const dd = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  let value;
  value = z80.regs.l;
  z80.regs.memptr = z80.regs.iy + signedByte(dd) & 65535;
  z80.writeByte(z80.regs.memptr, value);
});
decodeMapFD.set(119, (z80) => {
  const dd = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  let value;
  value = z80.regs.a;
  z80.regs.memptr = z80.regs.iy + signedByte(dd) & 65535;
  z80.writeByte(z80.regs.memptr, value);
});
decodeMapFD.set(124, (z80) => {
  let value;
  value = z80.regs.iyh;
  z80.regs.a = value;
});
decodeMapFD.set(125, (z80) => {
  let value;
  value = z80.regs.iyl;
  z80.regs.a = value;
});
decodeMapFD.set(126, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = z80.regs.iy + signedByte(value) & 65535;
  value = z80.readByte(z80.regs.memptr);
  z80.regs.a = value;
});
decodeMapFD.set(132, (z80) => {
  let value;
  value = z80.regs.iyh;
  let result = add16(z80.regs.a, value);
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | halfCarryAddTable[lookup & 7] | overflowAddTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapFD.set(133, (z80) => {
  let value;
  value = z80.regs.iyl;
  let result = add16(z80.regs.a, value);
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | halfCarryAddTable[lookup & 7] | overflowAddTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapFD.set(134, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = z80.regs.iy + signedByte(value) & 65535;
  value = z80.readByte(z80.regs.memptr);
  let result = add16(z80.regs.a, value);
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | halfCarryAddTable[lookup & 7] | overflowAddTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapFD.set(140, (z80) => {
  let value;
  value = z80.regs.iyh;
  let result = add16(z80.regs.a, value);
  if ((z80.regs.f & Flag.C) !== 0) {
    result = inc16(result);
  }
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | halfCarryAddTable[lookup & 7] | overflowAddTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapFD.set(141, (z80) => {
  let value;
  value = z80.regs.iyl;
  let result = add16(z80.regs.a, value);
  if ((z80.regs.f & Flag.C) !== 0) {
    result = inc16(result);
  }
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | halfCarryAddTable[lookup & 7] | overflowAddTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapFD.set(142, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = z80.regs.iy + signedByte(value) & 65535;
  value = z80.readByte(z80.regs.memptr);
  let result = add16(z80.regs.a, value);
  if ((z80.regs.f & Flag.C) !== 0) {
    result = inc16(result);
  }
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | halfCarryAddTable[lookup & 7] | overflowAddTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapFD.set(148, (z80) => {
  let value;
  value = z80.regs.iyh;
  let result = sub16(z80.regs.a, value);
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | Flag.N | halfCarrySubTable[lookup & 7] | overflowSubTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapFD.set(149, (z80) => {
  let value;
  value = z80.regs.iyl;
  let result = sub16(z80.regs.a, value);
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | Flag.N | halfCarrySubTable[lookup & 7] | overflowSubTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapFD.set(150, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = z80.regs.iy + signedByte(value) & 65535;
  value = z80.readByte(z80.regs.memptr);
  let result = sub16(z80.regs.a, value);
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | Flag.N | halfCarrySubTable[lookup & 7] | overflowSubTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapFD.set(156, (z80) => {
  let value;
  value = z80.regs.iyh;
  let result = sub16(z80.regs.a, value);
  if ((z80.regs.f & Flag.C) !== 0) {
    result = dec16(result);
  }
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | Flag.N | halfCarrySubTable[lookup & 7] | overflowSubTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapFD.set(157, (z80) => {
  let value;
  value = z80.regs.iyl;
  let result = sub16(z80.regs.a, value);
  if ((z80.regs.f & Flag.C) !== 0) {
    result = dec16(result);
  }
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | Flag.N | halfCarrySubTable[lookup & 7] | overflowSubTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapFD.set(158, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = z80.regs.iy + signedByte(value) & 65535;
  value = z80.readByte(z80.regs.memptr);
  let result = sub16(z80.regs.a, value);
  if ((z80.regs.f & Flag.C) !== 0) {
    result = dec16(result);
  }
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (result & 136) >> 1) & 255;
  z80.regs.a = result & 255;
  z80.regs.f = ((result & 256) !== 0 ? Flag.C : 0) | Flag.N | halfCarrySubTable[lookup & 7] | overflowSubTable[lookup >> 4] | z80.sz53Table[z80.regs.a];
});
decodeMapFD.set(164, (z80) => {
  let value;
  value = z80.regs.iyh;
  z80.regs.a &= value;
  z80.regs.f = z80.sz53pTable[z80.regs.a];
  z80.regs.f |= Flag.H;
});
decodeMapFD.set(165, (z80) => {
  let value;
  value = z80.regs.iyl;
  z80.regs.a &= value;
  z80.regs.f = z80.sz53pTable[z80.regs.a];
  z80.regs.f |= Flag.H;
});
decodeMapFD.set(166, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = z80.regs.iy + signedByte(value) & 65535;
  value = z80.readByte(z80.regs.memptr);
  z80.regs.a &= value;
  z80.regs.f = z80.sz53pTable[z80.regs.a];
  z80.regs.f |= Flag.H;
});
decodeMapFD.set(172, (z80) => {
  let value;
  value = z80.regs.iyh;
  z80.regs.a ^= value;
  z80.regs.f = z80.sz53pTable[z80.regs.a];
});
decodeMapFD.set(173, (z80) => {
  let value;
  value = z80.regs.iyl;
  z80.regs.a ^= value;
  z80.regs.f = z80.sz53pTable[z80.regs.a];
});
decodeMapFD.set(174, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = z80.regs.iy + signedByte(value) & 65535;
  value = z80.readByte(z80.regs.memptr);
  z80.regs.a ^= value;
  z80.regs.f = z80.sz53pTable[z80.regs.a];
});
decodeMapFD.set(180, (z80) => {
  let value;
  value = z80.regs.iyh;
  z80.regs.a |= value;
  z80.regs.f = z80.sz53pTable[z80.regs.a];
});
decodeMapFD.set(181, (z80) => {
  let value;
  value = z80.regs.iyl;
  z80.regs.a |= value;
  z80.regs.f = z80.sz53pTable[z80.regs.a];
});
decodeMapFD.set(182, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = z80.regs.iy + signedByte(value) & 65535;
  value = z80.readByte(z80.regs.memptr);
  z80.regs.a |= value;
  z80.regs.f = z80.sz53pTable[z80.regs.a];
});
decodeMapFD.set(188, (z80) => {
  let value;
  value = z80.regs.iyh;
  const diff = z80.regs.a - value & 65535;
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (diff & 136) >> 1) & 255;
  let f = Flag.N;
  if ((diff & 256) != 0)
    f |= Flag.C;
  if (diff == 0)
    f |= Flag.Z;
  f |= halfCarrySubTable[lookup & 7];
  f |= overflowSubTable[lookup >> 4];
  f |= value & (Flag.X3 | Flag.X5);
  f |= diff & Flag.S;
  z80.regs.af = word2(z80.regs.a, f);
});
decodeMapFD.set(189, (z80) => {
  let value;
  value = z80.regs.iyl;
  const diff = z80.regs.a - value & 65535;
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (diff & 136) >> 1) & 255;
  let f = Flag.N;
  if ((diff & 256) != 0)
    f |= Flag.C;
  if (diff == 0)
    f |= Flag.Z;
  f |= halfCarrySubTable[lookup & 7];
  f |= overflowSubTable[lookup >> 4];
  f |= value & (Flag.X3 | Flag.X5);
  f |= diff & Flag.S;
  z80.regs.af = word2(z80.regs.a, f);
});
decodeMapFD.set(190, (z80) => {
  let value;
  value = z80.readByte(z80.regs.pc);
  z80.incTStateCount(5);
  z80.regs.pc = inc16(z80.regs.pc);
  z80.regs.memptr = z80.regs.iy + signedByte(value) & 65535;
  value = z80.readByte(z80.regs.memptr);
  const diff = z80.regs.a - value & 65535;
  const lookup = ((z80.regs.a & 136) >> 3 | (value & 136) >> 2 | (diff & 136) >> 1) & 255;
  let f = Flag.N;
  if ((diff & 256) != 0)
    f |= Flag.C;
  if (diff == 0)
    f |= Flag.Z;
  f |= halfCarrySubTable[lookup & 7];
  f |= overflowSubTable[lookup >> 4];
  f |= value & (Flag.X3 | Flag.X5);
  f |= diff & Flag.S;
  z80.regs.af = word2(z80.regs.a, f);
});
decodeMapFD.set(203, (z80) => {
  decodeFDCB(z80);
});
decodeMapFD.set(225, (z80) => {
  z80.regs.iy = z80.popWord();
});
decodeMapFD.set(227, (z80) => {
  const rightValue = z80.regs.iy;
  const leftValueL = z80.readByte(z80.regs.sp);
  const leftValueH = z80.readByte(inc16(z80.regs.sp));
  z80.incTStateCount(1);
  z80.writeByte(inc16(z80.regs.sp), hi(rightValue));
  z80.writeByte(z80.regs.sp, lo(rightValue));
  z80.incTStateCount(2);
  z80.regs.memptr = word2(leftValueH, leftValueL);
  z80.regs.iy = word2(leftValueH, leftValueL);
});
decodeMapFD.set(229, (z80) => {
  z80.incTStateCount(1);
  z80.pushWord(z80.regs.iy);
});
decodeMapFD.set(233, (z80) => {
  z80.regs.pc = z80.regs.iy;
});
decodeMapFD.set(249, (z80) => {
  let value;
  value = z80.regs.iy;
  z80.incTStateCount(2);
  z80.regs.sp = value;
});
var decodeMapFDCB = /* @__PURE__ */ new Map();
decodeMapFDCB.set(0, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.b;
    const oldValue = value;
    value = (value << 1 | value >> 7) & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.b = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapFDCB.set(1, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.c;
    const oldValue = value;
    value = (value << 1 | value >> 7) & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.c = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapFDCB.set(2, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.d;
    const oldValue = value;
    value = (value << 1 | value >> 7) & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.d = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapFDCB.set(3, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.e;
    const oldValue = value;
    value = (value << 1 | value >> 7) & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.e = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapFDCB.set(4, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.h;
    const oldValue = value;
    value = (value << 1 | value >> 7) & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.h = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapFDCB.set(5, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.l;
    const oldValue = value;
    value = (value << 1 | value >> 7) & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.l = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapFDCB.set(6, (z80) => {
  let value;
  value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  const oldValue = value;
  value = (value << 1 | value >> 7) & 255;
  z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.writeByte(z80.regs.memptr, value);
});
decodeMapFDCB.set(7, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.a;
    const oldValue = value;
    value = (value << 1 | value >> 7) & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.a = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
decodeMapFDCB.set(8, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.b;
    const oldValue = value;
    value = (value >> 1 | value << 7) & 255;
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.b = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapFDCB.set(9, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.c;
    const oldValue = value;
    value = (value >> 1 | value << 7) & 255;
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.c = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapFDCB.set(10, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.d;
    const oldValue = value;
    value = (value >> 1 | value << 7) & 255;
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.d = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapFDCB.set(11, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.e;
    const oldValue = value;
    value = (value >> 1 | value << 7) & 255;
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.e = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapFDCB.set(12, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.h;
    const oldValue = value;
    value = (value >> 1 | value << 7) & 255;
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.h = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapFDCB.set(13, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.l;
    const oldValue = value;
    value = (value >> 1 | value << 7) & 255;
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.l = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapFDCB.set(14, (z80) => {
  let value;
  value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  const oldValue = value;
  value = (value >> 1 | value << 7) & 255;
  z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.writeByte(z80.regs.memptr, value);
});
decodeMapFDCB.set(15, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.a;
    const oldValue = value;
    value = (value >> 1 | value << 7) & 255;
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.a = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
decodeMapFDCB.set(16, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.b;
    const oldValue = value;
    value = (value << 1 | ((z80.regs.f & Flag.C) !== 0 ? 1 : 0)) & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.b = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapFDCB.set(17, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.c;
    const oldValue = value;
    value = (value << 1 | ((z80.regs.f & Flag.C) !== 0 ? 1 : 0)) & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.c = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapFDCB.set(18, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.d;
    const oldValue = value;
    value = (value << 1 | ((z80.regs.f & Flag.C) !== 0 ? 1 : 0)) & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.d = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapFDCB.set(19, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.e;
    const oldValue = value;
    value = (value << 1 | ((z80.regs.f & Flag.C) !== 0 ? 1 : 0)) & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.e = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapFDCB.set(20, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.h;
    const oldValue = value;
    value = (value << 1 | ((z80.regs.f & Flag.C) !== 0 ? 1 : 0)) & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.h = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapFDCB.set(21, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.l;
    const oldValue = value;
    value = (value << 1 | ((z80.regs.f & Flag.C) !== 0 ? 1 : 0)) & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.l = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapFDCB.set(22, (z80) => {
  let value;
  value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  const oldValue = value;
  value = (value << 1 | ((z80.regs.f & Flag.C) !== 0 ? 1 : 0)) & 255;
  z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.writeByte(z80.regs.memptr, value);
});
decodeMapFDCB.set(23, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.a;
    const oldValue = value;
    value = (value << 1 | ((z80.regs.f & Flag.C) !== 0 ? 1 : 0)) & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.a = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
decodeMapFDCB.set(24, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.b;
    const oldValue = value;
    value = value >> 1 | ((z80.regs.f & Flag.C) !== 0 ? 128 : 0);
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.b = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapFDCB.set(25, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.c;
    const oldValue = value;
    value = value >> 1 | ((z80.regs.f & Flag.C) !== 0 ? 128 : 0);
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.c = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapFDCB.set(26, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.d;
    const oldValue = value;
    value = value >> 1 | ((z80.regs.f & Flag.C) !== 0 ? 128 : 0);
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.d = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapFDCB.set(27, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.e;
    const oldValue = value;
    value = value >> 1 | ((z80.regs.f & Flag.C) !== 0 ? 128 : 0);
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.e = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapFDCB.set(28, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.h;
    const oldValue = value;
    value = value >> 1 | ((z80.regs.f & Flag.C) !== 0 ? 128 : 0);
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.h = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapFDCB.set(29, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.l;
    const oldValue = value;
    value = value >> 1 | ((z80.regs.f & Flag.C) !== 0 ? 128 : 0);
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.l = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapFDCB.set(30, (z80) => {
  let value;
  value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  const oldValue = value;
  value = value >> 1 | ((z80.regs.f & Flag.C) !== 0 ? 128 : 0);
  z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.writeByte(z80.regs.memptr, value);
});
decodeMapFDCB.set(31, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.a;
    const oldValue = value;
    value = value >> 1 | ((z80.regs.f & Flag.C) !== 0 ? 128 : 0);
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.a = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
decodeMapFDCB.set(32, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.b;
    const oldValue = value;
    value = value << 1 & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.b = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapFDCB.set(33, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.c;
    const oldValue = value;
    value = value << 1 & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.c = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapFDCB.set(34, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.d;
    const oldValue = value;
    value = value << 1 & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.d = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapFDCB.set(35, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.e;
    const oldValue = value;
    value = value << 1 & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.e = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapFDCB.set(36, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.h;
    const oldValue = value;
    value = value << 1 & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.h = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapFDCB.set(37, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.l;
    const oldValue = value;
    value = value << 1 & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.l = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapFDCB.set(38, (z80) => {
  let value;
  value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  const oldValue = value;
  value = value << 1 & 255;
  z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.writeByte(z80.regs.memptr, value);
});
decodeMapFDCB.set(39, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.a;
    const oldValue = value;
    value = value << 1 & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.a = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
decodeMapFDCB.set(40, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.b;
    const oldValue = value;
    value = value & 128 | value >> 1;
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.b = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapFDCB.set(41, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.c;
    const oldValue = value;
    value = value & 128 | value >> 1;
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.c = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapFDCB.set(42, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.d;
    const oldValue = value;
    value = value & 128 | value >> 1;
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.d = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapFDCB.set(43, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.e;
    const oldValue = value;
    value = value & 128 | value >> 1;
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.e = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapFDCB.set(44, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.h;
    const oldValue = value;
    value = value & 128 | value >> 1;
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.h = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapFDCB.set(45, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.l;
    const oldValue = value;
    value = value & 128 | value >> 1;
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.l = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapFDCB.set(46, (z80) => {
  let value;
  value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  const oldValue = value;
  value = value & 128 | value >> 1;
  z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.writeByte(z80.regs.memptr, value);
});
decodeMapFDCB.set(47, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.a;
    const oldValue = value;
    value = value & 128 | value >> 1;
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.a = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
decodeMapFDCB.set(48, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.b;
    const oldValue = value;
    value = (value << 1 | 1) & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.b = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapFDCB.set(49, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.c;
    const oldValue = value;
    value = (value << 1 | 1) & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.c = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapFDCB.set(50, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.d;
    const oldValue = value;
    value = (value << 1 | 1) & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.d = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapFDCB.set(51, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.e;
    const oldValue = value;
    value = (value << 1 | 1) & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.e = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapFDCB.set(52, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.h;
    const oldValue = value;
    value = (value << 1 | 1) & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.h = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapFDCB.set(53, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.l;
    const oldValue = value;
    value = (value << 1 | 1) & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.l = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapFDCB.set(54, (z80) => {
  let value;
  value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  const oldValue = value;
  value = (value << 1 | 1) & 255;
  z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.writeByte(z80.regs.memptr, value);
});
decodeMapFDCB.set(55, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.a;
    const oldValue = value;
    value = (value << 1 | 1) & 255;
    z80.regs.f = ((oldValue & 128) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.a = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
decodeMapFDCB.set(56, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.b;
    const oldValue = value;
    value = value >> 1;
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.b = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapFDCB.set(57, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.c;
    const oldValue = value;
    value = value >> 1;
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.c = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapFDCB.set(58, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.d;
    const oldValue = value;
    value = value >> 1;
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.d = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapFDCB.set(59, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.e;
    const oldValue = value;
    value = value >> 1;
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.e = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapFDCB.set(60, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.h;
    const oldValue = value;
    value = value >> 1;
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.h = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapFDCB.set(61, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.l;
    const oldValue = value;
    value = value >> 1;
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.l = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapFDCB.set(62, (z80) => {
  let value;
  value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  const oldValue = value;
  value = value >> 1;
  z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
  z80.writeByte(z80.regs.memptr, value);
});
decodeMapFDCB.set(63, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  {
    let value;
    value = z80.regs.a;
    const oldValue = value;
    value = value >> 1;
    z80.regs.f = ((oldValue & 1) !== 0 ? Flag.C : 0) | z80.sz53pTable[value];
    z80.regs.a = value;
  }
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
decodeMapFDCB.set(71, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  const hiddenValue = hi(z80.regs.memptr);
  z80.incTStateCount(1);
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 1) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapFDCB.set(64, decodeMapFDCB.get(71));
decodeMapFDCB.set(65, decodeMapFDCB.get(71));
decodeMapFDCB.set(66, decodeMapFDCB.get(71));
decodeMapFDCB.set(67, decodeMapFDCB.get(71));
decodeMapFDCB.set(68, decodeMapFDCB.get(71));
decodeMapFDCB.set(69, decodeMapFDCB.get(71));
decodeMapFDCB.set(70, decodeMapFDCB.get(71));
decodeMapFDCB.set(79, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  const hiddenValue = hi(z80.regs.memptr);
  z80.incTStateCount(1);
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 2) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapFDCB.set(72, decodeMapFDCB.get(79));
decodeMapFDCB.set(73, decodeMapFDCB.get(79));
decodeMapFDCB.set(74, decodeMapFDCB.get(79));
decodeMapFDCB.set(75, decodeMapFDCB.get(79));
decodeMapFDCB.set(76, decodeMapFDCB.get(79));
decodeMapFDCB.set(77, decodeMapFDCB.get(79));
decodeMapFDCB.set(78, decodeMapFDCB.get(79));
decodeMapFDCB.set(87, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  const hiddenValue = hi(z80.regs.memptr);
  z80.incTStateCount(1);
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 4) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapFDCB.set(80, decodeMapFDCB.get(87));
decodeMapFDCB.set(81, decodeMapFDCB.get(87));
decodeMapFDCB.set(82, decodeMapFDCB.get(87));
decodeMapFDCB.set(83, decodeMapFDCB.get(87));
decodeMapFDCB.set(84, decodeMapFDCB.get(87));
decodeMapFDCB.set(85, decodeMapFDCB.get(87));
decodeMapFDCB.set(86, decodeMapFDCB.get(87));
decodeMapFDCB.set(95, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  const hiddenValue = hi(z80.regs.memptr);
  z80.incTStateCount(1);
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 8) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapFDCB.set(88, decodeMapFDCB.get(95));
decodeMapFDCB.set(89, decodeMapFDCB.get(95));
decodeMapFDCB.set(90, decodeMapFDCB.get(95));
decodeMapFDCB.set(91, decodeMapFDCB.get(95));
decodeMapFDCB.set(92, decodeMapFDCB.get(95));
decodeMapFDCB.set(93, decodeMapFDCB.get(95));
decodeMapFDCB.set(94, decodeMapFDCB.get(95));
decodeMapFDCB.set(103, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  const hiddenValue = hi(z80.regs.memptr);
  z80.incTStateCount(1);
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 16) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapFDCB.set(96, decodeMapFDCB.get(103));
decodeMapFDCB.set(97, decodeMapFDCB.get(103));
decodeMapFDCB.set(98, decodeMapFDCB.get(103));
decodeMapFDCB.set(99, decodeMapFDCB.get(103));
decodeMapFDCB.set(100, decodeMapFDCB.get(103));
decodeMapFDCB.set(101, decodeMapFDCB.get(103));
decodeMapFDCB.set(102, decodeMapFDCB.get(103));
decodeMapFDCB.set(111, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  const hiddenValue = hi(z80.regs.memptr);
  z80.incTStateCount(1);
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 32) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapFDCB.set(104, decodeMapFDCB.get(111));
decodeMapFDCB.set(105, decodeMapFDCB.get(111));
decodeMapFDCB.set(106, decodeMapFDCB.get(111));
decodeMapFDCB.set(107, decodeMapFDCB.get(111));
decodeMapFDCB.set(108, decodeMapFDCB.get(111));
decodeMapFDCB.set(109, decodeMapFDCB.get(111));
decodeMapFDCB.set(110, decodeMapFDCB.get(111));
decodeMapFDCB.set(119, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  const hiddenValue = hi(z80.regs.memptr);
  z80.incTStateCount(1);
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 64) === 0) {
    f |= Flag.P | Flag.Z;
  }
  z80.regs.f = f;
});
decodeMapFDCB.set(112, decodeMapFDCB.get(119));
decodeMapFDCB.set(113, decodeMapFDCB.get(119));
decodeMapFDCB.set(114, decodeMapFDCB.get(119));
decodeMapFDCB.set(115, decodeMapFDCB.get(119));
decodeMapFDCB.set(116, decodeMapFDCB.get(119));
decodeMapFDCB.set(117, decodeMapFDCB.get(119));
decodeMapFDCB.set(118, decodeMapFDCB.get(119));
decodeMapFDCB.set(127, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  const hiddenValue = hi(z80.regs.memptr);
  z80.incTStateCount(1);
  let f = z80.regs.f & Flag.C | Flag.H | hiddenValue & (Flag.X3 | Flag.X5);
  if ((value & 128) === 0) {
    f |= Flag.P | Flag.Z;
  }
  if ((value & 128) !== 0) {
    f |= Flag.S;
  }
  z80.regs.f = f;
});
decodeMapFDCB.set(120, decodeMapFDCB.get(127));
decodeMapFDCB.set(121, decodeMapFDCB.get(127));
decodeMapFDCB.set(122, decodeMapFDCB.get(127));
decodeMapFDCB.set(123, decodeMapFDCB.get(127));
decodeMapFDCB.set(124, decodeMapFDCB.get(127));
decodeMapFDCB.set(125, decodeMapFDCB.get(127));
decodeMapFDCB.set(126, decodeMapFDCB.get(127));
decodeMapFDCB.set(128, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr) & 254;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapFDCB.set(129, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr) & 254;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapFDCB.set(130, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr) & 254;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapFDCB.set(131, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr) & 254;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapFDCB.set(132, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr) & 254;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapFDCB.set(133, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr) & 254;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapFDCB.set(134, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, value & 254);
});
decodeMapFDCB.set(135, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr) & 254;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
decodeMapFDCB.set(136, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr) & 253;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapFDCB.set(137, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr) & 253;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapFDCB.set(138, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr) & 253;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapFDCB.set(139, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr) & 253;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapFDCB.set(140, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr) & 253;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapFDCB.set(141, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr) & 253;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapFDCB.set(142, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, value & 253);
});
decodeMapFDCB.set(143, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr) & 253;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
decodeMapFDCB.set(144, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr) & 251;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapFDCB.set(145, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr) & 251;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapFDCB.set(146, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr) & 251;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapFDCB.set(147, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr) & 251;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapFDCB.set(148, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr) & 251;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapFDCB.set(149, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr) & 251;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapFDCB.set(150, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, value & 251);
});
decodeMapFDCB.set(151, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr) & 251;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
decodeMapFDCB.set(152, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr) & 247;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapFDCB.set(153, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr) & 247;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapFDCB.set(154, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr) & 247;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapFDCB.set(155, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr) & 247;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapFDCB.set(156, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr) & 247;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapFDCB.set(157, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr) & 247;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapFDCB.set(158, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, value & 247);
});
decodeMapFDCB.set(159, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr) & 247;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
decodeMapFDCB.set(160, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr) & 239;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapFDCB.set(161, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr) & 239;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapFDCB.set(162, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr) & 239;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapFDCB.set(163, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr) & 239;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapFDCB.set(164, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr) & 239;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapFDCB.set(165, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr) & 239;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapFDCB.set(166, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, value & 239);
});
decodeMapFDCB.set(167, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr) & 239;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
decodeMapFDCB.set(168, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr) & 223;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapFDCB.set(169, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr) & 223;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapFDCB.set(170, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr) & 223;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapFDCB.set(171, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr) & 223;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapFDCB.set(172, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr) & 223;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapFDCB.set(173, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr) & 223;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapFDCB.set(174, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, value & 223);
});
decodeMapFDCB.set(175, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr) & 223;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
decodeMapFDCB.set(176, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr) & 191;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapFDCB.set(177, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr) & 191;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapFDCB.set(178, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr) & 191;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapFDCB.set(179, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr) & 191;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapFDCB.set(180, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr) & 191;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapFDCB.set(181, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr) & 191;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapFDCB.set(182, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, value & 191);
});
decodeMapFDCB.set(183, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr) & 191;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
decodeMapFDCB.set(184, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr) & 127;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapFDCB.set(185, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr) & 127;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapFDCB.set(186, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr) & 127;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapFDCB.set(187, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr) & 127;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapFDCB.set(188, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr) & 127;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapFDCB.set(189, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr) & 127;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapFDCB.set(190, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, value & 127);
});
decodeMapFDCB.set(191, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr) & 127;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
decodeMapFDCB.set(192, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr) | 1;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapFDCB.set(193, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr) | 1;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapFDCB.set(194, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr) | 1;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapFDCB.set(195, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr) | 1;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapFDCB.set(196, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr) | 1;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapFDCB.set(197, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr) | 1;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapFDCB.set(198, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, value | 1);
});
decodeMapFDCB.set(199, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr) | 1;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
decodeMapFDCB.set(200, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr) | 2;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapFDCB.set(201, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr) | 2;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapFDCB.set(202, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr) | 2;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapFDCB.set(203, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr) | 2;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapFDCB.set(204, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr) | 2;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapFDCB.set(205, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr) | 2;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapFDCB.set(206, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, value | 2);
});
decodeMapFDCB.set(207, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr) | 2;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
decodeMapFDCB.set(208, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr) | 4;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapFDCB.set(209, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr) | 4;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapFDCB.set(210, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr) | 4;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapFDCB.set(211, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr) | 4;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapFDCB.set(212, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr) | 4;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapFDCB.set(213, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr) | 4;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapFDCB.set(214, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, value | 4);
});
decodeMapFDCB.set(215, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr) | 4;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
decodeMapFDCB.set(216, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr) | 8;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapFDCB.set(217, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr) | 8;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapFDCB.set(218, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr) | 8;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapFDCB.set(219, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr) | 8;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapFDCB.set(220, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr) | 8;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapFDCB.set(221, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr) | 8;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapFDCB.set(222, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, value | 8);
});
decodeMapFDCB.set(223, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr) | 8;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
decodeMapFDCB.set(224, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr) | 16;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapFDCB.set(225, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr) | 16;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapFDCB.set(226, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr) | 16;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapFDCB.set(227, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr) | 16;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapFDCB.set(228, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr) | 16;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapFDCB.set(229, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr) | 16;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapFDCB.set(230, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, value | 16);
});
decodeMapFDCB.set(231, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr) | 16;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
decodeMapFDCB.set(232, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr) | 32;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapFDCB.set(233, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr) | 32;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapFDCB.set(234, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr) | 32;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapFDCB.set(235, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr) | 32;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapFDCB.set(236, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr) | 32;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapFDCB.set(237, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr) | 32;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapFDCB.set(238, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, value | 32);
});
decodeMapFDCB.set(239, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr) | 32;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
decodeMapFDCB.set(240, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr) | 64;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapFDCB.set(241, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr) | 64;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapFDCB.set(242, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr) | 64;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapFDCB.set(243, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr) | 64;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapFDCB.set(244, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr) | 64;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapFDCB.set(245, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr) | 64;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapFDCB.set(246, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, value | 64);
});
decodeMapFDCB.set(247, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr) | 64;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
decodeMapFDCB.set(248, (z80) => {
  z80.regs.b = z80.readByte(z80.regs.memptr) | 128;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.b);
});
decodeMapFDCB.set(249, (z80) => {
  z80.regs.c = z80.readByte(z80.regs.memptr) | 128;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.c);
});
decodeMapFDCB.set(250, (z80) => {
  z80.regs.d = z80.readByte(z80.regs.memptr) | 128;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.d);
});
decodeMapFDCB.set(251, (z80) => {
  z80.regs.e = z80.readByte(z80.regs.memptr) | 128;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.e);
});
decodeMapFDCB.set(252, (z80) => {
  z80.regs.h = z80.readByte(z80.regs.memptr) | 128;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.h);
});
decodeMapFDCB.set(253, (z80) => {
  z80.regs.l = z80.readByte(z80.regs.memptr) | 128;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.l);
});
decodeMapFDCB.set(254, (z80) => {
  const value = z80.readByte(z80.regs.memptr);
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, value | 128);
});
decodeMapFDCB.set(255, (z80) => {
  z80.regs.a = z80.readByte(z80.regs.memptr) | 128;
  z80.incTStateCount(1);
  z80.writeByte(z80.regs.memptr, z80.regs.a);
});
function fetchInstruction(z80) {
  z80.incTStateCount(4);
  const inst = z80.readByteInternal(z80.regs.pc);
  z80.regs.pc = z80.regs.pc + 1 & 65535;
  z80.regs.r = z80.regs.r + 1 & 255;
  return inst;
}
function decodeCB(z80) {
  const inst = fetchInstruction(z80);
  const func = decodeMapCB.get(inst);
  if (func === void 0) {
    console.log("Unhandled opcode in CB: " + toHex(inst, 2));
  } else {
    func(z80);
  }
}
function decodeDD(z80) {
  const inst = fetchInstruction(z80);
  const func = decodeMapDD.get(inst);
  if (func === void 0) {
    console.log("Unhandled opcode in DD: " + toHex(inst, 2));
  } else {
    func(z80);
  }
}
function decodeDDCB(z80) {
  z80.incTStateCount(3);
  const offset = z80.readByteInternal(z80.regs.pc);
  z80.regs.memptr = add16(z80.regs.ix, signedByte(offset));
  z80.regs.pc = inc16(z80.regs.pc);
  z80.incTStateCount(3);
  const inst = z80.readByteInternal(z80.regs.pc);
  z80.incTStateCount(2);
  z80.regs.pc = inc16(z80.regs.pc);
  const func = decodeMapDDCB.get(inst);
  if (func === void 0) {
    console.log("Unhandled opcode in DDCB: " + toHex(inst, 2));
  } else {
    func(z80);
  }
}
function decodeED(z80) {
  const inst = fetchInstruction(z80);
  const func = decodeMapED.get(inst);
  if (func === void 0) {
    console.log("Unhandled opcode in ED: " + toHex(inst, 2));
  } else {
    func(z80);
  }
}
function decodeFD(z80) {
  const inst = fetchInstruction(z80);
  const func = decodeMapFD.get(inst);
  if (func === void 0) {
    console.log("Unhandled opcode in FD: " + toHex(inst, 2));
  } else {
    func(z80);
  }
}
function decodeFDCB(z80) {
  z80.incTStateCount(3);
  const offset = z80.readByteInternal(z80.regs.pc);
  z80.regs.memptr = add16(z80.regs.iy, signedByte(offset));
  z80.regs.pc = inc16(z80.regs.pc);
  z80.incTStateCount(3);
  const inst = z80.readByteInternal(z80.regs.pc);
  z80.incTStateCount(2);
  z80.regs.pc = inc16(z80.regs.pc);
  const func = decodeMapFDCB.get(inst);
  if (func === void 0) {
    console.log("Unhandled opcode in FDCB: " + toHex(inst, 2));
  } else {
    func(z80);
  }
}
function decode(z80) {
  const inst = fetchInstruction(z80);
  const func = decodeMapBASE.get(inst);
  if (func === void 0) {
    console.log("Unhandled opcode " + toHex(inst, 2));
  } else {
    func(z80);
  }
}

// node_modules/z80-emulator/dist/Z80.js
var Z80 = class {
  constructor(hal) {
    this.regs = new RegisterSet();
    this.sz53Table = [];
    this.parityTable = [];
    this.sz53pTable = [];
    this.hal = hal;
    this.initTables();
  }
  /**
   * Reset the Z80 to a known state.
   */
  reset() {
    this.regs = new RegisterSet();
  }
  /**
   * Execute one instruction.
   */
  step() {
    decode(this);
  }
  /**
   * Increment the clock count.
   */
  incTStateCount(count) {
    this.hal.tStateCount += count;
  }
  /**
   * Interrupt the CPU with a maskable interrupt
   */
  maskableInterrupt() {
    if (this.regs.iff1 !== 0) {
      this.interrupt(true);
    }
  }
  /**
   * Interrupt the CPU with a non-maskable interrupt
   */
  nonMaskableInterrupt() {
    this.interrupt(false);
  }
  /**
   * Read a byte from memory, taking as many clock cycles as necessary.
   */
  readByte(address3) {
    this.incTStateCount(3);
    return this.readByteInternal(address3);
  }
  /**
   * Reads a word at the specified address. Reads the low byte first.
   */
  readWord(address3) {
    const lowByte = this.readByte(address3);
    const highByte = this.readByte(address3 + 1);
    return word2(highByte, lowByte);
  }
  /**
   * Read a byte from memory (not affecting clock).
   */
  readByteInternal(address3) {
    return this.hal.readMemory(address3);
  }
  /**
   * Write a byte to memory, taking as many clock cycles as necessary.
   */
  writeByte(address3, value) {
    this.incTStateCount(3);
    this.writeByteInternal(address3, value);
  }
  /**
   * Write a byte to memory (not affecting clock).
   */
  writeByteInternal(address3, value) {
    this.hal.writeMemory(address3, value);
  }
  /**
   * Write a byte to a port, taking as many clock cycles as necessary.
   */
  writePort(address3, value) {
    this.incTStateCount(1);
    this.hal.writePort(address3, value);
    this.incTStateCount(3);
  }
  /**
   * Read a byte from a port, taking as many clock cycles as necessary.
   */
  readPort(address3) {
    this.incTStateCount(1);
    const value = this.hal.readPort(address3);
    this.incTStateCount(3);
    return value;
  }
  /**
   * Push a word on the stack.
   */
  pushWord(value) {
    this.pushByte(hi(value));
    this.pushByte(lo(value));
  }
  /**
   * Push a byte on the stack.
   */
  pushByte(value) {
    this.regs.sp = this.regs.sp - 1 & 65535;
    this.writeByte(this.regs.sp, value);
  }
  /**
   * Pop a word from the stack.
   */
  popWord() {
    const lowByte = this.popByte();
    const highByte = this.popByte();
    return word2(highByte, lowByte);
  }
  /**
   * Pop a byte from the stack.
   */
  popByte() {
    const value = this.readByte(this.regs.sp);
    this.regs.sp = inc16(this.regs.sp);
    return value;
  }
  /**
   * Process either kind of interrupt. If maskable, assumes that
   * the mask has already been checked.
   */
  interrupt(maskable) {
    if (this.regs.halted) {
      this.regs.pc++;
      this.regs.halted = 0;
    }
    this.incTStateCount(7);
    this.regs.r += 1;
    this.regs.iff1 = 0;
    this.regs.iff2 = 0;
    this.pushWord(this.regs.pc);
    if (maskable) {
      switch (this.regs.im) {
        case 0:
        case 1:
          this.regs.pc = 56;
          break;
        case 2: {
          const address3 = word2(this.regs.i, 255);
          this.regs.pc = this.readWord(address3);
          break;
        }
        default:
          throw new Error("Unknown im mode " + this.regs.im);
      }
    } else {
      this.regs.pc = 102;
    }
  }
  initTables() {
    for (let i = 0; i < 256; i++) {
      this.sz53Table.push(i & (Flag.X3 | Flag.X5 | Flag.S));
      let bits = i;
      let parity = 0;
      for (let bit2 = 0; bit2 < 8; bit2++) {
        parity ^= bits & 1;
        bits >>= 1;
      }
      this.parityTable.push(parity ? 0 : Flag.P);
      this.sz53pTable.push(this.sz53Table[i] | this.parityTable[i]);
    }
    this.sz53Table[0] |= Flag.Z;
    this.sz53pTable[0] |= Flag.Z;
  }
};

// runtime.js
async function runQueena(source, wasmBytes) {
  const start = performance.now();
  let output = "", assembly = "", ast = null, tokens = [];
  try {
    let put = function(ch) {
      if (output.length >= 16384) throw Error("\u51FA\u529B\u304C16 KiB\u3092\u8D85\u3048\u305F\u305F\u3081\u505C\u6B62\u3057\u307E\u3057\u305F\u3002");
      output += String.fromCharCode(ch);
    };
    if (typeof source !== "string" || !source.trim()) throw Error("\u30B3\u30FC\u30C9\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
    const bytes = new TextEncoder().encode(source);
    if (bytes.length > 16384) throw Error("\u30B3\u30FC\u30C9\u306F16 KiB\u4EE5\u5185\u306B\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
    const { instance } = await WebAssembly.instantiate(wasmBytes);
    const e = instance.exports;
    new Uint8Array(e.memory.buffer, e.input_ptr(), bytes.length).set(bytes);
    const status = e.compile(bytes.length);
    if (e.tokens_length() > 0) tokens = JSON.parse(new TextDecoder().decode(new Uint8Array(e.memory.buffer, e.tokens_ptr(), e.tokens_length())));
    if (e.ast_length() > 0) ast = JSON.parse(new TextDecoder().decode(new Uint8Array(e.memory.buffer, e.ast_ptr(), e.ast_length())));
    assembly = new TextDecoder().decode(new Uint8Array(e.memory.buffer, e.output_ptr(), e.output_len()));
    if (status) throw Error(assembly);
    const built = assemble(assembly);
    if (!built.ok) throw Error(built.diagnostics.filter((d) => d.severity === "error").map((d) => `${d.line}:${d.column}: ${d.message}`).join("\n"));
    const mem = new Uint8Array(65536);
    mem.fill(165);
    mem[5] = 201;
    let binaryBytes = 0;
    for (const line of built.listing) {
      if (!line.bytes.length) continue;
      if (line.load === null || line.load < 256 || line.load + line.bytes.length >= 28672) throw Error("\u751F\u6210\u30D7\u30ED\u30B0\u30E9\u30E0\u304C\u5B89\u5168\u306A\u30B3\u30FC\u30C9\u9818\u57DF\u3092\u8D85\u3048\u307E\u3057\u305F\u3002");
      mem.set(line.bytes, line.load);
      binaryBytes += line.bytes.length;
    }
    const hal = { tStateCount: 0, readMemory: (a) => mem[a & 65535], writeMemory: (a, v) => {
      mem[a & 65535] = v & 255;
    }, contendMemory() {
    }, readPort: () => 255, writePort() {
    }, contendPort() {
    } };
    const cpu = new Z80(hal);
    cpu.regs.pc = 256;
    cpu.regs.sp = 61440;
    let count = 0;
    while (cpu.regs.pc !== 0) {
      if (++count > 5e6) throw Error("\u547D\u4EE4\u5B9F\u884C\u4E0A\u9650\u306B\u9054\u3057\u307E\u3057\u305F\u3002\u7E70\u308A\u8FD4\u3057\u6761\u4EF6\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
      if ((count & 4095) === 0 && performance.now() - start > 2500) throw Error("\u5B9F\u884C\u6642\u9593\u306E\u4E0A\u9650\u306B\u9054\u3057\u307E\u3057\u305F\u3002");
      if (cpu.regs.pc === 5) {
        const fn = cpu.regs.c;
        if (fn === 2) put(cpu.regs.e);
        else if (fn === 9) {
          let a = cpu.regs.de, i = 0;
          while (mem[a] !== 36) {
            if (++i > 16384) throw Error("CP/M\u6587\u5B57\u5217\u51FA\u529B\u304C\u4E0A\u9650\u3092\u8D85\u3048\u307E\u3057\u305F\u3002");
            put(mem[a]);
            a = a + 1 & 65535;
          }
        } else throw Error(`\u672A\u5BFE\u5FDC\u306ECP/M\u30B3\u30F3\u30BD\u30FC\u30EB\u547C\u3073\u51FA\u3057: ${fn}`);
      }
      cpu.step();
      if (cpu.regs.halted) throw Error("\u30D7\u30ED\u30B0\u30E9\u30E0\u304CHALT\u3067\u505C\u6B62\u3057\u307E\u3057\u305F\u3002");
    }
    if (output.includes("Division by zero")) throw Error("Division by zero");
    return { ok: true, ast, tokens, output: output.replace(/\r\n/g, "\n"), assembly, binary_bytes: binaryBytes, elapsed_ms: Math.round(performance.now() - start), instructions: count };
  } catch (err) {
    return { ok: false, ast, tokens, output: output.replace(/\r\n/g, "\n"), error: err instanceof WebAssembly.RuntimeError ? "\u30B3\u30F3\u30D1\u30A4\u30E9\u306E\u5B9F\u884C\u4E0A\u9650\u306B\u9054\u3057\u307E\u3057\u305F\u3002\u30B3\u30FC\u30C9\u3092\u77ED\u304F\u3057\u3066\u304F\u3060\u3055\u3044\u3002" : String(err.message || err), assembly, binary_bytes: 0, elapsed_ms: Math.round(performance.now() - start) };
  }
}

// worker.js
self.onmessage = async ({ data }) => {
  try {
    const response = await fetch(new URL("./queena.wasm", import.meta.url));
    if (!response.ok) throw Error("WASM\u3092\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093\u3067\u3057\u305F\u3002");
    const bytes = await response.arrayBuffer();
    self.postMessage(await runQueena(data.source, bytes));
  } catch (e) {
    self.postMessage({ ok: false, ast: null, tokens: [], output: "", error: e.message, assembly: "", binary_bytes: 0, elapsed_ms: 0 });
  }
};
