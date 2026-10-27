/* Sessão local da demonstração em GitHub Pages. */
export class AuthIndividual {
 constructor(contas, sessionStorage, localStorage) {this.contas=contas;this.sessionStorage=sessionStorage;this.localStorage=localStorage;this.key='conexao-individual-sessao-v1';}
 current(){try{const item=JSON.parse(this.sessionStorage.getItem(this.key)||this.localStorage.getItem(this.key)||'null');if(item?.expires&&item.expires<Date.now()){this.clear();return null;}return item;}catch{return null;}}
 clear(){this.sessionStorage.removeItem(this.key);this.localStorage.removeItem(this.key);}
 async handle(method,body={}){
  if(method==='GET')return {user:this.current(),recoveryAvailable:false};
  if(method!=='POST')throw Error('Operação indisponível.');
  if(body.action==='logout'){this.clear();return {ok:true};}
  if(body.action==='password'||body.action==='recovery-email'){const user=this.current();if(!user)throw Error('Entre na sua conta.');if(body.action==='password'){await this.contas.alterarSenha(user.username,body.currentPassword,body.password);this.clear();}else await this.contas.alterarEmail(user.username,body.currentPassword,body.email);return {ok:true};}
  if(body.action==='register-company'){
   if(typeof body.password!=='string'||body.password.length<15)throw Error('A senha deve ter ao menos 15 caracteres.');
   await this.contas.cadastrar({usuario:body.username,nome:body.name,senha:body.password,email:body.email});
  } else if(body.action)throw Error('Esta operação ainda não está disponível.');
  const conta=await this.contas.autenticar(body.username,body.password);
  if(!conta)throw Error('Usuário ou senha inválidos.');
  const remember=body.remember===true||body.remember==='on'||body.remember==='true';
  const user={name:conta.nome,username:conta.usuario,email:conta.email,role:conta.perfil==='empresa'?'company':conta.perfil,auth:'local',id:conta.id,...(remember?{expires:Date.now()+30*86400000}:{})};
  this.clear();(remember?this.localStorage:this.sessionStorage).setItem(this.key,JSON.stringify(user));
  return {ok:true,name:user.name,role:user.role};
 }
}
