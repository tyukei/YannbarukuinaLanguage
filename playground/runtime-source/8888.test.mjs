import test from 'node:test';
import assert from 'node:assert/strict';
import {compactCodes, compile, debugLimit, debugSnapshot, run} from '../dist/8888/engine.mjs';

const execute = source => run(compile(source));
test('2 + 3 gives 5 and PC advances 3 bytes per instruction', () => {
  const result = execute('8 8\r\n8 8 8\n88888');
  assert.deepEqual(result.output, [5]);
  assert.deepEqual(result.trace.map(x => x.pc), [0, 3, 6, 9, 12, 15]);
});
test('countdown emits three numbers and encodes branch targets', () => {
  const p = compile('8 8 8 888888 88888 88 8888888');
  assert.deepEqual([...p.code.slice(9, 12)], [6, 21, 0]);
  assert.deepEqual([...p.code.slice(18)], [7, 12, 0]);
  assert.deepEqual(run(p).output, [3, 2, 1]);
});
test('nested and skipped loops', () => {
  assert.deepEqual(execute('8 888888 888888 88888 88 8888888 8888888').output, [1]);
  assert.deepEqual(execute('888888 8 888888 88888 88 8888888 8888888 88888').output, [0]);
});
test('memory pointer, value wrap, zeroing, empty source', () => {
  assert.deepEqual(execute('8888 88 88888 888 88888 8 88888888 88888').output, [255, 0, 0]);
  assert.deepEqual(execute('').output, []);
});
test('syntax errors point to the original source', () => {
  assert.throws(() => compile('8\n  9'), /2行 3列/u);
  assert.throws(() => compile('888888888'), /1行 1列/u);
  assert.throws(() => compile('888888'), /閉じていません/u);
  assert.throws(() => compile('8888888'), /ループ開始がありません/u);
});
test('bounds on source, program, output, and steps', () => {
  assert.throws(() => compile(' '.repeat(16385)), /16,384/u);
  assert.throws(() => compile('8 '.repeat(4097)), /4,096/u);
  assert.throws(() => execute('8 888888 88888 8888888'), /出力が4,096/u);
  assert.throws(() => execute('8 888888 8888888'), /100,000/u);
});

test('Bengali digit four is interchangeable with 8, but ASCII 4 is rejected', () => {
  const ascii = '8 8 8 8 8 88888';
  for (const source of ['৪ ৪ ৪ ৪ ৪ ৪৪৪৪৪', '8 ৪ ৪ 8 ৪ 8৪8৪8']) {
    assert.deepEqual(compile(source), compile(ascii));
    assert.deepEqual(execute(source).output, [5]);
  }
  assert.deepEqual(execute('৪ 8৪ ৪৪৪৪৪').output, [0]);
  assert.throws(() => compile('৪ 4'), /1行 3列/u);
  assert.throws(() => compile('৪'.repeat(9)), /1行 1列/u);
});

test('Odia digit four works alone or mixed with the other two symbols', () => {
  const ascii = '8 8 8 8 8 88888';
  for (const source of ['୪ ୪ ୪ ୪ ୪ ୪୪୪୪୪', '8 ৪ ୪ 8 ୪ 8৪୪8୪']) {
    assert.deepEqual(compile(source), compile(ascii));
    assert.deepEqual(execute(source).output, [5]);
  }
  assert.throws(() => compile('୪ 4'), /1行 3列/u);
  assert.throws(() => compile('୪'.repeat(9)), /1行 1列/u);
});

test('paired claps make comments that emit no bytecode, even across lines', () => {
  const source = '8👏任意の文字、88888、୪、"など\r\n次の行👏8 88888';
  const p = compile(source);
  assert.deepEqual(p.code, compile('8 8 88888').code);
  assert.deepEqual(p.locations, ['1行 1列', '2行 5列', '2行 7列']);
  assert.deepEqual(run(p).output, [2]);
  assert.deepEqual(execute('👏コメントだけ👏').output, []);
  assert.deepEqual(execute('8👏👏👏連続コメント👏88888').output, [1]);
});
test('unclosed comments and invalid tokens keep useful source locations', () => {
  assert.throws(() => compile('8\n  👏未閉鎖\nメモ'), /2行 3列.*コメント/u);
  assert.throws(() => compile('👏😀👏9'), /1行 4列/u);
});

test('arithmetic uses both operands, preserves order and wraps as a byte', () => {
  assert.deepEqual(execute('set 2 push set 3 add 88888 set 5 push set 2 sub 88888').output, [5, 3]);
  assert.deepEqual(execute('set 2 push set 5 sub 88888 set 255 push set 2 add 88888').output, [253, 1]);
  assert.throws(() => execute('add'), /push/u);
  assert.throws(() => compile('set 256'), /0〜255/u);
});
test('char emits ASCII characters and linefeeds, not raw cell numbers', () => {
  assert.deepEqual(execute('set 72 char set 73 char set 10 char 88888').output, ['H', 'I', '\n', 10]);
  assert.throws(() => execute('set 128 char'), /ASCII/u);
});
test('declaration does not execute; calls can repeat, nest and reference later declarations', () => {
  assert.deepEqual(execute('fn a set 65 char end').output, []);
  const source = 'call 挨拶 call 挨拶 fn 挨拶 call Hi set 33 char end fn Hi set 72 char set 73 char end';
  assert.deepEqual(execute(source).output, [...'HI!HI!']);
  assert.deepEqual(execute('fn f set 2 888888 88888 88 8888888 end call f').output, [2, 1]);
});
test('bad function declarations and excessive recursion are rejected', () => {
  for (const [source, pattern] of [
    ['call missing', /定義されていません/u],
    ['fn a set 1', /閉じる「神」/u],
    ['end', /対応する関数宣言/u],
    ['fn a fn b end end', /関数やループの外/u],
    ['fn a end fn a end', /定義済み/u],
    ['888888 fn f end 8888888', /関数やループの外/u],
    ['fn a 888888 end', /関数内のループ/u],
    ['fn a call a end call a', /64段/u],
  ]) assert.throws(() => execute(source), pattern);
});

test('Japanese function keywords compile to the same code and mix with English aliases', () => {
  const original = 'fn あいさつ set 72 char set 73 char end call あいさつ call あいさつ';
  const localized = 'マジ あいさつ set 72 char set 73 char 神 めっちゃ あいさつ call あいさつ';
  assert.deepEqual(compile(localized).code, compile(original).code);
  assert.deepEqual(execute(localized).output, [...'HIHI']);
  assert.deepEqual(execute('めっちゃ f fn f set 65 char end').output, ['A']);
  assert.throws(() => compile('めっちゃ 未定義'), /定義されていません/u);
  assert.throws(() => compile('神'), /対応する関数宣言/u);
});

test('compact commands use three distinct symbols and ignore whitespace between commands', () => {
  const flat = 'マジ"計算"8୪৪"2""3"8৪୪৪৪8"5""2"8৪୪神めっちゃ"計算"';
  const spaced = '👏説明👏\nマジ "計算"\n\t8୪৪ "2" "3" 8৪୪\r\n৪৪8"5""2" 8৪୪ 神 めっちゃ "計算"';
  assert.deepEqual(compile(spaced).code, compile(flat).code);
  assert.deepEqual(execute(flat).output, [5, 3]);
  assert.deepEqual(execute('マジ"二つ"8৪88୪88৪୪神めっちゃ"二つ"').output, [0]);
  assert.throws(() => compile('マジ"f"৪88神めっちゃ"f"'), /不明な命令/u);
});

test('quoted display preserves Unicode, spaces and clap characters without executing them', () => {
  const display = 'こんにちは 👏 "88888" 神\n';
  const source = 'マジ"挨拶"8৪୪' + JSON.stringify(display) + '神めっちゃ"挨拶"';
  assert.deepEqual(execute(source).output, [display]);
  assert.deepEqual(execute('マジ"字"8৪୪"123"神めっちゃ"字"').output, ['123']);
  assert.deepEqual(execute('マジ"字"8৪୪""神めっちゃ"字"').output, ['']);
  assert.throws(() => compile('マジ"f"8୪৪"2"神めっちゃ"f"'), /右の数/u);
  assert.throws(() => compile('マジ"f"8୪৪"2""字"神めっちゃ"f"'), /0〜255/u);
  assert.throws(() => compile('マジ"f"8৪୪"閉じ忘れ'), /表示する文字/u);
  const large = 'マジ"f"8৪୪"' + 'あ'.repeat(6000) + '"神' + 'めっちゃ"f"'.repeat(3);
  assert.throws(() => execute(large), /16,384文字/u);
});

test('braces close declarations and shared God boundaries delimit operands', () => {
  const add = 'マジ足し算{8୪৪神8神3神8৪୪}めっちゃ{足し算}';
  assert.deepEqual(execute(add).output, [11]);
  assert.deepEqual(execute('めっちゃ{足し算}マジ 足し算 { ৪৪8神 5 神 2 神8৪୪ }').output, [3]);
  assert.deepEqual(execute('マジ f { 8৪୪神こんにちは \\神 👏神 } めっちゃ { f }').output, ['こんにちは 神 👏']);
  assert.deepEqual(execute('マジ数{8৪୪神8神৪8৪神8神8৪୪}めっちゃ{数}').output, ['8',8]);
  assert.throws(() => compile('マジ数{8۴୪}'), /不明な命令/u);
  assert.throws(() => compile('マジ数{8৪୪'), /閉じる「\}」/u);
  assert.throws(() => compile('マジ数{8୪৪神8神'), /閉じる「神」/u);
});

test('v0.5 command families use distinct prefixes without breaking v0.4', () => {
  for (const [prefix, indices] of [['8',[0,1,7,10,11]],['৪',[4,8,9,12]],['୪',[2,3,5,6]]]) {
    for (const i of indices) assert.equal(compactCodes[i][0], prefix);
  }
  const current = 'マジ数{88৪神8神3神৪৪৪88୪神8神3神৪৪৪৪৪৪神8神}めっちゃ{数}';
  const previous = 'マジ数{8୪৪神8神3神8৪୪৪৪8神8神3神8৪୪8৪୪神8神}めっちゃ{数}';
  assert.deepEqual(compile(current).code, compile(previous).code);
  assert.deepEqual(execute(current).output, [11, 5, '8']);
});

test('debug snapshots restore memory before and after a move or cell update', () => {
  const p = compile('set 7 888 set 42 8888 88');
  const result = run(p, {debug:true});
  const {frames} = result.debug;
  assert.deepEqual([...debugSnapshot(frames, 0).cells.slice(0, 2)], [0,0]);
  assert.deepEqual(frames[1].change, {index:0, from:0, to:7});
  assert.equal(frames[2].pointer, 1);
  assert.equal(frames[2].change, null);
  assert.deepEqual([...debugSnapshot(frames, 3).cells.slice(0, 2)], [7,42]);
  assert.deepEqual([...debugSnapshot(frames, 5).cells.slice(0, 2)], [6,42]);
  assert.equal(run(p).debug, undefined);
});

test('debugging retains successful steps when the VM stops at an error', () => {
  assert.throws(() => run(compile('8 888888 8888888'), {debug:true}), error => {
    assert.match(error.message, /100,000/u);
    assert.equal(error.debug.steps, 100000);
    assert.equal(error.debug.frames.length, debugLimit + 1);
    assert.equal(debugSnapshot(error.debug.frames, debugLimit).cells[0], 1);
    return true;
  });
});
