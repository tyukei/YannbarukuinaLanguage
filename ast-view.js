/* Visual presentation of the compiler's AST. No parsing or execution here. */
(() => {
 'use strict';
 const MAX_CARDS=400, MAX_DEPTH=24, MAX_STATS=20000;
 const roles={statement:'文',condition:'条件',then:'条件が真のとき',else:'それ以外',body:'ループ本体',left:'左の式',right:'右の式',expression:'式',value:'代入する値'};
 const kinds={program:['全体','プログラム','structure'],block:['まとまり','ブロック','structure'],literal:['値','数値','value'],identifier:['値','変数','value'],binary:['式','演算','expression'],grouping:['式','括弧','expression'],assign_stmt:['処理','代入','operation'],print_stmt:['出力','naku · 出力','output'],if_stmt:['分岐','moshi / mata · 分岐','branch'],while_stmt:['ループ','aruku · くり返し','loop'],break_stmt:['制御','tobu · ループを抜ける','branch'],continue_stmt:['制御','hashiru · 次の繰り返しへ','branch']};
 const commands={'C · INC':['処理','C · 1増やす','operation'],'CH · DEC':['処理','CH · 1減らす','operation'],'CHU · RIGHT':['移動','CHU · 右のセルへ','operation'],'CHUK · OUT':['出力','CHUK · 現在セルを出力','output']};
 const chukeiLoop='CHUKE … CHUKEI · Loop while current cell ≠ 0';
 const childrenOf=n=>n && Array.isArray(n.children)?n.children:[];
 function describe(n){
  const raw=typeof n?.label==='string'?n.label:'';
  let info=kinds[n?.kind];
  if(!info && raw==='CHUKEI Program') info=['全体','CHUKEI プログラム','structure'];
  if(!info && raw===chukeiLoop) info=['ループ','CHUKE … CHUKEI','loop'];
  if(!info && Object.hasOwn(commands,raw)) info=commands[raw];
  return {raw,badge:info?.[0]||'ノード',title:info?.[1]||raw||'ノード',tone:info?.[2]||'structure',role:typeof n?.role==='string'?(roles[n.role]||n.role):'',hint:raw===chukeiLoop?'現在のセルが0以外の間、子の命令を繰り返す':''};
 }
 function summarize(root){
  let nodes=0,loops=0,branches=0,depth=0,limited=false;
  const pending=[{node:root,depth:0}],seen=new Set();
  while(pending.length){
   const entry=pending.pop(),n=entry.node;
   if(!n || typeof n!=='object' || seen.has(n)){limited=true;continue;}
   if(nodes>=MAX_STATS){limited=true;break;}
   seen.add(n);nodes++;depth=Math.max(depth,entry.depth);
   const type=describe(n).tone;if(type==='loop') loops++;if(n.kind==='if_stmt') branches++;
   const children=childrenOf(n);
   for(let i=children.length-1;i>=0;i--) pending.push({node:children[i],depth:entry.depth+1});
  }
  return {nodes,loops,branches,depth,limited};
 }
 function presentationEntries(children,group){
  const entries=[];
  for(const node of children){
   const previous=entries.at(-1);
   const groupable=group && !node?.kind && Object.hasOwn(commands,node?.label) && childrenOf(node).length===0;
   if(groupable && previous?.groupable && previous.node.label===node.label) previous.count++;
   else entries.push({node,count:1,groupable});
  }
  return entries;
 }
 function create({document,container,note,tools,summary,limit,groupInput,groupLabel,expandButton,collapseButton}){
  let root=null,language='',rendered=0,truncated=false,stale=false;
  const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
  const disable=state=>{expandButton.disabled=state;collapseButton.disabled=state;groupInput.disabled=state;};
  function clear(message='実行で表示。'){
   root=null;stale=false;container.replaceChildren();delete container.dataset.stale;summary.textContent='';limit.textContent='';limit.hidden=true;tools.hidden=true;disable(true);note.textContent=message;
  }
  function marker(text){truncated=true;const li=make('li','ast-cut',text);return li;}
  function card(entry,depth){
   if(rendered>=MAX_CARDS) return marker(`表示は${MAX_CARDS}枚までです。残りのノードは省略しています。`);
   if(depth>MAX_DEPTH) return marker(`深さ${MAX_DEPTH}を超える枝は省略しています。`);
   rendered++;
   const n=entry.node;if(!n || typeof n!=='object') return marker('表示できないノードがあります。');
   const info=describe(n),children=childrenOf(n),li=make('li','ast-item');
   const branch=children.length>0;
   const box=make(branch?'details':'div','ast-card');box.dataset.tone=info.tone;
   if(branch) box.open=depth<4;
   if(entry.count>1) box.dataset.group='true';
   const head=make(branch?'summary':'div','ast-card-head');
   const top=make('span','ast-card-top');
   top.append(make('span','ast-kind',info.badge));
   if(info.role) top.append(make('span','ast-role',info.role));
   if(Number.isInteger(n.line) && n.line>0 && Number.isInteger(n.column) && n.column>0) top.append(make('span','ast-location',`${n.line}行 ${n.column}列`));
   head.append(top,make('span','ast-title',info.title+(entry.count>1?` × ${entry.count}`:'')));
   if(info.raw && info.raw!==info.title) head.append(make('code','ast-original',info.raw));
   if(info.hint) head.append(make('span','ast-hint',info.hint));
   if(branch) head.append(make('span','ast-child-count',`子ノード ${children.length} · 押して開閉`));
   if(entry.count>1) head.append(make('span','ast-group-note',`ソース上の連続${entry.count}命令を表示用にまとめています`));
   box.append(head);li.append(box);
   if(branch){
    const list=make('ol','ast-branches');
    if(depth>=MAX_DEPTH) list.append(marker(`深さ${MAX_DEPTH}を超える枝は省略しています。`));
    else for(const child of presentationEntries(children,language==='chukei' && groupInput.checked)){
     if(rendered>=MAX_CARDS){list.append(marker(`表示は${MAX_CARDS}枚までです。残りのノードは省略しています。`));break;}
     list.append(card(child,depth+1));
    }
    box.append(list);
   }
   return li;
  }
  function draw(){
   container.replaceChildren();if(stale)container.dataset.stale='true';else delete container.dataset.stale;rendered=0;truncated=false;
   if(!root)return;
   const stats=summarize(root);
   const list=make('ol','ast-root');list.append(card({node:root,count:1},0));container.append(list);
   summary.textContent=`${stats.nodes}${stats.limited?'以上':''} ノード · ループ ${stats.loops} · 分岐 ${stats.branches} · 深さ ${stats.depth}${stats.limited?'以上':''}`;
   note.textContent=stale?'編集前の構文木です。再実行すると更新されます。':'コンパイラが返した構文木。線は親子関係で、実行順や実行回数ではありません。';
   limit.hidden=!(truncated||stats.limited);
   limit.textContent=limit.hidden?'':`大きな構文木のため表示を制限しています（最大${MAX_CARDS}枚・深さ${MAX_DEPTH}）。実際の解析結果や実行内容は変更していません。`;
   tools.hidden=false;groupLabel.hidden=language!=='chukei';disable(false);
  }
  expandButton.addEventListener('click',()=>{for(const d of container.querySelectorAll('details'))d.open=true;});
  collapseButton.addEventListener('click',()=>{const all=container.querySelectorAll('details');for(const d of all)d.open=false;if(all[0])all[0].open=true;});
  groupInput.addEventListener('change',draw);
  clear();
  return {render(ast,lang){root=ast&&typeof ast==='object'?ast:null;language=lang;stale=false;if(root)draw();else clear('構文木なし。解析エラー、または結果を取得できませんでした。');},clear,markStale(){if(root){stale=true;container.dataset.stale='true';note.textContent='編集前の構文木です。再実行すると更新されます。';}}};
 }
 globalThis.QueenaAstView=Object.freeze({create,describe,summarize,presentationEntries});
})();
