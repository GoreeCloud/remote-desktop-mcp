import { spawn } from "node:child_process";
import process from "node:process";

const cwd = new URL("../", import.meta.url);
const env = {
  ...process.env,
  BROKER_HOST: "127.0.0.1",
  BROKER_PORT: "18788",
  MCP_BEARER_TOKEN: "smoke-mcp-token-123",
  BROKER_DEVICE_TOKEN: "smoke-device-token-123",
  BROKER_WS_URL: "ws://127.0.0.1:18788/agent",
  AGENT_DEVICE_TOKEN: "smoke-device-token-123",
  DEVICE_ID: "smoke-device",
  AGENT_ALLOWED_ROOTS: process.cwd(),
  AGENT_ALLOW_WRITE: "false",
  AGENT_ALLOW_SHELL: "false"
};

const broker = spawn(process.execPath, ["src/broker.mjs"], { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
const agent = spawn(process.execPath, ["src/agent.mjs"], { cwd, env, stdio: ["ignore", "pipe", "pipe"] });

function stop() { broker.kill("SIGTERM"); agent.kill("SIGTERM"); }
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForHealth() {
  for (let i = 0; i < 50; i++) {
    try {
      const response = await fetch("http://127.0.0.1:18788/healthz");
      if (response.ok) return await response.json();
    } catch {}
    await wait(100);
  }
  throw new Error("Broker health endpoint did not become ready.");
}

async function callTool(name, args = {}, id = 1) {
  const response = await fetch("http://127.0.0.1:18788/mcp", {
    method: "POST",
    headers: {
      authorization: "Bearer smoke-mcp-token-123",
      "content-type": "application/json",
      accept: "application/json, text/event-stream"
    },
    body: JSON.stringify({
      jsonrpc: "2.0", id, method: "tools/call",
      params: { name, arguments: args }
    })
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`MCP HTTP ${response.status}: ${text}`);
  const data = text.split(/\r?\n/).find((line) => line.startsWith("data: "));
  if (!data) throw new Error(`No MCP data event returned: ${text}`);
  return JSON.parse(data.slice(6));
}

async function waitForDevice() {
  for (let i = 0; i < 50; i++) {
    const message = await callTool("goreecloud.remote.list_devices", {}, i + 1);
    if (JSON.stringify(message).includes("smoke-device")) return message;
    await wait(100);
  }
  throw new Error("Agent did not register through the MCP tool.");
}

function requireTrue(condition, label, value) {
  if (!condition) throw new Error(`${label} failed: ${JSON.stringify(value)}`);
}

try {
  const health = await waitForHealth();
  const list = await waitForDevice();
  const ping = await callTool("goreecloud.remote.ping", { deviceId: "smoke-device" }, 100);
  const dir = await callTool("goreecloud.remote.list_directory", {
    deviceId: "smoke-device", path: process.cwd()
  }, 101);
  const read = await callTool("goreecloud.remote.read_file", {
    deviceId: "smoke-device", path: process.cwd() + "/package.json", offset: 0, length: 20
  }, 102);
  const deniedWrite = await callTool("goreecloud.remote.write_file", {
    deviceId: "smoke-device", path: process.cwd() + "/smoke-write.txt", content: "should-not-write"
  }, 103);
  const deniedShell = await callTool("goreecloud.remote.execute_command", {
    deviceId: "smoke-device", command: "pwd", cwd: process.cwd()
  }, 104);

  requireTrue(JSON.stringify(list).includes("smoke-device"), "list_devices", list);
  requireTrue(ping.result?.structuredContent?.ok === true, "ping", ping);
  requireTrue(JSON.stringify(dir).includes("package.json"), "list_directory", dir);
  requireTrue(JSON.stringify(read).includes("goreecloud-remote-mcp"), "read_file", read);
  requireTrue(JSON.stringify(deniedWrite).includes("File writes are disabled"), "write denial", deniedWrite);
  requireTrue(JSON.stringify(deniedShell).includes("Shell execution is disabled"), "shell denial", deniedShell);

  console.log("health:", JSON.stringify(health));
  console.log("SMOKE PASS: connectivity, read tools, and fail-closed mutation controls");
} finally {
  stop();
}
