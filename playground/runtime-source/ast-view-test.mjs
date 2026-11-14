// Unit tests use a small DOM adapter, not a browser or layout simulation.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {runChukei} from './chukei-runtime.js';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const context={};vm.runInNewContext(read('../dist/ast-view.js'),context);
const api=context.QueenaAstView;
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS',name);}
class Element {
 constructor(tag){this.tagName=tag;this.children=[];this.dataset={};this.hidden=false;this.disabled=false;this.checked=false;this.open=false;this.events={};this._text='';this.className='';}
 append(...children){this.children.push(...children);}
 replaceChildren(...children){this.children=children;this._text='';}
 set textContent(value){this._text=String(value);this.children=[];}
 get textContent(){return this._text+this.children.map(c=>c.textContent).join('');}
 set innerHTML(_){throw Error('Unsafe HTML rendering is forbidden');}
 addEventListener(type,fn){(this.events[type]??=[]).push(fn);}
 dispatch(type){for(const f of this.events[type]||[])f();}
 all(){return this.children.flatMap(c=>[c,...c.all()]);}
 querySelectorAll(tag){return this.all().filter(n=>n.tagName===tag);}
}
function mount(){
 const elements={};
 for(const name of ['container','note','tools','summary','limit','groupInput','groupLabel','expandButton','collapseButton']) elements[name]=new Element('div');
 elements.groupInput.checked=true;
 const view=api.create({document:{createElement:tag=>new Element(tag)},...elements});
 return {...elements,view};
}
const wasm=readFileSync(new URL('../dist/queena.wasm',import.meta.url));
const {instance}=await WebAssembly.instantiate(wasm),e=instance.exports;
function compilerAst(source){
 const bytes=new TextEncoder().encode(source);new Uint8Array(e.memory.buffer,e.input_ptr(),bytes.length).set(bytes);e.compile(bytes.length);
 return e.ast_length()?JSON.parse(new TextDecoder().decode(new Uint8Array(e.memory.buffer,e.ast_ptr(),e.ast_length()))):null;
}
const flat=n=>[n,...(n.children||[]).flatMap(flat)];
const cards=ui=>ui.container.all().filter(n=>n.className==='ast-card');

test('actual operator precedence retains every original AST label',()=>{
 const ast=compilerAst('naku(1+2*3)');assert.equal(ast.children[0].children[0].label,'expression · Binary: +');
 assert.equal(ast.children[0].children[0].children[1].label,'right · Binary: *');
 const ui=mount(),before=JSON.stringify(ast);ui.view.render(ast,'queena');
 assert.equal(cards(ui).length,flat(ast).length);
 for(const n of flat(ast)) assert.ok(ui.container.textContent.includes(n.label),n.label);
 assert.match(ui.container.textContent,/左の式/);assert.match(ui.container.textContent,/右の式/);
 assert.equal(JSON.stringify(ast),before);assert.equal(ui.groupLabel.hidden,true);
});

test('actual conditional chain and loop roles are not reconstructed',()=>{
 const ast=compilerAst('i=0 aruku(i<2){moshi(i==0){naku(1)} mata(i==1){naku(2)} hoka{naku(3)} i=i+1}');
 const ui=mount();ui.view.render(ast,'queena');
 assert.equal(api.summarize(ast).loops,1);assert.equal(api.summarize(ast).branches,2);
 for(const label of ['条件','ループ本体','条件が真のとき','それ以外']) assert.ok(ui.container.textContent.includes(label));
 assert.equal(cards(ui).filter(n=>n.dataset.tone==='loop').length,1);
 assert.match(ui.note.textContent,/実行順や実行回数ではありません/);
});

test('CHUKEI nested loops preserve their real body hierarchy',()=>{
 const ast=runChukei('CCHUKECHUKECHCHUKEICHUKEICHUK').ast;
 const ui=mount();ui.view.render(ast,'chukei');
 assert.equal(api.summarize(ast).loops,2);
 assert.equal(cards(ui).filter(n=>n.dataset.tone==='loop').length,2);
 assert.equal(ui.container.textContent.includes('条件が真のとき'),false);
 assert.equal(cards(ui).some(n=>n.textContent.includes('1行')),false);
 assert.equal(ui.groupLabel.hidden,false);
});

test('identical adjacent commands group only for display and can be ungrouped',()=>{
 const ast=runChukei('CCCCHUKCCHUCC').ast,before=JSON.stringify(ast),ui=mount();
 ui.view.render(ast,'chukei');
 assert.equal(cards(ui).filter(n=>n.dataset.group==='true').length,2);
 assert.match(ui.container.textContent,/C · 1増やす × 3/);
 assert.match(ui.container.textContent,/ソース上の連続3命令/);
 assert.equal(api.summarize(ast).nodes,ast.children.length+1);
 ui.groupInput.checked=false;ui.groupInput.dispatch('change');
 assert.equal(cards(ui).length,ast.children.length+1);
 assert.equal(cards(ui).some(n=>n.dataset.group),false);
 assert.equal(JSON.stringify(ast),before);
});

test('grouping never crosses a loop or combines unrelated Queena nodes',()=>{
 const ast=runChukei('CCCHUKECHCHUKEICC').ast,ui=mount();ui.view.render(ast,'chukei');
 assert.equal(cards(ui).filter(n=>n.dataset.group==='true').length,2);
 const q=compilerAst('naku(1) naku(1)');ui.view.render(q,'queena');
 assert.equal(cards(ui).length,flat(q).length);
 assert.equal(cards(ui).some(n=>n.dataset.group),false);
});

test('native details controls open branches and collapse below the root',()=>{
 const ui=mount();ui.view.render(compilerAst('naku((1+2)*3)'),'queena');
 ui.collapseButton.dispatch('click');const details=ui.container.querySelectorAll('details');
 assert.equal(details[0].open,true);assert.ok(details.slice(1).every(d=>!d.open));
 ui.expandButton.dispatch('click');assert.ok(details.every(d=>d.open));
 assert.ok(ui.container.querySelectorAll('ol').length>1);
 assert.equal(ui.expandButton.disabled,false);
});

test('empty program and empty loop are still real nodes',()=>{
 const ui=mount();ui.view.render(runChukei('').ast,'chukei');assert.equal(cards(ui).length,1);assert.match(ui.summary.textContent,/1 ノード/);
 ui.view.render(runChukei('CHUKECHUKEI').ast,'chukei');assert.equal(cards(ui).length,2);assert.match(ui.summary.textContent,/ループ 1/);
});

test('parse errors clear old cards, controls and stale flags',()=>{
 const ui=mount();ui.view.render(compilerAst('naku(1)'),'queena');ui.view.markStale();assert.equal(ui.container.dataset.stale,'true');
 ui.view.render(compilerAst('naku('),'queena');assert.equal(ui.container.children.length,0);assert.equal(ui.tools.hidden,true);assert.equal(ui.expandButton.disabled,true);assert.equal(ui.summary.textContent,'');assert.equal(ui.container.dataset.stale,undefined);
 ui.view.clear('解析中…');assert.equal(ui.note.textContent,'解析中…');
});

test('runtime failure retains successfully parsed structure',()=>{
 const r=runChukei('CHCHUK',{outputMode:'ascii'});assert.equal(r.ok,false);assert.ok(r.ast);
 const ui=mount();ui.view.render(r.ast,'chukei');assert.equal(cards(ui).length,3);assert.equal(ui.tools.hidden,false);
});

test('stale warning survives grouping and disclosure until a fresh result',()=>{
 const ui=mount(),ast=runChukei('CCCCHUK').ast;ui.view.render(ast,'chukei');ui.view.markStale();
 for(const checked of [false,true,false]){
  ui.groupInput.checked=checked;ui.groupInput.dispatch('change');ui.expandButton.dispatch('click');ui.collapseButton.dispatch('click');
  assert.equal(ui.container.dataset.stale,'true');assert.match(ui.note.textContent,/編集前の構文木/);
 }
 ui.view.render(ast,'chukei');assert.equal(ui.container.dataset.stale,undefined);assert.doesNotMatch(ui.note.textContent,/編集前/);
});

test('untrusted labels are text, not HTML or inferred commands',()=>{
 const ui=mount();ui.view.render({label:'<script>alert(1)</script>',children:[{label:'CHUKE <img src=x>',role:'<b>fake</b>',children:[]}]},'chukei');
 assert.match(ui.container.textContent,/<script>alert\(1\)<\/script>/);
 assert.equal(ui.container.querySelectorAll('script').length,0);
 assert.equal(cards(ui).some(n=>n.dataset.tone==='loop'),false);
});

test('large trees are bounded with explicit notices and exact-cap handling',()=>{
 const ui=mount();ui.groupInput.checked=false;
 ui.view.render(runChukei('C'.repeat(399)).ast,'chukei');assert.equal(cards(ui).length,400);assert.equal(ui.limit.hidden,true);
 ui.view.render(runChukei('C'.repeat(16384)).ast,'chukei');assert.equal(cards(ui).length,400);assert.equal(ui.limit.hidden,false);assert.match(ui.summary.textContent,/16385 ノード/);
 ui.groupInput.checked=true;ui.groupInput.dispatch('change');assert.equal(cards(ui).length,2);assert.equal(ui.limit.hidden,true);assert.match(ui.container.textContent,/× 16384/);
});

test('deep trees show truncation without unbounded recursion',()=>{
 const ast=runChukei('CHUKE'.repeat(128)+'CHUKEI'.repeat(128)).ast,ui=mount();ui.view.render(ast,'chukei');
 assert.equal(cards(ui).length,25);assert.equal(ui.limit.hidden,false);assert.match(ui.container.textContent,/深さ24/);
 const cyclic={label:'cycle',children:[]};cyclic.children.push(cyclic);assert.equal(api.summarize(cyclic).limited,true);ui.view.render(cyclic,'chukei');assert.equal(ui.limit.hidden,false);
});

test('default HELLO AST displays grouped commands without changing output',()=>{
 const app=read('../dist/app.js');const samples=vm.runInNewContext(app.slice(0,app.indexOf('const drafts='))+';asciiSamples');
 const r=runChukei(samples.hello,{outputMode:'ascii'}),before=JSON.stringify(r.ast),ui=mount();ui.view.render(r.ast,'chukei');
 assert.equal(r.output,'HELLO, I AM CHUKEI!');assert.ok(cards(ui).length<flat(r.ast).length/3);assert.equal(JSON.stringify(r.ast),before);
});

test('HTML wiring and mobile/accessibility styles are declared',()=>{
 const html=read('../dist/index.html'),css=read('../dist/ast-view.css'),app=read('../dist/app.js');
 assert.ok(html.indexOf('ast-view.js?v=')<html.indexOf('app.js?v='));
 for(const id of ['ast-tools','ast-summary','ast-tree','ast-limit','ast-group','ast-expand','ast-collapse']) assert.match(html,new RegExp(`id="${id}"`));
 assert.match(html,/id="ast-tree" role="region"[^>]+tabindex="0"/);
 assert.match(html,/aria-controls="ast-tree"/);assert.match(html,/aria-hidden="true"/);
 assert.match(css,/@media\(max-width:600px\)/);assert.match(css,/overflow:auto/);assert.match(css,/min-height:44px/);assert.match(css,/focus-visible/);
 assert.match(app,/astView.clear\("解析中…"\)/);assert.match(app,/astView.markStale\(\)/);
});

console.log(`PASS ${passed} AST presentation test groups`);
