# Organização dos dados privados

Os dados são armazenados no servidor, fora do repositório e dos arquivos públicos. As pastas abaixo são prefixos privados do armazenamento R2, não pastas de download do site. Cada registro tem seu próprio arquivo JSON, com escrita condicionada à revisão para evitar conflitos entre contas e abas.

- `private-json/v1/users/`: contas; chave de arquivo derivada do nome de usuário, conteúdo criptografado, senhas com scrypt.
- `private-json/v1/sessions/`: sessões, validade e versão de autenticação.
- `private-json/v1/login-limits/`: controle de tentativas de acesso.
- `private-json/v1/password-resets/`: recuperação; tokens identificados por hash, expiração e uso único.
- `private-json/v1/clients/`: registros legados de perfil e controle de conta.
- `private-json/v1/companies/`: informações e referências às imagens de cada empresa.
- `private-json/v1/company-images/`: metadados privados das imagens, empresa responsável e decisão de aprovação.
- `private-json/v1/image-files/company-images/<empresa>/<imagem>.json`: novos arquivos de imagem de empresas; bytes criptografados com AES-GCM representados em Base64 dentro do JSON.
- `private-json/v1/about-slots/`: associação de cada espaço da aba Sobre à sua foto.
- `private-json/v1/about-assets/`: metadados das fotos do projeto.
- `private-json/v1/image-files/about-assets/about/<imagem>.json`: novos arquivos de fotos da aba Sobre em JSON criptografado.
- `private-json/v1/image-files/photos/<responsável>/<imagem>.json`: novos arquivos das rotas de foto legadas.
- `private-json/v1/reports/`: relatos privados da comunidade.
- `private-json/v1/entries/` e `ideas/`: dados das funções legadas.

As imagens são devolvidas ao navegador como JPG, PNG ou WebP após decodificação e autorização. JSON não substitui os controles de acesso: arquivos privados não são publicados no GitHub. Uma empresa pode excluir suas próprias fotos, inclusive aprovadas. Ela não pode aprovar fotos nem editar imagens de outras empresas. Administradores podem revisar e gerenciar imagens das empresas e da aba Sobre.

Compatibilidade: os arquivos de imagem anteriores, salvos como binários criptografados, continuam sendo lidos no formato original. Não houve conversão em massa dos arquivos históricos nem eliminação das tabelas SQL legadas. Todos os novos envios desta versão usam o formato JSON de imagem.
