"use strict";
const samples = {
  hello: "zz はじめの一歩。数字を鳴かせてみよう\nnaku(6 * 7)\nnaku(100 / 3)\n",
  branch: "zz 値を変えて、分岐を試してみよう\nx = 7\nmoshi (x < 5) {\n  naku(100)\n}\nmata (x < 10) {\n  naku(200)\n}\nhoka {\n  naku(300)\n}\n",
  loop: "zz 0 から 4 まで、ひとつずつ\ni = 0\naruku (i < 5) {\n  naku(i)\n  i = i + 1\n}\n",
  control: "zz 3 を飛ばして、6 の手前で止まる\ni = 0\naruku (i < 10) {\n  i = i + 1\n  moshi (i == 3) { hashiru }\n  moshi (i == 6) { tobu }\n  naku(i)\n}\n"
};
const chukeiSamples = {hello:"C C C CHUKE CHUK CH CHUKEI", branch:"CH CHUK C CHUK", loop:"C C CHU C C C CHUKE CHUK CH CHUKEI", control:"C CHUKE CHUKE CH CHUKEI CHUKEI CHUK"};
let language="queena", trace=[], traceIndex=0;
const drafts={};
function currentSamples(){return language==="chukei"?chukeiSamples:samples;}
const el = (id) => document.getElementById(id);
const source = el("source"), runButton = el("run"), loadButton = el("load");
let busy = false, lastSource = null, controller = null, cancelRun = null;
function execute(code) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(language==="chukei"?"/chukei-worker.js":"/runtime-worker.js", {type:"module"});
    controller = worker;
    cancelRun = () => { clearTimeout(timer); worker.terminate(); reject(new Error("実行を停止しました。")); };
    const timer = setTimeout(() => { worker.terminate(); reject(new Error("時間制限に達しました。ループや入力サイズを確認してください。")); }, 15000);
    worker.onmessage = ({data}) => { clearTimeout(timer); worker.terminate(); resolve(data); };
    worker.onerror = () => { clearTimeout(timer); worker.terminate(); reject(new Error("実行エンジンでエラーが発生しました。入力を短くして再実行してください。")); };
    worker.postMessage({source:code});
  });
}
source.value = samples.hello;
function setStatus(text, state) {
  el("status").textContent = text;
  el("status").dataset.state = state;
}
function renderTokens(tokens) {
  el("tokens-list").replaceChildren();
  if (!Array.isArray(tokens) || !tokens.length) { el("tokens-note").textContent = "トークンはありません。入力またはエラーを確認してください。"; return; }
  el("tokens-note").textContent = language==="chukei" ? "空白で分けた命令をソース順に表示します。種類と行・列を確認できます。" : "実際の字句解析器の出力です。ソース順に、種類と行・列を表示します（空白・コメントは除外、列はUTF-8バイト単位、EOF は入力の終わり）。";
  for (const token of tokens.slice(0,5000)) {
    const item=document.createElement("li"); item.className="token"; item.dataset.kind=token.kind;
    const value=document.createElement("code"); value.textContent=token.lexeme || "EOF";
    const kind=document.createElement("small"); kind.textContent=token.kind + (token.lexeme_encoding === "escaped-bytes" ? " (UTF-8 bytes)" : "");
    const position=document.createElement("small"); position.textContent=token.line+"行 "+token.column+"列";
    item.append(value,kind,position); el("tokens-list").append(item);
  }
  if(tokens.length>5000) el("tokens-note").textContent+=" 表示は先頭5000件までです。";
}
function renderAst(ast) {
  const container = el("ast-tree");
  container.replaceChildren();
  if (!ast) { el("ast-note").textContent = "構文木はありません。構文エラーの場合はコードを修正して再実行してください。"; return; }
  el("ast-note").textContent = "実際のコンパイラの解析結果です。枝の見出しを押すと開閉できます。";
  let count = 0;
  function node(item, depth) {
    if (++count > 2000 || depth > 80) { const p = document.createElement("p"); p.textContent = "表示上限に達しました。コードを短くして確認してください。"; return p; }
    const children = Array.isArray(item.children) ? item.children : [];
    const label = item.label;
    if (!children.length) { const p = document.createElement("div"); p.className="ast-leaf"; p.textContent=label; return p; }
    const d=document.createElement("details"); d.className="ast-node"; d.open=depth<4;
    const summary=document.createElement("summary"); summary.textContent=label; d.append(summary);
    const branch=document.createElement("div"); branch.className="ast-children";
    for (const child of children) { if(count>=2000) break; branch.append(node(child,depth+1)); }
    d.append(branch); return d;
  }
  container.append(node(ast,0));
}
function changed() {
  if (lastSource !== null && source.value !== lastSource) {
    if(language==="chukei") el("trace-note").textContent="編集前のコードの実行記録です。もう一度実行してください。";
    el("result-note").textContent = "編集前のコードの結果です。もう一度実行してください。";
    el("ast-note").textContent = "編集前のコードの構文木です。もう一度実行してください。";
    el("tokens-note").textContent = "編集前のコードのトークンです。もう一度実行してください。";
  }
}
loadButton.addEventListener("click", () => {
  if (busy) return;
  const next = currentSamples()[el("example").value];
  if (source.value !== next && !Object.values(currentSamples()).includes(source.value) && !window.confirm("編集したコードをサンプルで置き換えますか？")) return;
  source.value = next;
  changed();
  source.focus();
});
source.addEventListener("input", changed);
source.addEventListener("keydown", (event) => {
  if (event.key === "Tab") {
    event.preventDefault();
    source.setRangeText("  ", source.selectionStart, source.selectionEnd, "end");
    changed();
  }
});
document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    run();
  }
});
async function run() {
  if (busy) return;
  const code = source.value;
  el("tokens-list").replaceChildren();
  el("tokens-note").textContent = "入力の解析を待っています。";
  el("ast-tree").replaceChildren();
  el("ast-note").textContent = "解析結果を待っています。";
  if (!code.trim() && language!=="chukei") {
    el("tokens-note").textContent = "コードを入力して実行してください。";
    el("ast-note").textContent = "コードを入力して実行してください。";
    setStatus("入力待ち", "error");
    el("error").textContent = "コードを入力してください。";
    el("error").hidden = false;
    source.focus();
    return;
  }
  if (new TextEncoder().encode(code).length > 16384) {
    el("tokens-note").textContent = "入力上限のため解析していません。";
    el("ast-note").textContent = "入力上限のため解析していません。";
    setStatus("入力上限", "error");
    el("error").textContent = "コードは 16 KiB 以内にしてください。";
    el("error").hidden = false;
    return;
  }
  busy = true;
  el("cancel").hidden = false;
  lastSource = code;
  runButton.disabled = loadButton.disabled = el("example").disabled = el("language").disabled = true;
  runButton.textContent = "実行中…";
  setStatus("実行中", "running");
  el("output").textContent = "";
  el("error").hidden = true;
  el("error").textContent = "";
  el("result-note").textContent = language==="chukei"?"教材用VM命令を生成して実行しています。":"コンパイルして、Z80 の機械語を実行しています。";
  trace=[]; showTrace(); el("bytecode").textContent="実行後に表示します。";
  el("assembly").textContent = "実行後に表示します。";
  el("metrics").textContent = language==="chukei"?"教材用VM":"Z80 実行エンジン";

  try {
    const result = await execute(code);
    if(language==="chukei") renderChukei(result);
    renderTokens(result.tokens);
    renderAst(result.ast);
    el("output").textContent = result.output || "";
    if (!result.ok) {
      setStatus("停止", "error");
      el("error").textContent = result.error || "実行できませんでした。";
      el("error").hidden = false;
      el("result-note").textContent = "コードを確認して、もう一度どうぞ。";
    } else {
      setStatus("完了", "success");
      el("result-note").textContent = result.output ? (language==="chukei"?"CHUK が出力した結果です。":"naku が出力した結果です。") : "実行が終わりました。出力はありません。";
      el("assembly").textContent = result.assembly || "CHUKEIは教材用VMを使います。";
      el("metrics").textContent = language==="chukei" ? `${result.steps} steps · 教材用VM（Z80ではありません）` : `${result.binary_bytes} bytes · ${result.elapsed_ms} ms · Z80 / CP/M console`;
    }
    changed();
  } catch (error) {
    renderTokens(null);
    renderAst(null);
    setStatus("停止", "error");
    el("error").textContent = error.message || "実行できませんでした。";
    el("error").hidden = false;
    el("result-note").textContent = "実行結果を受け取れませんでした。";
  } finally {
    controller?.terminate();
    controller = null;
    busy = false;
    cancelRun = null;
    el("cancel").hidden = true;
    runButton.disabled = loadButton.disabled = el("example").disabled = el("language").disabled = false;
    runButton.innerHTML = '<span aria-hidden="true">▶</span> 実行';
  }
}
runButton.addEventListener("click", run);
window.addEventListener("pagehide", () => controller?.terminate());

el("cancel").addEventListener("click", () => cancelRun?.());


function renderChukei(result) {
  el("bytecode").textContent = (result.bytecode||[]).map(i=>i.pc+": "+i.op+(i.arg!==undefined?" → "+i.arg:"")+"  [token "+(i.sourceIndex+1)+"]").join("\n") || "構造を確認できなかったため命令は生成していません。";
  trace=result.trace||[];traceIndex=0;
  el("trace-index").max=Math.max(0,trace.length-1);el("trace-index").value=0;
  el("trace-note").textContent = "実行済みの記録を再生します。"+(result.trace_truncated?"記録は先頭200ステップまでです。":"");
  showTrace();
}
function showTrace(){
  el("trace-prev").disabled=!trace.length||traceIndex===0;el("trace-next").disabled=!trace.length||traceIndex===trace.length-1;el("trace-index").disabled=!trace.length;
  const t=trace[traceIndex];el("trace-index").value=traceIndex;
  el("trace-state").textContent=t?`ステップ ${t.step}（命令実行後）\n命令 ${t.pc}: ${t.op} → 次は ${t.next_pc}\nポインタ: セル ${t.pointer} ／ 値: ${t.value}\nこの命令の出力: ${t.output?.trim() || "なし"}`:"実行記録はありません。";
}
el("trace-prev").addEventListener("click",()=>{traceIndex=Math.max(0,traceIndex-1);showTrace()});
el("trace-next").addEventListener("click",()=>{traceIndex=Math.min(trace.length-1,traceIndex+1);showTrace()});
el("trace-index").addEventListener("input",e=>{traceIndex=Number(e.target.value);showTrace()});
el("language").addEventListener("change",()=>{
  drafts[language]=source.value;language=el("language").value;source.value=drafts[language]??currentSamples().hello;lastSource=null;
  for(const id of ["tokens-list","ast-tree"]) el(id).replaceChildren();
  el("output").textContent="";el("error").hidden=true;el("assembly").textContent="実行後に表示します。";setStatus("待機中","");
  el("tokens-note").textContent="実行するとトークンを表示します。";el("ast-note").textContent="実行すると構文木を表示します。";
  el("result-note").textContent="コードを実行してみましょう。";
  const isChukei=language==="chukei";
  document.querySelector('label[for="source"]').textContent=isChukei?"CHUKEIのコード":"やんばるくいな言語のコード";
  for(const id of ["chukei-guide","chukei-code","chukei-trace"]) el(id).hidden=!isChukei;
  document.querySelector(".behind:not(#chukei-guide)").hidden=isChukei;
  document.querySelector(".illustrated-guide").hidden=isChukei;document.querySelector(".guide").hidden=isChukei;
  document.querySelector(".file-name").textContent=isChukei?"main.chukei":"main.ykw";
  el("language-note").textContent=isChukei?"6命令から、字句解析・ループ構造・VM命令・実行を追います。":"変数・分岐・ループのある言語を Z80 機械語に変換します。";
  el("limits").textContent=isChukei?"CHUKEI：256セル・値0〜255・ポインタ循環・入力なし。":"数値は 0〜65535 の整数。変数は最大 32 個。";
  el("metrics").textContent=isChukei?"教材用VM（Z80ではありません）":"Z80 実行エンジン";
  const names=isChukei?["3・2・1を出力","0と255の循環","セルを右へ移動","入れ子のループ"]:["はじめの一歩","分岐してみる","くり返してみる","スキップと脱出"];
  [...el("example").options].forEach((o,i)=>o.textContent=names[i]);el("example").value="hello";
  trace=[];showTrace();el("bytecode").textContent="実行後に表示します。";
});
