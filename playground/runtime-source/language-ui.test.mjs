import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {compile, run} from '../dist/8888/engine.mjs';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('one editor, terminal and debugger are shared across the three languages', async () => {
 const html=await read('../dist/index.html'), app=await read('../dist/app.js'), legacy=await read('../dist/8888/index.html');
 const nav=html.match(/<nav class="language-tabs"[^>]*>(.*?)<\/nav>/su)[1];
 const labels=['yanbarukuina','chukei','8888'];
 assert.deepEqual([...nav.matchAll(/href="\.\/\?lang=([^"]+)" data-language="\1"/gu)].map(m=>m[1]),labels);
 assert.equal([...nav.matchAll(/aria-current="page"/gu)].length,1);
 for(const id of ['source','run','debug-run','debug-panel','output','cheatsheet','import-code','download-code','download-generated','result-heading']){
   assert.equal(html.split('id="'+id+'"').length,2,id);
   assert.doesNotMatch(legacy,new RegExp('id="'+id+'"'));
 }
 assert.match(legacy,/location\.replace\('\.\.\/\?lang=8888'/);
 assert.doesNotMatch(app,/location\.assign/);
 assert.match(app,/history\.replaceState\(null,"",tab.href\)/);
 assert.match(html,/id="clap-mark"[^>]*>8</u);
 assert.match(app,/main\.🔴/u);
 assert.match(app,/main\.👏/u);
 assert.match(html,/\.🔴,\.chukei,\.👏,\.8888/u);
 for(const name of ['queena','chukei','clap']) assert.ok(html.includes('id="'+name+'-cheat"'),name);
 const sample=html.match(/<pre><code>(マジ足す[\s\S]*?)<\/code><\/pre>/u)[1];
 assert.deepEqual(run(compile(sample)).output,[5]);
 assert.doesNotMatch(html,/Z80のステップ実行は未対応|8888言語（試作）/u);
 assert.deepEqual([...html.matchAll(/data-idea="([^"]+)"/gu)].map(m=>m[1]),labels);
 const designNotes=Object.fromEntries([...html.matchAll(/data-idea="([^"]+)"[^>]*><strong>([^<]+)/gu)].map(m=>[m[1],m[2]]));
 assert.deepEqual(designNotes,{
  yanbarukuina:'読みやすい手順を、Z80で動かす。',
  chukei:'6つの命令で、セルを直接操作する。',
  8888:'値を受け取り、次の値を返す。',
 });
 assert.match(app,/idea\.hidden=idea\.dataset\.idea!==language/);

});

test('language philosophy includes a shared comparison and qualified per-language labels', async () => {
 const html=await read('../dist/index.html');
 const labels=Object.fromEntries([...html.matchAll(/data-idea="([^"]+)"[^>]*>.*?<span class="paradigm-tag">([^<]+)/gu)].map(m=>[m[1],m[2]]));
 assert.deepEqual(labels,{
  yanbarukuina:'強いて言うなら：手続き型寄りの言語',
  chukei:'強いて言うなら：命令型言語',
  8888:'強いて言うなら：関数型言語（引数と戻り値を使う新形式）',
 });
 const table=html.match(/<details class="paradigm-guide">([\s\S]*?)<\/details>/u)[1];
 assert.deepEqual([...table.matchAll(/<th scope="row">([^<]+)<\/th><td>[^<]+<\/td>/gu)].map(m=>m[1]),
 ['命令型','手続き型','宣言型','関数型','オブジェクト指向','論理型']);
});
