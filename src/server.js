import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "./db.js";

const pastaAtual = path.dirname(fileURLToPath(import.meta.url));

const server = new McpServer({ name: "meu-primeiro-servidor", version: "1.1.0" });

// Formata a resposta no padrão MCP (conteúdo de texto)
function resposta(dados) {
  return { content: [{ type: "text", text: JSON.stringify(dados, null, 2) }] };
}

function erro(e) {
  console.error("Erro na tool:", e);
  return {
    isError: true,
    content: [{ type: "text", text: `Erro ao consultar o banco: ${e.message}` }],
  };
}

server.registerTool(
  "somar",
  {
    description: "Soma dois números e devolve o resultado.",
    inputSchema: {
      a: z.number().describe("Primeiro número"),
      b: z.number().describe("Segundo número"),
    },
  },
  async ({ a, b }) => {
    return { content: [{ type: "text", text: `${a} + ${b} = ${a + b}` }] };
  }
);

server.registerTool(
  "listar_usuarios",
  {
    description:
      "Lista os usuários do ReactGram (somente leitura), com a quantidade de fotos e de curtidas de cada um.",
  },
  async () => {
    try {
      // select explícito: a senha (hash) NUNCA sai do banco
      const usuarios = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          _count: { select: { photos: true, likes: true } },
        },
        orderBy: { id: "asc" },
      });
      return resposta(usuarios);
    } catch (e) {
      return erro(e);
    }
  }
);

server.registerTool(
  "fotos_mais_curtidas",
  {
    description:
      "Lista as fotos do ReactGram ordenadas por número de curtidas, da mais curtida para a menos curtida.",
    inputSchema: {
      limite: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .describe("Quantas fotos retornar (padrão 10, máximo 50)"),
    },
  },
  async ({ limite }) => {
    try {
      const fotos = await prisma.photo.findMany({
        select: {
          id: true,
          title: true,
          createdAt: true,
          user: { select: { name: true } },
          _count: { select: { likes: true } },
        },
        orderBy: { likes: { _count: "desc" } },
        take: limite ?? 10,
      });
      return resposta(
        fotos.map((f) => ({
          id: f.id,
          titulo: f.title,
          autor: f.user.name,
          curtidas: f._count.likes,
          criadaEm: f.createdAt,
        }))
      );
    } catch (e) {
      return erro(e);
    }
  }
);

// RESOURCE: conteúdo que a aplicação (host) pode ler, como se fosse um arquivo
server.registerResource(
  "schema-reactgram",
  "schema://reactgram",
  {
    title: "Schema do banco ReactGram",
    description: "Modelos Prisma (User, Photo, Like) do banco prisma_reactgram.",
    mimeType: "text/plain",
  },
  async (uri) => {
    const arquivo = path.join(pastaAtual, "..", "prisma", "schema.prisma");
    const texto = await readFile(arquivo, "utf-8");
    return { contents: [{ uri: uri.href, mimeType: "text/plain", text: texto }] };
  }
);

// PROMPT: modelo de instrução que o USUÁRIO escolhe (aparece como atalho no host)
server.registerPrompt(
  "resumo_reactgram",
  {
    title: "Resumo do ReactGram",
    description: "Pede um resumo da atividade do ReactGram usando as tools do banco.",
    argsSchema: {
      foco: z
        .string()
        .optional()
        .describe("Ponto de atenção do resumo (ex.: engajamento, novos usuários)"),
    },
  },
  ({ foco }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text:
            "Use as ferramentas listar_usuarios e fotos_mais_curtidas para montar um " +
            "resumo curto da atividade do ReactGram: quantos usuários existem, quem " +
            "mais posta e quais fotos têm mais curtidas." +
            (foco ? ` Dê atenção especial a: ${foco}.` : "") +
            " Responda em português, em até 5 linhas.",
        },
      },
    ],
  })
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Servidor MCP rodando via stdio");