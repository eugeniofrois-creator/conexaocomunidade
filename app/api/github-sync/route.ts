import {env} from 'cloudflare:workers';
import {json} from '@/lib/community';
import {flushGithub,queueExistingGithub} from '@/lib/github-sync';
export async function POST(req:Request) {
  const secret=(env as unknown as Record<string,string>).GITHUB_SYNC_JOB_KEY;
  const supplied=req.headers.get('authorization')||'';
  if(!secret||supplied!==`Bearer ${secret}`)return json({error:'Acesso não autorizado.'},403);
  if((req.headers.get('content-type')||'').includes('application/json')) {
    let body:any;try {body=await req.json();} catch {return json({error:'Dados inválidos.'},400);}
    if(body?.action==='backfill') {
      if(body.cursor!==undefined && (typeof body.cursor!=='string'||body.cursor.length>2048))return json({error:'Cursor inválido.'},400);
      try {return json(await queueExistingGithub(body.cursor));}
      catch {return json({error:'Repositório de dados não configurado, não permitido ou inacessível.'},503);}
    }
  }
  return json(await flushGithub());
}
