import {imageAdmin} from '@/lib/image-moderation';
import {readImageForm,readJsonBody} from '@/lib/request-body';
import {getTestUser as getChatGPTUser} from '@/lib/test-auth';
import {sameOrigin,json} from '@/lib/community';
import {read,write,ready,uuid,failed,Conflict} from '@/lib/json-store';
import {putImage,imageType,imageResponse,deleteImage} from '@/lib/images';
const referenced=(c:any,id:string)=>c.logo===id||c.facade===id||(c.gallery||[]).includes(id);
const imageFields=(c:any)=>({logo:c.logo||null,facade:c.facade||null,gallery:c.gallery||[]});
async function owned(company:unknown,user:any,revision:unknown){if(user.role==='coordination')return null;if(!uuid(company))throw Error('Invalid company');await ready();const row=await read('companies',company);if(!row||row.data.deleted||(row.data.owner!==user.userId&&!imageAdmin(user)))return null;if(row.revision!==revision)throw new Conflict('A empresa mudou em outra aba. Reabra o cadastro antes de alterar as fotos.');return row;}
export async function POST(req:Request){let created:string|null=null;let committed=false;try{
 if(!sameOrigin(req))return json({error:'Origem não autorizada.'},403);const u=await getChatGPTUser();if(!u)return json({error:'Entre para enviar.'},401);
 const form=await readImageForm(req),company=form.get('company'),f=form.get('image'),kind=String(form.get('kind')||'gallery'),replace=form.get('replace');
 if(!uuid(company)||!(f instanceof File)||!f.size||f.size>5000000||!['logo','facade','gallery'].includes(String(kind)))return json({error:'Use JPG, PNG ou WebP de até 5 MB.'},400);
 const row=await owned(company,u,form.get('revision'));if(!row)return json({error:'Sem permissão para esta empresa.'},403);
 if(kind!=='logo'&&!(row.data.configured??row.data.company.name!=='Nova empresa'))return json({error:'Salve o cadastro básico antes de adicionar fotos.'},400);
 const c={...row.data.company,...imageFields(row.data.company),gallery:[...(row.data.company.gallery||[])]};
 if(replace&&(!uuid(replace)||!(kind==='gallery'?c.gallery.includes(replace):c[kind]===replace)))return json({error:'A imagem a substituir não pertence a este espaço.'},400);
 if(!replace&&kind==='gallery'&&c.gallery.length+(c.facade?1:0)>=10||!replace&&kind==='facade'&&!c.facade&&c.gallery.length>=10)return json({error:'Use no máximo 10 fotos por empresa, incluindo a fachada. A logo fica separada.'},400);
 const bytes=new Uint8Array(await f.arrayBuffer()),type=imageType(bytes);if(!type)return json({error:'Formato não permitido.'},400);
 const previous=kind==='gallery'?replace:c[kind];const id=crypto.randomUUID();created=id;await putImage('company-images',id,company,bytes,{company_id:company,type,approval:imageAdmin(u)?'approved':'pending',submitted_by:u.userId});
 if(kind==='gallery'){if(replace)c.gallery[c.gallery.indexOf(replace)]=id;else c.gallery.push(id);}else c[kind]=id;
 const revision=await write('companies',company,{...row.data,company:c,updated_at:Date.now()},row.revision);committed=true;
 if(previous&&!referenced(c,previous)){const old=await read('company-images',previous);if(old)await deleteImage('company-images',previous,old.data);}
 return json({id,revision,images:imageFields(c),approval:imageAdmin(u)?'approved':'pending'});
 }catch(e){if(created&&!committed){const asset=await read('company-images',created);if(asset)await deleteImage('company-images',created,asset.data);}return failed(e,'Não foi possível enviar a imagem.');}}
export async function DELETE(req:Request){try{
 if(!sameOrigin(req))return json({error:'Origem não autorizada.'},403);const u=await getChatGPTUser();if(!u)return json({error:'Entre para excluir.'},401);
 const b=await readJsonBody(req,4000);if(!uuid(b.company)||!uuid(b.id))return json({error:'Imagem inválida.'},400);const row=await owned(b.company,u,b.revision);if(!row)return json({error:'Sem permissão para esta empresa.'},403);
 const asset=await read('company-images',b.id);if(!asset||asset.data.company_id!==b.company)return json({error:'Imagem não encontrada nesta empresa.'},404);
 const c={...row.data.company,...imageFields(row.data.company)};if(c.logo===b.id)c.logo=null;if(c.facade===b.id)c.facade=null;c.gallery=c.gallery.filter((id:string)=>id!==b.id);
 const revision=await write('companies',b.company,{...row.data,company:c,updated_at:Date.now()},row.revision);await deleteImage('company-images',b.id,asset.data);return json({ok:true,revision,images:imageFields(c)});
 }catch(e){return failed(e,'Não foi possível excluir a imagem.');}}
export async function GET(req:Request){try{const u=await getChatGPTUser();const id=new URL(req.url).searchParams.get('id');if(!uuid(id))return json({error:'Imagem inválida.'},400);await ready();const asset=await read('company-images',id);if(!asset)return json({error:'Imagem não encontrada.'},404);const row=await read('companies',asset.data.company_id);if(!row||row.data.deleted)return json({error:'Imagem não encontrada.'},404);if(!imageAdmin(u)&&(!u||row.data.owner!==u?.userId)&&(asset.data.approval!=='approved'||!row.data.company.published||(row.data.company.logo!==id&&row.data.company.facade!==id&&!row.data.company.gallery.includes(id))))return json({error:'Imagem privada.'},403);return await imageResponse(id,asset.data)||json({error:'Imagem não encontrada.'},404);}catch(e){return failed(e,'Imagem indisponível.');}}

export async function PATCH(req:Request){try{if(!sameOrigin(req))return json({error:'Origem não autorizada.'},403);const u=await getChatGPTUser();if(!u||!imageAdmin(u))return json({error:'Área exclusiva da administração.'},403);const b=await readJsonBody(req,2000);if(!uuid(b.id)||!['approved','rejected'].includes(b.approval))return json({error:'Revise a decisão.'},400);await ready();const row=await read('company-images',b.id);if(!row)return json({error:'Imagem não encontrada.'},404);if(row.revision!==b.revision)throw new Conflict();const revision=await write('company-images',b.id,{...row.data,approval:b.approval,reviewed_by:u.userId,reviewed_at:Date.now()},row.revision);return json({ok:true,revision});}catch(e){return failed(e,'Não foi possível revisar a imagem.');}}
