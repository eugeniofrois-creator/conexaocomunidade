import {read,write,list,uuid,Conflict} from '@/lib/json-store';
import {json} from '@/lib/community';
import {usernameKey,normalizeUsername} from '@/lib/local-auth';
import {passwordHash,passwordMatches,validPassword} from '@/lib/passwords';
import {reservedAdminUsername} from '@/lib/test-admin-bootstrap';

export async function releaseSchoolAccount(body:any,actor:string) {
  if(!uuid(body.id))return json({error:'Cadastro inválido.'},400);
  const row=await read('companies',body.id);
  if(!row||row.data.deleted||row.data.registration_source!=='school-informal')return json({error:'A liberação é restrita aos cadastros informais da escola.'},403);
  if(row.revision!==body.revision)throw new Conflict('O cadastro mudou. Atualize a lista.');
  if(row.data.account_username_key) {
    const account=await read('users',row.data.account_username_key);
    if(!account||account.data.role!=='company'||account.data.registration_source!=='school-informal'||account.data.linked_company_id!==body.id)return json({error:'Vínculo de conta inválido. Procure o ADM.'},403);
    if(account.revision!==body.accountRevision)throw new Conflict('A conta mudou. Atualize a lista.');
    if(!account.data.active)await write('users',row.data.account_username_key,{...account.data,active:true,authVersion:account.data.authVersion+1,released_by:actor,released_at:Date.now()},account.revision);
    return json({ok:true,username:account.data.username});
  }
  if(typeof body.username!=='string'||!/^[A-Za-z0-9_.-]{3,40}$/.test(body.username)||!validPassword(body.password))return json({error:'Use usuário de 3 a 40 caracteres e senha inicial de 15 a 128 caracteres.'},400);
  const username=normalizeUsername(body.username);
  if(reservedAdminUsername(username))return json({error:'Este nome de usuário está reservado.'},409);
  const key=await usernameKey(username);let user=await read('users',key);
  // Permite retomar uma criação interrompida, sem assumir contas de outra origem.
  if(user&&(user.data.active||user.data.role!=='company'||user.data.registration_source!=='school-informal'||user.data.linked_company_id!==body.id||!await passwordMatches(body.password,user.data.password)))return json({error:'Esse usuário já está em uso.'},409);
  if(!user) {
    if((await list('users')).length>=50)return json({error:'Limite de contas deste teste atingido.'},400);
    await write('users',key,{id:crypto.randomUUID(),username,name:row.data.company.provider||row.data.company.name,email:'',role:'company',active:false,password:await passwordHash(body.password),authVersion:1,registration_source:'school-informal',linked_company_id:body.id,created_at:Date.now(),created_by:actor},null);
    user=await read('users',key);
  }
  if(!user)throw Error('Account unavailable');
  await write('companies',body.id,{...row.data,owner:user.data.id,account_username_key:key,updated_at:Date.now()},row.revision);
  await write('users',key,{...user.data,active:true,released_by:actor,released_at:Date.now()},user.revision);
  return json({ok:true,username},201);
}
