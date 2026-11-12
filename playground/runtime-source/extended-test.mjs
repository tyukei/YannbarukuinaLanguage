import fs from 'node:fs';import assert from 'node:assert/strict';import {runQueena} from './runtime.js';
const wasm=fs.readFileSync('dist/queena.wasm');
let seed=1701; function next(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;}
let s='',want=''; for(let i=0;i<80;i++){let a=next()&65535,b=(next()&65535)||1; s+=`naku(${a}/${b})\n`;want+=Math.floor(a/b)+'\n';}
const r=await runQueena(s,wasm);assert.equal(r.ok,true);assert.equal(r.output,want);console.log('80 seeded division cases passed');
for(const [src,w] of [
 ['i=0 aruku(i<3){j=0 aruku(j<3){j=j+1 moshi(j==2){hashiru} naku(i*10+j)} i=i+1}','1\n3\n11\n13\n21\n23\n'],
 ['x=2 moshi(x==0){naku(0)} mata(x==1){naku(1)} mata(x==2){naku(2)} hoka{naku(3)}','2\n'],
 ['x=7 moshi(x==0){naku(0)} mata(x==1){naku(1)} mata(x==2){naku(2)} hoka{naku(3)}','3\n'],
 ['aruku(x<3){naku(x) x=x+1}','0\n1\n2\n']]){const r=await runQueena(src,wasm); assert.equal(r.ok,true, r.error);assert.equal(r.output,w);}
console.log('4 more condition/loop cases passed');
for(const src of ['naku(0)\n'.repeat(3000),'aruku(1){naku(65535)}']){const r=await runQueena(src,wasm);assert.equal(r.ok,false);console.log('limit',r.error);}
console.log('PASS 7 extended tests');
