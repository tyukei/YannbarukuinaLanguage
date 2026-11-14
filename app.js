"use strict";
const samples = {
  hello: "zz はじめの一歩。数字を鳴かせてみよう\nnaku(6 * 7)\nnaku(100 / 3)\n",
  branch: "zz 値を変えて、分岐を試してみよう\nx = 7\nmoshi (x < 5) {\n  naku(100)\n}\nmata (x < 10) {\n  naku(200)\n}\nhoka {\n  naku(300)\n}\n",
  loop: "zz 0 から 4 まで、ひとつずつ\ni = 0\naruku (i < 5) {\n  naku(i)\n  i = i + 1\n}\n",
  control: "zz 3 を飛ばして、6 の手前で止まる\ni = 0\naruku (i < 10) {\n  i = i + 1\n  moshi (i == 3) { hashiru }\n  moshi (i == 6) { tobu }\n  naku(i)\n}\n"
};
const chukeiSamples = {hello:"CCCCHUKECHUKCHCHUKEI", branch:"CHCHUKCCHUK", loop:"CCCHUCCCCHUKECHUKCHCHUKEI", control:"CCHUKECHUKECHCHUKEICHUKEICHUK"};
let language="queena", trace=[], traceIndex=0;
function asciiExample(text){
 let value=0;const commands=[];
 for(const char of text){
  const target=char.charCodeAt(0),delta=target-value;
  commands.push(...Array(Math.abs(delta)).fill(delta>=0?"C":"CH"),"CHUK");value=target;
 }
 return commands.join("");
}
const asciiSamples={
 hello:asciiExample("HELLO, I AM CHUKEI!"),
 branch:asciiExample("Hello"),
 loop:"C".repeat(65)+"CHUKCHU"+"C".repeat(66)+"CHUK",
 control:asciiExample("A\nB"),
 letters:asciiExample("AZaz"),
 abc:asciiExample("ABC")
};
const drafts={};
let chukeiMode="ascii";
function currentSamples(){return language==="chukei"?(el("output-mode").value==="ascii"?asciiSamples:chukeiSamples):samples;}
const el = (id) => document.getElementById(id);
const source = el("source"), runButton = el("run"), exampleSelect = el("example");
let busy = false, lastSource = null, controller = null, cancelRun = null;
function execute(code) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(language==="chukei"?"./chukei-worker.js?v=compact-20261114":"./runtime-worker.js", {type:"module"});
    controller = worker;
    cancelRun = () => { clearTimeout(timer); worker.terminate(); reject(new Error("実行を停止しました。")); };
    const timer = setTimeout(() => { worker.terminate(); reject(new Error("時間制限に達しました。ループや入力サイズを確認してください。")); }, 15000);
    worker.onmessage = ({data}) => { clearTimeout(timer); worker.terminate(); resolve(data); };
    worker.onerror = () => { clearTimeout(timer); worker.terminate(); reject(new Error("実行エンジンでエラーが発生しました。入力を短くして再実行してください。")); };
    worker.postMessage({source:code,outputMode:el("output-mode").value});
  });
}
source.value = samples.hello;
function setStatus(text, state) {
  el("status").textContent = text;
  el("status").dataset.state = state;
}
function renderTokens(tokens) {
  el("tokens-list").replaceChildren();
  if (!Array.isArray(tokens) || !tokens.length) { el("tokens-note").textContent = "トークンなし。"; return; }
  el("tokens-note").textContent = language==="chukei" ? "ソース順 · 種類 · 行/列" : "ソース順 · 種類 · 行/列";
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
  if (!ast) { el("ast-note").textContent = "構文木なし。エラーを確認。"; return; }
  el("ast-note").textContent = "枝を押して開閉。";
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
  invalidateGenerated();
  if (lastSource !== null && source.value !== lastSource) {
    if(language==="chukei") el("trace-note").textContent="編集前の記録。";
    el("result-note").textContent = "編集前の結果。再実行してください。";
    el("ast-note").textContent = "編集前の構文木。";
    el("tokens-note").textContent = "編集前のトークン。";
  }
}
let selectedSample="hello";
el("example").addEventListener("change",()=>{
 const next=el("example").value;
 const known=[...Object.values(samples),...Object.values(chukeiSamples),...Object.values(asciiSamples)].includes(source.value);
 if(source.value && !known && !confirm("編集したコードをサンプルで置き換えますか？")){el("example").value=selectedSample;return;}
 source.value=currentSamples()[next];selectedSample=next;changed();
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
  invalidateGenerated();
  const code = source.value;
  el("tokens-list").replaceChildren();
  el("tokens-note").textContent = "解析中…";
  el("ast-tree").replaceChildren();
  el("ast-note").textContent = "解析中…";
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
  openRunDialog();
  el("cancel").hidden = false;
  lastSource = code;
  runButton.disabled = el("example").disabled = el("language").disabled = el("output-mode").disabled = true;
  runButton.textContent = "実行中…";
  setStatus("実行中", "running");
  el("output").textContent = "";
  el("error").hidden = true;
  el("error").textContent = "";
  el("result-note").textContent = language==="chukei"?"教材用VM命令を生成して実行しています。":"コンパイルして、Z80 の機械語を実行しています。";
  trace=[]; showTrace(); el("bytecode").textContent="実行で表示。";
  el("assembly").textContent = "実行で表示。";
  el("metrics").textContent = language==="chukei"?"教材用VM":"";

  try {
    const result = await execute(code);
    replayStages(result);
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
      el("result-note").textContent = result.output ? (language==="chukei"?"出力":"出力") : "出力なし。";
      el("assembly").textContent = result.assembly || "CHUKEIは教材用VMを使います。";
      el("metrics").textContent = language==="chukei" ? `${result.steps} steps · 教材用VM（Z80ではありません）` : `${result.binary_bytes} bytes · ${result.elapsed_ms} ms`;
    }
    changed();
    if(result.ok){
      generated={source:code,language,mode:el("output-mode").value,
        content:language==="chukei"?JSON.stringify({format:"CHUKEI educational VM",version:1,outputMode:el("output-mode").value,bytecode:result.bytecode},null,2):result.assembly,
        filename:language==="chukei"?"main.chukei-vm.json":"main.z80.asm"};
      el("download-generated").disabled=!generated.content;
    }
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
    runButton.disabled = el("example").disabled = el("language").disabled = false;
    el("output-mode").disabled=language!=="chukei";
    runButton.innerHTML = '<span aria-hidden="true">▶</span> 2. 実行';
    finishRunDialog();
  }
}
runButton.addEventListener("click", run);
window.addEventListener("pagehide", () => controller?.terminate());

el("cancel").addEventListener("click", () => cancelRun?.());


function renderChukei(result) {
  el("bytecode").textContent = (result.bytecode||[]).map(i=>i.pc+": "+i.op+(i.arg!==undefined?" → "+i.arg:"")+"  [token "+(i.sourceIndex+1)+"]").join("\n") || "構造を確認できなかったため命令は生成していません。";
  trace=result.trace||[];traceIndex=0;
  el("trace-index").max=Math.max(0,trace.length-1);el("trace-index").value=0;
  el("trace-note").textContent = "実行後の状態。"+(result.trace_truncated?"先頭200ステップ。":"");
  showTrace();
}
function showTrace(){
  el("trace-prev").disabled=!trace.length||traceIndex===0;el("trace-next").disabled=!trace.length||traceIndex===trace.length-1;el("trace-index").disabled=!trace.length;
  const t=trace[traceIndex];el("trace-index").value=traceIndex;
  el("trace-state").textContent=t?`ステップ ${t.step}（命令実行後）\n命令 ${t.pc}: ${t.op} → 次は ${t.next_pc}\nポインタ: セル ${t.pointer} ／ 値: ${t.value}\nこの命令の出力: ${t.output!==undefined?JSON.stringify(t.output):"なし"}`:"";
}
el("trace-prev").addEventListener("click",()=>{traceIndex=Math.max(0,traceIndex-1);showTrace()});
el("trace-next").addEventListener("click",()=>{traceIndex=Math.min(trace.length-1,traceIndex+1);showTrace()});
el("trace-index").addEventListener("input",e=>{traceIndex=Number(e.target.value);showTrace()});
el("language").addEventListener("change",()=>{
  invalidateGenerated();
  drafts[language]=source.value;
  if(language==="chukei") chukeiMode=el("output-mode").value;
  language=el("language").value;
  el("output-mode").value=language==="chukei"?chukeiMode:"numeric";
  el("output-mode").disabled=language!=="chukei";
  source.value=drafts[language]??currentSamples().hello;lastSource=null;
  for(const id of ["tokens-list","ast-tree"]) el(id).replaceChildren();
  el("output").textContent="";el("error").hidden=true;el("assembly").textContent="実行で表示。";setStatus("待機中","");
  el("tokens-note").textContent="実行で表示。";el("ast-note").textContent="実行で表示。";
  el("result-note").textContent="実行で表示。";
  const isChukei=language==="chukei";
  el("chukei-implementation").hidden=!isChukei;
  el("queena-implementation").hidden=isChukei;
  el("chukei-mark").hidden=!isChukei;
  el("queena-mark").hidden=isChukei;
  el("brand-name").textContent=isChukei?"CHUKEI":"YanbaruKuina";
  document.querySelector('label[for="source"]').textContent=isChukei?"CHUKEIのコード":"やんばるくいな言語のコード";
  el("chukei-guide").hidden=!isChukei;el("queena-help").hidden=isChukei;
  el("assembly").hidden=isChukei;el("bytecode").hidden=!isChukei;
  el("code-kind").textContent=isChukei?"教材用VM":"Z80アセンブリ";
  document.querySelector(".trace-controls").hidden=!isChukei;
  el("trace-note").textContent=isChukei?"実行で表示。":"CHUKEIのみ対応。";
  document.querySelector(".file-name").textContent="main.🐧";
  el("language-note").textContent=isChukei?"教材用VM":"Z80";
  el("terminal-name").textContent=isChukei?"CHUKEI VM":"Z80 CONSOLE";
  el("z80-chip").hidden=isChukei;
  el("limits").textContent=isChukei?"CHUKEI：256セル・値0〜255・ポインタ循環・入力なし。":"数値は 0〜65535 の整数。変数は最大 32 個。";
  el("metrics").textContent=isChukei?"教材用VM（Z80ではありません）":"";
  refreshSampleNames();el("example").value="hello";selectedSample="hello";
  trace=[];showTrace();el("bytecode").textContent="実行で表示。";
});


function refreshSampleNames(){
 const keys=Object.keys(currentSamples());
 const names=language==="chukei"?(el("output-mode").value==="ascii"?["HELLO, I AM CHUKEI!","Helloを出力","別のセルでAB","改行してA・B","AZazを出力","ABCを出力"]:["3・2・1を出力","0と255の循環","セルを右へ移動","入れ子のループ"]):["はじめの一歩","分岐してみる","くり返してみる","スキップと脱出"];
 const selected=el("example").value;
 el("example").replaceChildren(...keys.map((key,i)=>{const option=document.createElement("option");option.value=key;option.textContent=names[i];return option;}));
 el("example").value=keys.includes(selected)?selected:"hello";
}
el("output-mode").addEventListener("change",()=>{
 const wasSample=[...Object.values(chukeiSamples),...Object.values(asciiSamples)].includes(source.value);
 invalidateGenerated();chukeiMode=el("output-mode").value;refreshSampleNames();selectedSample=el("example").value;
 if(wasSample){source.value=currentSamples()[el("example").value];changed();}
 el("result-note").textContent=wasSample?"出力形式に合わせてサンプルを更新しました。":"コードは保持。文字出力にはASCII値（65=A）が必要です。";
 el("output").textContent="";el("error").hidden=true;setStatus("再実行","");
 el("trace-note").textContent="形式変更前の記録。";
});

el("import-code").addEventListener("click",()=>{
 if(busy){el("file-status").textContent="実行終了後に開けます。";return;}
 el("code-file").click();
});
el("code-file").addEventListener("change",async()=>{
 const file=el("code-file").files[0];
 try{
  if(!file)return;
  if(file.size>16384)throw Error("16 KiB以内のファイルを選んでください。");
  const text=new TextDecoder("utf-8",{fatal:true}).decode(await file.arrayBuffer());
  if(text.includes("\u0000"))throw Error("テキストファイルを選んでください。");
  if(busy)throw Error("実行終了後に開いてください。");
  if(source.value && !confirm("編集中のコードを置き換えます。必要なら先にダウンロードしてください。"))return;
  source.value=text;drafts[language]=text;changed();
  el("file-status").textContent="読み込み完了。言語を確認して実行してください。";
 }catch(error){el("file-status").textContent=error instanceof TypeError?"UTF-8のテキストを選んでください。":error.message;}
 finally{el("code-file").value="";}
});
el("download-code").addEventListener("click",()=>{
 if(new TextEncoder().encode(source.value).length>16384){el("file-status").textContent="コードを16 KiB以内にしてください。";return;}
 const blob=new Blob([source.value],{type:"text/plain;charset=utf-8"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="main.🐧";document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),60000);
 el("file-status").textContent="ダウンロードを開始しました。";
});



let dialogFadeTimer=null,dialogCloseTimer=null;
function clearDialogTimers(){clearTimeout(dialogFadeTimer);clearTimeout(dialogCloseTimer);}
function openRunDialog(){
 clearDialogTimers();clearStageReplay();el("stage-replay").hidden=true;el("run-dialog").classList.remove("fading");
 el("run-title").textContent="実行中";el("walking-bird").hidden=false;
 el("dialog-action").hidden=false;
 if(!el("run-dialog").open)el("run-dialog").showModal();
 // This is a visual presentation timer, never an execution-success signal.
 dialogFadeTimer=setTimeout(()=>{
  el("run-dialog").classList.add("fading");
  const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
  dialogCloseTimer=setTimeout(()=>el("run-dialog").close(),reduced?0:250);
 },3000);
}
function finishRunDialog(){
 el("run-title").textContent=el("error").hidden?"実行完了。結果はコンソールに表示されています。":"実行停止。エラーはコンソールに表示されています。";
 el("dialog-action").hidden=true;
 if(el("run-dialog").open)el("run-title").focus();
}
el("dialog-action").addEventListener("click",()=>{if(busy)cancelRun?.();});
el("run-dialog").addEventListener("cancel",()=>{clearDialogTimers();if(busy)cancelRun?.();});
el("run-dialog").addEventListener("close",()=>{
 clearDialogTimers();clearStageReplay();el("run-dialog").classList.remove("fading");
 if(busy)el("cancel").focus();else el("output").focus({preventScroll:false});
});

let generated=null;
function invalidateGenerated(){generated=null;el("download-generated").disabled=true;}
el("download-generated").addEventListener("click",()=>{
 if(!generated||busy||source.value!==generated.source||language!==generated.language||el("output-mode").value!==generated.mode){invalidateGenerated();return;}
 const url=URL.createObjectURL(new Blob([generated.content],{type:language==="chukei"?"application/json":"text/plain;charset=utf-8"}));
 const a=document.createElement("a");a.href=url;a.download=generated.filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
});

// Replay returned compiler artifacts, not fabricated live phase timing.
let stageTimers=[];
function clearStageReplay(){stageTimers.forEach(clearTimeout);stageTimers=[];}
function replayStages(result){
 clearStageReplay();
 // Give all four returned stages time to be seen, even after a slow compile.
 if(el("run-dialog").open){
  clearDialogTimers();el("run-dialog").classList.remove("fading");
  dialogFadeTimer=setTimeout(()=>{el("run-dialog").classList.add("fading");dialogCloseTimer=setTimeout(()=>el("run-dialog").close(),matchMedia("(prefers-reduced-motion: reduce)").matches?0:250);},3000);
 }
 const tokens=result.tokens||[],ast=result.ast;
 const code=language==="chukei"?(result.bytecode?.length?JSON.stringify(result.bytecode.slice(0,4),null,2):""):(result.assembly||"");
 const phases=[
  ["字句解析",tokens.length?tokens.slice(0,12).map(t=>t.lexeme??t.kind).join(" → "):"トークンなし"],
  ["構文木",ast?JSON.stringify(ast,null,2).slice(0,420):"構文木を取得できませんでした"],
  ["制約の確認",result.ok?"構文解析・コード生成の検査を通過":code?"生成済み。実行時のエラーは③を確認":("検査未完了："+(result.error||"結果なし"))],
  ["コード生成",code?code.slice(0,420):"生成コードなし"]
 ];
 el("stage-replay").hidden=false;
 el("stage-list").replaceChildren(...phases.map(([name])=>{const li=document.createElement("li");li.textContent=name;return li;}));
 const show=(i)=>{[...el("stage-list").children].forEach((li,n)=>{li.dataset.active=String(n===i);li.dataset.seen=String(n<=i);});el("stage-preview").textContent=phases[i][1];};
 show(0);
 const finish=()=>{clearStageReplay();show(3);};
 el("skip-replay").onclick=()=>{finish();el("run-dialog").close();};
 if(matchMedia("(prefers-reduced-motion: reduce)").matches){finish();return;}
 phases.slice(1).forEach((_,i)=>stageTimers.push(setTimeout(()=>show(i+1),(i+1)*550)));
}

// Start with the explicitly selected CHUKEI greeting.
el("language").value="chukei";
el("language").dispatchEvent(new Event("change"));
