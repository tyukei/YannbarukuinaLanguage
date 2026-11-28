// 8888 v0.4: compact and legacy syntax compiled to 3-byte VM records.
export const instructions = [
  'セルの値を +1', 'セルの値を −1', '右のセルへ', '左のセルへ',
  '値を出力', '値が 0 ならループを飛ばす',
  '値が 0 でなければループに戻る', '値を 0 にする',
  '値をセット', '左の値として保存', '保存した値 + 現在値',
  '保存した値 − 現在値', 'ASCII文字を出力',
  '関数宣言を飛ばす', '呼び出し元に戻る', '関数を呼ぶ', '文字列を出力',
];
export const extendedSyntax = ['set 値', 'push', 'add', 'sub', 'char', 'マジ 名前', '神', 'めっちゃ 名前'];
const keywords = new Map(['set', 'push', 'add', 'sub', 'char', 'fn', 'end', 'call'].map((key, i) => [key, i + 9]));
keywords.set('マジ', keywords.get('fn'));
keywords.set('めっちゃ', keywords.get('call'));
keywords.set('神', keywords.get('end'));
const width = 3;
const maxInstructions = 4096;

export const compactCodes = ['8৪8','8୪8','৪8୪','୪8৪','8৪୪','৪୪8','୪৪8','୪୪8','৪8৪','୪8୪','8୪৪','৪৪8','8୪୪'];
export const commandTable = [
  [4, '表示', '神こんにちは神'],
  [8, '値を入れる', '神8神'],
  [10, '足す', '神2神3神'],
  [11, '引く', '神5神2神'],
].map(([i, label, suffix]) => [compactCodes[i], label, compactCodes[i] + suffix]);
const mainCodes = new Set(commandTable.map(([code]) => code));
export const extraCommands = compactCodes
  .map((code, i) => [code, instructions[i]])
  .filter(([code]) => !mainCodes.has(code));

function* legacyTokens(source) {
  const lines = source.split(/\r\n?|\n/u);
  let commentStart = null;
  for (const [row, line] of lines.entries()) {
    let offset = 0, column = 1;
    for (const match of line.matchAll(/👏|(?:(?!👏)\S)+/gu)) {
      column += Array.from(line.slice(offset, match.index)).length;
      offset = match.index;
      const token = match[0], pos = `${row + 1}行 ${column}列`;
      if (token === '👏') {
        commentStart = commentStart === null ? pos : null;
      } else if (commentStart === null) {
        yield {token, pos};
      }
    }
  }
  if (commentStart !== null) throw new Error(`${commentStart}：コメントを閉じる「👏」がありません。`);
}

function compactReader(source) {
  let cursor = 0, row = 1, column = 1;
  const position = () => `${row}行 ${column}列`;
  const advance = end => {
    const lines = source.slice(cursor, end).split(/\r\n?|\n/u);
    const width = Array.from(lines.at(-1)).length;
    row += lines.length - 1;
    column = lines.length === 1 ? column + width : width + 1;
    cursor = end;
  };
  function skip() {
    const whitespace = /\s+/uy;
    for (;;) {
      whitespace.lastIndex = cursor;
      if (whitespace.test(source)) advance(whitespace.lastIndex);
      if (!source.startsWith('👏', cursor)) return;
      const closing = source.indexOf('👏', cursor + 2);
      if (closing < 0) throw new Error(`${position()}：コメントを閉じる「👏」がありません。`);
      advance(closing + 2);
    }
  }
  return {
    skip, position, advance,
    get cursor() { return cursor; },
    starts(text) { return source.startsWith(text, cursor); },
    atQuote() { skip(); return source[cursor] === '"'; },
    declaration() { return /^マジ\s*([\p{L}_][\p{L}\p{N}_]{0,31})\s*\{/u.exec(source.slice(cursor)); },
    invocation() { return /^めっちゃ\s*\{\s*([\p{L}_][\p{L}\p{N}_]{0,31})\s*\}/u.exec(source.slice(cursor)); },
    atGod() { skip(); return source[cursor] === '神'; },
    godFields(count, label) {
      skip();
      const pos = position();
      if (source[cursor] !== '神') throw new Error(`${pos}：${label}を「神」で囲んでください。`);
      const fields = [];
      let from = cursor + 1;
      for (let n = 0; n < count; n++) {
        let end = from, token = '';
        for (; end < source.length && source[end] !== '神'; end++) {
          if (source[end] === '\\' && ['神', '\\'].includes(source[end + 1])) end++;
          token += source[end];
        }
        if (end === source.length) throw new Error(`${pos}：${label}を閉じる「神」がありません。`);
        fields.push({token, pos});
        from = end + 1;
      }
      advance(from);
      return fields;
    },
    quoted(label) {
      skip();
      const pos = position();
      const pattern = /"(?:[^"\\\r\n]|\\[^\r\n])*"/uy;
      pattern.lastIndex = cursor;
      const raw = pattern.exec(source)?.[0];
      if (!raw) throw new Error(`${pos}：${label}を半角の " で囲んでください。`);
      let token;
      try { token = JSON.parse(raw); }
      catch { throw new Error(`${pos}：文字列のエスケープが正しくありません。`); }
      advance(pattern.lastIndex);
      return {token, pos};
    },
  };
}

function* compactTokens(source, braces) {
  const r = compactReader(source);
  while (true) {
    r.skip();
    if (r.cursor === source.length) return;
    const pos = r.position();
    if (r.starts(braces ? '}' : '神')) {
      r.advance(r.cursor + 1);
      yield {token:'神', pos};
      continue;
    }
    const word = r.starts('マジ') ? 'マジ' : r.starts('めっちゃ') ? 'めっちゃ' : null;
    if (word && braces) {
      const match = word === 'マジ' ? r.declaration() : r.invocation();
      if (!match) throw new Error(`${pos}：関数は「マジ名前{…}」で宣言し、「めっちゃ{名前}」で呼びます。`);
      r.advance(r.cursor + match[0].length);
      yield {token:word, pos};
      yield {token:match[1], pos};
      continue;
    }
    if (word) {
      r.advance(r.cursor + word.length);
      yield {token:word, pos};
      yield r.quoted('関数名');
      continue;
    }
    const code = source.slice(r.cursor, r.cursor + 3), i = compactCodes.indexOf(code);
    if (i < 0) throw new Error(`${pos}：不明な命令です。命令は3文字ずつ、命令表どおりに書いてください。`);
    r.advance(r.cursor + 3);
    const atValue = () => braces ? r.atGod() : r.atQuote();
    if (i === 4 && atValue()) {
      const literal = braces ? r.godFields(1, '表示する文字')[0] : r.quoted('表示する文字');
      yield {literal:literal.token, pos};
      continue;
    }
    if ((i === 10 || i === 11) && atValue()) {
      const [left, right] = braces ? r.godFields(2, '左と右の数') : [r.quoted('左の数'), r.quoted('右の数')];
      if (braces) { left.token = left.token.trim(); right.token = right.token.trim(); }
      yield {token:'set', pos}; yield left;
      yield {token:'push', pos};
      yield {token:'set', pos}; yield right;
    }
    yield {token: i < 8 ? '8'.repeat(i + 1) : ['set','push','add','sub','char'][i - 8], pos};
    if (i === 8) {
      const value = braces ? r.godFields(1, '数')[0] : r.quoted('数');
      if (braces) value.token = value.token.trim();
      yield value;
    }
  }
}

function compactMode(source) {
  const r = compactReader(source);
  r.skip();
  const word = r.starts('マジ') ? 'マジ' : r.starts('めっちゃ') ? 'めっちゃ' : null;
  if (!word) return null;
  if (r.declaration() || r.invocation()) return 'braces';
  r.advance(r.cursor + word.length);
  if (r.atQuote()) return 'quotes';
  if (word === 'めっちゃ' && r.starts('{')) return 'braces';
  return null;
}

export function compile(source) {
  if (source.length > 16384) throw new Error('入力は16,384文字までです。');
  const code = [], locations = [], loops = [], literals = [];
  function setTarget(pc, target) {
    code[pc + 1] = target & 255;
    code[pc + 2] = target >>> 8;
  }
  const definitions = new Map(), calls = [];
  let pending = null, active = null;
  const mode = compactMode(source);
  const tokens = mode ? compactTokens(source, mode === 'braces') : legacyTokens(source);
  for (const {token, pos, literal} of tokens) {
    if (pending !== null) {
      const {op, pc} = pending;
      pending = null;
      if (op === 9) {
        if (typeof token !== 'string' || !/^[0-9]{1,3}$/u.test(token) || Number(token) > 255) {
          throw new Error(`${pos}：set には0〜255の整数を指定してください。`);
        }
        setTarget(pc, Number(token));
      } else {
        if (typeof token !== 'string' || !/^[\p{L}_][\p{L}\p{N}_]{0,31}$/u.test(token)) {
          throw new Error(`${pos}：関数名は文字か _ で始め、32文字以内にしてください。`);
        }
        if (op === 14) {
          if (definitions.has(token)) throw new Error(`${pos}：関数「${token}」は定義済みです。`);
          definitions.set(token, pc + width);
          active = {pc, name: token};
        } else {
          calls.push({pc, name: token, pos});
        }
      }
      continue;
    }
    const op = literal !== undefined ? 17 : /^[8৪୪]{1,8}$/u.test(token) ? token.length : keywords.get(token);
    if (op === undefined) {
      throw new Error(`${pos}：不明な命令です。「8」「৪」「୪」を合わせた1〜8文字か、命令表のキーワードを使ってください。`);
    }
    if (locations.length === maxInstructions) throw new Error('命令は4,096個までです。');
    const pc = code.length;
    code.push(op, 0, 0);
    locations.push(pos);
    if (op === 17) { setTarget(pc, literals.length); literals.push(literal); }
    if (op === 14 && (active !== null || loops.length)) throw new Error(`${pos}：関数宣言は関数やループの外に書いてください。`);
    if (op === 9 || op === 14 || op === 16) pending = {op, pc, pos, token};
    if (op === 15) {
      if (active === null) throw new Error(`${pos}：${token} に対応する関数宣言（マジ）がありません。`);
      if (loops.length) throw new Error(`${pos}：関数内のループが閉じていません。`);
      setTarget(active.pc, pc + width);
      active = null;
    }
    if (op === 6) loops.push(pc);
    if (op !== 7) continue;
    const open = loops.pop();
    if (open === undefined) throw new Error(`${pos}：対応するループ開始がありません。`);
    setTarget(open, pc + width);
    setTarget(pc, open + width);

  }
  if (pending !== null) throw new Error(`${pending.pos}：${pending.token} の後に${pending.op === 9 ? '値' : '関数名'}を書いてください。`);
  if (loops.length) throw new Error(`${locations[loops.at(-1) / width]}：ループが閉じていません。`);
  if (active !== null) throw new Error(`${locations[active.pc / width]}：関数「${active.name}」を閉じる${mode === 'braces' ? '「}」' : '「神」（end）'}がありません。`);
  for (const {pc, name, pos} of calls) {
    if (!definitions.has(name)) throw new Error(`${pos}：関数「${name}」が定義されていません。`);
    setTarget(pc, definitions.get(name));
  }
  return {code: Uint8Array.from(code), locations, literals};
}

export function run({code, locations, literals = []}) {
  const cells = new Uint8Array(256), output = [], trace = [];
  const saved = [], returns = [];
  let pointer = 0, pc = 0, steps = 0, outputChars = 0;
  const fail = message => { throw new Error(`${locations[pc / width]}：${message}`); };
  while (pc < code.length) {
    if (steps === 100000) throw new Error(`${locations[pc / width]}：100,000ステップで停止しました。ループや関数呼び出しを確認してください。`);
    const op = code[pc], target = code[pc + 1] + (code[pc + 2] << 8);
    let next = pc + width, emitted = null;
    switch (op) {
      case 1: cells[pointer]++; break;
      case 2: cells[pointer]--; break;
      case 3: pointer = (pointer + 1) & 255; break;
      case 4: pointer = (pointer - 1) & 255; break;
      case 5:
      case 13: {
        const value = cells[pointer];
        if (op === 13 && value !== 10 && (value < 32 || value > 126)) {
          fail('char はASCIIの表示文字（32〜126）と改行（10）に対応しています。');
        }
        emitted = op === 13 ? String.fromCharCode(value) : value;
        break;
      }
      case 6: if (!cells[pointer]) next = target; break;
      case 7: if (cells[pointer]) next = target; break;
      case 8: cells[pointer] = 0; break;
      case 9: cells[pointer] = target; break;
      case 10:
        if (saved.length === 256) fail('push で保存できるのは256個までです。');
        saved.push(cells[pointer]);
        break;
      case 11:
      case 12: {
        if (!saved.length) fail('先に push で左の値を保存してください。');
        const left = saved.pop();
        cells[pointer] = op === 11 ? left + cells[pointer] : left - cells[pointer];
        break;
      }
      case 14: next = target; break;
      case 15:
        if (!returns.length) fail('end に対応する呼び出しがありません。');
        next = returns.pop();
        break;
      case 16:
        if (returns.length === 64) fail('関数呼び出しは64段までです。');
        returns.push(next);
        next = target;
        break;
      case 17: emitted = literals[target]; break;
      default: throw new Error('不明なVM命令です。');
    }
    if (emitted !== null) {
      if (output.length === 4096) fail('出力が4,096個を超えました。');
      outputChars += String(emitted).length;
      if (outputChars > 16384) fail('出力が16,384文字を超えました。');
      output.push(emitted);
    }
    if (trace.length < 48) trace.push({pc, op, next, pointer, value: cells[pointer], emitted});
    steps++;
    pc = next;
  }
  return {output, trace, steps, pointer, cells};
}

export const hex = (n, digits = 2) => n.toString(16).toUpperCase().padStart(digits, '0');
