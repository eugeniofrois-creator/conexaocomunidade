/* O catálogo é público; esta chave é pública e não protege dados privados. */
(() => {
 const viewerKey = "885e64f2-9fec-4974-9566-fc190436408523af1865-fed4-41a0-8710-94e241896394";
 const prefix = new URL('.', document.currentScript.src);
 const cache = new Map();
 let addressPromise;
 async function enrichAddresses(data) {
  if(!addressPromise)addressPromise=Promise.all([
   window.fetch(new URL('dados/publicos/enderecos-referencia.json',prefix),{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Referências indisponíveis');return r.json();}),
   import('./enderecos-publicos.js?v='+encodeURIComponent(window.CONEXAO_CONFIG?.version||'enderecos-20261028'))
  ]).catch(()=>null);
  const loaded=await addressPromise;if(!loaded)return data;
  const [book,module]=loaded;
  for(const field of ['companies','records'])if(Array.isArray(data[field]))data[field]=data[field].map(row=>module.completarEndereco(row,book));
  data.addressReferences={source:'OpenStreetMap contributors',approximate:true};
  return data;
 }
 const decode = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
 async function load(kind, id) {
  if (kind === 'image' && !/^[0-9a-f-]{36}$/i.test(id || '')) throw Error('Imagem inválida.');
  const path = kind === 'companies' ? 'dados/publicos/catalogo.json' : kind === 'image' ? `dados/publicos/imagens/${id}.json` : 'dados/publicos/mapa.json';
  if (!cache.has(path)) cache.set(path, (async () => {
   const response = await window.fetch(new URL(path,prefix));
   if (!response.ok) throw Error('Catálogo indisponível.');
   const e=await response.json();
   if(e.version!==1||e.algorithm!=='AES-256-GCM'||e.kdf!=='PBKDF2-SHA256'||e.iterations!==210000)throw Error('Formato de catálogo inválido.');
   const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(viewerKey),'PBKDF2',false,['deriveKey']);
   const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:decode(e.salt),iterations:210000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['decrypt']);
   const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(e.iv),additionalData:new TextEncoder().encode(path)},key,decode(e.body));
   const data=JSON.parse(new TextDecoder().decode(bytes));
   return kind==='companies'||kind==='community'?enrichAddresses(data):data;
  })().catch(e=>{cache.delete(path);throw e;}));
  return cache.get(path);
 }
 window.ConexaoDadosPublicos={load};
})();
/* Prévia de leitura direta; operações de conta serão conectadas em seguida. */
(() => {
 const original=window.fetch.bind(window);
 let privateConfig=window.CONEXAO_CONFIG,configurationPromise,apiTransport;
 async function configurationReady(){
  if(!configurationPromise)configurationPromise=(async()=>{
   if(privateConfig?.tokenEnvelope){
    const {unlockConfiguration}=await import('./token-config.js?v='+encodeURIComponent(privateConfig.version||''));
    privateConfig=await unlockConfiguration(privateConfig);
   }
   if(privateConfig?.token){
    const [{getSharedGithubRequest},{installGithubStatus}]=await Promise.all([import('./github-request.js?v='+encodeURIComponent(privateConfig.version||'')),import('./github-status.js?v='+encodeURIComponent(privateConfig.version||''))]);
    apiTransport=getSharedGithubRequest({...privateConfig,request:original});
    installGithubStatus(apiTransport);
   }
  })().catch(()=>{configurationPromise=null;throw Error('Não foi possível carregar a conexão com o repositório.');});
  return configurationPromise;
 }
 const moduleURL=path=>path+'?v='+encodeURIComponent(privateConfig?.version||'auditoria-20261028');
 async function compactPhoto(form){
  const file=form.get('image');if(!file||file.size<=400000)return form;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5000000)throw Error('Use JPG, PNG ou WebP de até 5 MB.');
  let bitmap;
  if(typeof createImageBitmap==='function')bitmap=await createImageBitmap(file);
  else{const url=URL.createObjectURL(file);try{bitmap=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Não foi possível abrir a imagem.'));img.src=url;});}finally{URL.revokeObjectURL(url);}}let width=bitmap.width,height=bitmap.height,ratio=Math.min(1,1400/Math.max(width,height));
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');let blob=null;
  for(let step=0;step<6;step++){canvas.width=Math.max(1,Math.round(width*ratio));canvas.height=Math.max(1,Math.round(height*ratio));ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',Math.max(.45,.82-step*.07)));if(blob&&blob.size<=400000)break;ratio*=.8;}
  bitmap.close?.();if(!blob||blob.size>400000)throw Error('Não foi possível reduzir a imagem. Escolha outra foto.');form.set('image',blob,'imagem.jpg');return form;
 }
 let authPromise, reportPromise, businessPromise, imagePromise, usersPromise, aboutPromise, coordinationPromise;
 async function getAbout(){if(!aboutPromise)aboutPromise=(async()=>{const [{GithubJsonStore},{SobreDireto}]=await Promise.all([import(moduleURL('./github-direct.js')),import(moduleURL('./sobre-direto.js'))]);return new SobreDireto(new GithubJsonStore({...privateConfig,request:original}));})().catch(e=>{aboutPromise=null;throw e;});return aboutPromise;}
 async function getCoordination(){if(!coordinationPromise)coordinationPromise=(async()=>{const [{GithubJsonStore},{ContasRepositorio},{CoordenacaoDireta},business]=await Promise.all([import(moduleURL('./github-direct.js')),import(moduleURL('./contas-repositorio.js')),import(moduleURL('./coordenacao-direta.js')),getBusinesses()]);const store=new GithubJsonStore({...privateConfig,request:original});return new CoordenacaoDireta(store,business,new ContasRepositorio(store));})().catch(e=>{coordinationPromise=null;throw e;});return coordinationPromise;}
 async function getUsers(){if(!usersPromise)usersPromise=(async()=>{const [{GithubJsonStore},{ContasRepositorio},{UsuariosDiretos}]=await Promise.all([import(moduleURL('./github-direct.js')),import(moduleURL('./contas-repositorio.js')),import(moduleURL('./usuarios-diretos.js'))]);const store=new GithubJsonStore({...privateConfig,request:original});return new UsuariosDiretos(store,new ContasRepositorio(store));})().catch(e=>{usersPromise=null;throw e;});return usersPromise;}
 async function getImages(){if(!imagePromise) imagePromise=(async()=>{const [{GithubJsonStore},{ImagensDiretas},companies]=await Promise.all([import(moduleURL("./github-direct.js")),import(moduleURL("./imagens-diretas.js")),getBusinesses()]);return new ImagensDiretas(new GithubJsonStore({...privateConfig,request:original}),companies);})().catch(e=>{imagePromise=null;throw e;});return imagePromise;}
 async function getBusinesses(){
  if(!businessPromise) businessPromise=(async()=>{const cfg=privateConfig;if(!cfg?.token||!cfg?.password)throw Error("Integração com o repositório ainda não configurada.");const [{GithubJsonStore},{EmpresasDiretas}]=await Promise.all([import(moduleURL("./github-direct.js")),import(moduleURL("./empresas-diretas.js"))]);return new EmpresasDiretas(new GithubJsonStore({...cfg,request:original}));})().catch(e=>{businessPromise=null;throw e;});return businessPromise;
 }
 async function getReports(){
  if(!reportPromise) reportPromise=(async()=>{const cfg=privateConfig;if(!cfg?.token||!cfg?.password)throw Error('Integração com o repositório ainda não configurada.');const [{GithubJsonStore},{RelatosRepositorio}]=await Promise.all([import(moduleURL('./github-direct.js')),import(moduleURL('./relatos-repositorio.js'))]);return new RelatosRepositorio(new GithubJsonStore({...cfg,request:original}));})().catch(e=>{reportPromise=null;throw e;});return reportPromise;
 }
 async function getAuth(){
  if(!authPromise) authPromise=(async()=>{
   const cfg=privateConfig;
   if(!cfg?.token || !cfg?.password) throw Error('Integração com o repositório ainda não configurada.');
   const [{GithubJsonStore},{ContasRepositorio},{AuthIndividual}]=await Promise.all([import(moduleURL('./github-direct.js')),import(moduleURL('./contas-repositorio.js')),import(moduleURL('./auth-individual.js'))]);
   const store=new GithubJsonStore({...cfg,request:original});
   return new AuthIndividual(new ContasRepositorio(store),window.sessionStorage,window.localStorage);
  })().catch(e=>{authPromise=null;throw e;});
  return authPromise;
 }
 window.fetch=async (input,options={})=>{
  const url=new URL(typeof input==='string'?input:input.url||input.href,location.href);
  if(url.origin!==location.origin||!url.pathname.startsWith('/api/'))return original(input,options);
  try{await configurationReady();}catch(e){return Response.json({error:e.message},{status:503});}
  const method=String(options.method||(input instanceof Request?input.method:'GET')).toUpperCase();
  const name=url.pathname.slice(5);
  if(name==='admin-integration'){
   try{
    const user=(await (await getAuth()).handle('GET',{}, {fresh:method!=='GET'})).user;
    if(!user||!['owner','company-admin'].includes(user.role))return Response.json({error:'Acesso exclusivo da administração.'},{status:403});
    if(method!=='GET')return Response.json({error:'Operação indisponível.'},{status:405});
    const cfg=privateConfig;
    const response=await apiTransport.request('https://api.github.com/repos/'+encodeURIComponent(cfg.owner)+'/'+encodeURIComponent(cfg.repo)+'/contents/dados?ref='+encodeURIComponent(cfg.branch||'main'),{headers:{Authorization:'Bearer '+cfg.token,Accept:'application/vnd.github+json'},cache:'no-store'});
    if(!response.ok)throw Error('A conexão não respondeu. Código '+response.status+'.');
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(cfg.token));
    const fingerprint=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('').slice(0,12);
    return Response.json({connected:true,tokenMasked:'********',fingerprint,repository:cfg.owner+'/'+cfg.repo,checkedAt:new Date().toISOString(),protection:'Token ofuscado no navegador; não equivale a segredo no servidor.'});
   }catch(e){return Response.json({error:e.message},{status:e.status||400});}
  }
  if(method==='GET' && (name==='companies'||name==='community')){
   let data;
   try {data=await window.ConexaoDadosPublicos.load(name);}
   catch {return Response.json({error:'Não foi possível carregar a versão pública do catálogo.'},{status:503});}
   try {
    let user=null,rows=[];
    if(privateConfig?.token){
     user=(await (await getAuth()).handle('GET')).user;
     rows=await (await getBusinesses()).lista(user);
     const images=await getImages();
     rows=await Promise.all(rows.map(async row=>{
      if(row.mine)return row;
      const visible=async id=>{if(!id)return null;const asset=await images.row(id);return asset?.data.approval==='approved'?id:null;};
      return {...row,logo:await visible(row.logo),facade:await visible(row.facade),gallery:(await Promise.all((row.gallery||[]).map(visible))).filter(Boolean)};
     }));
    }
    const existing=new Set(rows.map(row=>row.id));
    const field=name==='companies'?'companies':'records';
    const snapshot=data[field].filter(row=>!existing.has(String(row.id).replace(/^company-/,'')));
    // Preserve the exclusion of legacy records already migrated to live storage.
    const migrated=['a1c31e73-c92a-4c5d-8ce4-fec4ec331635','37053464-505c-4574-a408-9132b1d2135b'];
    const published=snapshot.filter(row=>!migrated.includes(String(row.id).replace(/^company-/,'')));
    const live=name==='companies'?rows:rows.filter(row=>row.published).map(row=>({...row,title:row.name,kind:'service',created_at:0,status:'Publicado',photo:row.facade||null}));
    return Response.json({...data,user,[field]:[...published,...live],sync:{stale:false},accountVerified:true});
   } catch {
    // Failures in the live overlay must not discard the already published public data.
    const field=name==='companies'?'companies':'records';
    const rows=data[field].filter(row=>row.published!==false).map(row=>{
     const publicRow={...row};
     for(const field of ["privateNote","owner","userId","account","revision"])delete publicRow[field];
     return {...publicRow,mine:false};
    });
    const retryAt=apiTransport?.status().blockedUntil||0;
    return Response.json({...data,user:null,[field]:rows,accountVerified:false,sync:{stale:true,retryAt,message:'Exibindo a versão pública publicada. Não foi possível consultar alterações recentes. '+(retryAt?'Nova tentativa após '+new Date(retryAt).toLocaleTimeString('pt-BR')+'.':'Confira a conexão e tente novamente.')}});
   }
  }
  if(name==='companies'&&method!=='GET'){try{const user=(await (await getAuth()).handle('GET',{}, {fresh:method!=='GET'})).user;if(!user)return Response.json({error:'Entre na conta para continuar.'},{status:401});const b=JSON.parse(options.body||'{}'),companies=await getBusinesses();if(method==='POST')return Response.json(b.action==='create'?await companies.criar(user):await companies.salvar(user,b));if(method==='DELETE')return Response.json(await companies.excluir(user,b));throw Error('Operação indisponível.');}catch(e){return Response.json({error:e.message},{status:e.status||400});}}
  if(name==='company-image'&&method!=='GET'){try{const user=(await (await getAuth()).handle('GET',{}, {fresh:method!=='GET'})).user,images=await getImages();if(method==='POST')return Response.json(await images.enviar(user,await compactPhoto(options.body)));const b=JSON.parse(options.body||'{}');if(method==='DELETE')return Response.json(await images.excluir(user,b));if(method==='PATCH')return Response.json(await images.moderar(user,b));throw Error('Operação indisponível.');}catch(e){return Response.json({error:e.message},{status:e.status||400});}}
  if(method==='GET'&&name==='company-image'){
   try {let image;const id=url.searchParams.get('id');if(privateConfig?.token){const item=await (await getImages()).row(id);if(item){const user=(await (await getAuth()).handle('GET',{}, {fresh:method!=='GET'})).user;const company=await (await getBusinesses()).row(item.data.company);if(item.data.approval!=='approved'&&!(company&&(await getBusinesses()).can(user,company.data)))return Response.json({error:'Imagem indisponível.'},{status:404});image=item.data;}}if(!image)image=await window.ConexaoDadosPublicos.load('image',id);const bytes=Uint8Array.from(atob(image.base64),c=>c.charCodeAt(0));return new Response(bytes,{headers:{'Content-Type':image.mime}});}
   catch{return Response.json({error:'Imagem indisponível.'},{status:404});}
  }
  if(name==='auth'){
   try{const auth=await getAuth();const body=options.body?JSON.parse(options.body):{};return Response.json(await auth.handle(method,body,{fresh:method!=='GET'}));}
   catch(e){return Response.json({error:e.message||'Não foi possível acessar a conta.'},{status:e.status||400});}
  }
  if(name==='password-recovery'){
   if(method==='GET')return Response.json({available:false});
   return Response.json({message:'O envio automático por e-mail ainda não está configurado. Solicite a redefinição da senha à administração do projeto.'});
  }
  if(name==='admin-activity'&&method==='GET'){
   try{
    const user=(await (await getAuth()).handle('GET',{}, {fresh:method!=='GET'})).user;
    if(!user||!['owner','company-admin'].includes(user.role))return Response.json({error:'Área exclusiva da administração.'},{status:403});
    const [companies,accounts,inbox]=await Promise.all([(await getBusinesses()).lista(user),(await getUsers()).listar(user),(await getReports()).listar()]);
    const events=[
     ...companies.map(c=>({type:'Cadastro de empresa',name:c.name,status:c.published?'Publicado':'Rascunho',time:c.updated_at||c.created_at||null})),
     ...accounts.users.map(u=>({type:'Conta cadastrada',name:u.name+' · '+u.username,status:u.active?'Ativa':'Desativada',time:u.updated_at||u.created_at||null})),
     ...inbox.reports.map(r=>({type:'Relato da comunidade',name:r.title,status:r.status,time:r.updated_at||r.created_at||null}))
    ].sort((a,b)=>String(b.time||'').localeCompare(String(a.time||'')));
    return Response.json({events});
   }catch(e){return Response.json({error:e.message},{status:e.status||400});}
  }
  if(name==='test-users'){try{const user=(await (await getAuth()).handle('GET',{}, {fresh:method!=='GET'})).user,users=await getUsers();if(method==='GET')return Response.json(await users.listar(user));if(method==='POST')return Response.json(await users.alterar(user,JSON.parse(options.body||'{}')));throw Error('Operação indisponível.');}catch(e){return Response.json({error:e.message},{status:e.status||400});}}
  if(name==='admin-images'&&method==='GET'){try{const user=(await (await getAuth()).handle('GET',{}, {fresh:method!=='GET'})).user;if(!user||!['owner','company-admin'].includes(user.role))return Response.json({error:'Área exclusiva da administração.'},{status:403});const companies=await (await getBusinesses()).lista(user),images=await getImages();const rows=await Promise.all(companies.filter(c=>c.sourceType==='company').map(async c=>{const slots=[[c.logo,'logo'],[c.facade,'facade'],...(c.gallery||[]).map(id=>[id,'gallery'])].filter(x=>x[0]);const assets=(await Promise.all(slots.map(async ([id,kind])=>{const item=await images.row(id);return item?{id,kind,revision:item.revision,approval:item.data.approval}:null}))).filter(Boolean);return {id:c.id,name:c.name,revision:c.revision,images:assets}}));return Response.json({companies:rows,aboutSlots:(await getAbout()).slots});}catch(e){return Response.json({error:e.message},{status:e.status||400});}}
  if(name==='reports'){
   try{const reports=await getReports();if(method==='POST')return Response.json(await reports.criar(JSON.parse(options.body||'{}')));const user=(await (await getAuth()).handle('GET',{}, {fresh:method!=='GET'})).user;if(!user||!['owner','company-admin','coordination'].includes(user.role))return Response.json({error:'Entre como administração ou coordenação.'},{status:403});if(method==='GET')return Response.json(await reports.listar());if(method==='PATCH')return Response.json(await reports.atualizar(JSON.parse(options.body||'{}')));throw Error('Operação indisponível.');}catch(e){return Response.json({error:e.message||'Não foi possível processar o relato.'},{status:e.status||400});}
  }
  if(name==='coordination'){try{const user=(await (await getAuth()).handle('GET',{}, {fresh:method!=='GET'})).user,c=await getCoordination(),body=options.body?JSON.parse(options.body):{};if(method==='GET')return Response.json(await c.listar(user));if(method==='PATCH')return Response.json(await c.editar(user,body));if(method==='POST')return Response.json(body.action==='release-account'?await c.liberar(user,body):await c.cadastrar(user,body));throw Error('Operação indisponível.');}catch(e){return Response.json({error:e.message},{status:e.status||400});}}
  if(name==='about-images'){try{if(!privateConfig?.token)return Response.json({slots:[]});const a=await getAbout();if(method==='GET'){const id=url.searchParams.get('id');if(!id)return Response.json(await a.listar());const img=await a.obter(id);return new Response(Uint8Array.from(atob(img.base64),x=>x.charCodeAt(0)),{headers:{'Content-Type':img.mime}});}const user=(await (await getAuth()).handle('GET',{}, {fresh:method!=='GET'})).user;if(method==='POST')return Response.json(await a.salvar(user,await compactPhoto(options.body)));if(method==='DELETE')return Response.json(await a.remover(user,JSON.parse(options.body||'{}')));throw Error('Operação indisponível.');}catch(e){return Response.json({error:e.message},{status:e.status||400});}}
  return Response.json({error:'Esta função ainda não está disponível na integração individual.'},{status:503});
 };
})();

(() => {
 const pending=new WeakSet();
 function render(img){const src=img.getAttribute('src');if(!src||!(src.startsWith('/api/company-image')||src.startsWith('/api/about-images'))||pending.has(img))return;pending.add(img);window.fetch(src).then(r=>{if(!r.ok)throw Error('Imagem indisponível');return r.blob()}).then(b=>{img.src=URL.createObjectURL(b)}).catch(()=>{}).finally(()=>pending.delete(img));}
 function scan(node){if(node.nodeType!==1)return;if(node.tagName==='IMG')render(node);node.querySelectorAll?.('img').forEach(render);}
 new MutationObserver(events=>events.forEach(e=>e.type==='attributes'?render(e.target):e.addedNodes.forEach(scan))).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});
})();
