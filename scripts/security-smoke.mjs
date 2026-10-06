import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import net from "node:net";
import process from "node:process";
import WebSocket from "ws";

const cwd = new URL("../", import.meta.url);
const mcpToken = "security-smoke-mcp-token";
const agentToken = "security-smoke-agent-token";
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const agents = [];
let broker;

async function freeLoopbackPort() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function waitForBroker(base) {
  for (let i = 0; i < 60; i++) {
    try {
      const response = await fetch(base + "/healthz");
      if (response.ok) return;
    } catch {}
    if (broker.exitCode !== null) throw new Error("Broker exited before readiness.");
    await delay(100);
  }
  throw new Error("Broker did not become ready.");
}

async function callTool(base, name, args) {
  const response = await fetch(base + "/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      authorization: "Bearer " + mcpToken
    },
    body: JSON.stringify({
      jsonrpc: "2.0", id: 1, method: "tools/call",
      params: { name, arguments: args }
    }),
    signal: AbortSignal.timeout(5000)
  });
  const body = await response.text();
  assert.equal(response.status, 200, body);
  const event = body.split(/\r?\n/).find((line) => line.startsWith("data: "));
  assert.ok(event, "MCP response must contain a data event");
  return JSON.parse(event.slice(6));
}

function connection(base, deviceId, token) {
  return new WebSocket(base.replace("http:", "ws:") + "/agent?deviceId=" + encodeURIComponent(deviceId), {
    headers: { authorization: "Bearer " + token }
  });
}

async function connectAgent(base, name) {
  const ws = connection(base, name, agentToken);
  const agent = { ws, queue: [], waiter: null };
  ws.on("message", (raw) => {
    const message = JSON.parse(raw.toString("utf8"));
    if (agent.waiter) {
      const deliver = agent.waiter;
      agent.waiter = null;
      deliver(message);
    } else {
      agent.queue.push(message);
    }
  });
  await new Promise((resolve, reject) => {
    ws.once("open", resolve);
    ws.once("error", reject);
  });
  agents.push(agent);
  ws.send(JSON.stringify({ type: "hello", metadata: { capabilities: { read: true, write: false, shell: false } } }));
  return agent;
}

async function nextRequest(agent) {
  if (agent.queue.length) return agent.queue.shift();
  return await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Agent request not received.")), 5000);
    agent.waiter = (request) => {
      clearTimeout(timer);
      resolve(request);
    };
  });
}

function reply(agent, id, source) {
  agent.ws.send(JSON.stringify({ type: "response", id, ok: true, result: { ok: true, source } }));
}

async function rejectedConnection(base, deviceId, token, expectedStatus) {
  const ws = connection(base, deviceId, token);
  const actualStatus = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Rejected handshake did not complete.")), 5000);
    ws.on("unexpected-response", (_request, response) => {
      clearTimeout(timer);
      response.resume();
      resolve(response.statusCode);
    });
    ws.on("open", () => {
      clearTimeout(timer);
      reject(new Error("Rejected handshake unexpectedly succeeded."));
    });
    ws.on("error", () => {});
  });
  assert.equal(actualStatus, expectedStatus);
  ws.terminate();
}

async function run() {
  const port = await freeLoopbackPort();
  const base = "http://127.0.0.1:" + port;
  broker = spawn(process.execPath, ["src/broker.mjs"], {
    cwd,
    env: {
      ...process.env,
      BROKER_HOST: "127.0.0.1",
      BROKER_PORT: String(port),
      MCP_AUTH_MODE: "token",
      MCP_BEARER_TOKEN: mcpToken,
      BROKER_DEVICE_TOKEN: agentToken,
      RPC_TIMEOUT_MS: "3000",
      ADMIN_USER: "",
      ADMIN_PASSWORD: ""
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let stderr = "";
  broker.stderr.on("data", (chunk) => { stderr += chunk.toString("utf8").slice(0, 500); });
  try {
    await waitForBroker(base);
    const unauthorized = await fetch(base + "/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" })
    });
    assert.equal(unauthorized.status, 401, "unauthorized MCP request denied");
    assert.equal((await fetch(base + "/dashboard")).status, 404, "dashboard disabled without admin credentials");
    await rejectedConnection(base, "alpha", "invalid-agent-token", 401);
    await rejectedConnection(base, "bad/name", agentToken, 400);

    const alpha = await connectAgent(base, "alpha");
    const beta = await connectAgent(base, "beta");
    const original = callTool(base, "goreecloud.remote.ping", { deviceId: "alpha" });
    const request = await nextRequest(alpha);
    assert.equal(request.action, "ping");
    reply(beta, request.id, "forged-beta");
    await delay(50);
    reply(alpha, request.id, "authentic-alpha");
    const accepted = await original;
    assert.equal(accepted.result?.structuredContent?.source, "authentic-alpha", "cross-device response ignored");

    const stale = callTool(base, "goreecloud.remote.ping", { deviceId: "alpha" });
    const staleRequest = await nextRequest(alpha);
    assert.equal(staleRequest.action, "ping");
    const freshAgent = await connectAgent(base, "alpha");
    const fresh = callTool(base, "goreecloud.remote.ping", { deviceId: "alpha" });
    const freshRequest = await nextRequest(freshAgent);
    reply(freshAgent, freshRequest.id, "fresh-alpha");
    const staleResult = await stale;
    const freshResult = await fresh;
    assert.match(JSON.stringify(staleResult), /Device connection replaced/, "old connection requests fail closed");
    assert.equal(freshResult.result?.structuredContent?.source, "fresh-alpha", "replacement agent request survives old socket close");

    console.log("SECURITY SMOKE PASS: token auth, disabled admin, invalid agent ID, cross-device responses, and reconnect isolation");
  } finally {
    for (const agent of agents) agent.ws.terminate();
    broker.kill("SIGTERM");
    if (broker.exitCode !== null && broker.exitCode !== 0) console.error(stderr.slice(0, 800));
  }
}

await run();
