/* Camada de sessão para a integração individual em desenvolvimento. */
export class AuthIndividual {
 constructor(contas, sessionStorage, localStorage) {this.contas=contas;this.sessionStorage=sessionStorage;this.localStorage=localStorage;this.key='conexao-individual-sessao-v1';}
 current(){try{return JSON.parse(this.sessionStorage.getItem(this.key)||this.localStorage.getItem(this.key)||'null');}catch{return null;}}
 clear(){this.sessionStorage.removeItem(this.key);this.localStorage.removeItem(this.key);}
 async handle(method,body={}){
  if(method==='GET')return {user:this.current(),recoveryAvailable:false};
  if(method!=='POST')throw Error('Operação indisponível.');
  if(body.action==='logout'){this.clear();return {ok:true};}
  if(body.action==='register-company'){
   if(typeof body.password!=='string'||body.password.length<15)throw Error('A senha deve ter ao menos 15 caracteres.');
   await this.contas.cadastrar({usuario:body.username,nome:body.name,senha:body.password,email:body.email});
  } else if(body.action)throw Error('Esta operação ainda não está disponível.');
  let conta=await this.contas.autenticar(body.username,body.password);
  if(!conta)throw Error('Usuário ou senha inválidos.');
  const user={name:conta.nome,role:conta.perfil==='empresa'?'company':conta.perfil,auth:'local',id:conta.id};
  this.clear();(body.remember===true||body.remember==='on'?this.localStorage:this.sessionStorage).setItem(this.key,JSON.stringify(user));
  return {ok:true,name:user.name,role:user.role};
 }
}
