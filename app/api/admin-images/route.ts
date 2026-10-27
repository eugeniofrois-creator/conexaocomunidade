import {getTestUser} from '@/lib/test-auth';
import {imageAdmin,aboutSlots} from '@/lib/image-moderation';
import {list,ready,failed} from '@/lib/json-store';
import {json} from '@/lib/community';
export async function GET(){try{const u=await getTestUser();if(!u||!imageAdmin(u))return json({error:'Área exclusiva da administração.'},403);await ready();const assets=await list('company-images');const companies=(await list('companies')).filter(c=>!c.data.deleted).map(c=>({id:c.id,name:c.data.company.name,revision:c.revision,configured:c.data.configured,images:assets.filter(a=>a.data.company_id===c.id&&[c.data.company.logo,c.data.company.facade,...(c.data.company.gallery||[])].includes(a.id)).map(a=>({id:a.id,revision:a.revision,approval:a.data.approval||'pending',kind:c.data.company.logo===a.id?'logo':c.data.company.facade===a.id?'facade':'gallery'}))}));return json({companies,aboutSlots});}catch(e){return failed(e,'Não foi possível carregar as imagens.');}}
