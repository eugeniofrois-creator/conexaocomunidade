/* Relatos em JSON individuais no repositório de demonstração. */
export class RelatosRepositorio {
 constructor(store){this.store=store;}
 path(id){if(!/^[a-f0-9-]{36}$/i.test(id))throw Error('Identificador inválido.');return `dados/relatos/${id}.json`;}
 async criar(body){
  if(!String(body.title||'').trim()||!String(body.description||'').trim())throw Error('Informe o título e a descrição.');
  const id=crypto.randomUUID();const row={id,anonymous:!!body.anonymous,name:body.anonymous?'':String(body.name||''),contact:body.anonymous?'':String(body.contact||''),title:String(body.title).trim(),address:String(body.address||''),description:String(body.description).trim(),location:body.location||null,images:Array.isArray(body.images)?body.images:[],status:'Pendente',created_at:new Date().toISOString(),read_at:null};
  await this.store.write(this.path(id),row);return {id};
 }
 async listar(){
  const prefix=`https://api.github.com/repos/${encodeURIComponent(this.store.owner)}/${encodeURIComponent(this.store.repo)}/contents/dados/relatos?ref=${encodeURIComponent(this.store.branch)}`;
  const response=await this.store.request(prefix,{headers:this.store.headers(),cache:'no-store'});if(response.status===404)return {reports:[],unread:0,readOnly:false};if(!response.ok)throw Error(`Falha ao consultar relatos (${response.status}).`);
  const entries=await response.json();if(!Array.isArray(entries))throw Error('Lista de relatos inválida.');
  const reports=(await Promise.all(entries.filter(e=>e.type==='file'&&/^[a-f0-9-]{36}\.json$/i.test(e.name)).map(async e=>{const r=await this.store.read(`dados/relatos/${e.name}`);return r?{...r.data,revision:r.revision}:null;}))).filter(Boolean).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
  return {reports,unread:reports.filter(r=>!r.read_at).length,readOnly:false};
 }
 async atualizar({id,revision,status}){if(!['Lido','Aprovado','Em acompanhamento','Resolvido','Rejeitado'].includes(status))throw Error('Situação inválida.');const path=this.path(id),row=await this.store.read(path);if(!row||row.revision!==revision)throw Error('O relato foi alterado. Atualize a lista.');const result=await this.store.write(path,{...row.data,status,updated_at:new Date().toISOString(),read_at:row.data.read_at||new Date().toISOString()},row.revision);return {ok:true,revision:result.revision};}
}
