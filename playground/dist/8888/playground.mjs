import {commandGroups, commandTable, compactCodes, compile, hex, instructions, run} from './engine.mjs?v=11';

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

function clear() {
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

function execute() {
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

    const result = run(program);
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
  }
}
runButton.addEventListener('click', execute);
source.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault();
    execute();
  }
});
runButton.disabled = false;
