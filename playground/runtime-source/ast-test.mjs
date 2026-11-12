import fs from 'node:fs';
import assert from 'node:assert/strict';
import {runQueena} from './runtime.js';
const wasm=fs.readFileSync('dist/queena.wasm');
function flatten(root){const nodes=[];const walk=n=>{assert.equal(typeof n.label,'string');assert.ok(Array.isArray(n.children));nodes.push(n);n.children.forEach(walk);};walk(root);assert.equal(new Set(nodes.map(n=>n.id)).size,nodes.length);return nodes;}
let passed=0;
const r=await runQueena('x=(2+3)*4\nnaku(x)',wasm);
assert.equal(r.ok,true);assert.equal(r.output,'20\n');assert.equal(r.ast.kind,'program');assert.equal(r.ast.children[0].kind,'assign_stmt');
const nodes=flatten(r.ast);for(const kind of ['program','assign_stmt','binary','grouping','literal','identifier','print_stmt'])assert.ok(nodes.some(n=>n.kind===kind),kind);assert.ok(nodes.some(n=>n.label==='left · Grouping ( )'));passed++;
const branched=await runQueena('x=2 moshi(x==0){naku(0)} mata(x==1){naku(1)} mata(x==2){naku(2)} hoka{naku(3)}',wasm);
assert.equal(branched.output,'2\n');const branch=branched.ast.children[1];assert.deepEqual(branch.children.map(n=>n.role),['condition','then','else']);assert.equal(branch.children[2].kind,'if_stmt');assert.equal(branch.children[2].children[2].kind,'if_stmt');assert.equal(branch.children[2].children[2].children[2].kind,'block');assert.equal(flatten(branched.ast).filter(n=>n.kind==='if_stmt').length,3);passed++;
const loop=await runQueena('i=0 aruku(i<3){i=i+1 moshi(i==1){hashiru} moshi(i==3){tobu} naku(i)}',wasm);
assert.equal(loop.output,'2\n');const ln=flatten(loop.ast);for(const kind of ['while_stmt','break_stmt','continue_stmt','block']) assert.ok(ln.some(n=>n.kind===kind));assert.deepEqual(loop.ast.children[1].children.map(n=>n.role),['condition','body']);passed++;
for(const source of ['naku(1/0)','aruku(1){}','aruku(1){naku(65535)}']) {const r=await runQueena(source,wasm);assert.equal(r.ok,false);assert.equal(r.ast.kind,'program');flatten(r.ast);passed++;}
for(const source of ['naku(', 'x = 65536', 'moshi(1){naku(1)', 'tobu']) {const r=await runQueena(source,wasm);assert.equal(r.ok,false);assert.equal(r.ast,null);assert.match(r.error,/Parse error at line \d+, column \d+/);passed++;}
const tooMany=await runQueena(Array.from({length:33},(_,i)=>`x${i}=${i}`).join('\n'),wasm);assert.equal(tooMany.ok,false);assert.ok(tooMany.ast);assert.equal(tooMany.ast.children.length,33);passed++;
const comment=await runQueena('zz <script> "日本語"\nnaku(2)',wasm);assert.equal(comment.ok,true);assert.equal(comment.ast.children.length,1);assert.ok(!JSON.stringify(comment.ast).includes('<script>'));passed++;
const {instance}=await WebAssembly.instantiate(wasm);const e=instance.exports;const enc=new TextEncoder();function compile(s){const b=enc.encode(s);new Uint8Array(e.memory.buffer,e.input_ptr(),b.length).set(b);return e.compile(b.length);}assert.equal(compile('naku(1)'),0);assert.ok(e.ast_length()>0);assert.equal(compile('naku('),1);assert.equal(e.ast_length(),0);passed++;
console.log(`PASS ${passed} AST tests`);
