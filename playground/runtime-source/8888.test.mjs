import test from 'node:test';
import assert from 'node:assert/strict';
import {compile, run} from '../dist/8888/engine.mjs';

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
    ['fn a set 1', /閉じる end/u],
    ['end', /対応する fn/u],
    ['fn a fn b end end', /関数やループの外/u],
    ['fn a end fn a end', /定義済み/u],
    ['888888 fn f end 8888888', /関数やループの外/u],
    ['fn a 888888 end', /関数内のループ/u],
    ['fn a call a end call a', /64段/u],
  ]) assert.throws(() => execute(source), pattern);
});
