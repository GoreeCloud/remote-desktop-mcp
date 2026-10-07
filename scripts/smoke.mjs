import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const cwd = new URL("../", import.meta.url);
const fixtureDir = await fs.mkdtemp(path.join(process.cwd(), ".remote-mcp-smoke-"));
const largeFilePath = path.join(fixtureDir, "large.txt");
const largeContents = Buffer.concat([Buffer.from("large-file-test:"), Buffer.alloc(1048576, 0x61), Buffer.from("Ω")]);
await fs.writeFile(largeFilePath, largeContents);
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
  const brokerHealth = await callTool("goreecloud.remote.get_health", {}, 100);
  const capabilities = await callTool("goreecloud.remote.get_device_capabilities", {
    deviceId: "smoke-device"
  }, 101);
  const deviceHealth = await callTool("goreecloud.remote.get_device_health", {
    deviceId: "smoke-device"
  }, 102);
  const ping = await callTool("goreecloud.remote.ping", { deviceId: "smoke-device" }, 103);
  const dir = await callTool("goreecloud.remote.list_directory", {
    deviceId: "smoke-device", path: process.cwd(), offset: 0, limit: 1
  }, 104);
  const dirNext = await callTool("goreecloud.remote.list_directory", {
    deviceId: "smoke-device", path: process.cwd(), offset: 1, limit: 1
  }, 105);
  const finalPage = await callTool("goreecloud.remote.list_directory", {
    deviceId: "smoke-device", path: process.cwd(), offset: 100000, limit: 3
  }, 106);
  const deniedOutsideRoot = await callTool("goreecloud.remote.list_directory", {
    deviceId: "smoke-device", path: process.cwd() + "/.."
  }, 107);
  const rejectedPageLimit = await callTool("goreecloud.remote.list_directory", {
    deviceId: "smoke-device", path: process.cwd(), limit: 1001
  }, 108);
  const read = await callTool("goreecloud.remote.read_file", {
    deviceId: "smoke-device", path: process.cwd() + "/package.json", offset: 0, length: 20
  }, 109);
  const ordinaryLargeRead = await callTool("goreecloud.remote.read_file", {
    deviceId: "smoke-device", path: largeFilePath
  }, 112);
  const chunkStart = await callTool("goreecloud.remote.read_file_chunk", {
    deviceId: "smoke-device", path: largeFilePath, offset: 0, length: 16
  }, 113);
  const chunkNext = await callTool("goreecloud.remote.read_file_chunk", {
    deviceId: "smoke-device", path: largeFilePath, offset: 16, length: 64
  }, 114);
  const chunkTail = await callTool("goreecloud.remote.read_file_chunk", {
    deviceId: "smoke-device", path: largeFilePath, offset: largeContents.length - 2, length: 20
  }, 115);
  const chunkEmpty = await callTool("goreecloud.remote.read_file_chunk", {
    deviceId: "smoke-device", path: largeFilePath, offset: largeContents.length
  }, 116);
  const deniedChunkLimit = await callTool("goreecloud.remote.read_file_chunk", {
    deviceId: "smoke-device", path: largeFilePath, length: 65537
  }, 117);
  const deniedChunkRoot = await callTool("goreecloud.remote.read_file_chunk", {
    deviceId: "smoke-device", path: process.cwd() + "/.."
  }, 118);
  const nameSearch = await callTool("goreecloud.remote.search_files", {
    deviceId: "smoke-device", root: process.cwd(), query: "PACKAGE.JSON",
    mode: "name", maxResults: 1
  }, 119);
  const caseSearch = await callTool("goreecloud.remote.search_files", {
    deviceId: "smoke-device", root: process.cwd(), query: "PACKAGE.JSON",
    mode: "name", caseSensitive: true, maxResults: 10
  }, 120);
  const deniedWrite = await callTool("goreecloud.remote.write_file", {
    deviceId: "smoke-device", path: process.cwd() + "/smoke-write.txt", content: "should-not-write"
  }, 110);
  const deniedShell = await callTool("goreecloud.remote.execute_command", {
    deviceId: "smoke-device", command: "pwd", cwd: process.cwd()
  }, 111);

  const firstPage = dir.result?.structuredContent;
  const secondPage = dirNext.result?.structuredContent;

  requireTrue(JSON.stringify(list).includes("smoke-device"), "list_devices", list);
  requireTrue(brokerHealth.result?.structuredContent?.connectedDevices === 1, "broker health", brokerHealth);
  requireTrue(capabilities.result?.structuredContent?.filesystem?.write === false, "capability write state", capabilities);
  requireTrue(capabilities.result?.structuredContent?.filesystem?.directoryPagination === true, "directory pagination capability", capabilities);
  requireTrue(deviceHealth.result?.structuredContent?.status === "ready", "device health", deviceHealth);
  requireTrue(ping.result?.structuredContent?.ok === true, "ping", ping);
  requireTrue(firstPage?.entries?.length === 1, "list_directory first page", dir);
  requireTrue(firstPage?.totalEntries >= 2, "list_directory total entries", dir);
  requireTrue(firstPage?.nextOffset === 1, "list_directory next offset", dir);
  requireTrue(secondPage?.entries?.length === 1, "list_directory second page", dirNext);
  requireTrue(firstPage?.entries?.[0]?.name !== secondPage?.entries?.[0]?.name, "list_directory ordered pagination", { dir, dirNext });
  requireTrue(finalPage.result?.structuredContent?.entries?.length === 0, "list_directory empty final page", finalPage);
  requireTrue(finalPage.result?.structuredContent?.nextOffset === null, "list_directory completed pagination", finalPage);
  requireTrue(JSON.stringify(deniedOutsideRoot).includes("outside configured allowed roots"), "allowed-root confinement", deniedOutsideRoot);
  requireTrue(JSON.stringify(rejectedPageLimit).includes("Number must be less than or equal to 1000"), "oversized directory-page denial", rejectedPageLimit);
  requireTrue(JSON.stringify(read).includes("goreecloud-remote-mcp"), "read_file", read);
  requireTrue(JSON.stringify(ordinaryLargeRead).includes("File exceeds AGENT_MAX_READ_BYTES"), "ordinary size ceiling", ordinaryLargeRead);
  const start = chunkStart.result?.structuredContent;
  const next = chunkNext.result?.structuredContent;
  const tail = chunkTail.result?.structuredContent;
  const empty = chunkEmpty.result?.structuredContent;
  requireTrue(start?.encoding === "base64" && start?.byteLength === 16, "bounded chunk", chunkStart);
  requireTrue(Buffer.from(start.content, "base64").equals(largeContents.subarray(0, 16)), "chunk byte fidelity", chunkStart);
  requireTrue(start?.nextOffset === 16 && !start?.eof, "chunk continuation", chunkStart);
  requireTrue(next?.offset === 16 && next?.nextOffset === 80, "chunk second page", chunkNext);
  requireTrue(Buffer.from(next.content, "base64").equals(largeContents.subarray(16, 80)), "chunk second page fidelity", chunkNext);
  requireTrue(tail?.byteLength === 2 && tail?.eof === true && tail?.nextOffset === null, "chunk final page", chunkTail);
  requireTrue(Buffer.from(tail.content, "base64").equals(largeContents.subarray(-2)), "chunk Unicode bytes", chunkTail);
  requireTrue(empty?.byteLength === 0 && empty?.eof === true, "chunk empty EOF", chunkEmpty);
  requireTrue(JSON.stringify(deniedChunkLimit).includes("Number must be less than or equal to 65536"), "chunk limit rejection", deniedChunkLimit);
  requireTrue(JSON.stringify(deniedChunkRoot).includes("outside configured allowed roots"), "chunk root rejection", deniedChunkRoot);
  const searched = nameSearch.result?.structuredContent;
  const cased = caseSearch.result?.structuredContent;
  requireTrue(searched?.results?.length === 1 && searched?.truncationReason === "result_limit", "bounded search result", nameSearch);
  requireTrue(searched?.caseSensitive === false && searched?.searchTimeoutMs > 0, "search parameters", nameSearch);
  requireTrue(cased?.results?.length === 0 && cased?.caseSensitive === true && cased?.truncated === false, "case-sensitive search", caseSearch);
  requireTrue(JSON.stringify(deniedWrite).includes("File writes are disabled"), "write denial", deniedWrite);
  requireTrue(JSON.stringify(deniedShell).includes("Shell execution is disabled"), "shell denial", deniedShell);

  console.log("health:", JSON.stringify(health));
  console.log("SMOKE PASS: diagnostics, byte-range large-file reads, bounded searches, pagination, root confinement, and fail-closed mutation controls");
} finally {
  stop();
  await fs.rm(fixtureDir, { recursive: true, force: true });
}
