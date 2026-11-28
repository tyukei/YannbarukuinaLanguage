import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('the initial source and every sample declare and invoke a named function', async () => {
  const html = await readFile(new URL('../dist/8888/index.html', import.meta.url), 'utf8');
  const keys = [...html.matchAll(/<option value="([^"]+)">/gu)].map(m => m[1]);
  const defaults = html.match(/<textarea[^>]+>([\s\S]*?)<\/textarea>/u)[1];
  const results = {
    add: '5', count: '3 2 1', move: '2 1', bengali: '5', odia: '5',
    comment: '5', arithmetic: '5 3', letter: 'HI', function: 'HIHI',
  };
  const nodes = {source: {value: defaults, ...element()}};
  function element() {
    return {events:{}, append(){}, insertRow:element, insertCell:element,
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
      const name = source.match(/^マジ ([^\s]+)/u)?.[1];
      assert.ok(name, key);
      assert.ok(source.includes('\n神\n\nめっちゃ ' + name), key);
      assert.equal(key === 'add' ? source : defaults, defaults);
      nodes.run.events.click();
      assert.equal(nodes.output.textContent, results[key], key);
    }
  } finally {
    if (previous === undefined) delete globalThis.document;
    else globalThis.document = previous;
  }
});
