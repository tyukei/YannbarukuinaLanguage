import {examples as clapSamples, exampleNames as clapExampleNames, initDebugger} from "./8888/playground.mjs?v=values-1";
const samples = {
  hello: "zz はじめの一歩。数字を鳴かせてみよう\nnaku(6 * 7)\nnaku(100 / 3)\n",
  branch: "zz 値を変えて、分岐を試してみよう\nx = 7\nmoshi (x < 5) {\n  naku(100)\n}\nmata (x < 10) {\n  naku(200)\n}\nhoka {\n  naku(300)\n}\n",
  loop: "zz 0 から 4 まで、ひとつずつ\ni = 0\naruku (i < 5) {\n  naku(i)\n  i = i + 1\n}\n",
  control: "zz 3 を飛ばして、6 の手前で止まる\ni = 0\naruku (i < 10) {\n  i = i + 1\n  moshi (i == 3) { hashiru }\n  moshi (i == 6) { tobu }\n  naku(i)\n}\n"
};
let language="yanbarukuina", trace=[], traceIndex=0;
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
const languages={
 yanbarukuina:{name:"YanbaruKuina", title:"ちょっと鳴いときますね型言語 YanbaruKuina", file:"main.🐧",
  worker:"./runtime-worker.js?v=unified-1", terminal:"Z80 CONSOLE", engine:"Z80", output:"出力：数値", generated:"main.z80.asm",
  limits:"数値は 0〜65535 の整数。変数は最大 32 個。", samples, exampleNames:["はじめの一歩","分岐してみる","くり返してみる","スキップと脱出"]},
 chukei:{name:"CHUKEI", title:"ちょっと中継しときますね型言語 CHUKEI", file:"main.🔴",
  worker:"./chukei-worker.js?v=unified-debug-1", terminal:"CHUKEI VM", engine:"教材用VM", output:"出力：ASCII", generated:"main.chukei-vm.json",
  limits:"CHUKEI：256セル・値0〜255・ポインタ循環・入力なし。", samples:asciiSamples, exampleNames:["HELLO, I AM CHUKEI!","Helloを出力","別のセルでAB","改行してA・B","AZazを出力","ABCを出力"]},
 8888:{name:"8888", title:"ちょっと拍手しときますね型言語 8888", file:"main.👏",
  worker:"./8888/worker.mjs?v=values-1", terminal:"8888 VM", engine:"教材用VM", output:"出力：数値・文字", generated:"main.8888-vm.json",
  limits:"8888：256セル・値0〜255・ポインタ循環・入力なし。", samples:clapSamples, exampleNames:clapExampleNames},
};
const draftKey="yanbarukuina.playground.drafts";
const drafts=Object.create(null);
function saveDrafts(){
 drafts[language]=source.value;
 try { sessionStorage.setItem(draftKey, JSON.stringify(drafts)); } catch { /* In-page drafts still work. */ }
}
function restoreDrafts(){
 try {
  const stored=JSON.parse(sessionStorage.getItem(draftKey));
  const previous=JSON.parse(sessionStorage.getItem("yanbarukuina.playground.return-from-8888"));
  for(const key of Object.keys(languages)){
   const oldKey=key==="yanbarukuina"?"queena":key;
   const value=stored?.[key]??stored?.[oldKey]??previous?.drafts?.[oldKey]??(key==="8888"?sessionStorage.getItem("yanbarukuina.playground.8888-draft"):null);
   if(typeof value==="string") drafts[key]=value;
  }
 } catch { /* In-page drafts still work. */ }
}
function currentSamples(){return languages[language].samples;}
const el = (id) => document.getElementById(id);
const source = el("source"), runButton = el("run");
const stepDebugger = initDebugger(document);
let busy = false, lastSource = null, controller = null, cancelRun = null;
function execute(code, debug) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(languages[language].worker, {type:"module"});
    controller = worker;
    cancelRun = () => { clearTimeout(timer); worker.terminate(); reject(new Error("実行を停止しました。")); };
    const timer = setTimeout(() => { worker.terminate(); reject(new Error("時間制限に達しました。ループや入力サイズを確認してください。")); }, 15000);
    worker.onmessage = ({data}) => { clearTimeout(timer); worker.terminate(); resolve(data); };
    worker.onerror = () => { clearTimeout(timer); worker.terminate(); reject(new Error("実行エンジンでエラーが発生しました。入力を短くして再実行してください。")); };
    worker.postMessage({source:code,debug});
  });
}

function setStatus(text, state) {
  el("status").textContent = text;
  el("status").dataset.state = state;
}
function renderTokens(tokens) {
  el("tokens-list").replaceChildren();
  if (!Array.isArray(tokens) || !tokens.length) { el("tokens-note").textContent = "トークンなし。"; return; }
  el("tokens-note").textContent = language==="8888" ? "コンパイラが読む命令・引数（正規化後） · 行/列" : "ソース順 · 種類 · 行/列";
  for (const token of tokens.slice(0,5000)) {
    const item=document.createElement("li"); item.className="token"; item.dataset.kind=token.kind;
    const value=document.createElement("code"); value.textContent=token.lexeme || "EOF";
    const kind=document.createElement("small"); kind.textContent=token.kind + (token.lexeme_encoding === "escaped-bytes" ? " (UTF-8 bytes)" : "");
    const position=document.createElement("small"); position.textContent=token.line+"行 "+token.column+"列";
    item.append(value,kind,position); el("tokens-list").append(item);
  }
  if(tokens.length>5000) el("tokens-note").textContent+=" 表示は先頭5000件までです。";
}
const astView=QueenaAstView.create({document,container:el("ast-tree"),note:el("ast-note"),tools:el("ast-tools"),summary:el("ast-summary"),limit:el("ast-limit"),groupInput:el("ast-group"),groupLabel:el("ast-group-label"),expandButton:el("ast-expand"),collapseButton:el("ast-collapse")});
function renderAst(ast) { astView.render(ast,language); }

function changed() {
  saveDrafts();
  invalidateGenerated();
  if (lastSource !== null && source.value !== lastSource) {
    el("trace-note").textContent="編集前の記録。";
    el("result-note").textContent = "編集前の結果。再実行してください。";
    astView.markStale();
    el("tokens-note").textContent = "編集前のトークン。";
  }
}
let selectedSample="hello";
el("example").addEventListener("change",()=>{
 const next=el("example").value;
 const known=Object.values(currentSamples()).includes(source.value);
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
async function run({debug=false}={}) {
  if (busy) return;
  invalidateGenerated();
  const code = source.value;
  el("tokens-list").replaceChildren();
  el("tokens-note").textContent = "解析中…";
  astView.clear("解析中…");
  if (!code.trim() && language==="yanbarukuina") {
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
  if (!debug) openRunDialog();
  el("cancel").hidden = false;
  lastSource = code;
  runButton.disabled = el("debug-run").disabled = el("example").disabled = el("language").disabled = true;
  runButton.textContent = "実行中…";
  setStatus("実行中", "running");
  el("output").textContent = "";
  el("error").hidden = true;
  el("error").textContent = "";
  el("result-note").textContent = language!=="yanbarukuina"?"教材用VM命令を生成して実行しています。":"コンパイルして、Z80 の機械語を実行しています。";
  trace=[]; showTrace(); el("bytecode").textContent="実行で表示。";
  el("assembly").textContent = "実行で表示。";
  el("clap-trace").textContent = "";
  stepDebugger.reset();
  el("metrics").textContent = language!=="yanbarukuina"?"教材用VM":"";

  try {
    const result = await execute(code, debug);
    if (!debug) replayStages(result);
    if(language==="chukei") renderChukei(result);
    if(language==="8888") {
      el("bytecode").textContent=result.listing||"生成コードなし。";
      el("clap-trace").hidden=Boolean(result.debug);
      el("clap-trace").textContent=result.traceText||"実行記録なし。";
      el("trace-note").textContent=result.debug?result.debug.functional?"引数・戻り値・計算用スタックを追えます。":"PCとデータ用メモリの変化を確認できます。":"「デバッグ実行」で前後にステップを移動できます。";

    }
    if(result.debug){
      document.querySelector(".trace-controls").hidden=true;
      el("trace-state").hidden=true;
      el("trace-note").textContent=language==="yanbarukuina"?"Z80アセンブリ、レジスタ、メモリを確認できます。":result.debug.functional?"引数・戻り値・計算用スタックを追えます。":"PCとデータ用メモリの変化を確認できます。";
      stepDebugger.open(language,result,code);
    }else if(language==="chukei"){
      document.querySelector(".trace-controls").hidden=false;
      el("trace-state").hidden=false;
    }else if(language==="yanbarukuina") el("trace-note").textContent="「デバッグ実行」でZ80命令を追えます。";
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
      el("result-note").textContent = result.output ? "出力" : "出力なし。";
      el("assembly").textContent = result.assembly || "";
      el("metrics").textContent = language!=="yanbarukuina" ? `${result.steps} ステップ · 教材用VM（Z80ではありません）` : `${result.binary_bytes} bytes · ${result.elapsed_ms} ms`;
    }
    changed();
    if(result.ok || (language==="8888" && result.generated)){
      generated={source:code,language,
        content:language==="chukei"?JSON.stringify({format:"CHUKEI educational VM",version:1,outputMode:result.outputMode,bytecode:result.bytecode},null,2):language==="8888"?result.generated:result.assembly,
        filename:languages[language].generated};
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
    el("debug-run").disabled=false;
    runButton.innerHTML = '<span aria-hidden="true">▶</span> 2. 実行';
    if (!debug) finishRunDialog();
  }
}
runButton.addEventListener("click", () => run());
el("debug-run").addEventListener("click", async () => {
  if (busy || language === "queena") return;
  el("execution-trace").open=true;
  await run({debug:true});
  el("execution-trace").scrollIntoView({block:"nearest"});
});
window.addEventListener("pagehide", () => { saveDrafts(); controller?.terminate(); });

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
function selectLanguage(next, remember = true){
  if(remember) saveDrafts();
  invalidateGenerated();
  language=next;
  el("language").value=language;
  const config=languages[language];
  source.value=drafts[language]??config.samples.hello;lastSource=null;
  el("tokens-list").replaceChildren();astView.clear();
  el("output").textContent="";el("error").hidden=true;el("assembly").textContent="実行で表示。";setStatus("待機中","");
  el("tokens-note").textContent="実行で表示。";el("ast-note").textContent="実行で表示。";
  el("result-note").textContent="実行で表示。";
  el("file-status").textContent="";
  const isChukei=language==="chukei", isClap=language==="8888", isZ80=language==="yanbarukuina";
  el("language-title").textContent=config.title;
  for(const idea of document.querySelectorAll("[data-idea]")) idea.hidden=idea.dataset.idea!==language;
  document.title=config.title+" | Playground";
  for(const [base, show] of [["queena",isZ80],["chukei",isChukei],["clap",isClap]]){
    for(const suffix of ["cheat","implementation","mark"]) el(base+"-"+suffix).hidden=!show;
  }
  el("debug-run").disabled=false;
  el("debug-run").title="命令の実行ステップを見る";
  for(const tab of document.querySelectorAll(".language-tabs [data-language]")){
    if(tab.dataset.language===language)tab.setAttribute("aria-current","page");
    else tab.removeAttribute("aria-current");
  }
  el("brand-name").textContent=config.name;
  document.querySelector('label[for="source"]').textContent=config.name+"のコード";
  el("chukei-guide").hidden=!isChukei;el("queena-help").hidden=!isZ80;el("clap-guide").hidden=!isClap;
  el("chukei-vm-guide").hidden=!isChukei;
  el("assembly").hidden=!isZ80;el("bytecode").hidden=isZ80;
  el("code-kind").textContent=isZ80?"Z80アセンブリ":"教材用VM";
  document.querySelector(".trace-controls").hidden=true;
  el("trace-state").hidden=true;
  el("execution-trace").open=false;
  el("trace-note").textContent="「デバッグ実行」で命令を1つずつ確認できます。";
  stepDebugger.reset();
  el("clap-trace").hidden=true;
  el("clap-trace").textContent="";
  document.querySelector(".file-name").textContent=config.file;
  el("language-note").textContent=config.engine;
  el("output-format-note").textContent=config.output;
  el("terminal-name").textContent=config.terminal;
  el("z80-chip").hidden=!isZ80;
  el("limits").textContent=config.limits;
  el("metrics").textContent=isZ80?"":"教材用VM（Z80ではありません）";
  el("example").replaceChildren(...Object.keys(config.samples).map((key,i)=>{
    const option=document.createElement("option");option.value=key;option.textContent=config.exampleNames[i];return option;
  }));
  el("example").value="hello";selectedSample="hello";
  trace=[];showTrace();el("bytecode").textContent="実行で表示。";
}
el("clap-cheat").querySelector('a[href="#commands"]').addEventListener("click",()=>{
  el("clap-guide").closest("details").open=true;
});

el("import-code").addEventListener("click",()=>{
 if(busy){el("file-status").textContent="実行終了後に開けます。";return;}
 el("code-file").click();
});
el("code-file").addEventListener("change",async()=>{
 const file=el("code-file").files[0], requested=language;
 try{
  if(!file)return;
  if(file.size>16384)throw Error("16 KiB以内のファイルを選んでください。");
  const text=new TextDecoder("utf-8",{fatal:true}).decode(await file.arrayBuffer());
  if(text.includes("\u0000"))throw Error("テキストファイルを選んでください。");
  if(busy||requested!==language)throw Error("言語を確認し、ファイルを選び直してください。");
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
 a.href=url;a.download=languages[language].file;document.body.append(a);a.click();a.remove();
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
 if(!generated||busy||source.value!==generated.source||language!==generated.language){invalidateGenerated();return;}
 const url=URL.createObjectURL(new Blob([generated.content],{type:language!=="yanbarukuina"?"application/json":"text/plain;charset=utf-8"}));
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
 const code=language==="chukei"?(result.bytecode?.length?JSON.stringify(result.bytecode.slice(0,4),null,2):""):(result.listing||result.assembly||"");
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

for(const tab of document.querySelectorAll(".language-tabs [data-language]")){
  tab.addEventListener("click",e=>{
    if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey) return;
    e.preventDefault();
    if(busy || tab.dataset.language===language) return;
    selectLanguage(tab.dataset.language);
    history.replaceState(null,"",tab.href);
  });
}
restoreDrafts();
const requested=new URLSearchParams(location.search).get("lang");
const requestedLanguage=requested==="queena"?"yanbarukuina":requested;
if(requested==="queena"){
 const canonical=new URL(location.href);canonical.searchParams.set("lang","yanbarukuina");history.replaceState(null,"",canonical);
}
selectLanguage(Object.hasOwn(languages,requestedLanguage)?requestedLanguage:"chukei",false);
const target=location.hash.slice(1);
if(target){
 const section=el(target);
 if(section){
  const details=section.closest("details");
  if(details) details.open=true;
  section.scrollIntoView();
 }
}
