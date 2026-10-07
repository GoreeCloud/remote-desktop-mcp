import crypto from "node:crypto";
import http from "node:http";
import express from "express";
import { WebSocketServer } from "ws";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const host = process.env.BROKER_HOST ?? "127.0.0.1";
const port = Number(process.env.BROKER_PORT ?? "8788");
const mcpAuthMode = (process.env.MCP_AUTH_MODE ?? "token").toLowerCase();
const mcpToken = process.env.MCP_BEARER_TOKEN;
const deviceToken = process.env.BROKER_DEVICE_TOKEN;
const rpcTimeoutMs = Number(process.env.RPC_TIMEOUT_MS ?? "30000");
const adminUser = process.env.ADMIN_USER ?? "";
const adminPassword = process.env.ADMIN_PASSWORD ?? "";

if (mcpAuthMode === "token") {
  if (!mcpToken || mcpToken.length < 8) throw new Error("MCP_BEARER_TOKEN is required and must be at least 8 characters when MCP_AUTH_MODE=token.");
} else if (mcpAuthMode === "none") {
  if (!["127.0.0.1", "::1", "localhost"].includes(host)) {
    throw new Error("MCP_AUTH_MODE=none is permitted only with a loopback BROKER_HOST.");
  }
} else {
  throw new Error("MCP_AUTH_MODE must be either token or none.");
}
if (!deviceToken || deviceToken.length < 8) throw new Error("BROKER_DEVICE_TOKEN is required and must be at least 8 characters.");

const app = express();
app.use(express.json({ limit: "2mb" }));

const devices = new Map();
const pending = new Map();
const stats = { startedAt: new Date().toISOString(), mcpRequests: 0, agentRequests: 0, agentErrors: 0 };

function safeEqual(actual, expected) {
  if (typeof actual !== "string" || typeof expected !== "string") return false;
  const a = Buffer.from(actual), b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function bearer(req) {
  const value = req.headers.authorization ?? "";
  return value.startsWith("Bearer ") ? value.slice(7) : "";
}

function requireMcpAuth(req, res, next) {
  if (mcpAuthMode === "none") return next();
  if (!safeEqual(bearer(req), mcpToken)) return res.status(401).json({ error: "unauthorized" });
  next();
}

function requireAdmin(req, res, next) {
  if (!adminUser || !adminPassword) return res.status(404).end();
  const header = req.headers.authorization ?? "";
  if (!header.startsWith("Basic ")) {
    res.setHeader("WWW-Authenticate", 'Basic realm="GoreeCloud Remote MCP"');
    return res.status(401).end();
  }
  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const idx = decoded.indexOf(":");
  const user = idx >= 0 ? decoded.slice(0, idx) : decoded;
  const pass = idx >= 0 ? decoded.slice(idx + 1) : "";
  if (!safeEqual(user, adminUser) || !safeEqual(pass, adminPassword)) return res.status(401).end();
  next();
}

function deviceSummary() {
  return [...devices.entries()].map(([id, value]) => ({
    id,
    status: "online",
    connectedAt: value.connectedAt,
    lastSeen: value.lastSeen,
    metadata: value.metadata ?? {}
  }));
}

function brokerHealth() {
  return {
    ok: true,
    status: "ready",
    service: "goreecloud-remote-mcp",
    version: "0.1.0",
    startedAt: stats.startedAt,
    uptimeSeconds: Math.floor(process.uptime()),
    mcpAuthMode,
    connectedDevices: devices.size,
    stats: {
      mcpRequests: stats.mcpRequests,
      agentRequests: stats.agentRequests,
      agentErrors: stats.agentErrors
    }
  };
}

function rejectPendingForConnection(ws, error) {
  for (const [id, wait] of pending) {
    if (wait.ws !== ws) continue;
    clearTimeout(wait.timer);
    pending.delete(id);
    wait.reject(error);
  }
}

async function rpc(deviceId, action, params = {}) {
  const entry = devices.get(deviceId);
  if (!entry || entry.ws.readyState !== 1) throw new Error(`Device not connected: ${deviceId}`);
  const id = crypto.randomUUID();
  stats.agentRequests += 1;
  return await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Device RPC timed out after ${rpcTimeoutMs}ms`));
    }, rpcTimeoutMs);
    pending.set(id, { resolve, reject, timer, deviceId, ws: entry.ws });
    entry.ws.send(JSON.stringify({ type: "request", id, action, params }), (error) => {
      if (error) {
        clearTimeout(timer);
        pending.delete(id);
        reject(error);
      }
    });
  });
}

function textResult(value) {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }], structuredContent: value };
}

function createMcpServer() {
  const server = new McpServer({ name: "goreecloud-remote-mcp", version: "0.1.0" });

  server.registerTool("goreecloud.remote.list_devices", {
    description: "List device agents currently connected to the self-hosted broker.",
    inputSchema: {}
  }, async () => textResult({ devices: deviceSummary() }));

  server.registerTool("goreecloud.remote.get_health", {
    description: "Get bounded broker health and operational counters without exposing credentials or file contents.",
    inputSchema: {}
  }, async () => textResult(brokerHealth()));

  server.registerTool("goreecloud.remote.get_device_capabilities", {
    description: "Get the enabled capability set and enforced limits reported by one connected device agent.",
    inputSchema: { deviceId: z.string().min(1) }
  }, async ({ deviceId }) => textResult(await rpc(deviceId, "device.capabilities")));

  server.registerTool("goreecloud.remote.get_device_health", {
    description: "Get bounded health and readiness information from one connected device agent.",
    inputSchema: { deviceId: z.string().min(1) }
  }, async ({ deviceId }) => textResult(await rpc(deviceId, "device.health")));

  server.registerTool("goreecloud.remote.ping", {
    description: "Ping one connected device agent.",
    inputSchema: { deviceId: z.string().min(1) }
  }, async ({ deviceId }) => textResult(await rpc(deviceId, "ping")));

  server.registerTool("goreecloud.remote.list_directory", {
    description: "List a bounded, deterministically ordered page of a directory within the agent's allowed roots.",
    inputSchema: {
      deviceId: z.string().min(1),
      path: z.string().min(1),
      offset: z.number().int().nonnegative().optional(),
      limit: z.number().int().positive().max(1000).optional()
    }
  }, async ({ deviceId, path: targetPath, offset, limit }) =>
    textResult(await rpc(deviceId, "fs.list", { path: targetPath, offset, limit })));

  server.registerTool("goreecloud.remote.read_file", {
    description: "Read a UTF-8 text file within the agent's allowed roots.",
    inputSchema: {
      deviceId: z.string().min(1), path: z.string().min(1),
      offset: z.number().int().nonnegative().optional(),
      length: z.number().int().positive().max(10000).optional()
    }
  }, async ({ deviceId, path: targetPath, offset, length }) =>
    textResult(await rpc(deviceId, "fs.read", { path: targetPath, offset, length })));

  server.registerTool("goreecloud.remote.read_file_chunk", {
    description: "Read a bounded base64 byte range from an allowed local file, including files larger than the ordinary text-read limit.",
    inputSchema: {
      deviceId: z.string().min(1), path: z.string().min(1),
      offset: z.number().int().nonnegative().optional(),
      length: z.number().int().positive().max(65536).optional()
    }
  }, async ({ deviceId, path: targetPath, offset, length }) =>
    textResult(await rpc(deviceId, "fs.read_chunk", { path: targetPath, offset, length })));

  server.registerTool("goreecloud.remote.get_file_info", {
    description: "Get metadata for a file or directory within allowed roots.",
    inputSchema: { deviceId: z.string().min(1), path: z.string().min(1) }
  }, async ({ deviceId, path: targetPath }) => textResult(await rpc(deviceId, "fs.info", { path: targetPath })));

  server.registerTool("goreecloud.remote.search_files", {
    description: "Recursively search filenames or text content under an allowed root.",
    inputSchema: {
      deviceId: z.string().min(1), root: z.string().min(1), query: z.string().min(1).max(200),
      mode: z.enum(["name", "content"]).default("name"),
      caseSensitive: z.boolean().optional(),
      maxResults: z.number().int().positive().max(200).default(50)
    }
  }, async ({ deviceId, root, query, mode, caseSensitive, maxResults }) =>
    textResult(await rpc(deviceId, "fs.search", { root, query, mode, caseSensitive, maxResults })));

  server.registerTool("goreecloud.remote.write_file", {
    description: "Write a UTF-8 text file when writes are explicitly enabled on the agent.",
    inputSchema: {
      deviceId: z.string().min(1), path: z.string().min(1), content: z.string(),
      mode: z.enum(["rewrite", "append"]).default("rewrite")
    }
  }, async ({ deviceId, path: targetPath, content, mode }) =>
    textResult(await rpc(deviceId, "fs.write", { path: targetPath, content, mode })));

  server.registerTool("goreecloud.remote.execute_command", {
    description: "Execute a shell command when shell access is explicitly enabled on the agent.",
    inputSchema: {
      deviceId: z.string().min(1), command: z.string().min(1).max(8000),
      cwd: z.string().min(1).optional(), timeoutMs: z.number().int().positive().max(120000).optional()
    }
  }, async ({ deviceId, command, cwd, timeoutMs }) =>
    textResult(await rpc(deviceId, "process.exec", { command, cwd, timeoutMs })));

  return server;
}

app.get("/healthz", (_req, res) => res.json(brokerHealth()));

app.get("/api/status", requireAdmin, (_req, res) => res.json({ stats, devices: deviceSummary() }));

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

app.get("/dashboard", requireAdmin, (_req, res) => {
  const rows = deviceSummary().map((d) =>
    `<tr><td>${escapeHtml(d.id)}</td><td>${escapeHtml(d.connectedAt)}</td><td>${escapeHtml(d.lastSeen)}</td><td><pre>${escapeHtml(JSON.stringify(d.metadata, null, 2))}</pre></td></tr>`
  ).join("");
  res.type("html").send(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>GoreeCloud Remote MCP</title><style>
body{font-family:system-ui,sans-serif;max-width:1100px;margin:40px auto;padding:0 20px;background:#f7f8fa;color:#16181d}
.card{background:white;border:1px solid #dfe3ea;border-radius:16px;padding:20px;margin:16px 0}
table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:10px;border-bottom:1px solid #e7e9ee;vertical-align:top}
code,pre{font-family:ui-monospace,monospace}small{color:#656b76}</style></head><body>
<h1>GoreeCloud Remote MCP</h1><p><small>Development prototype · self-hosted broker</small></p>
<div class="card"><strong>Connected devices:</strong> ${devices.size}<br><strong>MCP requests:</strong> ${stats.mcpRequests}<br>
<strong>Agent RPCs:</strong> ${stats.agentRequests}<br><strong>Agent errors:</strong> ${stats.agentErrors}</div>
<div class="card"><table><thead><tr><th>Device</th><th>Connected</th><th>Last seen</th><th>Metadata</th></tr></thead>
<tbody>${rows || '<tr><td colspan="4">No devices connected.</td></tr>'}</tbody></table></div></body></html>`);
});

app.all("/mcp", requireMcpAuth, async (req, res) => {
  stats.mcpRequests += 1;
  const mcp = createMcpServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", async () => {
    try { await transport.close(); } catch {}
    try { await mcp.close(); } catch {}
  });
  try {
    await mcp.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    if (!res.headersSent) res.status(500).json({ error: "mcp_request_failed", detail: String(error?.message ?? error) });
  }
});

const httpServer = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

httpServer.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  if (url.pathname !== "/agent" || !safeEqual(bearer(req), deviceToken)) {
    socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
    socket.destroy();
    return;
  }
  const deviceId = url.searchParams.get("deviceId");
  if (!deviceId || !/^[A-Za-z0-9._-]{1,100}$/.test(deviceId)) {
    socket.write("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req, deviceId));
});

wss.on("connection", (ws, _req, deviceId) => {
  const previous = devices.get(deviceId);
  if (previous) {
    rejectPendingForConnection(previous.ws, new Error(`Device connection replaced: ${deviceId}`));
    if (previous.ws.readyState === 1) previous.ws.close(4000, "replaced");
  }
  const now = new Date().toISOString();
  const entry = { ws, connectedAt: now, lastSeen: now, metadata: {} };
  devices.set(deviceId, entry);

  ws.on("message", (raw) => {
    let message;
    try { message = JSON.parse(raw.toString("utf8")); }
    catch { return ws.close(1003, "invalid json"); }
    entry.lastSeen = new Date().toISOString();
    if (message.type === "hello") { entry.metadata = message.metadata ?? {}; return; }
    if (message.type === "response" && typeof message.id === "string") {
      const wait = pending.get(message.id);
      if (!wait || wait.ws !== ws) return;
      clearTimeout(wait.timer);
      pending.delete(message.id);
      if (message.ok) wait.resolve(message.result);
      else { stats.agentErrors += 1; wait.reject(new Error(message.error?.message ?? "Agent request failed")); }
    }
  });

  ws.on("close", () => {
    if (devices.get(deviceId)?.ws === ws) devices.delete(deviceId);
    rejectPendingForConnection(ws, new Error(`Device disconnected: ${deviceId}`));
  });
});

httpServer.listen(port, host, () => console.log(`GoreeCloud Remote MCP broker listening on http://${host}:${port}`));
