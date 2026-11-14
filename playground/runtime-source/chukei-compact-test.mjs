import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {runChukei} from './chukei-runtime.js';

let passed=0;
function test(name,fn){fn();passed++;console.log('PASS',name);}
const compact=s=>s.replace(/\s/gu,'');
const commands=['C','CH','CHU','CHUK','CHUKE','CHUKEI'];
const projectFile=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('compact countdown preserves AST, jumps and execution',()=>{
 const spaced='C C C CHUKE CHUK CH CHUKEI';
 const a=runChukei(spaced),b=runChukei(compact(spaced));
 assert.equal(b.ok,true);assert.equal(b.output,'3\n2\n1\n');
 for(const key of ['ast','bytecode','output','steps','trace','cells','pointer']) assert.deepEqual(b[key],a[key],key);
 assert.deepEqual(b.tokens.map(t=>t.column),[1,2,3,4,9,13,15]);
});

test('all 1554 sequences of up to four commands have unique boundaries',()=>{
 let cases=0;
 function check(parts){
  if(parts.length){
   // Invalid tail prevents execution, including nonterminating loops.
   const r=runChukei(parts.join('')+'\n?');
   assert.deepEqual(r.tokens.slice(0,-1).map(t=>t.lexeme),parts);
   let column=1;
   for(const t of r.tokens.slice(0,-1)){assert.equal(t.column,column);assert.equal(t.line,1);column+=t.lexeme.length;}
   assert.equal(r.tokens.at(-1).lexeme,'?');assert.equal(r.steps,0);cases++;
  }
  if(parts.length<4) for(const c of commands) check([...parts,c]);
 }
 check([]);assert.equal(cases,1554);
});

test('old spaced, compact and mixed whitespace programs agree',()=>{
 const programs=[
  'C C C CHUKE CHUK CH CHUKEI','CH CHUK C CHUK',
  'C C CHU C C C CHUKE CHUK CH CHUKEI',
  'C CHUKE CHUKE CH CHUKEI CHUKEI CHUK',
  'CHUKE C CHUKE CHUK CHUKEI CHUKEI CHUK',
  'C CHU C C CHUK '+'CHU '.repeat(255)+'CHUK',
  'C '.repeat(256)+'CHUK'
 ];
 for(const s of programs){
  const expected=runChukei(s);
  const parts=s.trim().split(/\s+/u);
  const mixed=parts.map((c,i)=>c+['',' ','\n','\t','\r\n','\u3000'][i%6]).join('');
  for(const input of [compact(s),mixed]){
   const actual=runChukei(input);
   for(const key of ['ok','output','ast','bytecode','steps','trace','cells','pointer']) assert.deepEqual(actual[key],expected[key],key);
  }
 }
});

test('six complete commands, not greedy prefix guesses',()=>{
 assert.deepEqual(runChukei('CCHCHUCHUKCHUKECHUKEI').tokens.map(t=>t.lexeme),commands);
 for(const c of commands.slice(0,4)) assert.equal(runChukei(c).ok,true,c);
 assert.equal(runChukei('CCH').cells[0],0);
 assert.equal(runChukei('CHUKECHUKEI').steps,1);
});

test('invalid chunks and split command fragments are not ignored or joined',()=>{
 for(const s of ['H','CX','CHUKK','CHUE','CHUKEII','CHUCK','C H','CHU KEI','CHUK!CHUK','C🤖CHUK','C;C','CCC#CHUK','cchuk']){
  const r=runChukei(s);assert.equal(r.ok,false,s);assert.match(r.error,/Unknown command/,s);
  assert.equal(r.ast,null);assert.deepEqual(r.bytecode,[]);assert.equal(r.steps,0);
 }
});

test('original positions retain CRLF, tabs, unicode and trailing tokens',()=>{
 const r=runChukei('CCH\r\n\tCHU\u3000CHUK?CCHUK');
 assert.deepEqual(r.tokens.map(({lexeme,line,column})=>({lexeme,line,column})),[
  {lexeme:'C',line:1,column:1},{lexeme:'CH',line:1,column:2},
  {lexeme:'CHU',line:2,column:2},{lexeme:'CHUK?',line:2,column:6},
  {lexeme:'C',line:2,column:11},{lexeme:'CHUK',line:2,column:12}
 ]);
 assert.match(r.error,/line 2, column 6/);
 const unicode=runChukei('🤖C');assert.equal(unicode.tokens[1].column,3);
});

test('unmatched compact loops report original positions',()=>{
 for(const [s,line,column] of [['CCHUKE',1,2],['CCHUKEI',1,2],['C\n\tCHUKECHUKE',2,7],['CHUKECHUKEICHUKEI',1,12]]){
  const r=runChukei(s);assert.equal(r.ok,false);assert.match(r.error,new RegExp(`line ${line}, column ${column}`));
  assert.equal(r.ast,null);assert.deepEqual(r.bytecode,[]);
 }
});

test('compact nesting, source and execution limits remain enforced',()=>{
 assert.equal(runChukei('CHUKE'.repeat(128)+'CHUKEI'.repeat(128)).ok,true);
 assert.match(runChukei('CHUKE'.repeat(129)).error,/nesting exceeds/);
 assert.equal(runChukei('C'.repeat(16384)).ok,true);
 assert.match(runChukei('C'.repeat(16385)).error,/16 KiB/);
 assert.match(runChukei('CCHUKECHUKEI').error,/上限/);
 assert.match(runChukei('CCHUKECHUKCHUKEI').error,/出力上限/);
});

test('compact ASCII output and error position stay unchanged',()=>{
 assert.equal(runChukei('C'.repeat(65)+'CHUKCHUK',{outputMode:'ascii'}).output,'AA');
 const r=runChukei('C'.repeat(128)+'CHUK',{outputMode:'ascii'});
 assert.equal(r.ok,false);assert.match(r.error,/line 1, column 129/);
 assert.equal(runChukei('C'.repeat(65)+'CHUK').output,'65\n');
});

// Evaluate only the sample declarations, not the DOM/UI code or a browser mock.
const app=projectFile('../dist/app.js');
const uiSamples=vm.runInNewContext(app.slice(0,app.indexOf('const drafts='))+';({samples,chukeiSamples,asciiSamples})');
const expectedNumeric={hello:'3\n2\n1\n',branch:'255\n0\n',loop:'3\n2\n1\n',control:'0\n'};
const expectedAscii={hello:'HELLO, I AM CHUKEI!',branch:'Hello',loop:'AB',control:'A\nB',letters:'AZaz',abc:'ABC'};

test('all ten UI samples are whitespace-free and produce expected output',()=>{
 for(const [collection,outputMode,outputs] of [[uiSamples.chukeiSamples,'numeric',expectedNumeric],[uiSamples.asciiSamples,'ascii',expectedAscii]]){
  for(const [name,s] of Object.entries(collection)){
   assert.doesNotMatch(s,/\s/u,name);const r=runChukei(s,{outputMode});assert.equal(r.ok,true,name);assert.equal(r.output,outputs[name],name);
  }
 }
 assert.match(app,/let chukeiMode="ascii"/);
 assert.match(app,/el\("language"\)\.value="chukei"/);
 assert.match(uiSamples.samples.hello,/naku\(6 \* 7\)/);
});

test('bundled worker message API agrees with runtime including errors',()=>{
 const messages=[];
 const self={postMessage:r=>messages.push(r)};
 vm.runInNewContext(projectFile('../dist/chukei-worker.js'),{self,performance,TextEncoder,Uint8Array});
 const cases=[...Object.values(uiSamples.chukeiSamples).map(source=>({source,outputMode:'numeric'})),...Object.values(uiSamples.asciiSamples).map(source=>({source,outputMode:'ascii'})),{source:'C H'},{source:'CCHUKE'},{source:'\nCHUKEI'},{source:''}];
 for(const data of cases){
  self.onmessage({data});
  const actual=JSON.parse(JSON.stringify(messages.pop()));
  assert.deepEqual(actual,runChukei(data.source,{outputMode:data.outputMode}));
 }
});

test('site explains compact syntax and retains VM instruction guide',()=>{
 const html=projectFile('../dist/index.html');
 assert.match(html,/app\.js\?v=compact-20261114/);assert.match(app,/chukei-worker\.js\?v=compact-20261114/);
 assert.match(html,/スペース不要/);assert.match(html,/次のCで区切れます/);
 assert.match(html,/C HはCHになりません/);assert.match(html,/未知の文字・命令はエラー/);
 assert.doesNotMatch(html,/空白で分割したトークン単位|大文字・空白区切り|空白で区切る6命令/);
 for(const op of ['INC','DEC','RIGHT','OUT','JZ','JNZ']) assert.match(html,new RegExp(`→ ${op}</code>`));
 assert.match(html,/移動先の命令番号（0始まり）/);
});

console.log(`PASS ${passed} compact CHUKEI test groups`);
