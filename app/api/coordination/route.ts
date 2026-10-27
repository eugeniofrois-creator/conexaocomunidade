import {releaseSchoolAccount} from '@/lib/school-accounts';
import {getTestUser} from '@/lib/test-auth';
import {json,sameOrigin} from '@/lib/community';
import {ready,list,failed,read,write,uuid,Conflict} from '@/lib/json-store';
import {readJsonBody} from '@/lib/request-body';
import {companySchema} from '@/lib/companies';
import {z} from 'zod';
const informalSchema=z.object({
  name:z.string().trim().min(2).max(120),
  provider:z.string().trim().min(2).max(100),
  category:z.string().trim().min(2).max(80),
  address:z.string().trim().max(250).default(''),
  contact:z.string().trim().max(120).default(''),
  hours:z.string().trim().max(200).default(''),
  description:z.string().trim().max(2000).default(''),
  products:z.string().trim().max(1500).default(''),
  lat:z.number().finite().min(-90).max(90).nullable().default(null),
  lng:z.number().finite().min(-180).max(180).nullable().default(null),
  published:z.boolean().default(false),
}).strict().refine(data=>(data.lat===null)===(data.lng===null),'Confira as coordenadas.');
const editable=['name','category','address','contact','hours','description','products'] as const;
export async function GET() {
  try {
    const user=await getTestUser();
    if(!user||!['coordination','company-admin','owner'].includes(user.role))return json({error:'Acesso restrito à equipe.'},403);
    await ready();
    const companies=await Promise.all((await list('companies')).filter(row=>!row.data.deleted).map(async row=>{const account=row.data.account_username_key?await read('users',row.data.account_username_key):null;return {id:row.id,revision:row.revision,...Object.fromEntries(editable.map(field=>[field,row.data.company[field]||''])),published:row.data.company.published,informal:row.data.registration_source==='school-informal',account:account?{username:account.data.username,active:account.data.active,revision:account.revision}:null};}));
    return json({name:user.displayName,role:user.role,companies});
  } catch(error) {return failed(error,'Não foi possível carregar a consulta.');}
}
export async function POST(req:Request) {
  try {
    if(!sameOrigin(req))return json({error:'Origem não autorizada.'},403);
    const user=await getTestUser();
    if(!user||!['coordination','company-admin','owner'].includes(user.role))return json({error:'Cadastro restrito à equipe.'},403);
    const body=await readJsonBody(req,12000);
    await ready();
    if(body.action==='release-account')return await releaseSchoolAccount(body,user.userId);
    const parsed=informalSchema.safeParse(body);
    if(!parsed.success)return json({error:'Confira o nome, o responsável, a atividade e os demais campos.'},400);
    await ready();
    const all=await list('companies');
    if(all.filter(row=>row.data.registered_by===user.userId&&!row.data.deleted).length>=200)return json({error:'Limite de cadastros deste teste atingido.'},400);
    const id=crypto.randomUUID(),now=Date.now();
    const company=companySchema.parse({...parsed.data,listingType:'autonomous',slogan:'',services:[],logo:null,facade:null,gallery:[],privateNote:''});
    const revision=await write('companies',id,{owner:user.userId,registered_by:user.userId,registration_source:'school-informal',company,configured:true,created_at:now,updated_at:now},null);
    return json({ok:true,id,revision},201);
  } catch(error) {return failed(error,'Não foi possível cadastrar. Os dados foram preservados.');}
}
export async function PATCH(req:Request) {
  try {
    if(!sameOrigin(req))return json({error:'Origem não autorizada.'},403);
    const user=await getTestUser();
    if(!user||!['coordination','company-admin','owner'].includes(user.role))return json({error:'Acesso restrito à equipe.'},403);
    const body=await readJsonBody(req,12000);
    if(!uuid(body.id)||!body.data||typeof body.data!=='object'||Array.isArray(body.data)||Object.keys(body.data).some(field=>!(editable as readonly string[]).includes(field)))return json({error:'Somente os dados básicos podem ser alterados.'},400);
    await ready();const row=await read('companies',body.id);
    if(!row||row.data.deleted)return json({error:'Cadastro não encontrado.'},404);
    if(row.revision!==body.revision)throw new Conflict('O cadastro mudou. Atualize a lista antes de editar.');
    const parsed=companySchema.safeParse({...row.data.company,...body.data});
    if(!parsed.success)return json({error:'Confira os dados e os limites de texto.'},400);
    const revision=await write('companies',body.id,{...row.data,company:parsed.data,updated_at:Date.now(),updated_by:user.userId},row.revision);
    return json({ok:true,revision});
  } catch(error) {return failed(error,'Não foi possível salvar as alterações.');}
}
