# Projeto Conexão Comunidade
## Plano de implantação — versão inicial, 7 de outubro de 2026

**Parceria e acompanhamento:** O projeto está sendo desenvolvido a partir da parceria entre a FMP e a Escola Frei Damião, com a participação dos alunos de Análise e Desenvolvimento de Sistemas (ADS), do ILAB.
**Créditos:** serão adicionados posteriormente na seção Sobre, com o grupo, criadores e participantes.


Este plano reúne o conteúdo da descrição em Word, dos dez slides fornecidos e das decisões recuperadas do projeto Assistek. Os quatro áudios recebidos ainda não foram transcritos: suas orientações não foram consideradas confirmadas. A conferência deles é um requisito antes de fechar o escopo. Complementos deste plano são propostas de implementação, não resultados da pesquisa original.

## 1. Problema e propósito

O bairro possui talentos, pequenos serviços, negócios, espaços e necessidades que muitos moradores não conhecem. Os slides também apontam poucos recursos, violência, ausência do poder público e dificuldade de localizar serviços e oportunidades. O aplicativo não pretende resolver sozinho todos esses desafios; sua contribuição é aproximar moradores e organizar informações.

**Pergunta norteadora:** como a tecnologia pode aproximar moradores, talentos, serviços, oportunidades e problemas do bairro?

**Objetivo geral:** utilizar tecnologia para conexão, informação, oportunidade e participação cidadã, fortalecendo os vínculos entre moradores.

**Objetivos específicos:** dar visibilidade aos talentos; facilitar contatos e oportunidades de renda; reunir lugares e horários; registrar necessidades; permitir acompanhamento; tornar as informações acessíveis em celular e computador.

## 2. Pesquisa que fundamenta a proposta

Os materiais fornecidos relatam entrevistas com 20 moradores:

| Atividade | Moradores |
|---|---:|
| Produção de alimentos caseiros | 6 |
| Pequenos artesanatos | 4 |
| Serviços de costura | 4 |
| Serviços de apoio | 3 |
| Limpeza | 3 |
| Total | 20 |

Conclusão dos alunos: existe talento na comunidade; falta uma rede que conecte quem oferece e quem precisa. Não foram fornecidos metodologia detalhada, datas, questionário, amostra representativa ou autorização para divulgar identidades. Os números são os relatados nos documentos; não são contas ou ofertas já cadastradas no aplicativo.

## 3. Público e frentes de atuação

- **Moradores:** consultam, oferecem serviços e registram problemas.
- **Prestadores e pequenos negócios:** divulgam atividades e horários.
- **Responsáveis por pontos úteis:** contribuem com informações de escolas, saúde, transporte e comércio.
- **Administradores escolhidos por Eugênio:** revisam informações e permissões na futura versão pública.

A plataforma reúne três frentes:

1. **Conexão Comunidade:** talentos, pequenos negócios, serviços e oportunidades.
2. **Mapa da Rotina:** escolas, saúde, transporte, comércio, dias, horários e referências úteis.
3. **Participação cidadã:** buracos, iluminação, lixo e outros problemas registrados com descrição, foto e localização.

Ciclo esperado: morador cadastra → informação aparece no mapa/listagem → outro morador encontra → contato gera oportunidade → moradores registram e acompanham necessidades.

## 4. Etapa 1 — Estrutura e versão privada

**Entregas desta versão:** portal responsivo; navegação entre as três frentes; pesquisa preservada; projeto passo a passo; perfil de morador; base persistente; fotos; mapa real de registros com coordenadas; busca; filtros; aplicativo web instalável.

**Como testar:** acessar o portal, entrar com ChatGPT, completar nome de exibição e bairro/município, criar um registro real de teste, anexar uma foto, conferir na lista e no mapa e abrir a mesma conta em outro dispositivo. A interface é acessível pelo endereço hospedado, mas os dados e operações de teste são restritos à conta autorizada; moradores ainda não podem participar.

**Critério de conclusão:** o registro permanece depois de recarregar a página; busca e filtros localizam o registro; erros não apagam o formulário; dados de pesquisa não se confundem com cadastros.

## 5. Etapa 2 — Cadastro de contas, com referência no Assistek

### Decisões recuperadas

No Assistek, foram definidos login por usuário/e-mail/telefone com senha, confirmação de contato, recuperação por código e redefinição, permissão administrativa somente para Eugênio e ADMs escolhidos. Havia problemas de envio de códigos por e-mail/SMS e intenção de substituir SMS por WhatsApp. O Assistek tinha perfis Empresa/Assistência e Cliente e a preferência por banco central no PC.

**Adaptação para este projeto:** aproveitar o desenho dos fluxos, mantendo contas, dados e permissões separados. Os perfis Empresa/Assistência e Cliente não serão copiados automaticamente para um projeto comunitário. O banco central no PC permanece uma decisão do Assistek: nesta versão hospedada, site e aplicativo usam uma base central online, permitindo o acesso entre dispositivos. Não foi realizada integração com o banco ou código-fonte do Assistek.

### Cadastro próprio planejado

1. Informar nome de exibição, nome de usuário, bairro/município e um contato para confirmação.
2. Escolher senha e confirmar; mostrar requisitos antes da digitação, permitindo colar e usar gerenciadores de senha.
3. Confirmar o contato por código de uso único antes de ativar a conta.
4. Entrar usando usuário, e-mail ou telefone e a senha.
5. Manter sessão segura entre navegações e atualizações normais.
6. Recuperar a conta por código e criar uma nova senha; encerrar sessões antigas após redefinir.
7. Editar contato com nova verificação. Não exibir senha antiga para nenhum administrador.

**Dados mínimos propostos:** identificador interno, nome, usuário único, contato normalizado e verificado, bairro, perfil/permissão, datas e situação da conta. Senhas ficam protegidas por hash adequado no servidor, nunca em texto, navegador ou planilhas. Não coletar CPF, documentos ou endereço residencial completo por rotina.

**Permissões propostas:** morador publica e acompanha seus próprios registros; moderador pode revisar conteúdo se convidado; Eugênio controla convites e administração. O campo de administrador não aparece no cadastro. Todas as permissões precisam ser verificadas no servidor, não apenas escondidas na tela.

**Tentativas e recuperação:** o histórico do Assistek descrevia 10 tentativas e pausa de 10 minutos, seguidas de 5 tentativas e pausa de 15 minutos. Preservar isso como referência a validar; implementar contagem e proteção no servidor, expiração de códigos, limitação de reenvio e respostas que não revelem se um contato tem conta. Administradores não recuperam senhas antigas.

### Envio de códigos — dependência real

E-mail precisa de um serviço de envio configurado. Códigos automáticos no WhatsApp precisam de integração oficial e modelo de autenticação compatível. Um link que abre uma conversa comum no WhatsApp não envia automaticamente o código e não comprova a identidade.

**Situação desta entrega:** acesso protegido pela conta ChatGPT e perfil persistente funcionam; contas autorizadas por usuário e senha e gerência de participantes estão disponíveis na atualização JSON. Envio por e-mail/WhatsApp, recuperação automática e moderação continuam pendentes. Não simulamos envio de códigos.

**Critério para liberar a etapa 2:** testar cadastro, código correto/incorreto/expirado, reenvio, duplicidade, recuperação, término de sessão, isolamento entre duas contas e bloqueio de ações administrativas por moradores.

## 6. Etapa 3 — Talentos e serviços

**Campos disponíveis:** título, categoria, descrição, referência de local, dias/horários opcionais, contato de divulgação opcional, coordenadas opcionais e foto opcional. Categorias originais: alimentos, artesanato, costura, apoio e limpeza; opção para outro talento.

**Fluxo:** completar perfil → cadastrar oferta → localizar na listagem ou no mapa → visualizar informações e contato autorizado. Contato não significa contratação, pagamento ou garantia do serviço. Não há pagamento dentro desta versão.

**Critério:** buscar e filtrar por texto/tipo; mostrar horários e contatos apenas quando informados; manter rótulos claros em registros sem foto ou coordenadas. Edição pelo autor está disponível. Exclusão de ofertas e moderação são melhorias a concluir antes do piloto público.

## 7. Etapa 4 — Mapa da rotina

Pontos úteis possuem categoria, nome, descrição, referência, horário e localização. O mapa utiliza OpenStreetMap e permite abrir um ponto cadastrado. A localização pode ser digitada ou obtida com permissão do dispositivo, apenas quando o morador estiver no lugar correto. Não inventar coordenadas da escola, município ou bairro.

**Esta versão:** mapa mostra o ponto selecionado; listagem dos registros com coordenadas; endereço por texto nos demais. Não há busca automática de endereço, navegação de rotas, horários ao vivo ou todas as marcações simultâneas.

**Antes do piloto:** definir município e bairro, conferir os primeiros pontos e horários, registrar a fonte e data de verificação. Revisar privacidade de residências e divulgar somente o necessário.

## 8. Etapa 5 — Problemas e acompanhamento

**Fluxo:** descrever o problema → informar local → anexar foto opcional → salvar → acompanhar. Estados desta versão: Registrado, Em acompanhamento e Resolvido. Somente o autor atualiza o andamento do seu problema; os estados são informações do autor, não validação oficial.

**Limite explícito:** o aplicativo não encaminha solicitações à prefeitura, não fornece protocolo público e não confirma que uma autoridade recebeu ou solucionou o problema. Uma integração futura dependerá do município e de canais reais de atendimento.

**Critério:** salvar foto/local/descrição; apresentar andamento; bloquear alteração por outra conta; não prometer envio automático ao poder público.

## 9. Etapa 6 — Moderação, privacidade e piloto

**Pendências para abrir aos moradores:** transcrever/conferir áudios; definir bairro e município; confirmar responsável operacional; implantar cadastro próprio; configurar envio real; concluir moderação e edição/exclusão; definir política de retenção e canal de remoção; escolher ADMs; validar acessibilidade e uso em dispositivos reais.

**Propostas:** manter nova publicação pendente de revisão na futura versão pública; recusar dados sensíveis ou exposição de terceiros; evitar rostos de menores e documentos em fotos; restringir alterações ao autor e administradores autorizados; registrar ações administrativas. Dados de menores exigem avaliação específica, orientada pelo melhor interesse, conforme a ANPD.

**Piloto proposto, sem datas prometidas:** testar primeiro com o responsável e administradores escolhidos; depois convidar um pequeno grupo de moradores; colher dificuldades; corrigir; ampliar somente após cumprir os critérios. A pesquisa de 20 entrevistados não comprova que todos aceitaram participar do aplicativo.

## 10. Etapa 7 — Site e aplicativo interligados

A primeira versão utiliza um aplicativo web instalável (PWA), adaptado a computador e celular. Site e aplicativo acessam o mesmo endereço, serviços e base de dados. Não há APK, instalador Windows ou aplicativo publicado em loja nesta entrega.

**Instalação:** botão interno quando o navegador permitir; menu de instalação em navegadores compatíveis; no iPhone, Safari → Compartilhar → Adicionar à Tela de Início. A disponibilidade precisa ser testada no dispositivo do usuário.

**Atualização de dados:** consulta automática a cada 20 segundos com a tela visível; ao voltar ao aplicativo, os dados são consultados novamente. Não é conexão em tempo real por socket nem atualização garantida com o aplicativo fechado.

**Atualização de versão:** carregar o código pela rede; quando uma nova versão do serviço de atualização estiver pronta, aplicar com a tela aberta se não houver formulário. Se houver formulário, aguardar seu fechamento. Não cachear respostas de conta, API ou páginas privadas. Sem conexão, mostrar uma página explicativa; cadastro e consulta de registros requerem rede. Formulários não enviados não têm sincronização offline.

**Critério:** criar registro no site e visualizar no app com a mesma conta; testar atualização com tela aberta; verificar que formulário ativo não sofre recarga automática; verificar instalação nos navegadores escolhidos.

## 11. Estrutura técnica e autonomia

Código-fonte do site versionado; interface React/TypeScript; servidor compatível com a hospedagem; banco de dados persistente para perfis e registros; armazenamento de imagens; autenticação de teste via plataforma. Consultas usam parâmetros e alterações verificam identidade/autoria no servidor. A arquitetura não usa armazenamento do navegador como base dos registros.

Para ampliar: perfis e verificação → políticas/permissões → revisão/edição/exclusão → pontos conferidos → piloto público. Fazer alterações por etapas, preservando a base e a identidade do projeto. Segredos de envio ficam somente no servidor. Nenhum contato ou credencial do Assistek foi importado.

## 12. Indicadores e impactos esperados

- Número de serviços e talentos publicados e revisados.
- Número de pontos úteis com horário confirmado.
- Registros de problemas por estado e idade do registro.
- Moradores que conseguem concluir cadastro e busca sem ajuda.
- Relatos voluntários de contato e oportunidades geradas.

Não tratar esses indicadores como resultados já atingidos. Impactos esperados: talentos valorizados, mais oportunidades, informação acessível e maior participação. A avaliação deve usar dados agregados e coleta mínima.

## 13. Pendências de informação

1. Conteúdo dos quatro áudios.
2. Bairro, município e localização exata da escola/pontos.
3. Quem administrará operacionalmente e quais ADMs Eugênio escolherá.
4. Serviço de envio de e-mail/WhatsApp e testes reais.
5. Código-fonte atual do Assistek, caso se deseje reutilização efetiva de componentes.
6. Termos, proteção de dados e regras para participantes menores antes do acesso público.

## 14. Referências consultadas

- Documentos anexados: “DESCRIÇÃO DO PROJETO – CONEXÃO COMUNIDADE - EB FREI DAMIÃO.docx” e “Projeto Conexão Comunidade - EB Frei Damião.pptx”.
- Contexto recuperado da conversa “Planejar aplicativo de assistência”, sobre Assistek.
- Meta, Authentication templates: https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/authentication-templates/authentication-templates
- MDN, What is a progressive web app?: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/What_is_a_progressive_web_app
- MDN, ServiceWorkerRegistration.update(): https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/update
- ANPD, Guia sobre legítimo interesse: https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_legitimo_interesse.pdf

Referências externas consultadas em 7 de outubro de 2026. Regras e serviços devem ser reconferidos na implementação da etapa correspondente.

## Atualização — estabelecimentos, produtos e proximidade

Os nomes dos alunos ficam ocultos por enquanto. A seção Sobre está reservada para os créditos futuros do grupo, criadores e participantes.

Cada cadastro pode informar o que vende ou oferece. Exemplo: uma padaria informa “pão francês, pão integral, bolos, café”. A busca consulta esses produtos, nome, categoria, descrição e local. Acentos são normalizados: “pao” encontra “pão”; “pães” também é reconhecido na busca. A busca só mostra os locais cadastrados na plataforma.

O botão Buscar perto de mim solicita a localização do visitante. Se o acesso for negado, coordenadas podem ser informadas manualmente. A localização usada na busca fica apenas na tela, sem salvar no perfil. Resultados com coordenadas são ordenados do mais próximo ao mais distante. Os cadastros sem coordenadas ficam no final, com indicação de localização não informada.

Distâncias são aproximadas em linha reta, calculadas pelas coordenadas; não são trajetos, tempo de viagem ou distância pelas ruas.

Uma galeria comporta até seis imagens por cadastro, de até 5 MB cada, nos formatos JPG, PNG ou WebP. A primeira imagem aparece como capa. O autor pode editar produtos, localização, informações e imagens do seu cadastro. As fotos anteriores permanecem compatíveis.

Para verificar o mapa, abrir Mapa da rotina → Testar mapa de exemplo. O ponto de demonstração em Brasília é somente um teste e não salva um estabelecimento. Conferir ruas, marcador e zoom, depois selecionar “Consegui ver mapa e marcador”. O carregamento da janela sozinho não confirma a visualização dos mapas externos: a confirmação é feita por quem testa. Também há um link para abrir o ponto no OpenStreetMap.

## Atualização — demonstração pessoal para empresas e clientes

A nova entrada do site é uma interface HTML com área de empresa e área de cliente. Empresa envia o próprio slogan, logo/ícone, fotos, produtos e dados comerciais. Nenhuma imagem comercial de exemplo foi adicionada pelo desenvolvimento. A área de ideias está reservada para sugestões de teste, visíveis somente à conta responsável. Créditos dos participantes permanecem ocultos.

O novo cadastro de empresas e imagens utiliza IDs aleatórios como referências. O conteúdo é criptografado em repouso com AES-GCM, chaves de 256 bits derivadas por empresa com HKDF e IV aleatório por gravação. A chave principal está no ambiente protegido do servidor e não no HTML. O ID não é um token de autenticação: toda edição, upload e exclusão exige a identidade do responsável no servidor. Conteúdo público é entregue aos clientes quando o responsável habilita o catálogo; a observação privada não é enviada a outras contas. Isso não é criptografia de ponta a ponta.

Escopo: proteção nova aplica-se ao módulo de empresas, suas imagens e às novas ideias. Os cadastros comunitários anteriores e a autenticação de plataforma são sistemas separados, e não foram migrados para esse esquema. A interface é acessível pelo endereço hospedado; as APIs e os dados de demonstração continuam restritos à conta autorizada.

Antes de abertura: definir controlador e canal de direitos, política de privacidade e bases legais, retenção, backups, recuperação/rotação de chaves, auditoria, gestão de incidentes, contas próprias, moderação, proteção de menores e revisão jurídica/técnica. A criptografia não certifica conformidade ou ausência de falhas.

Referências oficiais adicionais (consulta em 07/10/2026): LGPD Lei 13.709/2018 (arts. 18 e 46); Marco Civil Lei 12.965/2014 (inclusive análise de aplicabilidade do art. 15); Decreto 8.771/2016 em seu texto atualizado; Lei Brasileira de Inclusão Lei 13.146/2015 (art. 63); Estatuto Digital da Criança e do Adolescente Lei 15.211/2025 e regulamentação. Defesa do consumidor, direitos autorais e uso de marcas precisam ser avaliados conforme o produto evoluir.

O HTML baixado mostra a interface. As operações de armazenamento protegido precisam da versão online e do servidor. Não há armazenamento de senhas ou chaves secretas no arquivo HTML.

A configuração atual permite abrir a interface publicamente, mas todas as APIs de dados deste teste verificam uma lista de contas autorizadas no servidor, configurada somente com o responsável. Nenhum visitante não autorizado pode consultar, cadastrar, alterar ou excluir dados. A apresentação pública da interface não libera a participação de empresas reais.

A seção Sobre agora reserva cartões individuais para fotos e apresentação de alunos e desenvolvedores. Nenhum nome ou retrato real foi inserido. A logo oficial da FMP está aplicada na seção Sobre, conforme o manual enviado. Durante os testes, a hospedagem permanece no ChatGPT; publicação no GitHub somente após a conclusão dos testes e nova orientação do responsável.

A aba Sobre reserva uma foto individual para o gerente Leandro e uma imagem grande intitulada Equipe do projeto para a foto coletiva.

## Revisão das pendências — 7 de outubro de 2026

Correções: localização manual na busca; validação do par latitude/longitude antes de salvar; exportação exige alterações salvas; proteção da ideia em edição durante atualização de versão; bloqueio de troca de empresa durante envio.

Ainda pendentes: confirmar em texto a orientação do áudio sobre JSON; contas próprias e confirmação de contato; fotos autorizadas da equipe; revisão operacional e jurídica antes do piloto; testar instalação e visualização do mapa nos dispositivos dos participantes. JSON já é usado na troca de dados e exportação; o armazenamento de empresas permanece criptografado no servidor.


## Atualização — arquivos JSON e contas autorizadas

Orientação recebida em texto: separar empresas e usuários em JSON e preparar o projeto para GitHub. Durante os testes, o endereço continua no ChatGPT; nenhum repositório do usuário foi publicado.

Dados ativos: um JSON protegido por empresa, um por cliente/perfil, um por usuário autorizado e registros separados para ideias, contribuições, sessões e referências de imagens. Os JSON privados ficam no armazenamento persistente do servidor, fora da pasta pública e do repositório. Imagens são arquivos separados, associados por identificadores; não são inseridas como grandes textos Base64 no cadastro.

O responsável entra com sua conta ChatGPT autorizada e usa /contas.html para criar participantes de teste (Cliente ou Empresa), desativar contas e redefinir senhas. Participantes entram em /entrar.html com usuário e senha. Apenas Empresa pode criar cadastros comerciais; cada conta altera seus próprios dados. O responsável da hospedagem conserva sua administração pela identidade ChatGPT. Não há cadastro aberto, confirmação por e-mail/WhatsApp ou recuperação automática nesta versão.

Senhas: scrypt com sal aleatório individual, N=16384, r=8, p=5 e hash de 32 bytes. A senha não é armazenada em texto. O JSON contendo o verificador também é criptografado. Sessão de oito horas em cookie Secure, HttpOnly e SameSite=Strict; a referência persistida é o hash SHA-256 de um token aleatório de 256 bits. Redefinir senha, trocar senha ou desativar uma conta revoga sessões por versão de autorização. Limites de tentativas persistentes são aplicados antes da verificação da senha. Esses controles ainda exigem revisão de segurança antes do piloto público.

Cada gravação usa a revisão do arquivo (ETag) para rejeitar alterações concorrentes e formulários desatualizados. A tela preserva os campos em conflitos, mas o usuário precisa reabrir a versão salva e comparar antes de reenviar.

Migração: na primeira operação autenticada, o servidor copia os dados SQL anteriores para os JSON de forma reiniciável, sem apagar o original. Só registra conclusão depois de copiar todas as categorias. Após a conclusão, as APIs ativas passam a ler e escrever JSON; o binding SQL permanece para importação do legado e preservação dos originais. Fotos antigas mantêm o formato anterior; novos envios são criptografados. A remoção definitiva das cópias antigas depende da política de retenção, ainda a definir. O site não apresenta esses arquivos como downloads públicos.

GitHub: os arquivos de implementação e exemplos sem dados pessoais podem ir ao repositório. Dados reais, exportações privadas, senhas, chave de criptografia e tokens não podem entrar nele. Token do GitHub não é ocultado por hash: quando necessário, usar variável secreta no servidor ou GitHub Actions Secrets, com permissões mínimas. GitHub Pages hospeda arquivos estáticos e não executa este servidor de login/gravação. Na publicação futura, será necessário manter um backend compatível e o armazenamento persistente, ou escolher outra arquitetura.

Limites: JSON simplifica o modelo deste protótipo, mas não elimina hospedagem, backups, controles de acesso, auditoria ou limites de escala. As listas hoje percorrem arquivos privados; índices e paginação de catálogo poderão ser necessários conforme a participação crescer. Não é uma garantia de conformidade LGPD.

Referências: https://docs.github.com/en/rest/authentication/keeping-your-api-credentials-secure ; https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html ; https://developers.cloudflare.com/r2/api/workers/workers-api-reference/ .


## Fluxo definido com o professor — Conexão Comunidade

Nome oficial atualizado para Conexão Comunidade. A tela inicial apresenta busca de serviços e sugestões baseadas nas empresas que habilitaram o catálogo. Cada comércio informa nome, telefone, atividade, responsável opcional, endereço/coordenadas e serviços/produtos e referência (unidade, cento, hora etc.). O cadastro e a exibição de preços ficam para uma etapa futura, após a apresentação e avaliação da continuidade do projeto.

Depois de salvar o cadastro, a empresa ganha a área de imagens: uma foto de fachada em destaque e até seis fotos adicionais. Logo, slogan e todas as imagens comerciais são enviados pela empresa; não foram adicionadas fotos demonstrativas de comércios. As novas referências são verificadas no servidor e persistidas no JSON protegido. Cadastros anteriores continuam compatíveis.

Ao abrir o comércio, o cliente vê seus dados e a tabela de serviços. O botão Abrir rota no Google Maps usa Maps URLs com api=1, destino e modo de deslocamento. Coordenadas têm prioridade; sem elas, o endereço informado é utilizado e deve ser conferido. Se a origem foi informada na busca, ela é incluída no link; caso contrário, o Google Maps solicita ou define a origem. A abertura é voluntária e envia esses dados ao Google. Distância do catálogo permanece em linha reta. Trajeto, quilometragem pelas ruas e estimativa de tempo disponíveis são apresentados pelo Google Maps; não são calculados ou inventados dentro deste site.

O aplicativo segue responsivo e instalável pelo navegador, no mesmo endereço do site. A área comunitária permanece disponível e tem retorno explícito ao site principal.

Referência oficial: https://developers.google.com/maps/documentation/urls/get-started .

## Revisão técnica para apresentação — 07/10/2026

Foram reforçados os limites reais de requisições, a validação de JSON, os cabeçalhos de proteção e o bloqueio do formulário durante gravações. A leitura de arquivos JSON usa lotes pequenos em paralelo. O catálogo evita consultas sobrepostas e remove resultados anteriores quando o acesso deixa de ser reconhecido.

A etapa de GitHub deve usar repositório privado se o código também for restrito, mantendo segredos e JSON de execução fora do Git. Exportações individuais são arquivos .private.json. A chave de criptografia existente será preservada. Não haverá upload ao GitHub nesta revisão.

Limites: dados ativos em JSON e novos envios de imagens são criptografados; originais SQL e fotos legadas são preservados pela migração e exigem política de retenção. Falta recuperação automática de conta, confirmação de contato, operação de backup e revisão jurídica antes de um piloto público.

## Gestão de fotos — 08/10/2026

Minha conta · Empresas permite adicionar, substituir e excluir fotos, com contador de 10 fotos por empresa incluindo a fachada. A logo fica separada. Alterações nas imagens são imediatas; os demais dados continuam sendo salvos pelo botão Salvar empresa. O servidor aplica o limite e as permissões, protege conflitos entre abas e remove os arquivos substituídos/excluídos do armazenamento ativo.

## Carregamento do mapa — 08/10/2026

A interface comunitária não espera leituras da conta no servidor para renderizar a página. A API continua verificando autenticação antes de entregar os dados. Consultas simultâneas são agrupadas e têm prazo de espera. Busca e ordenação são reaproveitadas entre renderizações, os registros aparecem em lotes e o mapa permanece montado ao navegar entre abas internas. O provedor externo e a conexão ainda influenciam o tempo de abertura do mapa.

## Integração do levantamento territorial — 08/10/2026

467 registros fornecidos na planilha: 300 do Brejaru e 167 de Frei Damião. Há 466 coordenadas publicadas; o registro sem localização permanece sem marcador. Os 10 endereços complementares não são somados como estabelecimentos únicos. Fonte, observações e data ficam visíveis. Não foram criadas contas para esses negócios.

Busca por atividade, filtros de bairro/setor, catálogo em lotes e mapa de vários pontos. Marcadores usam renderização em canvas, carregamento local do Leaflet sob demanda e mapas de fundo do OpenStreetMap. A lista também permite selecionar pontos, consultar detalhes e abrir itinerário no Google Maps. Novas empresas cadastradas e publicadas também aparecem no mapa. Preços e imagens ilustrativas continuam ausentes.
