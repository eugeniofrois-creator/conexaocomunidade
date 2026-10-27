# Conexão Comunidade — preparação para GitHub

O projeto continua hospedado no ChatGPT durante os testes. A publicação no GitHub será feita quando o responsável solicitar.

## O que vai para o repositório

- Interfaces HTML/CSS/JavaScript e React.
- Rotas do servidor, validadores e funções de criptografia.
- Exemplo de ambiente sem valores de chaves.
- Logo oficial da FMP e demais imagens institucionais autorizadas.
- Documentação e exemplos fictícios, sem participantes reais.

## O que fica no servidor

- JSON de usuários: identidade interna, perfil, permissão, situação da conta, sal e hash da senha.
- JSON de clientes: perfil do responsável, separado por identificador.
- JSON de empresas: cadastro comercial e referências de imagens.
- JSON de contribuições, ideias, sessões e controle de tentativas.
- Imagens enviadas pelos participantes, guardadas separadamente e acessadas por autorização.
- Chave principal de criptografia e qualquer token de integração.

O JSON persistido é um envelope com versão, IV e conteúdo criptografado. A senha dentro dele é um verificador scrypt, não a senha original. Os arquivos privados não pertencem à pasta public e não são publicados pelo site.

## Token do GitHub

Não inserir um token no HTML, JavaScript, JSON, README ou histórico Git, mesmo como Base64. Hash não permite recuperar um token para chamar a API. Se uma automação futura precisar dele, usar GitHub Actions Secrets ou um segredo do servidor e limitar suas permissões. Nenhum token do GitHub é necessário para usar o site atual.

## Hospedagem futura

GitHub Pages oferece hospedagem estática. Ele não executa as rotas de login, gravação, criptografia e controle de acesso deste projeto. Publicar o código no GitHub não substitui o backend e o armazenamento de arquivos. Preservar o backend compatível ou migrá-lo com testes antes da mudança de hospedagem.

## Teste das contas

1. O responsável entra pela opção ChatGPT com a conta autorizada.
2. Abre Contas de teste e autoriza um usuário de Empresa ou Cliente.
3. O participante entra em /entrar.html e pode alterar sua senha.
4. Empresa cadastra o próprio negócio e suas imagens; Cliente consulta o catálogo autorizado.
5. Desativar uma conta ou redefinir sua senha encerra a validade das sessões anteriores.

Não há cadastro aberto, verificação de contato por e-mail/WhatsApp ou recuperação automática nesta etapa.

## Migração e limites

Na primeira operação autenticada, o servidor copia os registros antigos para JSON e marca a conclusão somente depois de todas as categorias. A cópia SQL original permanece preservada; após concluir, as APIs ativas usam JSON. Fotos antigas mantêm compatibilidade; novos envios são criptografados. Retenção das cópias antigas e backups operacionais ainda precisam ser definidos.

Arquivos separados reduzem o conflito entre cadastros; gravações do mesmo arquivo usam revisão/ETag e podem retornar conflito. JSON não elimina custos de armazenamento, backups, autenticação ou revisão de segurança. O protótipo deve ser reavaliado antes de aumentar o volume de participantes.

Fontes: https://docs.github.com/en/rest/authentication/keeping-your-api-credentials-secure ; https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages ; https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html .

## Revisão de proteção — 07/10/2026

- JSON ativo protegido com AES-GCM de 256 bits, chaves derivadas por arquivo e IV aleatório. Empresas e perfis de clientes têm arquivos separados.
- Senhas com scrypt e sal individual; sessão com cookie HttpOnly, Secure e SameSite=Strict. O servidor guarda somente o hash do token aleatório de sessão.
- Edição, exclusão e imagens verificam o responsável no servidor. Somente contas autorizadas leem o catálogo desta etapa.
- Requisições JSON e uploads têm limite pelo tamanho efetivamente recebido, inclusive sem Content-Length. JSON inválido retorna mensagem de validação.
- Formulário bloqueado durante salvamento/envio; gravações concorrentes do mesmo registro continuam protegidas por ETag.
- Respostas privadas sem cache; proteções de conteúdo, referência e permissões do navegador. Noindex não restringe acesso nem torna o código secreto.
- Exportações da empresa terminam em .private.json e estão excluídas pelo .gitignore, junto com .dev.vars, .env, chaves e dados de execução.

Quando transferir para o GitHub, criar um repositório privado se o código também precisar ficar restrito. A interface entregue ao navegador sempre pode ser inspecionada por quem tem acesso. A segurança dos dados depende das permissões no servidor, não de esconder HTML ou JavaScript. Habilitar secret scanning e push protection quando disponíveis. Se um segredo já tiver sido publicado, excluí-lo do arquivo não basta: revogar/rotacionar e tratar o histórico.

Manter a chave de criptografia em segredo do servidor e preparar uma cópia de recuperação protegida antes de uma migração. Não substituir a chave atual sem plano de migração: isso pode impedir a leitura dos dados existentes. Tokens de integração futuros devem ter permissões mínimas e jamais ir para a interface.

A revisão não apagou as cópias SQL legadas nem criou uma política de backups. Registros novos e JSON ativos são criptografados; a retenção das cópias antigas e das fotos legadas ainda precisa ser resolvida antes de ampliar os testes. Recuperação de conta, confirmação de contato e revisão jurídica continuam pendentes. Os testes de segurança realizados não equivalem a uma garantia de ausência de falhas.

Referências adicionais: https://docs.github.com/en/get-started/learning-to-code/storing-your-secrets-safely ; https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html .

## Controle de fotos por empresa

Em Minha conta · Empresas, o responsável gerencia até 10 fotos no total (fachada + galeria), além da logo separada. Pode adicionar, substituir e excluir cada imagem. Essas operações são salvas imediatamente, verificam autoria e revisão no servidor e removem o arquivo substituído/excluído do armazenamento ativo. Outros campos ainda exigem Salvar empresa. Cada imagem pode ter até 5 MB; o limite também é validado no servidor.

## Levantamento territorial

A planilha de 08/10/2026 tem 467 registros principais (300 Brejaru e 167 Frei Damião), 466 com coordenadas e 1 sem localização. Os 10 endereços complementares são separados e não somados como empresas únicas. Os dados de fonte pública não criam contas nem atribuem autoria; ficam identificados como levantamento com confirmação pendente. Nenhuma foto comercial ou preço foi adicionado.

O pacote inicial está criptografado em lib/local-directory-seed.json. A chave LOCAL_DIRECTORY_IMPORT_KEY_V1 fica como segredo do servidor, fora do código. Na primeira leitura autenticada, os dados são gravados em um JSON privado com a criptografia principal já existente. Preserve as duas chaves na futura migração. Nunca coloque a planilha original, as exportações legíveis ou essas chaves no repositório. O acesso ao catálogo continua restrito às contas autorizadas.

O mapa usa Leaflet local e mapas de fundo do OpenStreetMap, com atribuição visível e sem download antecipado de mapas para uso offline. O provedor recebe requisições de imagens de mapa; a conexão afeta o carregamento. As rotas externas usam Google Maps. Coordenadas e telefones da fonte não foram confirmados por contato, nem corrigidos por suposição.
