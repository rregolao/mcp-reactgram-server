import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const client = new Client({ name: "test-client", version: "1.0.0" });
await client.connect(
  new StdioClientTransport({ command: "node", args: ["src/server.js"] })
);

console.log("Tools:", (await client.listTools()).tools.map((t) => t.name));

const { resources } = await client.listResources();
console.log("\nResources:", resources.map((r) => `${r.name} -> ${r.uri}`));
const schema = await client.readResource({ uri: "schema://reactgram" });
console.log(schema.contents[0].text.slice(0, 120), "...");

const { prompts } = await client.listPrompts();
console.log("\nPrompts:", prompts.map((p) => p.name));
const p = await client.getPrompt({
  name: "resumo_reactgram",
  arguments: { foco: "engajamento" },
});
console.log(p.messages[0].content.text);

await client.close();