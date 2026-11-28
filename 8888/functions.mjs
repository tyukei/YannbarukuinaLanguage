// Value-oriented 8888: functions are pure expressions; output lives at the top level.
export const expressionInstructions = ['定数を積む', '引数を読む', '足し算', '引き算', '値を渡して呼ぶ', '値を返す', '結果を表示'];
const scan = /\s+|👏[\s\S]*?👏|88[৪୪]|৪৪৪|[0-9]+|[\p{L}_][\p{L}\p{N}_]*|[(){},]/uy;
export function isExpressionProgram(source) {
  const start = source.replace(/^(?:\s+|👏[\s\S]*?👏)*/u,'');
  return /^(?:マジ\s*[\p{L}_][\p{L}\p{N}_]*\s*\(|৪৪৪\s*\()/u.test(start);
}
export function compileExpressions(source,{sourceMap,analysis}) {
  let offset=0,line=1,column=1,cached;
  const tokens=[],code=[],locations=[],sourceCommands=[],functions=[],definitions=new Map(),calls=[];
  const ast={label:'プログラム',kind:'program',children:[]};
  const at=t=>`${t.line}行 ${t.column}列`;
  const fail=(t,message)=>{throw new Error(at(t)+'：'+message);};
  const make=(label,kind,children=[])=>({label,kind,children});
  function lex(){
    while(offset<source.length){
      scan.lastIndex=offset;
      // Keywords are glued to names, so split them before reading a name.
      let text=/^(?:マジ|めっちゃ)/u.exec(source.slice(offset))?.[0]??scan.exec(source)?.[0];
      const t={lexeme:text??'',line,column};
      if(!text) fail(t,source.startsWith('👏',offset)?'コメントを閉じる「👏」がありません。':'使えない文字です。');
      const lines=text.split(/\r\n?|\n/u);
      line+=lines.length-1;column=(lines.length===1?column:1)+Array.from(lines.at(-1)).length;
      offset+=text.length;
      if(/^\s/u.test(text)||text.startsWith('👏')) continue;
      t.kind=/^(?:マジ|めっちゃ|88[৪୪]|৪৪৪)$/u.test(text)?'命令':/^\d/u.test(text)?'数値':/^[(){},]$/u.test(text)?'区切り':'名前';
      tokens.push(t);
      return t;
    }
    return {lexeme:'',line,column,kind:'EOF'};
  }
  const peek=()=>cached??=lex();
  const take=()=>{const t=peek();cached=undefined;return t;};
  function expect(text){const t=take();if(t.lexeme!==text) fail(t,`「${text}」が必要です。`);return t;}
  function name(){const t=take();if(t.kind!=='名前') fail(t,'名前が必要です。');return t;}
  function emit(op,t,arg=0){
    if(locations.length>=4096) fail(t,'命令は4,096個までです。');
    const pc=code.length;
    code.push(op,arg&255,arg>>>8);locations.push(at(t));sourceCommands.push(t.lexeme);
    return pc;
  }
  function patch(pc,value){code[pc+1]=value&255;code[pc+2]=value>>>8;}
  function list(parse,depth){
    expect('(');const values=[];
    if(peek().lexeme!==')'){
      do {
        if(values.length>=16) fail(peek(),'引数は16個までです。');
        values.push(parse(depth));
        if(peek().lexeme!==',') break;
        take();
      } while(true);
    }
    expect(')');return values;
  }
  function expression(params,depth=0) {
    const t=take(),text=t.lexeme;
    if(depth>=48) fail(t,'式の入れ子は48段までです。');
    if(t.kind==='数値'){
      if(Number(text)>255) fail(t,'数値は0〜255です。');
      emit(18,t,Number(text));return make(text,'number');
    }
    if(text==='88৪'||text==='88୪'){
      const args=list(d=>expression(params,d),depth+1);
      if(args.length!==2) fail(t,'足し算・引き算には値が2つ必要です。');
      emit(text==='88৪'?20:21,t);return make(text==='88৪'?'足し算':'引き算','binary',args);
    }
    if(text==='めっちゃ'){
      const n=name(),args=list(d=>expression(params,d),depth+1);
      const pc=emit(22,t);
      calls.push({token:n,pc,arity:args.length});
      return make('呼び出し · '+n.lexeme,'call',args);
    }
    if(params.has(text)){
      emit(19,t,params.get(text));return make('引数 · '+text,'identifier');
    }
    fail(t,text==='৪৪৪'?'関数の中では出力できません。値を返して外で表示してください。':'数値・引数・計算・関数呼び出しのいずれかが必要です。');
  }
  while(peek().lexeme){
    const t=take();
    if(t.lexeme==='マジ'){
      const n=name(),names=list(name,0);
      if(definitions.has(n.lexeme)) fail(n,'関数は定義済みです。');
      const params=new Map();
      for(const [i,n] of names.entries()){
        if(params.has(n.lexeme)) fail(n,'同じ引数名を2回使えません。');
        params.set(n.lexeme,i);
      }
      expect('{');
      const skip=emit(14,t);
      definitions.set(n.lexeme,functions.length);functions.push({pc:code.length,arity:params.size});
      const body=expression(params);
      const end=expect('}');emit(23,end);patch(skip,code.length);
      ast.children.push(make('関数 · '+n.lexeme,'function',[make('引数 · '+names.map(n=>n.lexeme).join(', '),'parameters'),body]));
    }else if(t.lexeme==='৪৪৪'){
      expect('(');const value=expression(new Map());expect(')');
      emit(24,t);ast.children.push(make('結果を表示','instruction',[value]));
    }else fail(t,'関数の定義「マジ 名前(引数){式}」か、表示「৪৪৪(式)」を書いてください。');
  }
  for(const {token,pc,arity} of calls){
    const id=definitions.get(token.lexeme);
    if(id===undefined) fail(token,'関数は定義されていません。');
    if(functions[id].arity!==arity) fail(token,`引数は${functions[id].arity}個必要です。`);
    patch(pc,id);
  }
  return {code:Uint8Array.from(code),locations,literals:[],functions,
    ...(sourceMap?{sourceCommands}:{}),...(analysis?{ast,tokens}:{})};
}
