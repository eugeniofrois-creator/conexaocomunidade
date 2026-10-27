import {env} from 'cloudflare:workers';
import seed from '@/lib/local-directory-seed.json';
import {read,write,Conflict} from '@/lib/json-store';
import {decode64} from '@/lib/vault';
const id='frei-damiao-brejaru-2026-10-08-v1';
export async function localDirectory(){
 const stored=await read('local-directory',id);if(stored)return stored.data;
 const secret=(env as unknown as {LOCAL_DIRECTORY_IMPORT_KEY_V1?:string}).LOCAL_DIRECTORY_IMPORT_KEY_V1;
 if(!secret)return {main:[],complementary:[],sourceDate:null};
 const key=await crypto.subtle.importKey('raw',decode64(secret) as unknown as BufferSource,'AES-GCM',false,['decrypt']);
 const raw=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode64(seed.iv) as unknown as BufferSource,additionalData:new TextEncoder().encode(seed.aad)},key,decode64(seed.body) as unknown as BufferSource);
 const data=JSON.parse(new TextDecoder().decode(raw));
 if(data.version!==1||data.main?.length!==467||data.complementary?.length!==10)throw Error('Invalid local directory');
 try{await write('local-directory',id,data,null);}catch(e){if(!(e instanceof Conflict))throw e;}
 return (await read('local-directory',id))!.data;
}
export function directoryEntry(c:any){return {...c,title:c.name,kind:'service',created_at:0,status:'Levantamento público',photo:null,mine:false,revision:undefined};}
