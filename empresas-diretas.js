/* Cadastro em JSON por empresa; os papéis são demonstrativos no navegador. */
export class EmpresasDiretas {
 constructor(store){this.store=store;}
 path(id){if(!/^[a-f0-9-]{36}$/i.test(id))throw Error('Identificador inválido.');return `dados/empresas/${id}/cadastro.json`;}
 can(user,row){return user&&(['owner','company-admin'].includes(user.role)||(user.role==='company'&&row.owner===user.id));}
 async row(id){return this.store.read(this.path(id));}
 async lista(user){
  const url=`https://api.github.com/repos/${encodeURIComponent(this.store.owner)}/${encodeURIComponent(this.store.repo)}/contents/dados/empresas?ref=${encodeURIComponent(this.store.branch)}`;
  const res=await this.store.request(url,{headers:this.store.headers(),cache:'no-store'});if(res.status===404)return [];if(!res.ok)throw Error(`Falha ao listar empresas (${res.status}).`);
  const entries=await res.json();if(!Array.isArray(entries))throw Error('Lista de empresas inválida.');
  const rows=await Promise.all(entries.filter(e=>e.type==='dir'&&/^[a-f0-9-]{36}$/i.test(e.name)).map(async e=>{const r=await this.row(e.name);return r?{...r.data,revision:r.revision}:null;}));
  return rows.filter(r=>r&&!r.deleted&&(r.company.published||this.can(user,r))).map(r=>({...r.company,id:r.id,revision:r.revision,configured:r.configured,mine:this.can(user,r),sourceType:'company',created_at:r.created_at||null,updated_at:r.updated_at||null}));
 }
 async criar(user){if(!user||user.role!=='company')throw Error('Entre em uma conta de empresa.');const id=crypto.randomUUID();const company={name:'Nova empresa',slogan:'',category:'',products:'',description:'',address:'',hours:'',contact:'',lat:null,lng:null,logo:null,facade:null,gallery:[],services:[],published:false};const row={id,owner:user.id,company,configured:false,deleted:false,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};const saved=await this.store.write(this.path(id),row);return {id,revision:saved.revision};}
 async salvar(user,{id,revision,data}){const row=await this.row(id);if(!row||!this.can(user,row.data))throw Error('Sem permissão para editar.');if(row.revision!==revision)throw Error('O cadastro foi alterado. Atualize a página.');if(!String(data?.name||'').trim())throw Error('Informe o nome da empresa.');const saved=await this.store.write(this.path(id),{...row.data,company:data,configured:true,updated_at:new Date().toISOString()},row.revision);return {ok:true,revision:saved.revision};}
 async excluir(user,{id,revision}){const row=await this.row(id);if(!row||!this.can(user,row.data))throw Error('Sem permissão para excluir.');if(row.revision!==revision)throw Error('O cadastro foi alterado. Atualize a página.');await this.store.write(this.path(id),{...row.data,deleted:true,updated_at:new Date().toISOString()},revision);return {ok:true};}
}
