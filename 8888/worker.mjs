import {compile, hex, instructions, run} from './engine.mjs?v=kami-parens-1';

export function execute8888(source, debug = false) {
  let program;
  const result = {ok:false, tokens:[], ast:null, output:''};
  try {
    program = compile(source, {sourceMap:debug, analysis:true});
    const {code, literals, tokens, ast, functions} = program;
    result.tokens = tokens;
    result.ast = ast;
    const listing = [];
    for (let i = 0; i < Math.min(code.length, 96 * 3); i += 3) {
      const arg = code[i + 1] + (code[i + 2] << 8);
      const extra = code[i] === 17 ? ' ' + JSON.stringify(literals[arg]) : '';
      listing.push(`${hex(i, 4)}  ${hex(code[i])} ${hex(code[i+1])} ${hex(code[i+2])}  ${instructions[code[i]-1]}${extra}`);
    }
    if (code.length > 96 * 3) listing.push('…（先頭96命令のみ表示）');
    result.listing = listing.join('\n') || '（命令なし）';
    result.generated = JSON.stringify({format:'8888 educational VM', version:functions?2:1, code:[...code], literals, ...(functions?{functions}:{})}, null, 2);
    const finished = run(program, {debug});
    if (finished.debug) result.debug = finished.debug;
    let previous;
    for (const value of finished.output) {
      if (previous !== undefined) {
        if (typeof previous !== typeof value && previous !== '\n') result.output += '\n';
        if (typeof previous === 'number' && typeof value === 'number') result.output += ' ';
      }
      result.output += value;
      previous = value;
    }
    const rows = finished.trace.map(({pc, op, next, pointer, value, emitted}) =>
      `${hex(pc, 4)} → ${hex(next, 4)}  ${hex(op)}  ${functions?('スタック先頭（最新値）: '+(value??'空')):('データ[0x'+hex(pointer,4)+'] = '+value)}${emitted === null ? '' : `  出力: ${typeof emitted === 'string' ? JSON.stringify(emitted) : emitted}`}`);
    if (finished.steps > finished.trace.length) rows.push('…（先頭48ステップのみ表示）');
    result.traceText = [`実行: ${finished.steps} ステップ`, ...rows].join('\n');
    result.steps = finished.steps;
    result.ok = true;
  } catch (error) {
    result.error = error.message;
    if (error.debug) result.debug = error.debug;
  }
  if (result.debug) result.program = {code:program.code, sourceCommands:program.sourceCommands};
  return result;
}
if (typeof self !== 'undefined' && typeof document === 'undefined') {
  self.onmessage = ({data}) => self.postMessage(execute8888(data.source, data.debug));
}
