# MCP ReactGram Server

Servidor MCP (Model Context Protocol) em Node.js que dá a um LLM acesso **somente leitura** ao banco PostgreSQL do ReactGram (protótipo de rede social), usando Prisma. Projeto de estudo.

## O que o servidor expõe

| Tipo | Nome | Descrição |
|---|---|---|
| Tool | `somar` | Soma dois números (exemplo mínimo) |
| Tool | `listar_usuarios` | Usuários com contagem de fotos e curtidas (nunca retorna a senha) |
| Tool | `fotos_mais_curtidas` | Fotos ordenadas por curtidas; parâmetro opcional `limite` (1 a 50) |
| Resource | `schema://reactgram` | Schema Prisma do banco |
| Prompt | `resumo_reactgram` | Pede um resumo da atividade; argumento opcional `foco` |

## Requisitos

- Node.js 20.6 ou superior (usa `process.loadEnvFile`)
- PostgreSQL com o banco `prisma_reactgram`
- Claude Desktop (ou outro host MCP)

## Instalação

```bash
npm install
```

Crie o arquivo `.env` a partir do modelo e preencha a senha (caracteres especiais precisam de URL-encode, por exemplo `@` vira `%40`):

```bash
copy .env.example .env
```

Gere o client do Prisma e crie as tabelas, se o banco ainda estiver vazio:

```bash
npx prisma generate
npx prisma db push
```

## Testar sem o Claude Desktop

```bash
node src/test-client.js
```

O script inicia o servidor, lista tools, resources e prompts e executa as consultas.

## Configurar no Claude Desktop

No `claude_desktop_config.json` (Configurações → Desenvolvedor → Editar configuração), adicione `mcpServers` no nível mais externo do JSON, com o caminho absoluto do `server.js` (no Windows, barras duplicadas):

```json
{
  "mcpServers": {
    "meu-primeiro-servidor": {
      "command": "node",
      "args": ["C:\\caminho\\para\\05_mcp_servidor\\src\\server.js"]
    }
  }
}
```

Saia do Claude pela bandeja do sistema e abra de novo.

## Como funciona

O host inicia `node src/server.js` como processo filho e conversa com ele por JSON-RPC via **stdio**. Por isso o servidor nunca escreve logs em `stdout` (reservado ao protocolo): usa `console.error`.

O `.env` é carregado por caminho absoluto em `src/db.js`, porque o host inicia o servidor a partir de outra pasta.

## Segurança

- Todas as tools são somente leitura.
- `select` explícito nas consultas: o hash da senha nunca sai do banco.
- `.env` está no `.gitignore`; use `.env.example` como modelo.

## Estrutura

```
src/
  server.js       tools, resource e prompt
  db.js           conexão Prisma e carga do .env
  test-client.js  cliente de teste
prisma/
  schema.prisma   modelos User, Photo, Like
```