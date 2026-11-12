// CHUKEI educational VM. Independent from Queena and the Z80 pipeline.
const COMMANDS = Object.freeze({C:'INC',CH:'DEC',CHU:'RIGHT',CHUK:'OUT',CHUKE:'JZ',CHUKEI:'JNZ'});
const SOURCE_LIMIT=16384, OUTPUT_LIMIT=16384, STEP_LIMIT=1000000, TIME_LIMIT_MS=1500;
export function runChukei(source, options={}) {
 const result={ok:false,tokens:[],ast:null,bytecode:[],output:'',steps:0,trace:[],trace_truncated:false,cells:Array(256).fill(0),pointer:0,outputMode:'numeric'};
 const started=performance.now();
 try {
  if(options===null || typeof options!=='object' || Array.isArray(options)) throw Error('出力設定が不正です。');
  const outputMode=options.outputMode===undefined?'numeric':options.outputMode;
  if(outputMode!=='numeric' && outputMode!=='ascii') throw Error('出力モードはnumericまたはasciiを指定してください。');
  result.outputMode=outputMode;
  if(typeof source!=='string') throw Error('ソースコードは文字列で指定してください。');
  if(new TextEncoder().encode(source).length>SOURCE_LIMIT) throw Error('コードは16 KiB以内にしてください。');
  // Whitespace-delimited, case-sensitive commands; no comments or punctuation.
  let line=1,column=1,scanned=0;
  for(const match of source.matchAll(/\S+/gu)) {
   for(let i=scanned;i<match.index;i++){if(source[i]==='\n'){line++;column=1;}else column++;}
   const lexeme=match[0];
   result.tokens.push({kind:Object.hasOwn(COMMANDS,lexeme)?COMMANDS[lexeme]:'invalid',lexeme,line,column});
   column+=lexeme.length;scanned=match.index+lexeme.length;
  }
  const root={label:'CHUKEI Program',children:[]};
  let children=root.children;const stack=[];const code=[];
  for(let i=0;i<result.tokens.length;i++) {
   const t=result.tokens[i];
   const at=`line ${t.line}, column ${t.column}`;
   if(t.kind==='invalid') throw Error(`Unknown command at ${at}: ${t.lexeme}`);
   const pc=code.length;
   code.push({pc,op:t.kind,sourceIndex:i});
   if(t.kind==='JZ') {
    if(stack.length>=128) throw Error(`Loop nesting exceeds 128 levels at ${at}`);
    const node={label:'CHUKE … CHUKEI · Loop while current cell ≠ 0',children:[]};
    children.push(node);stack.push({pc,parent:children,token:t});children=node.children;
   } else if(t.kind==='JNZ') {
    if(!stack.length) throw Error(`Unmatched CHUKEI at ${at}`);
    const open=stack.pop();code[open.pc].arg=pc+1;code[pc].arg=open.pc+1;children=open.parent;
   } else children.push({label:`${t.lexeme} · ${t.kind}`,children:[]});
  }
  if(stack.length){const t=stack.at(-1).token;throw Error(`Unmatched CHUKE at line ${t.line}, column ${t.column}`);}
  // Publish only a fully validated AST and bytecode, never partially patched jumps.
  result.ast=root;result.bytecode=code;
  const cells=new Uint8Array(256);let pointer=0,pc=0;
  try {
   while(pc<code.length) {
    if(result.steps>=STEP_LIMIT) throw Error('命令実行上限（1,000,000ステップ）に達しました。');
    if((result.steps&4095)===0 && performance.now()-started>TIME_LIMIT_MS) throw Error('実行時間上限（1.5秒）に達しました。');
    const ins=code[pc];const executedPc=pc;let emitted;result.steps++;
    switch(ins.op) {
     case 'INC':cells[pointer]=(cells[pointer]+1)&255;pc++;break;
     case 'DEC':cells[pointer]=(cells[pointer]+255)&255;pc++;break;
     case 'RIGHT':pointer=(pointer+1)&255;pc++;break;
     case 'OUT':{
      if(outputMode==='ascii' && cells[pointer]>127) throw Error(`ASCII出力範囲外 at line ${result.tokens[ins.sourceIndex].line}, column ${result.tokens[ins.sourceIndex].column}: ${cells[pointer]}（0〜127のみ対応）`);
      const text=outputMode==='ascii'?String.fromCharCode(cells[pointer]):`${cells[pointer]}\n`;
      if(result.output.length+text.length>OUTPUT_LIMIT) throw Error('出力上限（16 KiB）に達しました。');
      result.output+=text;emitted=text;pc++;break;
     }
     case 'JZ':pc=cells[pointer]===0?ins.arg:pc+1;break;
     case 'JNZ':pc=cells[pointer]!==0?ins.arg:pc+1;break;
     default:throw Error('Invalid VM instruction');
    }
    if(result.trace.length<200) result.trace.push({step:result.steps,pc:executedPc,op:ins.op,next_pc:pc,pointer,value:cells[pointer],...(emitted!==undefined?{output:emitted}:{})});
    else result.trace_truncated=true;
   }
   result.ok=true;
  } finally {result.cells=Array.from(cells);result.pointer=pointer;}
 } catch(err) {result.error=String(err?.message||err);}
 return result;
}
