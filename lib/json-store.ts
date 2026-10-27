import {changedJson} from '@/lib/github-sync';
import {RequestError} from '@/lib/request-body';
import {bucket,database,json} from '@/lib/community';
import {masterKey} from '@/lib/companies';
import {sealJson,openJson} from '@/lib/vault';
export const uuid=(id:unknown):id is string=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
export const key=(kind:string,id:string)=>`private-json/v1/${kind}/${encodeURIComponent(id)}.json`;
export class Conflict extends Error{}
export async function read(kind:string,id:string){const k=key(kind,id),obj=await bucket().get(k);if(!obj)return null;const envelope:any=await obj.json();if(envelope.version!==1)throw Error('Unsupported JSON version');return {data:await openJson(masterKey(),k,envelope),revision:obj.etag};}
export async function write(kind:string,id:string,data:any,revision:string|null){const k=key(kind,id);const e=await sealJson(masterKey(),k,data);const result=await bucket().put(k,JSON.stringify({version:1,...e}),{httpMetadata:{contentType:'application/json',cacheControl:'no-store'},onlyIf:revision?{etagMatches:revision}:{etagDoesNotMatch:'*'}});if(!result)throw new Conflict('O cadastro mudou em outra aba. Reabra a versão salva antes de confirmar novas alterações. Seus campos foram preservados.');await changedJson(k);return result.etag;}
export async function list(kind:string){const prefix=key(kind,'').replace('.json','');let cursor:string|undefined;const result:any[]=[];do{const page=await bucket().list({prefix,cursor,limit:100});for(let i=0;i<page.objects.length;i+=4){const batch=await Promise.all(page.objects.slice(i,i+4).map(async obj=>{const id=decodeURIComponent(obj.key.slice(prefix.length,-5));const record=await read(kind,id);return record?{id,...record}:null;}));result.push(...batch.filter(Boolean));}cursor=page.truncated?page.cursor:undefined;}while(cursor);return result;}
async function seed(kind:string,id:string,data:any){try{await write(kind,id,data,null);}catch(e){if(!(e instanceof Conflict))throw e;}}
// Import is additive and restart-safe: original SQL rows remain untouched.
// Completion is recorded only after every JSON record has been persisted.
let importing:Promise<void>|null=null;
export async function ready(){if(await bucket().head('private-json/v1/migration-complete.json'))return;if(!importing)importing=migrate().finally(()=>{importing=null;});await importing;}
async function migrate(){const db=database();const companies=await db.prepare('SELECT * FROM companies').all();for(const row of companies.results as any[])await seed('companies',row.id,{owner:row.owner,created_at:row.created_at,updated_at:row.updated_at,company:await openJson(masterKey(),row.id,row)});
 const profiles=await db.prepare('SELECT * FROM profiles').all();for(const row of profiles.results as any[])await seed('clients',row.user_id,{owner:row.user_id,profile:{name:row.name,neighborhood:row.neighborhood},created_at:row.created_at});
 const entries=await db.prepare('SELECT * FROM entries').all();for(const row of entries.results as any[])await seed('entries',row.id,{...row,gallery:JSON.parse(row.gallery||'[]')});
 const photos=await db.prepare('SELECT * FROM photos').all();for(const row of photos.results as any[])await seed('photos',row.id,{...row,encrypted:false});
 const assets=await db.prepare('SELECT * FROM company_assets').all();for(const row of assets.results as any[])await seed('company-images',row.id,{...row,encrypted:true,tenant:row.company_id});
 const ideas=await db.prepare('SELECT * FROM ideas').all();for(const row of ideas.results as any[])await seed('ideas',row.id,{owner:row.owner,created_at:row.created_at,...await openJson(masterKey(),'idea:'+row.id,row)});
 await bucket().put('private-json/v1/migration-complete.json',JSON.stringify({version:1,completed_at:Date.now()}),{httpMetadata:{contentType:'application/json'},onlyIf:{etagDoesNotMatch:'*'}});
}
export async function client(owner:string){let row=await read('clients',owner);if(!row){await seed('clients',owner,{owner,profile:null,created_at:Date.now()});row=await read('clients',owner);}return row!;}
export function failed(e:unknown,message:string){if(e instanceof RequestError)return json({error:e.message},e.status);if(e instanceof Conflict)return json({error:e.message},409);console.error('JSON storage operation failed',e instanceof Error?e.name:'Unknown');return json({error:message},503);}
