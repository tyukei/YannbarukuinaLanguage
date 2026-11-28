import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {compile, run} from '../dist/8888/engine.mjs';

test('both entry points have the same switcher and an inline quick reference', async () => {
  for (const path of ['../dist/index.html','../dist/8888/index.html']) {
    const html = await readFile(new URL(path, import.meta.url), 'utf8');
    const nav = html.match(/<nav class="language-tabs"[^>]*>(.*?)<\/nav>/su)[1];
    assert.deepEqual([...nav.matchAll(/data-language="([^"]+)"/gu)].map(m=>m[1]), ['queena','chukei','8888']);
    assert.equal([...nav.matchAll(/aria-current="page"/gu)].length, 1);
    assert.ok(nav.length > 100);
    assert.match(html, /id="cheatsheet"/u);
    assert.doesNotMatch(html, /8888言語（試作）/u);
    for (const id of ['import-code','download-code','download-generated','result-heading']) assert.ok(html.includes('id="' + id + '"'), id);
    if (path.includes('8888')) {
      const sample = html.match(/<pre><code>(マジ挨拶[\s\S]*?)<\/code><\/pre>/u)[1];
      assert.deepEqual(run(compile(sample)).output, ['こんにちは']);
    } else {
      assert.match(html, /id="chukei-cheat"/u);
      assert.match(html, /id="queena-cheat"/u);
    }
  }
});
