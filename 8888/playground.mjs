import {compile, extendedSyntax, hex, instructions, run} from './engine.mjs?v=6';

const $ = id => document.getElementById(id);
const source = $('source'), output = $('output'), error = $('error');
const bytes = $('bytes'), trace = $('trace'), runButton = $('run');
function example(name, body, calls = 1) {
  const definition = ['マジ ' + name, ...body.split('\n').map(line => '  ' + line), 'end'];
  return [...definition, '', ...Array(calls).fill('めっちゃ ' + name)].join('\n');
}
const examples = {
  add: example('五を出す', '8 8\n8 8 8\n88888'),
  count: example('カウントダウン', '8 8 8\n888888\n  88888 88\n8888888'),
  move: example('セルを移動', '8 888 8 8 88888 8888 88888'),
  bengali: example('数字を混ぜる', '8 ৪\n৪ 8 ৪\n8৪8৪8'),
  odia: example('三つの数字', '8 ৪\n୪ 8 ୪\n8৪୪8୪'),
  comment: example('コメントの例', '8 ৪ 👏 ここまでで 2\nコメント内の 88888 は実行しません 👏\n୪ 8 ୪ 88888'),
  arithmetic: example('足し引き', 'set 2 push set 3 add 88888\nset 5 push set 2 sub 88888'),
  letter: example('文字を出す', 'set 72 char\nset 73 char'),
  function: example('あいさつ', 'set 72 char\nset 73 char', 2),
};

for (const [i, description] of instructions.entries()) {
  const row = $('commands-body').insertRow();
  const token = document.createElement('code');
  token.textContent = i < 8 ? '8'.repeat(i + 1) : extendedSyntax[i - 8];
  row.insertCell().append(token);
  row.insertCell().textContent = description;
}

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
    const {code} = program;
    const listing = [];
    for (let i = 0; i < Math.min(code.length, 96 * 3); i += 3) {
      listing.push(`${hex(i, 4)}  ${hex(code[i])} ${hex(code[i + 1])} ${hex(code[i + 2])}  ${instructions[code[i] - 1]}`);
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
