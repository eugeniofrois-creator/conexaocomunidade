// Espelha somente JSON cifrado. Nenhuma credencial é enviada ao navegador.
export const syncPrefix = 'private-sync/v1/';
export function syncable(key: string) {
  return /^private-json\/v1\/(companies|users|clients|company-images|image-files|reports|about-slots|about-assets)\/.+\.json$/.test(key);
}
type Store = { get(key:string):Promise<any>; put(key:string,value:string):Promise<any>; delete(key:string):Promise<any>; list(options:any):Promise<any> };
export type SyncConfig = { owner:string; repo:string; branch:string; token:string; allowPublicEncrypted?:boolean };
export async function enqueueSync(store:Store, key:string) {
  if (!syncable(key)) return;
  await store.put(syncPrefix + Date.now().toString().padStart(13,'0') + '-' + crypto.randomUUID() + '.json', JSON.stringify({key}));
}
export async function isPermittedDestination(c:SyncConfig, request:typeof fetch=fetch) {
  const url = `https://api.github.com/repos/${encodeURIComponent(c.owner)}/${encodeURIComponent(c.repo)}`;
  try {
    const result = await request(url, {headers:{Authorization:`Bearer ${c.token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'Conexao-Comunidade'},signal:AbortSignal.timeout(8000)});
    if (!result.ok) return false;
    const repo = await result.json() as {private?:boolean;full_name?:string};
    return (repo.private === true || (repo.private === false && c.allowPublicEncrypted === true)) && repo.full_name?.toLowerCase() === `${c.owner}/${c.repo}`.toLowerCase();
  } catch { return false; }
}
export async function enqueueExisting(store:Store,c:SyncConfig,cursor?:string,request:typeof fetch=fetch) {
  if (!await isPermittedDestination(c,request)) throw Error('Destination is not permitted');
  const page = await store.list({prefix:'private-json/v1/',limit:100,...(cursor?{cursor}:{})});
  let queued = 0;
  for (const item of page.objects) if (syncable(item.key)) {await enqueueSync(store,item.key);queued++;}
  return {queued,done:!page.truncated,nextCursor:page.truncated?page.cursor:null};
}
function encryptedEnvelope(value:string) {
  try {
    const data=JSON.parse(value);
    return (data.version===1||data.version===2) && typeof data.iv==='string' && data.iv.length>0 && typeof data.body==='string' && data.body.length>0 && (data.version!==2||data.algorithm==='AES-256-GCM');
  } catch { return false; }
}
const encode = (text:string) => { const bytes=new TextEncoder().encode(text);let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.slice(i,i+8192));return btoa(s); };
export async function mirrorKey(store:Store,key:string,c:SyncConfig,request:typeof fetch=fetch) {
  if (!syncable(key)) throw Error('Invalid synchronization path');
  const url=`https://api.github.com/repos/${encodeURIComponent(c.owner)}/${encodeURIComponent(c.repo)}/contents/${key.split('/').map(encodeURIComponent).join('/')}`;
  const headers={Authorization:`Bearer ${c.token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2026-03-10','User-Agent':'Comunidade-Conectada','Content-Type':'application/json'};
  for(let attempt=0;attempt<3;attempt++) {
    const remote=await request(url+'?ref='+encodeURIComponent(c.branch),{headers,signal:AbortSignal.timeout(8000)});
    if(!remote.ok&&remote.status!==404)throw Error('Remote read failed');
    const sha=remote.ok?(await remote.json() as any).sha:undefined;
    // Releitura evita reenviar um cadastro antigo após conflito entre edições.
    const local=await store.get(key);
    if(!local&&!sha)return;
    const body:any={branch:c.branch,message:'Sincronizar cadastro da comunidade',...(sha?{sha}:{})};
    if(local){const payload=await local.text();if(!encryptedEnvelope(payload))throw Error('Encrypted JSON required');body.content=encode(payload);}
    const result=await request(url,{method:local?'PUT':'DELETE',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(8000)});
    if(result.ok||(!local&&result.status===404))return;
    if(result.status!==409&&result.status!==422)throw Error('Remote write failed');
  }
  throw Error('Remote conflict');
}
export async function drainSync(store:Store,c:SyncConfig|null,limit=3,request:typeof fetch=fetch) {
  if(!c)return {configured:false,synced:0,pending:true};
  if(!await isPermittedDestination(c,request))return {configured:true,synced:0,pending:true,reason:'destination_not_permitted'};
  const page=await store.list({prefix:syncPrefix,limit});let synced=0;
  for(const job of page.objects) {
    const item=await store.get(job.key);if(!item)continue;
    const {key}=await item.json();
    try {await mirrorKey(store,key,c,request);await store.delete(job.key);synced++;}
    catch {return {configured:true,synced,pending:true};}
  }
  const rest=await store.list({prefix:syncPrefix,limit:1});
  return {configured:true,synced,pending:rest.objects.length>0};
}
