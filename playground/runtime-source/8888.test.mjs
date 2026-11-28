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
