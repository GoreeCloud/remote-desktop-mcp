# GoreeCloud Remote MCP

**Status: Development prototype. Not production-approved.**

GoreeCloud Remote MCP is a self-hosted Model Context Protocol bridge intended to replace the paid relay portion of services such as Desktop Commander Remote MCP.

It is deliberately separate from the current `GoreeCloud/plugin` Phase 1 implementation. That repository is currently loopback-only and does not yet expose shell or filesystem capabilities.

## Recommended ChatGPT architecture

For ChatGPT, use **OpenAI Secure MCP Tunnel** rather than exposing this server publicly.

```text
ChatGPT
   |
   | OpenAI Secure MCP Tunnel
   v
127.0.0.1:8788/mcp
GoreeCloud Remote MCP broker
   ^
   | loopback WebSocket + device token
   |
Local device agent
```

Run the broker with `MCP_AUTH_MODE=none` only when `BROKER_HOST` is loopback. The broker enforces that restriction. The tunnel becomes the remote transport boundary.

ChatGPT custom MCP apps do not use arbitrary customer-provided static API keys as their normal authentication mechanism. For a public ChatGPT MCP endpoint, implement OAuth 2.1. For a private local MCP endpoint, use Secure MCP Tunnel and no MCP-layer authentication on loopback.

## Prototype tools

- `goreecloud.remote.list_devices`
- `goreecloud.remote.ping`
- `goreecloud.remote.list_directory`
- `goreecloud.remote.read_file`
- `goreecloud.remote.search_files`
- `goreecloud.remote.get_file_info`
- `goreecloud.remote.write_file` (agent opt-in)
- `goreecloud.remote.execute_command` (agent opt-in)

## Security defaults

- MCP endpoint defaults to bearer-token mode.
- No-auth MCP mode is accepted only on loopback.
- Agent WebSocket requires a separate device token.
- File access is restricted to configured roots.
- File mutation is disabled unless `AGENT_ALLOW_WRITE=true`.
- Shell execution is disabled unless `AGENT_ALLOW_SHELL=true`.
- Request/output sizes and RPC durations are bounded.
- The broker does not persist filesystem contents.

This is a prototype, not a production-security claim. Before public deployment, add accepted GoreeCloud Identity/Wardveil/Privacy Shield integration, durable audit logging, rate limits, credential rotation/revocation, monitoring, recovery, and rollback.

## ChatGPT tunnel mode

Install dependencies:

```bash
npm install --ignore-scripts
```

Start the broker:

```bash
MCP_AUTH_MODE=none \
BROKER_DEVICE_TOKEN=dev-device-token-123 \
BROKER_HOST=127.0.0.1 \
BROKER_PORT=8788 \
npm run broker
```

Start the local agent in another terminal:

```bash
BROKER_WS_URL=ws://127.0.0.1:8788/agent \
AGENT_DEVICE_TOKEN=dev-device-token-123 \
DEVICE_ID=personal-laptop \
AGENT_ALLOWED_ROOTS="$HOME" \
npm run agent
```

Configure OpenAI `tunnel-client` to forward to:

```text
http://127.0.0.1:8788/mcp
```

Creating the tunnel requires a `tunnel_id` and runtime Platform API key.

## OpenAI API chat CLI

When the Secure MCP Tunnel is running, the repository includes a small read-only CLI that sends a prompt to the OpenAI Responses API and lets the model call the approved GoreeCloud Remote MCP tools through the configured tunnel.

The CLI automatically looks for the API key in:

```text
~/.config/goreecloud-remote-mcp/tunnel.env
```

and for the tunnel ID in:

```text
~/.config/tunnel-client/goreecloud-remote-mcp.yaml
```

Run:

```bash
npm run chat -- "List the files in my Documents folder"
```

Choose another available model when needed:

```bash
npm run chat -- --model gpt-6-astra "Search my home directory for files named privacy"
```

The CLI allows only the read-only MCP tool set by default:

- device listing and ping
- directory listing
- file reading
- file search
- file metadata

It does not expose `write_file` or `execute_command`, even if those capabilities are later enabled on the device agent.

## Local token-auth test

```bash
MCP_AUTH_MODE=token \
MCP_BEARER_TOKEN=dev-mcp-token-123 \
BROKER_DEVICE_TOKEN=dev-device-token-123 \
BROKER_HOST=127.0.0.1 \
BROKER_PORT=8788 \
npm run broker
```

Automated smoke test:

```bash
npm run check
npm run smoke
```

## Optional public deployment

For non-ChatGPT clients that require a public endpoint, terminate TLS at a trusted reverse proxy and add standards-compliant authentication and authorization before exposing the broker. Keep device-agent connections outbound-only.

Do not expose this Development prototype publicly until authentication/authorization, abuse-control, audit, recovery, monitoring, and rollback gates are accepted.

## Cost model

The code has no metered relay service and no built-in monthly tool-call quota. Remaining costs and limits depend on whatever infrastructure/networking you choose and on the MCP client's own plan, API, or tunnel requirements.
