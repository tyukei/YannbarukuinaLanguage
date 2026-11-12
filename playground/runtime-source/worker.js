import {runQueena} from './runtime.js';
self.onmessage=async ({data})=>{
 try {const response=await fetch(new URL('./queena.wasm',import.meta.url));if(!response.ok)throw Error('WASMを読み込めませんでした。');const bytes=await response.arrayBuffer();self.postMessage(await runQueena(data.source,bytes));}
 catch(e){self.postMessage({ok:false,ast:null,tokens:[],output:'',error:e.message,assembly:'',binary_bytes:0,elapsed_ms:0});}
};
