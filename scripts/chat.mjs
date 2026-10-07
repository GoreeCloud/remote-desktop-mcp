#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const READ_ONLY_TOOLS = [
  "goreecloud.remote.list_devices",
  "goreecloud.remote.get_health",
  "goreecloud.remote.get_device_capabilities",
  "goreecloud.remote.get_device_health",
  "goreecloud.remote.ping",
  "goreecloud.remote.list_directory",
  "goreecloud.remote.read_file",
  "goreecloud.remote.read_file_chunk",
  "goreecloud.remote.search_files",
  "goreecloud.remote.get_file_info",
];

function loadSimpleEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;

    let value = rawValue.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function readTunnelId(profilePath) {
  if (process.env.OPENAI_TUNNEL_ID) return process.env.OPENAI_TUNNEL_ID;
  if (!fs.existsSync(profilePath)) return null;

  const text = fs.readFileSync(profilePath, "utf8");
  const match = text.match(/^\s*tunnel_id:\s*["']?([^"'\s#]+)["']?/m);
  return match?.[1] ?? null;
}

function parseArgs(argv) {
  const args = [...argv];
  let model = process.env.OPENAI_MODEL || "gpt-6.1-sol";
  let json = false;
  const promptParts = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--model") {
      if (!args[i + 1]) throw new Error("--model requires a value");
      model = args[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--json") {
      json = true;
      continue;
    }
    promptParts.push(arg);
  }

  return { model, json, prompt: promptParts.join(" ").trim() };
}

async function localReadyCheck() {
  const url = process.env.TUNNEL_HEALTH_URL || "http://127.0.0.1:8080/readyz";
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
    const text = (await response.text()).trim();
    if (!response.ok || text !== "ready") {
      throw new Error(`${response.status} ${text}`);
    }
  } catch (error) {
    throw new Error(
      `Secure MCP Tunnel is not ready at ${url}. Check goreecloud-remote-mcp-tunnel.service. (${error.message})`,
    );
  }
}

function extractOutputText(data) {
  const chunks = [];
  for (const item of data.output ?? []) {
    if (item.type !== "message") continue;
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text) chunks.push(content.text);
    }
  }
  return chunks.join("\n").trim();
}

const configDir = path.join(os.homedir(), ".config", "goreecloud-remote-mcp");
loadSimpleEnvFile(path.join(configDir, "tunnel.env"));

const profilePath =
  process.env.TUNNEL_PROFILE_PATH ||
  path.join(os.homedir(), ".config", "tunnel-client", "goreecloud-remote-mcp.yaml");

const { model, json, prompt } = parseArgs(process.argv.slice(2));

if (!prompt) {
  console.error('Usage: npm run chat -- "List the files in my Documents folder"');
  console.error("Optional: --model gpt-6-astra | --json");
  process.exit(2);
}

const apiKey = process.env.OPENAI_API_KEY || process.env.CONTROL_PLANE_API_KEY;
if (!apiKey) {
  console.error(
    "Missing OpenAI API key. Set OPENAI_API_KEY or CONTROL_PLANE_API_KEY, or store CONTROL_PLANE_API_KEY in ~/.config/goreecloud-remote-mcp/tunnel.env.",
  );
  process.exit(2);
}

const tunnelId = readTunnelId(profilePath);
if (!tunnelId) {
  console.error(
    "Missing tunnel ID. Set OPENAI_TUNNEL_ID or configure ~/.config/tunnel-client/goreecloud-remote-mcp.yaml.",
  );
  process.exit(2);
}

await localReadyCheck();

const response = await fetch("https://api.openai.com/v1/responses", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    model,
    input: prompt,
    tools: [
      {
        type: "mcp",
        server_label: "goreecloud_remote",
        server_description:
          "Private GoreeCloud Remote MCP broker for the local authorized device.",
        tunnel_id: tunnelId,
        require_approval: "never",
        allowed_tools: READ_ONLY_TOOLS,
      },
    ],
  }),
  signal: AbortSignal.timeout(
    Number.parseInt(process.env.OPENAI_REQUEST_TIMEOUT_MS || "120000", 10),
  ),
});

const bodyText = await response.text();
let data;
try {
  data = JSON.parse(bodyText);
} catch {
  throw new Error(`OpenAI returned non-JSON HTTP ${response.status}: ${bodyText.slice(0, 500)}`);
}

if (!response.ok || data.error) {
  const message = data.error?.message || `HTTP ${response.status}`;
  throw new Error(`OpenAI API request failed: ${message}`);
}

if (json) {
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}

const outputText = extractOutputText(data);
if (outputText) {
  console.log(outputText);
} else {
  console.log("Request completed, but no output_text was returned.");
}

const totalTokens = data.usage?.total_tokens;
if (totalTokens !== undefined) {
  console.error(`\n[model=${model} total_tokens=${totalTokens}]`);
}
