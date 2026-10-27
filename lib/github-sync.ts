import {env} from 'cloudflare:workers';
import {bucket} from '@/lib/community';
import {drainSync,enqueueSync,enqueueExisting,type SyncConfig} from './github-sync-core.mjs';
export function syncConfig():SyncConfig|null {
  const e=env as unknown as Record<string,string>;
  if(!e.GITHUB_DATA_TOKEN||!e.GITHUB_DATA_OWNER||!e.GITHUB_DATA_REPO)return null;
  if(!/^[a-zA-Z0-9_.-]+$/.test(e.GITHUB_DATA_OWNER)||!/^[a-zA-Z0-9_.-]+$/.test(e.GITHUB_DATA_REPO))return null;
  return {owner:e.GITHUB_DATA_OWNER,repo:e.GITHUB_DATA_REPO,branch:e.GITHUB_DATA_BRANCH||'main',token:e.GITHUB_DATA_TOKEN,allowPublicEncrypted:e.GITHUB_ALLOW_ENCRYPTED_PUBLIC==='true'};
}
let running:Promise<any>|null=null;
export async function flushGithub() {
  if(!running)running=drainSync(bucket(),syncConfig()).finally(()=>{running=null;});
  return running;
}
export async function changedJson(key:string) {
  try {await enqueueSync(bucket(),key);await flushGithub();}
  catch {console.error('Synchronization remains pending; local record retained.');}
}

export async function queueExistingGithub(cursor?:string) {
  const config=syncConfig();
  if(!config)throw Error('Sincronização ainda não configurada.');
  return enqueueExisting(bucket(),config,cursor);
}
