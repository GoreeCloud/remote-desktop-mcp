# GoreeCloud Remote MCP

**Lifecycle:** Forge
**Deployment state:** Development
**Current baseline:** Private read-only path validated
**Production status:** Not production-approved

GoreeCloud Remote MCP is a self-hosted Model Context Protocol bridge designed to replace the paid relay portion of remote MCP services while keeping the device-facing agent under GoreeCloud/user control.

It is deliberately separate from the current `GoreeCloud/plugin` foundation. This repository focuses on remote device access; the plugin project remains the broader GoreeCloud conversational integration layer.

## Current working architecture

The validated deployment uses the OpenAI Responses API and OpenAI Secure MCP Tunnel:

```text
npm run chat -- "..."
        |
        v
OpenAI Responses API
        |
        | MCP tool call + tunnel_id
        v
OpenAI Secure MCP Tunnel
        ^
        | outbound HTTPS
        |
tunnel-client on laptop
        |
        v
http://127.0.0.1:8788/mcp
GoreeCloud Remote MCP broker
        ^
        | authenticated local WebSocket
        |
Local device agent
        |
        v
Approved local filesystem roots
```

The broker is not exposed directly to the public Internet in this mode.

## Working status

The current implementation has been validated end-to-end for read-only access:

- broker and agent run as persistent systemd user services;
- OpenAI `tunnel-client` runs as a persistent systemd user service;
- the tunnel reports `live` and `ready`;
- the broker sees the connected device;
- the Responses API can discover and call the MCP tools through the tunnel;
- `npm run chat` can list devices, inspect broker/device health, inspect device capabilities, page through directories, read files, search files, inspect metadata, and ping the agent;
- directory listing supports deterministically ordered bounded pagination;
- approved files larger than the ordinary text-read limit can be read in base64 byte chunks (up to 64 KiB each);
- filesystem search supports case sensitivity, bounded cooperative runtime, deterministic traversal, and explicit truncation reasons;
- broker RPC replies are bound to the exact authenticated agent connection, preventing cross-device reply substitution;
- replaced agent connections fail pending old requests without affecting the replacement agent's requests;
- file writes and shell execution remain disabled.

See [Validation Record](docs/VALIDATION.md) for the recorded checks.

## Canonical documentation entry points

The canonical starting point for the repository is this `README.md`.

The full operational runbook is [`docs/SETUP-AND-OPERATIONS.md`](docs/SETUP-AND-OPERATIONS.md).

The current documentation and deployment baseline includes:

- `README.md` — current working state, architecture, quick-use commands, tool list, security defaults, cost model, and documentation index.
- `docs/ARCHITECTURE.md` — full OpenAI API → Secure MCP Tunnel → broker → agent → filesystem architecture, components, trust boundaries, and deployment modes.
- `docs/SETUP-AND-OPERATIONS.md` — complete installation and operations runbook: credentials, broker/agent setup, tunnel creation, `tunnel-client`, systemd, API CLI, health checks, updating, troubleshooting, rotation, removal, and write/shell considerations.
- `docs/SPECIFICATIONS.md` — current Development requirements and accepted read-only boundary.
- `docs/FEATURES.md` and `docs/IMPLEMENTED-FEATURES.md` — current Development functionality and verified source implementation lifecycle.
- `docs/PLANNED-FEATURES.md` — long-term capability roadmap and production acceptance direction.
- `docs/CHANGELOGS.md` — repository-native change history.
- `docs/VALIDATION.md` — recorded Node/npm/`tunnel-client` versions, service status, health/readiness checks, audit/smoke results, end-to-end Responses API validation, reconnect testing, and remaining production blockers.
- `.github/SECURITY.md` and `docs/PRIVACY.md` — current security and privacy boundaries.
- `deploy/systemd/goreecloud-remote-mcp-tunnel.service` — reproducible persistent tunnel service.
- `deploy/systemd/tunnel.env.example` — safe example of the runtime tunnel credential file.

## Quick use

After the one-time setup is complete:

```bash
npm run chat -- "List the files in my Documents folder"
```

Read a text file:

```bash
npm run chat -- "Read ~/Documents/example.md and summarize it"
```

Search:

```bash
npm run chat -- "Search my home directory for files containing Wardveil"
```

Use another available model:

```bash
npm run chat -- --model gpt-6-astra \
  "Search my home directory for files named privacy"
```

For installation, tunnel setup, systemd configuration, updates, troubleshooting, key rotation, and removal, see [Setup and Operations Guide](docs/SETUP-AND-OPERATIONS.md).

## Prototype tools

Read-only tools currently allowed by the OpenAI API CLI:

- `goreecloud.remote.list_devices`
- `goreecloud.remote.get_health`
- `goreecloud.remote.get_device_capabilities`
- `goreecloud.remote.get_device_health`
- `goreecloud.remote.ping`
- `goreecloud.remote.list_directory`
- `goreecloud.remote.read_file`
- `goreecloud.remote.read_file_chunk`
- `goreecloud.remote.search_files`
- `goreecloud.remote.get_file_info`

Implemented but deliberately excluded from the chat CLI:

- `goreecloud.remote.write_file` — agent opt-in
- `goreecloud.remote.execute_command` — agent opt-in

## Security defaults

- broker binds to loopback by default;
- no-auth MCP mode is accepted only on loopback;
- agent WebSocket uses a separate device token;
- filesystem access is restricted to configured roots;
- write access defaults to disabled;
- shell execution defaults to disabled;
- request, output, read, write, and command durations are bounded;
- runtime secrets are stored outside the repository;
- the chat CLI applies an explicit read-only MCP tool allowlist;
- the broker does not persist filesystem contents.

See [Security Notes](.github/SECURITY.md), [Privacy](docs/PRIVACY.md), and [Architecture](docs/ARCHITECTURE.md).

## Local development

Install dependencies:

```bash
npm install --ignore-scripts
```

Run syntax checks and local smoke validation:

```bash
npm run check
npm audit --audit-level=high
npm run smoke
```

The smoke command runs both the read-only agent checks and an isolated adversarial broker security suite covering MCP/agent authentication, malformed device identifiers, connection replacement, cross-device RPC reply isolation, and disabled administrator access. To run the adversarial checks alone, use `npm run security-smoke`.

For local bearer-token testing without the OpenAI tunnel:

```bash
MCP_AUTH_MODE=token \
MCP_BEARER_TOKEN=dev-mcp-token-123 \
BROKER_DEVICE_TOKEN=dev-device-token-123 \
BROKER_HOST=127.0.0.1 \
BROKER_PORT=8788 \
npm run broker
```

Start an agent in another terminal:

```bash
BROKER_WS_URL=ws://127.0.0.1:8788/agent \
AGENT_DEVICE_TOKEN=dev-device-token-123 \
DEVICE_ID=personal-laptop \
AGENT_ALLOWED_ROOTS="$HOME" \
npm run agent
```

## Documentation

- [Specifications](docs/SPECIFICATIONS.md)
- [Features](docs/FEATURES.md)
- [Implemented Features](docs/IMPLEMENTED-FEATURES.md)
- [Planned Features and Capabilities](docs/PLANNED-FEATURES.md)
- [Changelog](docs/CHANGELOGS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Setup and Operations Guide](docs/SETUP-AND-OPERATIONS.md)
- [User Manual](docs/USER-MANUAL.md)
- [Validation Record](docs/VALIDATION.md)
- [Security Notes](.github/SECURITY.md)
- [Privacy](docs/PRIVACY.md)
- [Benefits](docs/BENEFITS.md)
- [Competitive Objectives](docs/COMPETITIVE-OBJECTIVES.md)
- [Branding](docs/BRANDING.md)
- [Notes](docs/NOTES.md)
- [Example environment](.env.example)
- [systemd broker service](deploy/systemd/goreecloud-remote-mcp-broker.service)
- [systemd agent service](deploy/systemd/goreecloud-remote-mcp-agent.service)
- [systemd tunnel service](deploy/systemd/goreecloud-remote-mcp-tunnel.service)
- [tunnel environment example](deploy/systemd/tunnel.env.example)

## Cost model

The GoreeCloud code has no built-in monthly relay subscription and no metered MCP-tool-call quota.

External services can still have their own costs and limits. In the current deployment, OpenAI API usage is billed separately according to the selected API model and account, and the CLI prints total tokens after each completed request.

## Production status

This repository is a Development prototype.

Before public deployment or privileged operations, separately design and accept identity/authorization, Wardveil Security controls, Privacy Shield evaluation, durable audit, rate limiting, credential rotation/revocation, monitoring, recovery, rollback, controlled writes, command authorization, and destructive-action confirmation.
