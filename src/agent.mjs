import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import WebSocket from "ws";

const brokerUrl = process.env.BROKER_WS_URL ?? "ws://127.0.0.1:8788/agent";
const deviceId = process.env.DEVICE_ID ?? os.hostname();
const token = process.env.AGENT_DEVICE_TOKEN;
const allowWrite = /^true$/i.test(process.env.AGENT_ALLOW_WRITE ?? "false");
const allowShell = /^true$/i.test(process.env.AGENT_ALLOW_SHELL ?? "false");
const maxReadBytes = Number(process.env.AGENT_MAX_READ_BYTES ?? "1048576");
const maxWriteBytes = Number(process.env.AGENT_MAX_WRITE_BYTES ?? "1048576");
const maxCommandOutputBytes = Number(process.env.AGENT_MAX_COMMAND_OUTPUT_BYTES ?? "1048576");
const commandTimeoutMs = Number(process.env.AGENT_COMMAND_TIMEOUT_MS ?? "30000");
const agentVersion = "0.1.0";
const protocolVersion = "1";
const startedAt = new Date().toISOString();
const maxDirectoryPageSize = 1000;
const maxSearchResults = 200;
const maxSearchEntries = 10000;

if (!token || token.length < 8) throw new Error("AGENT_DEVICE_TOKEN is required and must be at least 8 characters.");

const configuredRoots = (process.env.AGENT_ALLOWED_ROOTS ?? os.homedir()).split(":").map((v) => v.trim()).filter(Boolean)
  .map((v) => path.resolve(v.replace(/^~(?=\/|$)/, os.homedir())));
if (configuredRoots.length === 0) throw new Error("At least one AGENT_ALLOWED_ROOTS path is required.");

const blockedCommands = new Set([
  "sudo","su","passwd","useradd","adduser","usermod","groupadd","mkfs","fdisk","parted","dd","mount","umount",
  "shutdown","reboot","halt","poweroff","iptables","nft"
]);
let allowedRoots = [];

async function initializeRoots() {
  allowedRoots = await Promise.all(configuredRoots.map(async (root) => await fs.realpath(root)));
}

function capabilitySummary() {
  return {
    protocolVersion,
    agentVersion,
    platform: {
      hostname: os.hostname(),
      os: os.platform(),
      arch: os.arch(),
      node: process.version
    },
    filesystem: {
      read: true,
      search: true,
      write: allowWrite,
      allowedRoots: [...allowedRoots],
      directoryPagination: true,
      limits: {
        maxReadBytes,
        maxWriteBytes,
        maxDirectoryPageSize,
        maxSearchResults,
        maxSearchEntries
      }
    },
    execution: {
      shell: allowShell,
      interactiveSessions: false,
      processManagement: false,
      limits: {
        maxCommandOutputBytes,
        commandTimeoutMs,
        maximumCommandTimeoutMs: 120000
      }
    }
  };
}

function healthSummary() {
  return {
    ok: true,
    status: "ready",
    deviceId,
    agentVersion,
    protocolVersion,
    startedAt,
    uptimeSeconds: Math.floor(process.uptime()),
    time: new Date().toISOString(),
    allowedRootCount: allowedRoots.length,
    capabilities: {
      read: true,
      search: true,
      write: allowWrite,
      shell: allowShell
    }
  };
}

function isInside(candidate, root) { return candidate === root || candidate.startsWith(root + path.sep); }

async function resolveExisting(input) {
  const absolute = path.resolve(input.replace(/^~(?=\/|$)/, os.homedir()));
  const real = await fs.realpath(absolute);
  if (!allowedRoots.some((root) => isInside(real, root))) throw new Error("Path is outside configured allowed roots.");
  return real;
}

async function resolveForWrite(input) {
  const absolute = path.resolve(input.replace(/^~(?=\/|$)/, os.homedir()));
  const parent = await fs.realpath(path.dirname(absolute));
  const candidate = path.join(parent, path.basename(absolute));
  if (!allowedRoots.some((root) => isInside(candidate, root))) throw new Error("Path is outside configured allowed roots.");
  return candidate;
}

async function readFile(params) {
  const target = await resolveExisting(params.path);
  const stat = await fs.stat(target);
  if (!stat.isFile()) throw new Error("Target is not a regular file.");
  if (stat.size > maxReadBytes) throw new Error(`File exceeds AGENT_MAX_READ_BYTES (${maxReadBytes}).`);
  const text = await fs.readFile(target, "utf8");
  const lines = text.split(/\r?\n/);
  const offset = params.offset ?? 0;
  const length = params.length ?? Math.min(1000, Math.max(0, lines.length - offset));
  return { path: target, offset, length, totalLines: lines.length, content: lines.slice(offset, offset + length).join("\n") };
}

async function listDirectory(params) {
  const target = await resolveExisting(params.path);
  const entries = (await fs.readdir(target, { withFileTypes: true }))
    .sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  const offset = Math.max(0, Number(params.offset ?? 0));
  const limit = Math.min(Math.max(1, Number(params.limit ?? maxDirectoryPageSize)), maxDirectoryPageSize);
  const page = entries.slice(offset, offset + limit);
  const out = [];
  for (const entry of page) {
    const full = path.join(target, entry.name);
    let size = null;
    try { if (entry.isFile()) size = (await fs.stat(full)).size; } catch {}
    out.push({ name: entry.name, type: entry.isDirectory() ? "directory" : entry.isFile() ? "file" : "other", size });
  }
  const nextOffset = offset + out.length < entries.length ? offset + out.length : null;
  return {
    path: target,
    offset,
    limit,
    totalEntries: entries.length,
    entries: out,
    truncated: nextOffset !== null,
    nextOffset
  };
}

async function fileInfo(params) {
  const target = await resolveExisting(params.path);
  const stat = await fs.stat(target);
  return {
    path: target, type: stat.isDirectory() ? "directory" : stat.isFile() ? "file" : "other", size: stat.size,
    mode: (stat.mode & 0o777).toString(8), modifiedAt: stat.mtime.toISOString(), createdAt: stat.birthtime.toISOString()
  };
}

async function writeFile(params) {
  if (!allowWrite) throw new Error("File writes are disabled on this agent.");
  const content = String(params.content ?? "");
  if (Buffer.byteLength(content) > maxWriteBytes) throw new Error(`Write exceeds AGENT_MAX_WRITE_BYTES (${maxWriteBytes}).`);
  const target = await resolveForWrite(params.path);
  if (params.mode === "append") await fs.appendFile(target, content, "utf8");
  else await fs.writeFile(target, content, "utf8");
  const stat = await fs.stat(target);
  return { ok: true, path: target, size: stat.size, mode: params.mode ?? "rewrite" };
}

async function searchFiles(params) {
  const root = await resolveExisting(params.root);
  const query = String(params.query ?? "").toLowerCase();
  const mode = params.mode === "content" ? "content" : "name";
  const requestedMaxResults = Number(params.maxResults ?? 50);
  const resultLimit = Math.min(Math.max(1, requestedMaxResults), maxSearchResults);
  const results = [], queue = [root];
  let scanned = 0;
  const maxEntries = maxSearchEntries;

  while (queue.length && results.length < resultLimit && scanned < maxEntries) {
    const dir = queue.shift();
    let entries;
    try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries) {
      scanned += 1;
      if (scanned >= maxEntries || results.length >= resultLimit) break;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!["node_modules", ".git", ".cache"].includes(entry.name)) queue.push(full);
        continue;
      }
      if (!entry.isFile()) continue;
      if (mode === "name") {
        if (entry.name.toLowerCase().includes(query)) results.push({ path: full, match: "name" });
        continue;
      }
      try {
        const stat = await fs.stat(full);
        if (stat.size > Math.min(maxReadBytes, 256 * 1024)) continue;
        const content = await fs.readFile(full, "utf8");
        const index = content.toLowerCase().indexOf(query);
        if (index >= 0) {
          const start = Math.max(0, index - 120), end = Math.min(content.length, index + query.length + 240);
          results.push({ path: full, match: "content", excerpt: content.slice(start, end) });
        }
      } catch {}
    }
  }
  return { root, mode, query: params.query, scanned, results, truncated: scanned >= maxEntries };
}

function firstCommands(command) {
  return command.split(/[;&|]+/).map((part) => part.trim().split(/\s+/)[0]).map((v) => path.basename(v ?? "")).filter(Boolean);
}

async function executeCommand(params) {
  if (!allowShell) throw new Error("Shell execution is disabled on this agent.");
  const command = String(params.command ?? "");
  for (const name of firstCommands(command)) if (blockedCommands.has(name)) throw new Error(`Blocked command: ${name}`);
  const cwd = params.cwd ? await resolveExisting(params.cwd) : allowedRoots[0];
  const timeoutMs = Math.min(Number(params.timeoutMs ?? commandTimeoutMs), 120000);
  const safeEnv = {
    PATH: process.env.PATH ?? "/usr/local/bin:/usr/bin:/bin", HOME: os.homedir(), USER: os.userInfo().username,
    LANG: process.env.LANG ?? "C.UTF-8", TERM: "dumb"
  };

  return await new Promise((resolve, reject) => {
    const child = spawn("/bin/bash", ["-lc", command], { cwd, env: safeEnv, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = Buffer.alloc(0), stderr = Buffer.alloc(0), outputExceeded = false;
    const collect = (current, chunk) => {
      const next = Buffer.concat([current, chunk]);
      if (next.length > maxCommandOutputBytes) { outputExceeded = true; return next.subarray(0, maxCommandOutputBytes); }
      return next;
    };
    child.stdout.on("data", (chunk) => { stdout = collect(stdout, chunk); });
    child.stderr.on("data", (chunk) => { stderr = collect(stderr, chunk); });
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    child.on("error", (error) => { clearTimeout(timer); reject(error); });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal, stdout: stdout.toString("utf8"), stderr: stderr.toString("utf8"), outputTruncated: outputExceeded });
    });
  });
}

const actions = new Map([
  ["ping", async () => ({
    ok: true, deviceId, hostname: os.hostname(), platform: os.platform(), arch: os.arch(), time: new Date().toISOString(),
    capabilities: { read: true, search: true, write: allowWrite, shell: allowShell }
  })],
  ["device.capabilities", async () => capabilitySummary()],
  ["device.health", async () => healthSummary()],
  ["fs.list", listDirectory], ["fs.read", readFile], ["fs.info", fileInfo], ["fs.write", writeFile],
  ["fs.search", searchFiles], ["process.exec", executeCommand]
]);

async function connect() {
  await initializeRoots();
  const url = new URL(brokerUrl);
  url.searchParams.set("deviceId", deviceId);
  const ws = new WebSocket(url, { headers: { Authorization: `Bearer ${token}` } });

  ws.on("open", () => {
    ws.send(JSON.stringify({
      type: "hello",
      metadata: {
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        node: process.version,
        agentVersion,
        protocolVersion,
        allowedRoots,
        capabilities: {
          read: true,
          search: true,
          write: allowWrite,
          shell: allowShell,
          directoryPagination: true,
          capabilityDiscovery: true,
          healthReporting: true
        }
      }
    }));
    console.log(`Agent connected as ${deviceId} to ${url.origin}`);
  });

  ws.on("message", async (raw) => {
    let request;
    try { request = JSON.parse(raw.toString("utf8")); } catch { return; }
    if (request.type !== "request" || typeof request.id !== "string") return;
    const handler = actions.get(request.action);
    if (!handler) {
      ws.send(JSON.stringify({ type: "response", id: request.id, ok: false, error: { message: `Unknown action: ${request.action}` } }));
      return;
    }
    try {
      const result = await handler(request.params ?? {});
      ws.send(JSON.stringify({ type: "response", id: request.id, ok: true, result }));
    } catch (error) {
      ws.send(JSON.stringify({ type: "response", id: request.id, ok: false, error: { message: String(error?.message ?? error) } }));
    }
  });

  ws.on("close", () => {
    console.error("Agent disconnected; reconnecting in 2 seconds.");
    setTimeout(connect, 2000);
  });
  ws.on("error", (error) => console.error("Agent WebSocket error:", error.message));
}

connect().catch((error) => { console.error(error); process.exitCode = 1; });
