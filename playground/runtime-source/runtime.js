import { assemble } from '@fugloy/asm';
import { Z80 } from 'z80-emulator';
export async function runQueena(source, wasmBytes) {
 const start=performance.now(); let output='',assembly='',ast=null,tokens=[];
 try {
  if(typeof source !== 'string'||!source.trim()) throw Error('コードを入力してください。');
  const bytes=new TextEncoder().encode(source);
  if(bytes.length>16384) throw Error('コードは16 KiB以内にしてください。');
  const {instance}=await WebAssembly.instantiate(wasmBytes);
  const e=instance.exports;
  new Uint8Array(e.memory.buffer,e.input_ptr(),bytes.length).set(bytes);
  const status=e.compile(bytes.length);
  if(e.tokens_length()>0) tokens=JSON.parse(new TextDecoder().decode(new Uint8Array(e.memory.buffer,e.tokens_ptr(),e.tokens_length())));
  if(e.ast_length()>0) ast=JSON.parse(new TextDecoder().decode(new Uint8Array(e.memory.buffer,e.ast_ptr(),e.ast_length())));
  assembly=new TextDecoder().decode(new Uint8Array(e.memory.buffer,e.output_ptr(),e.output_len()));
  if(status) throw Error(assembly);
  const built=assemble(assembly);
  if(!built.ok) throw Error(built.diagnostics.filter(d=>d.severity==='error').map(d=>`${d.line}:${d.column}: ${d.message}`).join('\n'));
  const mem=new Uint8Array(65536); mem.fill(0xa5); mem[5]=0xc9;
  let binaryBytes=0;
  for(const line of built.listing){
   if(!line.bytes.length) continue;
   if(line.load===null || line.load<0x100 || line.load+line.bytes.length>=0x7000) throw Error('生成プログラムが安全なコード領域を超えました。');
   mem.set(line.bytes,line.load); binaryBytes+=line.bytes.length;
  }
  const hal={tStateCount:0,readMemory:a=>mem[a&65535],writeMemory:(a,v)=>{mem[a&65535]=v&255;},contendMemory(){},readPort:()=>255,writePort(){},contendPort(){}};
  const cpu=new Z80(hal); cpu.regs.pc=0x100; cpu.regs.sp=0xf000;
  let count=0;
  function put(ch) { if(output.length>=16384) throw Error('出力が16 KiBを超えたため停止しました。'); output+=String.fromCharCode(ch); }
  while(cpu.regs.pc!==0){
   if(++count>5000000) throw Error('命令実行上限に達しました。繰り返し条件を確認してください。');
   if((count&4095)===0 && performance.now()-start>2500) throw Error('実行時間の上限に達しました。');
   if(cpu.regs.pc===5){
    const fn=cpu.regs.c;
    if(fn===2) put(cpu.regs.e);
    else if(fn===9){let a=cpu.regs.de, i=0; while(mem[a]!==36){if(++i>16384) throw Error('CP/M文字列出力が上限を超えました。'); put(mem[a]); a=(a+1)&65535;}}
    else throw Error(`未対応のCP/Mコンソール呼び出し: ${fn}`);
   }
   cpu.step();
   if(cpu.regs.halted) throw Error('プログラムがHALTで停止しました。');
  }
  if(output.includes('Division by zero')) throw Error('Division by zero');
  return {ok:true,ast,tokens,output:output.replace(/\r\n/g,'\n'),assembly,binary_bytes:binaryBytes,elapsed_ms:Math.round(performance.now()-start),instructions:count};
 } catch(err) {return {ok:false,ast,tokens,output:output.replace(/\r\n/g,'\n'),error:err instanceof WebAssembly.RuntimeError?'コンパイラの実行上限に達しました。コードを短くしてください。':String(err.message||err),assembly,binary_bytes:0,elapsed_ms:Math.round(performance.now()-start)};}
}
