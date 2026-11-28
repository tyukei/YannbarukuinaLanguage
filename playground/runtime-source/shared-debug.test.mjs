import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runChukei} from './chukei-runtime.js';
import {runYanbaruKuina} from './runtime.js';
import {initDebugger} from '../dist/8888/playground.mjs';

function mount(){
 const nodes={};
 function element(){
  return {events:{},children:[],value:'',append(...c){this.children.push(...c);},
   replaceChildren(...c){this.children=c;},insertRow:element,insertCell:element,
   addEventListener(name,fn){this.events[name]=fn;}};
 }
 return {nodes, ui:initDebugger({getElementById:id=>nodes[id]??=element(),createElement:element})};
}

test('CHUKEI debugger shows exact source, cells and jumps without changing ASCII output',()=>{
 const source='CCCHUKECHCHUKEI';
 const result=runChukei(source,{debug:true});
 assert.equal(result.output,runChukei(source).output);
 const {ui,nodes}=mount();ui.open('chukei',result,source);
 assert.equal(nodes['debug-next-pc'].textContent,'0x0000');
 nodes['debug-next'].events.click();
 assert.equal(nodes['debug-source'].children[2].textContent,'C');
 assert.match(nodes['debug-effect'].textContent,/0 → 1/u);
 assert.match(nodes['debug-cells'].children[0].className,/changed/u);
 assert.match(nodes['debug-map-body'].children[2].children[3].textContent,/JZ/);
});

test('Z80 debugger replays actual PCs, assembled bytes, registers and memory writes',async()=>{
 const wasm=readFileSync(new URL('../dist/yanbarukuina.wasm',import.meta.url));
 const source='t = 2 + 3\nnaku(t)';
 const result=await runYanbaruKuina(source,wasm,{debug:true});
 assert.equal(result.ok,true);assert.equal(result.output,'5\n');
 assert.equal(result.debug.steps,result.instructions);
 assert.equal(result.debug.frames[0].next,0x100);
 assert.equal(result.debug.frames[1].next,0x104);
 assert.deepEqual(Array.from(result.debug.listing[1].bytes),[0xdd,0x21,0x00,0x7f]);
 const {ui,nodes}=mount();ui.open('yanbarukuina',result,source);
 assert.equal(nodes['debug-next-pc'].textContent,'0x0100');
 nodes['debug-next'].events.click();
 assert.equal(nodes['debug-next-pc'].textContent,'0x0104');
 assert.match(nodes['debug-source'].textContent,/LD\s+IX/u);
 assert.match(nodes['debug-registers'].textContent,/IX=7F00/u);
 assert.equal(nodes['debug-map-body'].children[1].children[2].textContent,'DD 21 00 7F');
 nodes['debug-next'].events.click();
 nodes['debug-next'].events.click();
 assert.match(nodes['debug-effect'].textContent,/0x8000：A5 → 00/u);
 assert.equal(nodes['debug-cells'].children[0].children[1].textContent,'00');
 nodes['debug-prev'].events.click();
 nodes['debug-bank'].value='8000';nodes['debug-bank'].events.input();
 assert.equal(nodes['debug-cells'].children[0].children[1].textContent,'A5');
});

test('a runtime error retains completed CHUKEI instructions',()=>{
 const source='C'.repeat(128)+'CHUK';
 const r=runChukei(source,{debug:true});
 assert.equal(r.ok,false);assert.equal(r.debug.steps,128);
 assert.equal(r.debug.frames.at(-1).after,128);
});
