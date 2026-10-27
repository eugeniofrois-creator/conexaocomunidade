/* Contas em JSON cifrado para a demonstração; permissões no navegador não isolam o repositório. */
export class ContasRepositorio {
 constructor(store){this.store=store;}
 async path(usuario){
  const u=String(usuario||'').trim().toLowerCase();
  if(!/^[a-z0-9_.-]{3,40}$/.test(u))throw Error('Usuário inválido');
  const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('usuario:'+u)));
  return 'dados/contas/'+Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('')+'.json';
 }
 async derivar(senha,salt){const source=await crypto.subtle.importKey('raw',new TextEncoder().encode(senha),'PBKDF2',false,['deriveBits']);return new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:310000,hash:'SHA-256'},source,256));}
 static encode(b){return btoa(String.fromCharCode(...b));}
 static decode(s){return Uint8Array.from(atob(s),c=>c.charCodeAt(0));}
 async senhaRegistro(senha){const salt=crypto.getRandomValues(new Uint8Array(16));const hash=await this.derivar(senha,salt);return {algoritmo:'PBKDF2-SHA256',iteracoes:310000,salt:ContasRepositorio.encode(salt),hash:ContasRepositorio.encode(hash)};}
 async cadastrar({usuario,nome,senha,email='',perfil='empresa'}){
  const path=await this.path(usuario);
  if(typeof nome!=='string'||nome.trim().length<2||typeof senha!=='string'||senha.length<8)throw Error('Dados inválidos');
  if(await this.store.read(path))throw Error('Usuário já cadastrado');
  return this.store.write(path,{id:crypto.randomUUID(),usuario:usuario.trim().toLowerCase(),nome:nome.trim(),email:String(email).trim(),perfil,ativo:true,senha:await this.senhaRegistro(senha)},null);
 }
 async autenticar(usuario,senha){
  const row=await this.store.read(await this.path(usuario));
  if(!row||typeof senha!=='string'||row.data.ativo===false)return null;
  const dados=row.data?.senha;if(!dados||dados.algoritmo!=='PBKDF2-SHA256'||dados.iteracoes!==310000)return null;
  const calculado=await this.derivar(senha,ContasRepositorio.decode(dados.salt)),esperado=ContasRepositorio.decode(dados.hash);
  let diff=calculado.length^esperado.length;for(let i=0;i<calculado.length;i++)diff|=calculado[i]^(esperado[i]||0);
  if(diff)return null;
  return {id:row.data.id,usuario:row.data.usuario,nome:row.data.nome,email:row.data.email||'',perfil:row.data.perfil,revision:row.revision};
 }
 async alterarSenha(usuario,atual,nova){if(typeof nova!=='string'||nova.length<15)throw Error('A nova senha precisa ter ao menos 15 caracteres.');const conta=await this.autenticar(usuario,atual);if(!conta)throw Error('Senha atual incorreta.');const path=await this.path(usuario),row=await this.store.read(path);if(row.revision!==conta.revision)throw Error('A conta foi alterada. Tente novamente.');await this.store.write(path,{...row.data,senha:await this.senhaRegistro(nova)},row.revision);}
 async alterarEmail(usuario,senha,email){const conta=await this.autenticar(usuario,senha);if(!conta)throw Error('Senha atual incorreta.');const path=await this.path(usuario),row=await this.store.read(path);if(row.revision!==conta.revision)throw Error('A conta foi alterada. Tente novamente.');await this.store.write(path,{...row.data,email:String(email||'').trim()},row.revision);}
}
