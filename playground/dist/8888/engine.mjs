// 8888 v0.2: whitespace-delimited runs of 8, ৪ and ୪ with 👏-delimited comments, compiled to 3-byte VM records.
export const instructions = [
  'セルの値を +1', 'セルの値を −1', '右のセルへ', '左のセルへ',
  '値を出力', '値が 0 ならループを飛ばす',
  '値が 0 でなければループに戻る', '値を 0 にする',
  '値をセット', '左の値として保存', '保存した値 + 現在値',
  '保存した値 − 現在値', 'ASCII文字を出力',
  '関数宣言を飛ばす', '呼び出し元に戻る', '関数を呼ぶ',
];
export const extendedSyntax = ['set 値', 'push', 'add', 'sub', 'char', 'fn 名前', 'end', 'call 名前'];
const keywords = new Map(['set', 'push', 'add', 'sub', 'char', 'fn', 'end', 'call'].map((key, i) => [key, i + 9]));
const width = 3;
const maxInstructions = 4096;

export function compile(source) {
  if (source.length > 16384) throw new Error('入力は16,384文字までです。');
  const code = [], locations = [], loops = [];
  const lines = source.split(/\r\n?|\n/u);
  function setTarget(pc, target) {
    code[pc + 1] = target & 255;
    code[pc + 2] = target >>> 8;
  }
  const definitions = new Map(), calls = [];
  let commentStart = null, pending = null, active = null;
  for (const [row, line] of lines.entries()) {
    let offset = 0, column = 1;
    for (const match of line.matchAll(/👏|(?:(?!👏)\S)+/gu)) {
      column += Array.from(line.slice(offset, match.index)).length;
      offset = match.index;
      const token = match[0], pos = `${row + 1}行 ${column}列`;
      if (token === '👏') {
        commentStart = commentStart === null ? pos : null;
        continue;
      }
      if (commentStart !== null) continue;
      if (pending !== null) {
        const {op, pc} = pending;
        pending = null;
        if (op === 9) {
          if (!/^[0-9]{1,3}$/u.test(token) || Number(token) > 255) {
            throw new Error(`${pos}：set には0〜255の整数を指定してください。`);
          }
          setTarget(pc, Number(token));
        } else {
          if (!/^[\p{L}_][\p{L}\p{N}_]{0,31}$/u.test(token)) {
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
      const op = /^[8৪୪]{1,8}$/u.test(token) ? token.length : keywords.get(token);
      if (op === undefined) {
        throw new Error(`${pos}：不明な命令です。「8」「৪」「୪」を合わせた1〜8文字か、命令表のキーワードを使ってください。`);
      }
      if (locations.length === maxInstructions) throw new Error('命令は4,096個までです。');
      const pc = code.length;
      code.push(op, 0, 0);
      locations.push(pos);
      if (op === 14 && (active !== null || loops.length)) throw new Error(`${pos}：関数宣言は関数やループの外に書いてください。`);
      if (op === 9 || op === 14 || op === 16) pending = {op, pc, pos, token};
      if (op === 15) {
        if (active === null) throw new Error(`${pos}：end に対応する fn がありません。`);
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
  }
  if (commentStart !== null) throw new Error(`${commentStart}：コメントを閉じる「👏」がありません。`);
  if (pending !== null) throw new Error(`${pending.pos}：${pending.token} の後に${pending.op === 9 ? '値' : '関数名'}を書いてください。`);
  if (loops.length) throw new Error(`${locations[loops.at(-1) / width]}：ループが閉じていません。`);
  if (active !== null) throw new Error(`${locations[active.pc / width]}：関数「${active.name}」を閉じる end がありません。`);
  for (const {pc, name, pos} of calls) {
    if (!definitions.has(name)) throw new Error(`${pos}：関数「${name}」が定義されていません。`);
    setTarget(pc, definitions.get(name));
  }
  return {code: Uint8Array.from(code), locations};
}

export function run({code, locations}) {
  const cells = new Uint8Array(256), output = [], trace = [];
  const saved = [], returns = [];
  let pointer = 0, pc = 0, steps = 0;
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
        if (output.length === 4096) fail('出力が4,096個を超えました。');
        const value = cells[pointer];
        if (op === 13 && value !== 10 && (value < 32 || value > 126)) {
          fail('char はASCIIの表示文字（32〜126）と改行（10）に対応しています。');
        }
        emitted = op === 13 ? String.fromCharCode(value) : value;
        output.push(emitted);
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
      default: throw new Error('不明なVM命令です。');
    }
    if (trace.length < 48) trace.push({pc, op, next, pointer, value: cells[pointer], emitted});
    steps++;
    pc = next;
  }
  return {output, trace, steps, pointer, cells};
}

export const hex = (n, digits = 2) => n.toString(16).toUpperCase().padStart(digits, '0');
