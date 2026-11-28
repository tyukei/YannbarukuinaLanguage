// 8888 v0.1: whitespace-delimited runs of 8, ৪ and ୪, compiled to 3-byte VM records.
export const instructions = [
  'セルの値を +1', 'セルの値を −1', '右のセルへ', '左のセルへ',
  '値を出力', '値が 0 ならループを飛ばす',
  '値が 0 でなければループに戻る', '値を 0 にする',
];
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
  for (const [row, line] of lines.entries()) {
    for (const match of line.matchAll(/\S+/gu)) {
      const token = match[0], op = token.length, pc = code.length;
      const pos = `${row + 1}行 ${match.index + 1}列`;
      if (!/^[8৪୪]{1,8}$/u.test(token)) {
        throw new Error(`${pos}：命令は「8」「৪」「୪」を合わせて1〜8文字です。空白か改行で区切ってください。`);
      }
      if (locations.length === maxInstructions) throw new Error('命令は4,096個までです。');
      code.push(op, 0, 0);
      locations.push(pos);
      if (op === 6) loops.push(pc);
      if (op !== 7) continue;
      const open = loops.pop();
      if (open === undefined) throw new Error(`${pos}：対応するループ開始がありません。`);
      setTarget(open, pc + width);
      setTarget(pc, open + width);
    }
  }
  if (loops.length) throw new Error(`${locations[loops.at(-1) / width]}：ループが閉じていません。`);
  return {code: Uint8Array.from(code), locations};
}

export function run({code, locations}) {
  const cells = new Uint8Array(256), output = [], trace = [];
  let pointer = 0, pc = 0, steps = 0;
  while (pc < code.length) {
    if (steps === 100000) throw new Error(`${locations[pc / width]}：100,000ステップで停止しました。ループが終わるか確認してください。`);
    const op = code[pc], target = code[pc + 1] + (code[pc + 2] << 8);
    let next = pc + width, emitted = null;
    switch (op) {
      case 1: cells[pointer]++; break;
      case 2: cells[pointer]--; break;
      case 3: pointer = (pointer + 1) & 255; break;
      case 4: pointer = (pointer - 1) & 255; break;
      case 5:
        if (output.length === 4096) throw new Error(`${locations[pc / width]}：出力が4,096個を超えました。`);
        emitted = cells[pointer];
        output.push(emitted);
        break;
      case 6: if (!cells[pointer]) next = target; break;
      case 7: if (cells[pointer]) next = target; break;
      case 8: cells[pointer] = 0; break;
      default: throw new Error('不明なVM命令です。');
    }
    if (trace.length < 48) trace.push({pc, op, next, pointer, value: cells[pointer], emitted});
    steps++;
    pc = next;
  }
  return {output, trace, steps, pointer, cells};
}

export const hex = (n, digits = 2) => n.toString(16).toUpperCase().padStart(digits, '0');
