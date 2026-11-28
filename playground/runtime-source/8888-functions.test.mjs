import test from 'node:test';
import assert from 'node:assert/strict';
import {compile, run} from '../dist/8888/engine.mjs';
import {execute8888} from '../dist/8888/worker.mjs';

test('value functions receive explicit arguments, return values, and do not change shared memory',()=>{
 const source='マジ差(x,y){88୪(x,y)} マジ増(x){88৪(x,1)} ৪৪৪(めっちゃ差(めっちゃ増(8),2)) ৪৪৪(めっちゃ差(めっちゃ増(8),2))';
 const program=compile(source,{analysis:true,sourceMap:true});
 const result=run(program,{debug:true});
 assert.deepEqual(result.output,[7,7]);
 assert.ok(result.cells.every(value=>value===0));
 assert.ok(result.debug.frames.every(frame=>!frame.change));
 assert.ok(result.debug.frames.some(frame=>frame.op===23&&frame.values.at(-1)===7));
 assert.equal(result.debug.functional,true);
 assert.equal(program.ast.children[0].kind,'function');
 assert.equal(program.code.length%3,0);
 assert.equal(JSON.parse(execute8888(source).generated).version,2);
});

test('zero arguments, forward calls, and byte wrap remain supported',()=>{
 const result=execute8888('৪৪৪(めっちゃ零()) マジ零(){88৪(255,1)}');
 assert.equal(result.ok,true);
 assert.equal(result.output,'0');
});

test('wrong arity, unknown names, effects inside functions, and excessive recursion are rejected',()=>{
 for(const [source,error] of [
  ['マジa(x){x} ৪৪৪(めっちゃa())',/引数は1個/],
  ['マジa(x){y} ৪৪৪(めっちゃa(1))',/引数・計算/],
  ['マジa(){৪৪৪(2)}',/関数の中では出力できません/],
  ['マジa(){88৪(2,3)} 88৪神2神3神',/関数の定義/],
  ['マジa(){めっちゃa()} ৪৪৪(めっちゃa())',/64段/],
 ]) {
  const result=execute8888(source,true);
  assert.equal(result.ok,false,source);
  assert.match(result.error,error,source);
 }
});
