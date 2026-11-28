import assert from 'node:assert/strict';
import {runChukei} from './chukei-runtime.js';
const ascii=runChukei;
let passed=0;function test(name,fn){fn();passed++;console.log('PASS',name);}
const char=n=>'C '.repeat(n)+'CHUK';
test('A Z a z',()=>{for(const n of [65,90,97,122]){const r=ascii(char(n));assert.equal(r.ok,true);assert.equal(r.output,String.fromCharCode(n));assert.equal(r.outputMode,'ascii');assert.equal(r.trace.at(-1).output,r.output);}});
test('ASCII is the default and numeric mode is rejected',()=>{assert.equal(runChukei(char(65)).output,'A');assert.equal(runChukei(char(65),{outputMode:'ascii'}).output,'A');assert.equal(runChukei(char(65),{outputMode:'numeric'}).ok,false);assert.equal(runChukei('CHUK').outputMode,'ascii');});
test('loop ASCII sequence',()=>{const r=ascii('C C C CHUKE CHUK CH CHUKEI');assert.equal(r.ok,true);assert.equal(r.output,'\x03\x02\x01');assert.equal(r.cells[0],0);});
test('all 128 ASCII values preserved',()=>{for(let n=0;n<128;n++){const r=ascii(char(n));assert.equal(r.ok,true);assert.equal(r.output.length,1);assert.equal(r.output.charCodeAt(0),n);}});
test('high bytes rejected only at output',()=>{for(let n=128;n<256;n++){const r=ascii(char(n));assert.equal(r.ok,false);assert.match(r.error,/ASCII出力範囲外 at line 1, column/);assert.equal(r.output,'');assert.equal(r.cells[0],n);assert.ok(r.ast);assert.equal(r.bytecode.at(-1).op,'OUT');}assert.equal(ascii('CH C CHUK').output,'\0');});
test('partial output retained with error',()=>{const r=ascii(char(65)+' '+'C '.repeat(63)+'CHUK');assert.equal(r.ok,false);assert.equal(r.output,'A');});
test('invalid modes/settings',()=>{for(const outputMode of ['text','ASCII','',null,0,false,{},[]])assert.equal(runChukei('CHUK',{outputMode}).ok,false);for(const opts of [null,[],42,'ascii'])assert.equal(runChukei('CHUK',opts).ok,false);});
test('ASCII output bounded',()=>{const r=ascii('C CHUKE CHUK CHUKEI');assert.equal(r.ok,false);assert.match(r.error,/出力上限/);assert.equal(r.output.length,16384);assert.equal(r.trace.find(x=>x.op==='OUT').output,'\x01');});
test('ASCII state reset and empty',()=>{assert.equal(ascii('').ok,true);ascii(char(65));assert.equal(runChukei('CHUK').output,'\0');assert.equal(ascii('CHUK').output,'\0');});
console.log(`PASS ${passed} ASCII tests`);
