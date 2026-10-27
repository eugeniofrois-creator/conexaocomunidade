/* Operações de empresa em arquivos JSON, usando um GithubJsonStore. */
export class EmpresaRepositorio {
 constructor(store){this.store=store;}
 path(id){if(!/^[A-Za-z0-9_-]{1,80}$/.test(id))throw Error('Identificador de empresa inválido');return `dados/empresas/${id}`;}
 async consultar(id){return this.store.read(`${this.path(id)}/cadastro.json`);}
 async salvar(id,empresa,revision=null){
  if(!empresa || typeof empresa.nome!=='string' || !empresa.nome.trim())throw Error('Informe o nome da empresa');
  return this.store.write(`${this.path(id)}/cadastro.json`,empresa,revision);
 }
 async removerCadastro(id,revision){return this.store.remove(`${this.path(id)}/cadastro.json`,revision);}
 fotoPath(id,foto){if(!/^[A-Za-z0-9_-]{1,80}$/.test(foto))throw Error('Identificador de imagem inválido');return `${this.path(id)}/imagens/${foto}.json`;}
 async consultarFoto(id,foto){return this.store.read(this.fotoPath(id,foto));}
 async salvarFoto(id,foto,{mime,base64},revision=null){
  if(!['image/jpeg','image/png','image/webp'].includes(mime) || typeof base64!=='string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length>600000)throw Error('Imagem inválida ou muito grande');
  return this.store.write(this.fotoPath(id,foto),{mime,base64},revision);
 }
 async removerFoto(id,foto,revision){return this.store.remove(this.fotoPath(id,foto),revision);}
 async adicionarFoto(id,foto,imagem,cadastroRevision){
  const cadastro=await this.consultar(id);
  if(!cadastro || cadastro.revision!==cadastroRevision)throw Error('O cadastro mudou. Atualize antes de incluir a imagem.');
  const fotos=Array.isArray(cadastro.data.fotos)?cadastro.data.fotos:[];
  if(fotos.length>=10)throw Error('Cada empresa pode ter até 10 fotos.');
  if(fotos.includes(foto))throw Error('Essa imagem já está vinculada à empresa.');
  const arquivo=await this.salvarFoto(id,foto,imagem);
  try {
   const updated=await this.salvar(id,{...cadastro.data,fotos:[...fotos,foto]},cadastroRevision);
   return {cadastroRevision:updated.revision,fotoRevision:arquivo.revision};
  } catch(e) {
   try {await this.removerFoto(id,foto,arquivo.revision);} catch (_) {}
   throw e;
  }
 }
 async removerFotoVinculada(id,foto,cadastroRevision){
  const cadastro=await this.consultar(id);
  if(!cadastro || cadastro.revision!==cadastroRevision)throw Error('O cadastro mudou. Atualize antes de remover a imagem.');
  const fotos=Array.isArray(cadastro.data.fotos)?cadastro.data.fotos:[];
  if(!fotos.includes(foto))throw Error('Imagem não vinculada a esta empresa.');
  const arquivo=await this.consultarFoto(id,foto);
  const updated=await this.salvar(id,{...cadastro.data,fotos:fotos.filter(x=>x!==foto)},cadastroRevision);
  if(arquivo)try {await this.removerFoto(id,foto,arquivo.revision);} catch (_) {return {cadastroRevision:updated.revision,limpezaPendente:true};}
  return {cadastroRevision:updated.revision,limpezaPendente:false};
 }
}
