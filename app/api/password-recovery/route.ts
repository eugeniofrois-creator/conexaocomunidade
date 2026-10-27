import {json,sameOrigin} from '@/lib/community';
import {readJsonBody} from '@/lib/request-body';
import {read,write,ready,failed} from '@/lib/json-store';
import {digest,usernameKey,consumeAttempt} from '@/lib/local-auth';
import {validPassword,passwordHash} from '@/lib/passwords';
import {encode64} from '@/lib/vault';
import {validEmail,normalizeEmail,emailRecoveryReady,sendResetEmail} from '@/lib/recovery-email';
const generic='Se o usuário e o e-mail corresponderem a uma conta ativa, você receberá um link para criar uma nova senha. Confira também a caixa de spam.';
export async function GET(){return json({available:emailRecoveryReady()});}
export async function POST(req:Request){try{
 if(!sameOrigin(req))return json({error:'Origem não autorizada.'},403);
 const b:any=await readJsonBody(req,2500);await ready();const ip=req.headers.get('cf-connecting-ip')||'unknown';
 if(!await consumeAttempt(await digest('recovery:'+ip),5))return json({error:'Muitas tentativas. Aguarde 15 minutos.'},429);
 if(b.action==='reset'){
  if(typeof b.token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(b.token)||!validPassword(b.password))return json({error:'Link inválido ou senha fora do limite de 15 a 128 caracteres.'},400);
  const id=await digest(b.token),token=await read('password-resets',id);if(!token||token.data.used||token.data.expires_at<Date.now())return json({error:'Este link expirou ou já foi usado. Solicite outro.'},400);
  const account=await read('users',token.data.usernameKey);if(!account||!account.data.active||account.data.authVersion!==token.data.authVersion||await digest(account.data.email||'')!==token.data.emailHash)return json({error:'Este link não é mais válido. Solicite outro.'},400);
  const password=await passwordHash(b.password);await write('password-resets',id,{...token.data,used:true},token.revision);await write('users',token.data.usernameKey,{...account.data,password,authVersion:account.data.authVersion+1},account.revision);
  return json({ok:true,message:'Senha redefinida. Entre com a nova senha. As sessões anteriores foram encerradas.'});
 }
 if(b.action!=='request'||typeof b.username!=='string'||b.username.length>40||!validEmail(b.email))return json({error:'Informe o usuário e o e-mail cadastrado na conta.'},400);
 if(!emailRecoveryReady())return json({error:'O envio de e-mail ainda não está configurado neste projeto. Procure o responsável para recuperar o acesso.'},503);
 const k=await usernameKey(b.username);if(!await consumeAttempt(await digest('recovery-user:'+k),3))return json({ok:true,message:generic});
 const account=await read('users',k);if(!account||!account.data.active||normalizeEmail(account.data.email||'')!==normalizeEmail(b.email))return json({ok:true,message:generic});
 const token=encode64(crypto.getRandomValues(new Uint8Array(32))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');const id=await digest(token);const data={usernameKey:k,authVersion:account.data.authVersion,emailHash:await digest(account.data.email),expires_at:Date.now()+15*60000,used:false};await write('password-resets',id,data,null);
 try{await sendResetEmail(account.data.email,new URL('/redefinir.html',req.url).origin+'/redefinir.html#token='+token);}catch{const row=await read('password-resets',id);if(row)await write('password-resets',id,{...row.data,used:true},row.revision);console.error('Password recovery email delivery failed');}
 return json({ok:true,message:generic});
 }catch(e){return failed(e,'Não foi possível concluir a recuperação. Tente novamente.');}}
