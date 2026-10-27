/* O catálogo é público; esta chave é pública e não protege dados privados. */
(() => {
 const viewerKey = "885e64f2-9fec-4974-9566-fc190436408523af1865-fed4-41a0-8710-94e241896394";
 const prefix = new URL('.', document.currentScript.src);
 const cache = new Map();
 const decode = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
 async function load(kind) {
  const path = kind === 'companies' ? 'dados/publicos/catalogo.json' : 'dados/publicos/mapa.json';
  if (!cache.has(path)) cache.set(path, (async () => {
   const response = await window.fetch(new URL(path,prefix));
   if (!response.ok) throw Error('Catálogo indisponível.');
   const e=await response.json();
   if(e.version!==1||e.algorithm!=='AES-256-GCM'||e.kdf!=='PBKDF2-SHA256'||e.iterations!==210000)throw Error('Formato de catálogo inválido.');
   const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(viewerKey),'PBKDF2',false,['deriveKey']);
   const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:decode(e.salt),iterations:210000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['decrypt']);
   const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(e.iv),additionalData:new TextEncoder().encode(path)},key,decode(e.body));
   return JSON.parse(new TextDecoder().decode(bytes));
  })().catch(e=>{cache.delete(path);throw e;}));
  return cache.get(path);
 }
 window.ConexaoDadosPublicos={load};
})();
