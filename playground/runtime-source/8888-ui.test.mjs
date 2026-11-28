import test from 'node:test';
import assert from 'node:assert/strict';
import {examples, exampleNames, initDebugger} from '../dist/8888/playground.mjs';
import {execute8888} from '../dist/8888/worker.mjs';

test('the initial source and every sample declare and invoke a named function', async () => {
  const keys = Object.keys(examples);
  const defaults=examples.hello;
  const results = {
    hello: '5', compose: '5', legacy: '5', count: '3 2 1', move: '2 1', bengali: '5', odia: '5',
    comment: '5', arithmetic: '5 3', letter: 'こんにちは', function: 'HIHI',
  };
  const nodes = {};
  function element() {
    return {events:{}, children:[], append(...children){this.children.push(...children);}, replaceChildren(...children){this.children = children;}, insertRow:element, insertCell:element,
      addEventListener(name, f) { this.events[name] = f; }};
  }
  const dom = {getElementById: id => nodes[id] ??= {...element(),value:''}, createElement: element};
  const debuggerUI=initDebugger(dom);
  const runDebug=key=>debuggerUI.open('8888',execute8888(examples[key],true),examples[key]);
  assert.equal(execute8888(defaults).output,'5');
  assert.deepEqual(keys,Object.keys(results));
  assert.equal(exampleNames.length,keys.length);
    for (const key of keys) {
      const source=examples[key];
      if (key==='hello'||key==='compose') assert.match(source,/マジ[^()]+\([^)]*\)神神神.*神神神\n৪৪৪\(めっちゃ/u);
      else {
        const name=source.match(/^マジ([^{]+)\{/u)?.[1];
        assert.ok(name&&source.includes('}めっちゃ{'+name+'}'),key);
        assert.doesNotMatch(source,/\s/u,key);
      }
      const result=execute8888(source);
      assert.equal(result.output,results[key],key);
      assert.equal(result.tokens[0].lexeme,'マジ');
      assert.equal(result.ast.children[0].kind,'function');
    }
    runDebug('move');
    assert.equal(nodes['debug-panel'].hidden, false);
    assert.match(nodes['debug-status'].textContent, /全メモリ 0/u);
    assert.match(nodes['debug-source'].textContent, /実行前/u);
    assert.equal(nodes['debug-pc'].textContent, '未実行');
    assert.equal(nodes['debug-next-pc'].textContent, '0x0000');
    assert.equal(nodes['debug-cells'].children.length, 16);
    const step = nodes['debug-step'];
    for (let n = 0; n < 3; n++) nodes['debug-next'].events.click();
    assert.match(nodes['debug-status'].textContent, /メモリ 0x0000：0 → 1/u);
    assert.match(nodes['debug-source-label'].textContent, /▶ 実行した命令/u);
    assert.equal(nodes['debug-source'].children[1].textContent, '▶');
    assert.equal(nodes['debug-source'].children[2].textContent, '৪8৪');
    assert.match(nodes['debug-cells'].children[0].className, /active changed/u);
    nodes['debug-next'].events.click();
    assert.match(nodes['debug-status'].textContent, /移動：0x0000 → 0x0001/u);
    assert.equal(nodes['debug-source'].children[2].textContent, '୪৪৪');
    assert.match(nodes['debug-effect'].textContent, /セル0から右へ移動.*セル1/u);
    nodes['debug-prev'].events.click();
    assert.match(nodes['debug-status'].textContent, /データ位置：0x0000/u);
    assert.equal(nodes['debug-source'].children[2].textContent, '৪8৪');
    step.value = step.max;
    step.events.input();
    assert.deepEqual(nodes['debug-cells'].children.slice(0, 2).map(x=>x.children[1].textContent), ['1','2']);
    nodes['debug-page'].value = '240';
    nodes['debug-page'].events.change();
    assert.equal(nodes['debug-cells'].children[15].children[0].textContent, '0x00FF');
    runDebug('legacy');
    const addressRows = nodes['debug-map-body'].children;
    assert.equal(addressRows.length, 8);
    assert.equal(addressRows[0].children[0].textContent, '0x0000（0）');
    assert.equal(addressRows[0].children[1].textContent, 'マジ五を出す{');
    assert.equal(addressRows[0].children[2].textContent, '0E 15 00');
    for (const row of addressRows.slice(1, 5)) assert.equal(row.children[1].textContent, '88৪神2神3神');
    assert.equal(addressRows[0].className, 'map-next');
    step.value = '2';
    step.events.input();
    assert.equal(addressRows[7].children[0].textContent, '0x0015（21）');
    assert.equal(addressRows[7].className, 'map-done');
    assert.equal(addressRows[1].className, 'map-next');
    assert.equal(addressRows[0].className, '');
    assert.equal(nodes['debug-pc'].textContent, '0x0015');
    assert.equal(nodes['debug-next-pc'].textContent, '0x0003');
    assert.match(nodes['debug-pc-note'].textContent, /ジャンプ：0x0015 → 0x0003/u);
    step.value = step.max;
    step.events.input();
    assert.match(nodes['debug-next-pc'].textContent, /（終了）/u);
    step.value = '6';
    step.events.input();
    assert.equal(nodes['debug-effect'].textContent, '2 と 3 を足して、セル0に 5 を入れました。');
    runDebug('hello');
    assert.equal(nodes['debug-values'].hidden,false);
    assert.match(nodes['debug-values'].textContent,/共有メモリへの書き込みなし/u);
    assert.equal(nodes['debug-cells'].children[0].children[0].textContent,'0x0000');
    step.value='4';step.events.input();
    assert.match(nodes['debug-values'].textContent,/引数：\[2, 3\]/u);
    step.value='8';step.events.input();
    assert.match(nodes['debug-effect'].textContent,/結果 5 を返して/u);
    debuggerUI.reset();
    assert.equal(nodes['debug-panel'].hidden, true);
});
