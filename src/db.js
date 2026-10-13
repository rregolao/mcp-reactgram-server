import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

// Quando o Claude Desktop inicia o servidor, o diretório de trabalho NÃO é pasta do projeto. Por isso carregamos o .env pelo caminho absoluto.
const pastaAtual = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.join(pastaAtual, "..", ".env"));

export const prisma = new PrismaClient();