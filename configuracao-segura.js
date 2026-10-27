/* O token é cifrado neste navegador; a senha não é gravada. */
const keyName='conexao-repositorio-individual-v2';
const b64=b=>btoa(String.fromCharCode(...b));
const bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function derive(password,salt,usage){
 const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:310000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,usage);
}
export async function guardar(config,storage=localStorage){
 const {owner,repo,branch,token,password}=config;
 if(!/^[\w.-]+$/.test(owner)||!/^[\w.-]+$/.test(repo)||!branch||!token||!password)throw Error('Configuração incompleta.');
 const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
 const aad=new TextEncoder().encode(`${owner}/${repo}/${branch}`);
 const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad},await derive(password,salt,['encrypt']),new TextEncoder().encode(token));
 const record={version:2,owner,repo,branch,salt:b64(salt),iv:b64(iv),body:b64(new Uint8Array(ciphertext))};
 storage.setItem(keyName,JSON.stringify(record));return {owner,repo,branch};
}
export function informacoes(storage=localStorage){const raw=storage.getItem(keyName);if(!raw)return null;const {owner,repo,branch}=JSON.parse(raw);return {owner,repo,branch};}
export async function abrir(password,storage=localStorage){
 const raw=storage.getItem(keyName);if(!raw)throw Error('Configure o repositório neste navegador.');
 const data=JSON.parse(raw);if(data.version!==2)throw Error('Configuração inválida.');
 try{const plaintext=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(data.iv),additionalData:new TextEncoder().encode(`${data.owner}/${data.repo}/${data.branch}`)},await derive(password,bytes(data.salt),['decrypt']),bytes(data.body));return {owner:data.owner,repo:data.repo,branch:data.branch,token:new TextDecoder().decode(plaintext),password};}catch{throw Error('Senha de criptografia incorreta ou configuração alterada.');}
}
export function remover(storage=localStorage){storage.removeItem(keyName);}
