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

test('triple 神 surrounds function bodies without changing their bytecode',()=>{
 const source='マジ同じ(x)神神神x神神神マジ足す(x,y)👏 目印 👏神神神88৪(x,y)神神神৪৪৪(めっちゃ足す(めっちゃ同じ(2),3))';
 const curly='マジ同じ(x){x}マジ足す(x,y){88৪(x,y)}৪৪৪(めっちゃ足す(めっちゃ同じ(2),3))';
 const a=compile(source,{analysis:true,sourceMap:true}),b=compile(curly);
 assert.deepEqual(a.code,b.code);
 assert.deepEqual(run(a).output,[5]);
 assert.equal(a.tokens.filter(t=>t.lexeme==='神神神'&&t.kind==='区切り').length,4);
 assert.ok(a.sourceCommands.includes('神神神'));
 assert.deepEqual(run(compile('マジ神神神(神神神){神神神}৪৪৪(めっちゃ神神神(2))')).output,[2]);
});

test('a triple-神 function body must end with its matching delimiter',()=>{
 for(const source of ['マジa(x)神神神x}', 'マジa(x)神神神x', 'マジa(x){x神神神']){
   const result=execute8888(source);
   assert.equal(result.ok,false);
 }
 assert.match(execute8888('マジa()神神神2}',true).error,/「神神神」が必要/);
});

test('single 神 replaces paired parentheses while braces enclose the function body',()=>{
 const source='マジ増やす神x神{88৪神x,1神}マジ三神神{3}৪৪৪神めっちゃ増やす神めっちゃ増やす神めっちゃ三神神神神神';
 const equivalent='マジ増やす(x){88৪(x,1)}マジ三(){3}৪৪৪(めっちゃ増やす(めっちゃ増やす(めっちゃ三())))';
 const program=compile(source,{analysis:true});
 assert.deepEqual(program.code,compile(equivalent).code);
 assert.deepEqual(run(program).output,[5]);
 assert.ok(program.tokens.filter(t=>t.lexeme==='神').every(t=>t.kind==='区切り'));
 assert.equal(execute8888('マジそのまま 👏引数👏 神x神 {x}৪৪৪(めっちゃそのまま神5神)').output,'5');
 assert.match(execute8888('マジ零神神{0}৪৪৪神めっちゃ零神神',true).error,/「神」が必要/);
});

test('legacy functions with 神 in names and older delimiters still work',()=>{
 assert.equal(execute8888('マジ女神王神{8৪8৪৪৪}めっちゃ{女神王神}').output,'1');
 assert.equal(execute8888('マジ 女神 8 88888 神 めっちゃ 女神').output,'1');
 assert.equal(execute8888('マジ女神(x)神神神x神神神৪৪৪(めっちゃ女神(5))').output,'5');
});
