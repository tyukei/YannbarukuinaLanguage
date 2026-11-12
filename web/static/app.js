"use strict";
const samples = {
  hello: "zz はじめの一歩。数字を鳴かせてみよう\nnaku(6 * 7)\nnaku(100 / 3)\n",
  branch: "zz 値を変えて、分岐を試してみよう\nx = 7\nmoshi (x < 5) {\n  naku(100)\n}\nmata (x < 10) {\n  naku(200)\n}\nhoka {\n  naku(300)\n}\n",
  loop: "zz 0 から 4 まで、ひとつずつ\ni = 0\naruku (i < 5) {\n  naku(i)\n  i = i + 1\n}\n",
  control: "zz 3 を飛ばして、6 の手前で止まる\ni = 0\naruku (i < 10) {\n  i = i + 1\n  moshi (i == 3) { hashiru }\n  moshi (i == 6) { tobu }\n  naku(i)\n}\n"
};
const el = (id) => document.getElementById(id);
const source = el("source"), runButton = el("run"), loadButton = el("load");
let busy = false, lastSource = null, controller = null;
source.value = samples.hello;
function setStatus(text, state) {
  el("status").textContent = text;
  el("status").dataset.state = state;
}
function changed() {
  if (lastSource !== null && source.value !== lastSource) {
    el("result-note").textContent = "編集前のコードの結果です。もう一度実行してください。";
  }
}
loadButton.addEventListener("click", () => {
  if (busy) return;
  const next = samples[el("example").value];
  if (source.value !== next && !Object.values(samples).includes(source.value) && !window.confirm("編集したコードをサンプルで置き換えますか？")) return;
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
  if (!code.trim()) {
    setStatus("入力待ち", "error");
    el("error").textContent = "コードを入力してください。";
    el("error").hidden = false;
    source.focus();
    return;
  }
  if (new TextEncoder().encode(code).length > 16384) {
    setStatus("入力上限", "error");
    el("error").textContent = "コードは 16 KiB 以内にしてください。";
    el("error").hidden = false;
    return;
  }
  busy = true;
  lastSource = code;
  runButton.disabled = loadButton.disabled = el("example").disabled = true;
  runButton.textContent = "実行中…";
  setStatus("実行中", "running");
  el("output").textContent = "";
  el("error").hidden = true;
  el("error").textContent = "";
  el("result-note").textContent = "コンパイルして、Z80 の機械語を実行しています。";
  el("assembly").textContent = "実行後に表示します。";
  el("metrics").textContent = "Z80 実行エンジン";
  controller = new AbortController();
  const timer = setTimeout(() => controller?.abort(), 18000);
  try {
    const response = await fetch("/api/run", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({source: code}), signal: controller.signal});
    const result = await response.json();
    el("output").textContent = result.output || "";
    if (!response.ok || !result.ok) {
      setStatus("停止", "error");
      el("error").textContent = result.error || "実行できませんでした。";
      el("error").hidden = false;
      el("result-note").textContent = "コードを確認して、もう一度どうぞ。";
    } else {
      setStatus("完了", "success");
      el("result-note").textContent = result.output ? "naku が出力した結果です。" : "実行が終わりました。出力はありません。";
      el("assembly").textContent = result.assembly;
      el("metrics").textContent = `${result.binary_bytes} bytes · ${result.elapsed_ms} ms · Z80 / CP/M console`;
    }
    changed();
  } catch (error) {
    setStatus("接続エラー", "error");
    el("error").textContent = error.name === "AbortError" ? "応答が時間内に届きませんでした。ローカルサーバーを確認してください。" : "ローカルサーバーに接続できません。起動してから再実行してください。";
    el("error").hidden = false;
    el("result-note").textContent = "実行結果を受け取れませんでした。";
  } finally {
    clearTimeout(timer);
    controller = null;
    busy = false;
    runButton.disabled = loadButton.disabled = el("example").disabled = false;
    runButton.innerHTML = '<span aria-hidden="true">▶</span> 実行';
  }
}
runButton.addEventListener("click", run);
window.addEventListener("pagehide", () => controller?.abort());
