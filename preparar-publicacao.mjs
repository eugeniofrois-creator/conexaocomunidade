/* Preparação do artefato Pages de demonstração. Segredos usados aqui ficam visíveis no site gerado. */
import {readFile,writeFile,readdir} from 'node:fs/promises';
const {PROTOTYPE_GITHUB_TOKEN:token,PROTOTYPE_DATA_KEY_V1:password,GITHUB_REPOSITORY:repository}=process.env;
if(!token||!password||!repository)throw Error('Configure os dois secrets do protótipo no repositório.');
const [owner,repo]=repository.split('/');
await writeFile('conexao-config.js','window.CONEXAO_CONFIG='+JSON.stringify({owner,repo,branch:process.env.CONEXAO_BRANCH||'main',token,password})+';\n');
for(const file of await readdir('.'))if(file.endsWith('.html')){
 const html=await readFile(file,'utf8');
 if(html.includes('pages-independent.js')&&!html.includes('conexao-config.js'))await writeFile(file,html.replace(/(<script\s+src=["'][^"']*pages-independent\.js["'][^>]*><\/script>)/,'<script src="/conexaocomunidade/conexao-config.js"></script>\n    $1'));
}
