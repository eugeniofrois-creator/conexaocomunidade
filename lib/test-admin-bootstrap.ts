import {env} from 'cloudflare:workers';
import {passwordMatches} from '@/lib/passwords';
import {read,write,Conflict} from '@/lib/json-store';
import {usernameKey,normalizeUsername} from '@/lib/local-auth';
export const ADMIN_TEST_USERNAME='eugenio.admin';
export const STANDARD_ADMIN_USERNAME='admin';
export const reservedAdminUsername=(username:string)=>[ADMIN_TEST_USERNAME,STANDARD_ADMIN_USERNAME,'escola'].includes(normalizeUsername(username));
export async function bootstrapAdmin(username:string,password:string){
 const normalized=normalizeUsername(username);if(!reservedAdminUsername(normalized))return null;
 const settings=env as unknown as {ADMIN_TEST_BOOTSTRAP_HASH?:string;STANDARD_ADMIN_TEST_HASH?:string;SCHOOL_COORDINATION_BOOTSTRAP_HASH?:string};
 const raw=normalized==='escola'?settings.SCHOOL_COORDINATION_BOOTSTRAP_HASH:normalized===STANDARD_ADMIN_USERNAME?settings.STANDARD_ADMIN_TEST_HASH:settings.ADMIN_TEST_BOOTSTRAP_HASH;
 if(!raw)return null;const verifier=JSON.parse(raw);if(!await passwordMatches(password,verifier))return null;
 const k=await usernameKey(normalized);const existing=await read('users',k);if(existing)return existing;
 try{await write('users',k,{id:crypto.randomUUID(),username:normalized,name:normalized==='escola'?'Escola · Coordenação':normalized===STANDARD_ADMIN_USERNAME?'Administrador · FMP':'Eugênio · Administração',role:normalized==='escola'?'coordination':'company-admin',active:true,password:verifier,authVersion:1,created_at:Date.now()},null);}catch(e){if(!(e instanceof Conflict))throw e;}
 return read('users',k);
}
