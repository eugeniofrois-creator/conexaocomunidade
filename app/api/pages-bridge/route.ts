import * as auth from '../auth/route';
import * as community from '../community/route';
import * as companies from '../companies/route';
import * as companyImage from '../company-image/route';
import * as aboutImages from '../about-images/route';
import * as adminActivity from '../admin-activity/route';
import * as adminImages from '../admin-images/route';
import * as coordination from '../coordination/route';
import * as recovery from '../password-recovery/route';
import * as photo from '../photo/route';
import * as reports from '../reports/route';
import * as testUsers from '../test-users/route';
import {tokenFromCookie} from '@/lib/local-auth';

const origin = 'https://eugeniofrois-creator.github.io';
const routes:Record<string,Record<string,any>> = {
  auth, community, companies, 'company-image': companyImage,
  'about-images': aboutImages, 'admin-activity': adminActivity,
  'admin-images': adminImages, coordination, 'password-recovery': recovery,
  photo, reports, 'test-users': testUsers,
};
const cors = {'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET, POST, PATCH, DELETE, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Expose-Headers':'X-Conexao-Session','Vary':'Origin','Cache-Control':'no-store'};
export async function OPTIONS(req:Request) {
  return req.headers.get('origin')===origin ? new Response(null,{status:204,headers:cors}) : new Response(null,{status:403});
}
async function run(req:Request) {
  if (req.headers.get('origin')!==origin) return Response.json({error:'Origem não autorizada.'},{status:403});
  const url=new URL(req.url), name=url.searchParams.get('endpoint')||'';
  const handler=routes[name]?.[req.method];
  if (!handler) return Response.json({error:'Operação indisponível.'},{status:404,headers:cors});
  url.searchParams.delete('endpoint');
  url.pathname='/api/'+name;
  const headers=new Headers(req.headers);headers.set('origin',url.origin);
  const inner=new Request(url, {method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:req.body,duplex:'half'} as RequestInit);
  try {
    const response:Response=await handler(inner);
    const h=new Headers(response.headers);
    for (const [k,v] of Object.entries(cors)) h.set(k,v);
    const token=tokenFromCookie(h.get('set-cookie')||'');
    if(name==='auth' && response.ok && token) h.set('X-Conexao-Session',token);
    h.delete('set-cookie');
    return new Response(response.body,{status:response.status,headers:h});
  } catch {return Response.json({error:'Serviço temporariamente indisponível.'},{status:503,headers:cors});}
}
export const GET=run;export const POST=run;export const PATCH=run;export const DELETE=run;
