const source = `
const stores = new Map();
const inspectionReads = [];
const inspectionWrites = [];
let inspectionHook = null;
let readOnly = false;
export const __STUDY_HUB_TEST_BLOBS__ = true;
export async function listStores(options={}){ const event={listStores:true,method:'listStores',consistency:options.consistency,result:{stores:[...stores].filter(([,rows])=>rows.size).map(([name])=>name).sort()}}; inspectionReads.push({...event,result:undefined}); return inspectionHook ? inspectionHook(event) : event.result; }
function copy(value){ return value == null ? value : structuredClone(value); }
function write(name,key,method){ if(readOnly){ inspectionWrites.push({name,key,method}); throw new Error('Read-only test guard'); } }
export function getStore(options){
  const name = typeof options === 'string' ? options : options.name;
  const consistency = typeof options === 'string' ? undefined : options.consistency;
  inspectionReads.push({name,method:'getStore',consistency});
  if(!stores.has(name)) stores.set(name,new Map());
  const rows=stores.get(name);
  return {
    async get(key,options={}){ inspectionReads.push({name,key,method:'get',consistency:options.consistency ?? consistency}); const result=copy(rows.get(key) ?? null); return inspectionHook ? inspectionHook({name,key,result,method:'get'}) : result; },
    async getWithMetadata(key,options={}){ inspectionReads.push({name,key,method:'getWithMetadata',consistency:options.consistency ?? consistency}); const result=rows.has(key) ? {data:copy(rows.get(key)),metadata:{}} : null; return inspectionHook ? inspectionHook({name,key,result,method:'getWithMetadata'}) : result; },
    async set(key,value){ write(name,key,'set'); rows.set(key,copy(value)); },
    async setJSON(key,value){ write(name,key,'setJSON'); rows.set(key,copy(value)); },
    async delete(key){ write(name,key,'delete'); rows.delete(key); },
    async deleteAll(){ write(name,null,'deleteAll'); rows.clear(); },
    async list({prefix=''}={}){ inspectionReads.push({name,list:true,method:'list',consistency}); const result={blobs:[...rows.keys()].filter(key=>key.startsWith(prefix)).sort().map(key=>({key}))}; return inspectionHook ? inspectionHook({name,result,method:'list'}) : result; },
  };
}
export function __resetAll(){ readOnly=false; inspectionHook=null; inspectionReads.length=0; inspectionWrites.length=0; for(const rows of stores.values()) rows.clear(); }
export function __inspectionGuard(value=true){ readOnly=value; inspectionReads.length=0; inspectionWrites.length=0; }
export function __inspectionSnapshot(){ return [...stores].map(([name,rows])=>[name,[...rows].map(([key,value])=>[key,copy(value)])]).filter(([,rows])=>rows.length).sort(([a],[b])=>a.localeCompare(b)); }
export function __inspectionAccess(){ return {reads:copy(inspectionReads),writes:copy(inspectionWrites)}; }
export function __inspectionFault(hook){ inspectionHook=hook; }
`;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === '@netlify/blobs') return { url: 'mock-blobs:module', shortCircuit: true };
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url === 'mock-blobs:module') return { format: 'module', source, shortCircuit: true };
  return nextLoad(url, context);
}
