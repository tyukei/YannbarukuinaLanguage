import fs from 'node:fs'; import assert from 'node:assert/strict'; import {runQueena} from './runtime.js';
const wasm=fs.readFileSync('dist/queena.wasm');
const cases=[['naku(3)','3\n'],['naku(6*7)\nnaku(100/3)','42\n33\n'],['i=0\naruku(i<5){naku(i) i=i+1}','0\n1\n2\n3\n4\n'],['x=7\nmoshi(x<0){naku(0)} mata(x<10){naku(1)} hoka{naku(2)}','1\n'],['naku(0) naku(9) naku(10) naku(255) naku(256) naku(65535)','0\n9\n10\n255\n256\n65535\n'],['naku(65535+1) naku(0-1)','0\n65535\n'],['naku(x) x=3 naku(x)','0\n3\n'],['i=0 aruku(i<10){i=i+1 moshi(i==3){hashiru} moshi(i==6){tobu} naku(i)}','1\n2\n4\n5\n'],['zz 日本語コメント\nnaku(2)','2\n']];
for(const [s,expected] of cases){const r=await runQueena(s,wasm); console.log(s.slice(0,30),JSON.stringify(r.output),r.error);assert.equal(r.ok,true);assert.equal(r.output,expected);}
for(const s of ['naku(', 'naku(65536)','naku(1.5)','naku(1/0)','aruku(1){ }']){const r=await runQueena(s,wasm);console.log('error',r.error);assert.equal(r.ok,false);}
console.log('PASS',cases.length+5);
