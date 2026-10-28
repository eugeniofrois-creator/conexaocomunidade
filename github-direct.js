/* Acesso isolado a JSON criptografado em um repositório por instalação. */
export class GithubJsonStore {
  constructor({owner, repo, token, password, branch='main', request=fetch}) {
    if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo) || !token || !password) throw Error('Configuração incompleta');
    Object.assign(this,{owner,repo,token,password,branch,request});
  }
  url(path) {
    if (!/^[\w./-]+\.json$/.test(path) || path.split('/').includes('..')) throw Error('Caminho inválido');
    return `https://api.github.com/repos/${encodeURIComponent(this.owner)}/${encodeURIComponent(this.repo)}/contents/${path.split('/').map(encodeURIComponent).join('/')}`;
  }
  headers() {return {Authorization:`Bearer ${this.token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'};}
  static encode(b) {let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode(...b.subarray(i,i+8192));return btoa(s);}
  static decode(s) {return Uint8Array.from(atob(s),c=>c.charCodeAt(0));}
  async key(salt) {const m=await crypto.subtle.importKey('raw',new TextEncoder().encode(this.password),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:210000,hash:'SHA-256'},m,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
  async seal(path,data) {const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));const b=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(path)},await this.key(salt),new TextEncoder().encode(JSON.stringify(data)));return {version:1,algorithm:'AES-256-GCM',kdf:'PBKDF2-SHA256',iterations:210000,salt:GithubJsonStore.encode(salt),iv:GithubJsonStore.encode(iv),body:GithubJsonStore.encode(new Uint8Array(b))};}
  async open(path,e) {if(e.version!==1||e.algorithm!=='AES-256-GCM'||e.kdf!=='PBKDF2-SHA256'||e.iterations!==210000)throw Error('Formato inválido');const b=await crypto.subtle.decrypt({name:'AES-GCM',iv:GithubJsonStore.decode(e.iv),additionalData:new TextEncoder().encode(path)},await this.key(GithubJsonStore.decode(e.salt)),GithubJsonStore.decode(e.body));return JSON.parse(new TextDecoder().decode(b));}
  async read(path) {
    const url=this.url(path)+'?ref='+encodeURIComponent(this.branch);
    const r=await this.request(url,{headers:this.headers(),cache:'no-store'});
    if(r.status===404)return null;
    if(!r.ok)throw Error(`Falha ao consultar (${r.status})`);
    const d=await r.json();
    if(!d.sha)throw Error('Resposta inválida');
    let envelope;
    if(d.encoding==='base64'&&typeof d.content==='string')envelope=JSON.parse(new TextDecoder().decode(GithubJsonStore.decode(d.content.replace(/\s/g,''))));
    else if(d.encoding==='none'){
      const raw=await this.request(url,{headers:{...this.headers(),Accept:'application/vnd.github.raw+json'},cache:'no-store'});
      if(!raw.ok)throw Error(`Falha ao consultar arquivo grande (${raw.status})`);
      envelope=await raw.json();
    }else throw Error('Resposta inválida');
    return {data:await this.open(path,envelope),revision:d.sha};
  }
  async write(path,data,revision=null) {const e=await this.seal(path,data);const r=await this.request(this.url(path),{method:'PUT',headers:this.headers(),body:JSON.stringify({message:'Atualizar registro criptografado',branch:this.branch,content:GithubJsonStore.encode(new TextEncoder().encode(JSON.stringify(e))),...(revision?{sha:revision}:{})})});if(!r.ok)throw Error(`Falha ao salvar (${r.status})`);const d=await r.json();return {revision:d.content.sha};}
  async remove(path,revision) {if(!revision)throw Error('Versão necessária');const r=await this.request(this.url(path),{method:'DELETE',headers:this.headers(),body:JSON.stringify({message:'Remover registro criptografado',branch:this.branch,sha:revision})});if(!r.ok)throw Error(`Falha ao remover (${r.status})`);}
}
