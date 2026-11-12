import {runChukei} from './chukei-runtime.js';
self.onmessage=({data})=>{self.postMessage(runChukei(data?.source));};
