import {commandGroups, commandTable, compactCodes, compile, debugSnapshot, hex, instructions, run} from './engine.mjs?v=12';

const $ = id => document.getElementById(id);
const source = $('source'), output = $('output'), error = $('error');
const bytes = $('bytes'), trace = $('trace'), runButton = $('run');
function example(name, body, calls = 1) {
  return 'マジ' + name + '{' + body + '}' + ('めっちゃ{' + name + '}').repeat(calls);
}
const [inc, dec, right, left, print, loop, again, , set, , add, sub] = compactCodes;
const plus = add + '神2神3神', minus = sub + '神5神2神';
const put = n => set + '神' + n + '神';
const display = text => print + '神' + text + '神';
const examples = {
  add: example('五を出す', '👏2と3を足して表示する👏' + plus + print),
  count: example('カウントダウン', '👏3から1まで順に表示する👏' + put(3) + loop + print + dec + again),
  move: example('セルを移動', '👏隣のセルに移って戻る👏' + put(1) + right + put(2) + print + left + print),
  bengali: example('ベンガル数字', '👏৪を含む命令で1ずつ増やす👏' + inc.repeat(5) + print),
  odia: example('三つの数字', '👏6回増やしてから1回減らす👏' + inc.repeat(6) + dec + print),
  comment: example('コメントの例', '👏囲んだ中の৪৪৪は実行しない👏' + plus + print),
  arithmetic: example('足し引き', '👏足し算と引き算を1回ずつ👏' + plus + print + minus + print),
  letter: example('文字を出す', '👏神で囲んだ文字を表示する👏' + display('こんにちは')),
  function: example('あいさつ', '👏この関数を呼ぶたびにHIを表示する👏' + display('HI'), 2),
};

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
const debugPanel = $('debug-panel'), slider = $('debug-step'), pageSelect = $('debug-page');
for (let index = 0; index < 256; index += 16) {
  const option = document.createElement('option');
  option.value = String(index);
  option.textContent = `セル ${index}〜${index + 15}`;
  pageSelect.append(option);
}
function showStep(step) {
  if (!recording) return;
  const {frames, steps} = recording;
  const last = frames.length - 1;
  step = Math.max(0, Math.min(step, last));
  slider.value = String(step);
  $('debug-prev').disabled = step === 0;
  $('debug-next').disabled = step === last;
  const {cells, frame} = debugSnapshot(frames, step);
  let label = `${step} / ${steps} ステップ · 現在のセル：${frame.pointer}`;
  if (step === 0) label += ' · 実行前（全セル 0）';
  else {
    label += ` · ${instructions[frame.op - 1]}（${frame.source}）`;
    if (frame.change) label += ` · セル ${frame.change.index}：${frame.change.from} → ${frame.change.to}`;
    else if (frame.pointer !== frame.previousPointer) label += ` · 移動：${frame.previousPointer} → ${frame.pointer}`;
    else label += ' · 値の変化なし';
  }
  $('debug-status').textContent = label;
  const first = pageSelect.value === 'auto' || pageSelect.value === undefined
    ? frame.pointer - frame.pointer % 16 : Number(pageSelect.value);
  const cards = [];
  for (let i = first; i < first + 16; i++) {
    const item = document.createElement('li');
    item.className = 'debug-cell' + (i === frame.pointer ? ' active' : '') + (i === frame.change?.index ? ' changed' : '');
    const name = document.createElement('small'), value = document.createElement('strong');
    name.textContent = `セル ${i}`;
    value.textContent = String(cells[i]);
    item.append(name, value);
    cards.push(item);
  }
  $('debug-cells').replaceChildren(...cards);
}
function openDebug(data) {
  recording = data;
  pageSelect.value = 'auto';
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

function clear() {
  recording = null;
  debugPanel.hidden = true;
  output.textContent = 'まだ実行していません。';
  error.hidden = true;
  error.textContent = '';
  bytes.textContent = trace.textContent = '実行後に表示します。';
}
$('example').addEventListener('change', event => {
  source.value = examples[event.target.value];
  clear();
});
source.addEventListener('input', clear);

function execute(debug = false) {
  clear();
  try {
    const program = compile(source.value);
    const {code, literals} = program;
    const listing = [];
    for (let i = 0; i < Math.min(code.length, 96 * 3); i += 3) {
      const arg = code[i + 1] + (code[i + 2] << 8);
      const extra = code[i] === 17 ? ' ' + JSON.stringify(literals[arg]) : '';
      listing.push(`${hex(i, 4)}  ${hex(code[i])} ${hex(code[i + 1])} ${hex(code[i + 2])}  ${instructions[code[i] - 1]}${extra}`);
    }
    if (code.length > 96 * 3) listing.push('…（先頭96命令のみ表示）');
    bytes.textContent = listing.join('\n') || '（命令なし）';

    const result = run(program, {debug});
    if (result.debug) openDebug(result.debug);
    let rendered = '', previous;
    for (const value of result.output) {
      if (previous !== undefined) {
        if (typeof previous !== typeof value && previous !== '\n') rendered += '\n';
        if (typeof previous === 'number' && typeof value === 'number') rendered += ' ';
      }
      rendered += value;
      previous = value;
    }
    output.textContent = result.output.length ? rendered : '（出力なし）';
    const rows = result.trace.map(({pc, op, next, pointer, value, emitted}) =>
      `${hex(pc, 4)} → ${hex(next, 4)}  ${hex(op)}  セル[${pointer}] = ${value}${emitted === null ? '' : `  出力: ${typeof emitted === 'string' ? JSON.stringify(emitted) : emitted}`}`);
    if (result.steps > result.trace.length) rows.push('…（先頭48ステップのみ表示）');
    trace.textContent = [`実行: ${result.steps} ステップ`, ...rows].join('\n');
  } catch (e) {
    output.textContent = '停止しました。';
    error.hidden = false;
    error.textContent = e.message;
    if (e.debug) openDebug(e.debug);
  }
}
runButton.addEventListener('click', () => execute());
$('run-debug').addEventListener('click', () => execute(true));
$('run-debug').disabled = false;
source.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault();
    execute();
  }
});
runButton.disabled = false;
