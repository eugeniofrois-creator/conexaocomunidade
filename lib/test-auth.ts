import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {sessionUser} from '@/lib/local-auth';
export async function getPlatformTestUser(){const user=await getChatGPTUser();if(!user)return null;const allowed=(env as unknown as {TEST_ALLOWED_EMAILS?:string}).TEST_ALLOWED_EMAILS?.split(',').map(e=>e.trim().toLowerCase())||[];return allowed.includes(user.email.trim().toLowerCase())?{...user,role:'owner',auth:'platform' as const}:null;}
export async function getTestUser(){return await sessionUser()||await getPlatformTestUser();}
