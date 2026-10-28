/* Fotografias editáveis do Sobre, em JSON por espaço. */
export class SobreDireto {
 constructor(store){this.store=store;this.slots=['student-1','student-2','student-3','teacher-1','teacher-2','teacher-3','teacher-4','developer-1','developer-2','manager','coordination','team','institution'];this.defaults={'institution':'fmp-logo.png','teacher-4':'gabriela-da-silva-loh.jpeg','coordination':'daniela-amorim.jpeg','student-1':'natanael-vieira-sousa.jpeg','student-2':'vitor-hugo-pereira.jpeg','student-3':'caue-vinicius-teixeira-da-silva.jpeg','teacher-1':'diego-paulo-garcia.jpeg','teacher-2':'silvania-matos-de-lima.jpeg','teacher-3':'willian-de-franca.jpeg','developer-1':'eugenio-carlos-damasio-frois.png','developer-2':'joao-paulo-broering.jpeg','manager':'leandro-pickler.jpeg'};}
 path(slot){if(!this.slots.includes(slot))throw Error('Espaço inválido.');return `dados/sobre/${slot}.json`;}
 check(user){if(!user||!['owner','company-admin'].includes(user.role))throw Error('Área exclusiva da administração.');}
 async listar(){
  const url=`https://api.github.com/repos/${encodeURIComponent(this.store.owner)}/${encodeURIComponent(this.store.repo)}/contents/dados/sobre?ref=${encodeURIComponent(this.store.branch)}`;
  const response=await this.store.request(url,{headers:this.store.headers(),cache:'no-store'});
  let entries=[];
  if(response.status!==404){if(!response.ok)throw Error('Não foi possível consultar as fotos do projeto.');entries=await response.json();if(!Array.isArray(entries))throw Error('Lista de fotos inválida.');}
  const existing=new Set(entries.filter(e=>e.type==='file').map(e=>e.name.replace(/\.json$/,'')));
  const slots=await Promise.all(this.slots.map(async slot=>{
   const row=existing.has(slot)?await this.store.read(this.path(slot)):null;
   if(row)return {slot,image:row.data.image?slot:null,revision:row.revision};
   const file=this.defaults[slot];return {slot,image:null,revision:'',...(file?{defaultSrc:'/conexaocomunidade/brand/'+file}:{})};
  }));
  return {slots};
 }
 async obter(slot){const row=await this.store.read(this.path(slot));if(!row?.data.image)throw Error('Imagem não encontrada.');return row.data.image;}
 async salvar(user,form){this.check(user);const slot=String(form.get('slot')||''),revision=String(form.get('revision')||''),file=form.get('image');const row=await this.store.read(this.path(slot));if((row?.revision||'')!==revision)throw Error('Foto alterada. Atualize a página.');if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>400000)throw Error('Use JPG, PNG ou WebP de até 400 KB.');const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));const saved=await this.store.write(this.path(slot),{image:{mime:file.type,base64:btoa(binary)}},row?.revision||null);return {ok:true,image:slot,revision:saved.revision};}
 async remover(user,{slot,revision}){this.check(user);const row=await this.store.read(this.path(slot));if((row?.revision||'')!==revision)throw Error('Foto alterada. Atualize a página.');await this.store.write(this.path(slot),{image:null},row?.revision||null);return {ok:true};}
}
