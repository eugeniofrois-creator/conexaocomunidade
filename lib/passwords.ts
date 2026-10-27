import {scrypt,timingSafeEqual} from 'node:crypto';
import {encode64,decode64} from '@/lib/vault';
const options={N:16384,r:8,p:5,maxmem:32*1024*1024};
async function derive(password:string,salt:Uint8Array){return await new Promise<Uint8Array>((resolve,reject)=>scrypt(password,salt,32,options,(err,key)=>err?reject(err):resolve(new Uint8Array(key))));}
export async function passwordHash(password:string){const salt=crypto.getRandomValues(new Uint8Array(16));return {algorithm:'scrypt-v1',salt:encode64(salt),hash:encode64(await derive(password,salt))};}
export async function passwordMatches(password:string,stored:any){if(stored?.algorithm!=='scrypt-v1')return false;const derived=await derive(password,decode64(stored.salt)),expected=decode64(stored.hash);return expected.length===derived.length&&timingSafeEqual(derived,expected);}
export const validPassword=(value:unknown):value is string=>typeof value==='string'&&[...value].length>=15&&[...value].length<=128;
