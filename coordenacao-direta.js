/* Recursos da coordenação; a integração pública continua sendo demonstrativa. */
export class CoordenacaoDireta {
 constructor(store,empresas,contas){Object.assign(this,{store,empresas,contas});}
 autorizar(user){if(!user||!['coordination','owner','company-admin'].includes(user.role))throw Error('Área exclusiva da coordenação.');}
 async listar(user){
  this.autorizar(user);
  const companies=await this.empresas.lista({...user,role:'owner'});
  return {name:user.name,companies:await Promise.all(companies.map(async c=>{
   let account=c.account||null;
   if(c.informal&&account?.username){const row=await this.store.read(await this.contas.path(account.username));account=row?{username:row.data.usuario,active:row.data.ativo!==false,revision:row.revision}:null;}
   const company={...c};if(user.role==='coordination')delete company.privateNote;
   return {...company,informal:!!c.informal,account};
  }))};
 }
 async cadastrar(user,data){
  this.autorizar(user);
  if(!String(data.name||'').trim()||!String(data.category||'').trim())throw Error('Informe o nome e a atividade.');
  const id=crypto.randomUUID();
  const company={...data,id:undefined,logo:null,facade:null,gallery:[],services:[],published:!!data.published,listingType:'business',informal:true};
  const saved=await this.store.write(this.empresas.path(id),{id,owner:user.id,company,configured:true,deleted:false,created_at:new Date().toISOString(),updated_at:new Date().toISOString()});
  return {id,revision:saved.revision};
 }
 async editar(user,{id,revision,data}){
  this.autorizar(user);const row=await this.empresas.row(id);
  if(!row||row.data.deleted||row.revision!==revision)throw Error('O cadastro mudou. Atualize a página.');
  const fields=['name','category','address','contact','hours','description','products'];
  const changes=Object.fromEntries(fields.filter(k=>typeof data?.[k]==='string').map(k=>[k,data[k].trim()]));
  if(!changes.name)throw Error('Informe o nome.');
  const saved=await this.store.write(this.empresas.path(id),{...row.data,company:{...row.data.company,...changes},updated_at:new Date().toISOString()},revision);
  return {ok:true,revision:saved.revision};
 }
 async liberar(user,{id,revision,username,password,accountRevision}){
  this.autorizar(user);const row=await this.empresas.row(id);
  if(!row||row.data.deleted||row.revision!==revision||!row.data.company.informal)throw Error('O cadastro mudou. Atualize a página.');
  let account;
  const linked=row.data.company.account?.username;
  if(linked){
   const path=await this.contas.path(linked),existing=await this.store.read(path);
   if(!existing||existing.data.id!==row.data.owner||existing.data.perfil!=='empresa'||(accountRevision&&existing.revision!==accountRevision))throw Error('A conta mudou. Atualize a lista.');
   if(existing.data.ativo===false)await this.store.write(path,{...existing.data,ativo:true,updated_at:new Date().toISOString()},existing.revision);
   account={id:existing.data.id,usuario:existing.data.usuario};
  }else{
   if(typeof password!=='string'||password.length<15)throw Error('Use uma senha de pelo menos 15 caracteres.');
   await this.contas.cadastrar({usuario:username,nome:row.data.company.name,senha:password});
   account=await this.contas.autenticar(username,password);
   if(!account)throw Error('Não foi possível criar a conta.');
  }
  const company={...row.data.company,account:{username:account.usuario,active:true}};
  const saved=await this.store.write(this.empresas.path(id),{...row.data,owner:account.id,company,updated_at:new Date().toISOString()},revision);
  return {ok:true,revision:saved.revision};
 }
}
