import {commandGroups, commandTable, compactCodes, debugSnapshot, hex, instructions} from './engine.mjs?v=values-1';

function example(name, body, calls = 1) {
  return 'マジ' + name + '{' + body + '}' + ('めっちゃ{' + name + '}').repeat(calls);
}
const [inc, dec, right, left, print, loop, again, , set, , add, sub] = compactCodes;
const plus = add + '神2神3神', minus = sub + '神5神2神';
const put = n => set + '神' + n + '神';
const display = text => print + '神' + text + '神';
export const examples = {
  hello: '👏足す関数に2と3を渡して、戻り値を表示👏\nマジ足す(x,y){88৪(x,y)}\n৪৪৪(めっちゃ足す(2,3))',
  compose: '👏増やすを2回つないで、戻り値を表示👏\nマジ増やす(x){88৪(x,1)}\n৪৪৪(めっちゃ増やす(めっちゃ増やす(3)))',
  legacy: example('五を出す', '👏2と3を足して表示する👏' + plus + print),
  count: example('カウントダウン', '👏3から1まで順に表示する👏' + put(3) + loop + print + dec + again),
  move: example('セルを移動', '👏隣のセルに移って戻る👏' + put(1) + right + put(2) + print + left + print),
  bengali: example('ベンガル数字', '👏৪を含む命令で1ずつ増やす👏' + inc.repeat(5) + print),
  odia: example('三つの数字', '👏6回増やしてから1回減らす👏' + inc.repeat(6) + dec + print),
  comment: example('コメントの例', '👏囲んだ中の৪৪৪は実行しない👏' + plus + print),
  arithmetic: example('足し引き', '👏足し算と引き算を1回ずつ👏' + plus + print + minus + print),
  letter: example('文字を出す', '👏神で囲んだ文字を表示する👏' + display('こんにちは')),
  function: example('あいさつ', '👏この関数を呼ぶたびにHIを表示する👏' + display('HI'), 2),
};

export const exampleNames = ['関数に2と3を渡す → 5','関数をつなぐ → 5','従来のメモリ操作 → 5','カウントダウン → 3, 2, 1','別のセルに移動 → 2, 1','৪ を使って増やす → 5','8・৪・୪ を混ぜる → 5','👏 コメントを書く → 5','足し算・引き算 → 5, 3','文字を出す → こんにちは','関数を呼ぶ → HIHI'];

export function initDebugger(document) {
  const $ = id => document.getElementById(id);
function showCommands(id, commands) {
  for (const [syntax, label, example] of commands) {
    const row = $(id).insertRow();
    const addCode = text => {
      const code = document.createElement('code');
      code.textContent = text;
      row.insertCell().append(code);
    };
    addCode(syntax);
    row.insertCell().textContent = label;
    if (example) addCode(example);
  }
}
showCommands('commands-body', commandTable);
for (const [i, [, commands]] of commandGroups.entries()) showCommands('command-group-' + i, commands);

let recording = null;
const debugPanel = $('debug-panel'), slider = $('debug-step'), pageSelect = $('debug-page'), bankInput = $('debug-bank');
for (let index = 0; index < 256; index += 16) {
  const option = document.createElement('option');
  option.value = String(index);
  option.textContent = `0x${hex(index,4)}〜0x${hex(index+15,4)}`;
  pageSelect.append(option);
}
function showSource(frame) {
  const preview = $('debug-source');
  const label = $('debug-source-label');
  if (recording.machine === 'z80') {
    const row=recording.entries.get(frame.pc);
    label.textContent=row?.line ? '▶ Z80アセンブリ：' + row.line + '行' : 'Z80アセンブリ';
    preview.textContent=row ? '▶ ' + row.text : frame.pc===undefined ? '実行前：次は0x0100です。' : '▶ 実行アドレス 0x' + hex(frame.pc, 4);
    return;
  }
  const location = frame.source?.match(/^(\d+)行 (\d+)列$/u);
  if (!location) {
    label.textContent = 'ソース上の位置';
    preview.textContent = '実行前：まだ命令を実行していません。';
    return;
  }
  const [, row, column] = location;
  const line = Array.from(recording.lines[Number(row) - 1] ?? '');
  const at = Number(column) - 1;
  const after = line.slice(at).join('');
  const highlightLength = frame.sourceLength ?? (recording.functional ? Array.from(recording.entries.get(frame.pc)?.text??'').length : 0);
  const command = highlightLength ? line.slice(at, at + highlightLength).join('') : after.match(/^(?:マジ|めっちゃ|神|\}|[8৪୪]{3}|[^\s👏]+)/u)?.[0] ?? after.charAt(0);
  const end = at + Array.from(command).length;
  const startContext = Math.max(0, at - 38), endContext = Math.min(line.length, end + 38);
  const before = document.createElement('span'), arrow = document.createElement('span');
  const current = document.createElement('mark'), rest = document.createElement('span');
  before.textContent = (startContext ? '…' : '') + line.slice(startContext, at).join('');
  arrow.textContent = '▶';
  arrow.className = 'debug-source-arrow';
  current.textContent = command;
  rest.textContent = line.slice(end, endContext).join('') + (endContext < line.length ? '…' : '');
  label.textContent = '▶ 実行した命令：' + frame.source;
  preview.replaceChildren(before, arrow, current, rest);
}
function explainStep(frame) {
  if(frame.pc===undefined) return 'ステップを進めると、ここに説明が出ます。';
  if(recording.machine==='z80'){
    const row=recording.entries.get(frame.pc);
    const changes=(frame.writes??[]).map(w=>`0x${hex(w.index,4)}：${hex(w.from)} → ${hex(w.to)}`);
    return (row?.text??'機械語を1命令実行しました。') +
      (changes.length ? ' ／ メモリ ' + changes.join('、') : ' ／ メモリ書き込みなし') +
      (frame.emitted===undefined ? '' : ' ／ 出力 ' + JSON.stringify(frame.emitted));
  }
  if(recording.machine==='chukei'){
    const cell='セル'+frame.pointer;
    switch(frame.op){
      case 'INC': case 'DEC': return `${cell}：${frame.before} → ${frame.after}`;
      case 'RIGHT': return `セル${frame.previousPointer}から右に移動して、${cell}を選びました。`;
      case 'OUT': return `${cell}の値 ${frame.before} をASCII文字 ${JSON.stringify(frame.emitted)} として出力しました。`;
      case 'JZ': return frame.before===0 ? '現在のセルが0なのでループを飛ばしました。' : '現在のセルが0でないのでループに入りました。';
      case 'JNZ': return frame.before===0 ? '現在のセルが0なのでループを抜けました。' : '現在のセルが0でないのでループの先頭に戻りました。';
    }
  }
  const {op, before, after, pointer, previousPointer, leftValue, emitted, next} = frame;
  const cell = `セル${pointer}`;
  const jump = `アドレス 0x${hex(next, 4)}`;
  const result = frame.values?.at(-1);
  switch (op) {
    case 1:
    case 2: {
      const delta = op === 1 ? 1 : -1;
      let message = `${cell}の ${before} を1つ${delta > 0 ? '増やし' : '減らし'}、${after} にしました。`;
      if (before + delta !== after) message += '値は0〜255で一周します。';
      return message;
    }
    case 3:
    case 4: return `セル${previousPointer}から${op === 3 ? '右へ' : '左へ'}移動して、${cell}を選びました。値は変わりません。`;
    case 5: return `${cell}の値 ${emitted} を数として表示しました。`;
    case 6: return before === 0 ? `${cell}の値が0なのでループを飛ばしました。` : `${cell}の値が ${before} なのでループに入りました。`;
    case 7: return before === 0 ? `${cell}の値が0なのでループを抜けました。` : `${cell}の値が ${before} なのでループの先頭に戻りました。`;
    case 8: return `${cell}の値を ${before} から0にしました。`;
    case 9: return `${cell}に ${after} を入れました（実行前は ${before}）。`;
    case 10: return `${cell}の値 ${before} を、次の計算で使う左の数として保存しました。`;
    case 11:
    case 12: {
      const raw = op === 11 ? leftValue + before : leftValue - before;
      let message = op === 11
        ? `${leftValue} と ${before} を足して、${cell}に ${after} を入れました。`
        : `${leftValue} から ${before} を引いて、${cell}に ${after} を入れました。`;
      if (raw !== after) message += `計算結果 ${raw} は0〜255の範囲で一周します。`;
      return message;
    }
    case 13: return `${cell}の値 ${before} をASCII文字 ${JSON.stringify(emitted)} として表示しました。`;
    case 14: return `関数を宣言しただけなので中身は実行せず、${jump} に進みました。`;
    case 15: return `関数の実行が終わり、呼び出した場所の次（${jump}）に戻りました。`;
    case 16: return `関数を呼び出し、中身の先頭（${jump}）へ進みました。`;
    case 18: return `定数 ${result} を計算用スタックに置きました。`;
    case 19: return `引数の値 ${result} を読みました。引数や共有メモリは変えません。`;
    case 20: case 21: return `計算結果 ${result} をスタックに置きました。`;
    case 22: return `引数 [${frame.args.join(', ')}] を渡して、関数の先頭（${jump}）へ進みました。`;
    case 23: return `結果 ${result} を返して、呼び出し元（${jump}）に戻りました。`;
    case 24: return `関数の外で、結果 ${emitted} を表示しました。`;
    case 17: return `文字列 ${JSON.stringify(emitted.length > 48 ? emitted.slice(0, 48) + '…' : emitted)} を表示しました。セルの値は変わりません。`;
    default: return 'ステップを進めると、ここに説明が出ます。';
  }
}
function buildAddressMap(entries) {
  const rows = new Map();
  const body = $('debug-map-body');
  for (const entry of entries.values()) {
    const row = document.createElement('tr');
    const addCell = (value, className) => {
      const cell = document.createElement('td');
      if (className) cell.className = className;
      cell.textContent = value;
      row.append(cell);
      return cell;
    };
    const {address, text, bytes, description} = entry;
    addCell('0x' + hex(address, 4) + '（' + address + '）', 'map-address');
    const excerpt = Array.from(text);
    const sourceCell = addCell(excerpt.length > 48 ? excerpt.slice(0, 48).join('') + '…' : text, 'map-source');
    if (excerpt.length > 48) sourceCell.title = text;
    addCell(bytes, 'map-bytes');
    addCell(description);
    rows.set(address, {row, status: addCell('')});
  }
  body.replaceChildren(...Array.from(rows.values(), entry => entry.row));
  $('debug-map-scroll').hidden = !rows.size;
  $('debug-map-scroll').scrollTop = 0;
  $('debug-map-empty').hidden = Boolean(rows.size);
  return rows;
}

function markAddressRows(frame) {
  const {rows} = recording;
  for (const addr of recording.marked) {
    const {row, status} = rows.get(addr);
    row.className = '';
    status.textContent = '';
  }
  recording.marked = [];
  for (const addr of new Set([frame.pc, frame.next])) {
    if (!rows.has(addr)) continue;
    const {row, status} = rows.get(addr);
    const done = addr === frame.pc, upcoming = addr === frame.next;
    row.className = done ? 'map-done' : 'map-next';
    status.textContent = done && upcoming ? '▶ 実行・次' : done ? '▶ 実行済み' : '↳ 次';
    recording.marked.push(addr);
  }
  const scroll = $('debug-map-scroll');
  const row = rows.get(frame.pc ?? frame.next)?.row;
  if (row && (row.offsetTop < scroll.scrollTop || row.offsetTop + row.offsetHeight > scroll.scrollTop + scroll.clientHeight)) {
    scroll.scrollTop = Math.max(0, row.offsetTop - 36);
  }
}
function showAddresses(frame) {
  const address = n => '0x' + hex(n, 4);
  const {pc, next} = frame;
  $('debug-pc').textContent = pc === undefined ? '未実行' : address(pc);
  $('debug-next-pc').textContent = address(next) + (next === recording.codeLength ? '（終了）' : '');
  const base = recording.machine === 'z80' ? 'PCはZ80のメモリアドレスです。命令によって長さが異なります。'
    : recording.machine === 'chukei' ? 'PCはVMの命令番号です。データ用のメモリアドレスとは別です。'
    : 'PCはバイトコード上の位置です。データ用のメモリアドレスとは別です。';
  const width=recording.entries.get(pc)?.width;
  const explanation = pc !== undefined && width && next !== pc + width
    ? 'ジャンプ：' + address(pc) + ' → ' + address(next) + '。' + base : base;
  $('debug-pc-note').textContent = explanation;
  markAddressRows(frame);
}
function showStep(step) {
  if (!recording) return;
  const {frames, steps} = recording;
  const last = frames.length - 1;
  step = Math.max(0, Math.min(step, last));
  slider.value = String(step);
  $('debug-prev').disabled = step === 0;
  $('debug-next').disabled = step === last;
  const z80 = recording.machine === 'z80';
  const {cells, frame} = z80 ? z80Snapshot(recording,step) : debugSnapshot(frames, step);
  let label = `${step} / ${steps} ステップ · データ位置：0x${hex(frame.pointer,4)}`;
  if(z80) label=`${step} / ${steps} ステップ · Z80` + (step===0 ? ' · 実行前' : '');
  else if(recording.functional) label=`${step} / ${steps} ステップ · 関数の深さ：${frame.depth}`+(step?' · '+recording.entries.get(frame.pc)?.description:' · 実行前');
  else if (step === 0) label += ' · 実行前（全メモリ 0）';
  else {
    label += ` · ${recording.entries.get(frame.pc)?.description ?? frame.op}（${frame.source}）`;
    if (frame.change) label += ` · メモリ 0x${hex(frame.change.index,4)}：${frame.change.from} → ${frame.change.to}`;
    else if (frame.pointer !== frame.previousPointer) label += ` · 移動：0x${hex(frame.previousPointer,4)} → 0x${hex(frame.pointer,4)}`;
    else label += ' · 値の変化なし';
  }
  $('debug-status').textContent = label;
  showSource(frame);
  showAddresses(frame);
  $('debug-effect').textContent = explainStep(frame);
  const bank=bankInput.value.trim().replace(/^0x/iu,'');
  const manual=z80&&/^[0-9a-f]{1,4}$/iu.test(bank)?Number.parseInt(bank,16):null;
  const pointer=manual??frame.pointer;
  const first = z80||pageSelect.value === 'auto' || pageSelect.value === undefined
    ? pointer - pointer % 16 : Number(pageSelect.value);
  $('debug-registers').hidden=!z80;
  if(z80) $('debug-registers').textContent=Object.entries(frame.regs??{}).map(([name,value])=>name+'='+hex(value,name.length===1?2:4)).join('  ');
  $('debug-values').hidden=!recording.functional;
  if(recording.functional) $('debug-values').textContent=`引数：[${frame.args.join(', ')}]\n計算用スタック（末尾16個まで）：[${frame.values.join(', ')}]\n共有メモリへの書き込みなし`;
  const altered = z80 ? new Set((frame.writes??[]).map(w=>w.index)) : new Set([frame.change?.index]);
  const cards = [];
  for (let i = first; i < first + 16; i++) {
    const item = document.createElement('li');
    item.className = 'debug-cell' + (i === frame.pointer && !recording.functional ? ' active' : '') + (altered.has(i) ? ' changed' : '');
    const name = document.createElement('small'), value = document.createElement('strong');
    name.textContent = '0x'+hex(i,4);
    value.textContent = z80 ? hex(cells[i]) : String(cells[i]);
    item.append(name, value);
    cards.push(item);
  }
  $('debug-cells').replaceChildren(...cards);
}
function z80Snapshot({initial, frames}, step) {
  const cells=initial.slice();
  for(let i=1;i<=step;i++) for(const {index,to} of frames[i].writes) cells[index]=to;
  return {cells,frame:frames[step]};
}
function openDebug(machine, result, source) {
  const data=result.debug;
  const isZ80=machine==='yanbarukuina';
  if(isZ80) machine='z80';
  const entries = new Map();
  let codeLength;
  function add(address,text,bytes,description,width,line){
    entries.set(address,{address,text,bytes,description,width,line});
  }
  if(isZ80){
    codeLength=0;
    for(const row of data.listing) add(row.address,row.text,Array.from(row.bytes,n=>hex(n)).join(' '),'Z80',row.bytes.length,row.line);
  }else if(machine==='chukei'){
    codeLength=result.bytecode.length;
    for(const {pc,op,arg,sourceIndex} of result.bytecode){
      const token=result.tokens[sourceIndex];
      add(pc,token.lexeme,'—',op+(arg===undefined?'':' → '+arg),1);
    }
  }else{
    const {code,sourceCommands}=result.program;
    codeLength=code.length;
    for(let addr=0;addr<code.length;addr+=3){
      add(addr,sourceCommands[addr/3]??'',Array.from(code.subarray(addr,addr+3),n=>hex(n)).join(' '),instructions[code[addr]-1],3);
    }
  }
  // Keep rendering bounded while retaining the address data for step explanations.
  const mapEntries = new Map([...entries].slice(0,4096));
  recording = {...data, machine, entries, codeLength, rows:buildAddressMap(mapEntries), marked:[], lines:source.split(/\r\n?|\n/u)};
  pageSelect.value = 'auto';
  bankInput.value='';
  $('debug-cell-picker').hidden=isZ80;
  $('debug-memory-picker').hidden=!isZ80;
  $('debug-map-source-heading').textContent=isZ80?'Z80アセンブリ':'元のコード';
  $('debug-map-help').textContent=(isZ80 ? 'アセンブラが配置したバイト列です。CPUは左のアドレスから命令を読みます。'
    : machine==='chukei'?'1行が1つのVM命令です。命令番号で表示します。'
    :'1行が1つのVM命令（3バイト）です。1つの8888命令が複数のVM命令になることがあります。') +
    (entries.size>mapEntries.size || (machine==='chukei' && result.bytecode.length>4096) ? ' 配置表は先頭4,096行まで。':'');
  slider.max = String(data.frames.length - 1);
  slider.disabled = data.frames.length <= 1;
  const limited = data.frames.length - 1 < data.steps;
  $('debug-limit').hidden = !limited;
  $('debug-limit').textContent = limited ? `先頭 ${data.frames.length - 1} ステップまで確認できます。` : '';
  debugPanel.hidden = false;
  showStep(0);
}
$('debug-prev').addEventListener('click', () => showStep(Number(slider.value) - 1));
$('debug-next').addEventListener('click', () => showStep(Number(slider.value) + 1));
slider.addEventListener('input', () => showStep(Number(slider.value)));
pageSelect.addEventListener('change', () => showStep(Number(slider.value)));
bankInput.addEventListener('input', () => showStep(Number(slider.value)));

  return {open:openDebug, reset(){ recording = null; debugPanel.hidden = true; }};
}
