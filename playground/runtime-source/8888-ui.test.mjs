import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('the initial source and every sample declare and invoke a named function', async () => {
  const html = await readFile(new URL('../dist/8888/index.html', import.meta.url), 'utf8');
  const sampleSelect = html.match(/<select id="example">([\s\S]*?)<\/select>/u)[1];
  const keys = [...sampleSelect.matchAll(/<option value="([^"]+)">/gu)].map(m => m[1]);
  const defaults = html.match(/<textarea[^>]+>([\s\S]*?)<\/textarea>/u)[1];
  const results = {
    add: '5', count: '3 2 1', move: '2 1', bengali: '5', odia: '5',
    comment: '5', arithmetic: '5 3', letter: 'こんにちは', function: 'HIHI',
  };
  const nodes = {source: {value: defaults, ...element()}};
  function element() {
    return {events:{}, children:[], append(...children){this.children.push(...children);}, replaceChildren(...children){this.children = children;}, insertRow:element, insertCell:element,
      addEventListener(name, f) { this.events[name] = f; }};
  }
  const previous = globalThis.document;
  globalThis.document = {getElementById: id => nodes[id] ??= element(), createElement: element};
  try {
    await import('../dist/8888/playground.mjs');
    nodes.run.events.click();
    assert.equal(nodes.output.textContent, '5');
    assert.deepEqual(keys, Object.keys(results));
    for (const key of keys) {
      nodes.example.events.change({target:{value:key}});
      const source = nodes.source.value;
      const name = source.match(/^マジ([^{]+)\{/u)?.[1];
      assert.ok(name, key);
      assert.ok(source.includes('}めっちゃ{' + name + '}'), key);
      assert.doesNotMatch(source, /\s/u, key);
      assert.match(source, /\{👏[^👏]+👏/u, key);
      if (key === 'add') assert.equal(source, defaults);
      nodes.run.events.click();
      assert.equal(nodes.output.textContent, results[key], key);
    }
    nodes.example.events.change({target:{value:'move'}});
    nodes['run-debug'].events.click();
    assert.equal(nodes['debug-panel'].hidden, false);
    assert.match(nodes['debug-status'].textContent, /全セル 0/u);
    assert.match(nodes['debug-source'].textContent, /実行前/u);
    assert.equal(nodes['debug-pc'].textContent, '未実行');
    assert.equal(nodes['debug-next-pc'].textContent, '0x0000');
    assert.equal(nodes['debug-cells'].children.length, 16);
    const step = nodes['debug-step'];
    for (let n = 0; n < 3; n++) nodes['debug-next'].events.click();
    assert.match(nodes['debug-status'].textContent, /セル 0：0 → 1/u);
    assert.match(nodes['debug-source-label'].textContent, /▶ 実行した命令/u);
    assert.equal(nodes['debug-source'].children[1].textContent, '▶');
    assert.equal(nodes['debug-source'].children[2].textContent, '৪8৪');
    assert.match(nodes['debug-cells'].children[0].className, /active changed/u);
    nodes['debug-next'].events.click();
    assert.match(nodes['debug-status'].textContent, /移動：0 → 1/u);
    assert.equal(nodes['debug-source'].children[2].textContent, '୪৪৪');
    assert.match(nodes['debug-effect'].textContent, /セル0から右へ移動.*セル1/u);
    nodes['debug-prev'].events.click();
    assert.match(nodes['debug-status'].textContent, /現在のセル：0/u);
    assert.equal(nodes['debug-source'].children[2].textContent, '৪8৪');
    step.value = step.max;
    step.events.input();
    assert.deepEqual(nodes['debug-cells'].children.slice(0, 2).map(x=>x.children[1].textContent), ['1','2']);
    nodes['debug-page'].value = '240';
    nodes['debug-page'].events.change();
    assert.equal(nodes['debug-cells'].children[15].children[0].textContent, 'セル 255');
    nodes.example.events.change({target:{value:'add'}});
    nodes['run-debug'].events.click();
    step.value = '2';
    step.events.input();
    assert.equal(nodes['debug-pc'].textContent, '0x0015');
    assert.equal(nodes['debug-next-pc'].textContent, '0x0003');
    assert.match(nodes['debug-pc-note'].textContent, /ジャンプ：0x0015 → 0x0003/u);
    step.value = step.max;
    step.events.input();
    assert.match(nodes['debug-next-pc'].textContent, /（終了）/u);
    step.value = '6';
    step.events.input();
    assert.equal(nodes['debug-effect'].textContent, '2 と 3 を足して、セル0に 5 を入れました。');
    nodes.source.events.input();
    assert.equal(nodes['debug-panel'].hidden, true);
  } finally {
    if (previous === undefined) delete globalThis.document;
    else globalThis.document = previous;
  }
});
