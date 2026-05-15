// Teste end-to-end: handshake MCP + gtm_auth login + gtm_account list.
// Abre o navegador pro login Google. Timeout longo pra dar tempo de logar.
import { spawn } from "node:child_process";

const child = spawn("node", ["dist/index.js"], {
  stdio: ["pipe", "pipe", "inherit"],
});

let buf = "";
const send = (o) => child.stdin.write(JSON.stringify(o) + "\n");

function handle(msg) {
  if (msg.id === 1) {
    console.log(">> MCP inicializado. Chamando gtm_auth login (abre navegador)…");
    send({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "gtm_auth",
        arguments: { action: "login", profile: "teste" },
      },
    });
  } else if (msg.id === 2) {
    console.log(">> Resultado gtm_auth login:");
    console.log(msg.result?.content?.[0]?.text ?? JSON.stringify(msg));
    console.log(">> Chamando gtm_account list (chamada real na API GTM)…");
    send({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "gtm_account", arguments: { action: "list" } },
    });
  } else if (msg.id === 3) {
    console.log(">> Resultado gtm_account list:");
    console.log(msg.result?.content?.[0]?.text ?? JSON.stringify(msg));
    child.kill();
    process.exit(0);
  }
}

child.stdout.on("data", (d) => {
  buf += d.toString();
  let i;
  while ((i = buf.indexOf("\n")) !== -1) {
    const line = buf.slice(0, i);
    buf = buf.slice(i + 1);
    if (!line.trim()) continue;
    try {
      handle(JSON.parse(line));
    } catch {
      /* linha não-JSON, ignora */
    }
  }
});

send({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "live-test", version: "1" },
  },
});
setTimeout(
  () => send({ jsonrpc: "2.0", method: "notifications/initialized" }),
  150,
);

// Encerra sozinho após 5 min se o login não for concluído.
setTimeout(() => {
  console.error(">> Timeout (5 min) sem concluir. Encerrando.");
  child.kill();
  process.exit(1);
}, 300000);
