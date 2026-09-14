const source = `
const stores = new Map();
function copy(value){ return value == null ? value : structuredClone(value); }
export function getStore(name){
  if(!stores.has(name)) stores.set(name,new Map());
  const rows=stores.get(name);
  return {
    async get(key){ return copy(rows.get(key) ?? null); },
    async setJSON(key,value){ rows.set(key,copy(value)); },
    async delete(key){ rows.delete(key); },
    async list({prefix=''}={}){ return {blobs:[...rows.keys()].filter(key=>key.startsWith(prefix)).sort().map(key=>({key}))}; },
  };
}
export function __resetAll(){ for(const rows of stores.values()) rows.clear(); }
`;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === '@netlify/blobs') return { url: 'mock-blobs:module', shortCircuit: true };
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url === 'mock-blobs:module') return { format: 'module', source, shortCircuit: true };
  return nextLoad(url, context);
}
