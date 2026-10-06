# Architecture

**Status:** Development prototype
**Current operating mode:** private, read-only OpenAI API access through Secure MCP Tunnel

## Purpose

GoreeCloud Remote MCP is a self-hosted replacement for the paid relay portion of remote MCP products. It keeps the filesystem-facing agent on the user's own device while allowing an approved remote MCP client to reach that device through a controlled transport.

The project is intentionally separate from the GoreeCloud ChatGPT Plugin foundation. The plugin project remains the broader conversational integration layer, while this repository focuses on remote device access.

## Current architecture

```text
User command
   |
   | npm run chat -- "..."
   v
scripts/chat.mjs
   |
   | OpenAI Responses API
   v
OpenAI model
   |
   | MCP tool call associated with tunnel_id
   v
OpenAI Secure MCP Tunnel
   ^
   | outbound HTTPS
   |
tunnel-client on the laptop
   |
   | loopback HTTP
   v
http://127.0.0.1:8788/mcp
GoreeCloud Remote MCP broker
   ^
   | authenticated local WebSocket
   |
GoreeCloud device agent
   |
   | OS-account permissions + allowed-root policy
   v
Approved local filesystem roots
```

No inbound Internet port is required for the current tunnel deployment. The MCP broker remains bound to loopback.

## Components

### Broker

Entry point:

```text
src/broker.mjs
```

Responsibilities:

- exposes the Streamable HTTP MCP endpoint at `/mcp`;
- exposes `/healthz`;
- maintains the connected-device registry;
- forwards approved device RPC calls to the agent;
- enforces MCP authentication mode;
- refuses unauthenticated MCP mode when bound to a non-loopback address.

Current tunnel deployment:

```text
BROKER_HOST=127.0.0.1
BROKER_PORT=8788
MCP_AUTH_MODE=none
```

`MCP_AUTH_MODE=none` is used only because the broker is loopback-only and the OpenAI tunnel is the remote transport boundary.

### Device agent

Entry point:

```text
src/agent.mjs
```

Responsibilities:

- establishes an outbound WebSocket connection to the broker;
- authenticates with a separate device token;
- resolves and validates filesystem paths;
- constrains access to configured roots;
- performs read operations;
- exposes optional write and shell capabilities only when explicitly enabled.

Current deployment:

```text
AGENT_ALLOWED_ROOTS=<local home directory>
AGENT_ALLOW_WRITE=false
AGENT_ALLOW_SHELL=false
```

### OpenAI Secure MCP Tunnel client

The OpenAI `tunnel-client` runs on the same laptop as the broker because it must be able to reach:

```text
http://127.0.0.1:8788/mcp
```

The tunnel client makes outbound connections to OpenAI and presents the private MCP server through the configured tunnel resource.

The runtime tunnel profile is stored outside the repository:

```text
~/.config/tunnel-client/goreecloud-remote-mcp.yaml
```

The API key used by the tunnel client is also stored outside the repository:

```text
~/.config/goreecloud-remote-mcp/tunnel.env
```

### OpenAI API CLI

Entry point:

```text
scripts/chat.mjs
```

The CLI calls the OpenAI Responses API and supplies the configured Secure MCP Tunnel as an MCP tool source.

The CLI has its own allowlist and currently exposes only:

- `goreecloud.remote.list_devices`
- `goreecloud.remote.ping`
- `goreecloud.remote.list_directory`
- `goreecloud.remote.read_file`
- `goreecloud.remote.search_files`
- `goreecloud.remote.get_file_info`

It intentionally does not expose:

- `goreecloud.remote.write_file`
- `goreecloud.remote.execute_command`

This creates an additional read-only boundary even if those agent capabilities are enabled later.

## Trust boundaries

### OpenAI API boundary

The local CLI sends the user's prompt to the OpenAI Responses API. The model may request only the MCP tools present in the request's `allowed_tools` set.

### Tunnel boundary

The Secure MCP Tunnel connects OpenAI to a private MCP endpoint without publishing the broker directly on the public Internet.

### Broker-to-agent boundary

The agent authenticates separately to the broker using a device token. The MCP-facing credential and the agent credential are not the same trust boundary.

### Filesystem boundary

The agent evaluates resolved paths against `AGENT_ALLOWED_ROOTS`. Read, write, output-size, and command-time limits are bounded in configuration.

### OS boundary

The agent runs as an ordinary user service. Its effective access cannot exceed the operating-system permissions of that account and the systemd sandbox applied to the service.

## Deployment modes

### Current recommended mode: private tunnel

Use when OpenAI API access is desired without publicly exposing the laptop.

```text
OpenAI -> Secure MCP Tunnel -> loopback broker -> local agent
```

### Local token mode

Useful for local testing or MCP clients that can send a bearer token.

```text
MCP_AUTH_MODE=token
MCP_BEARER_TOKEN=<secret>
```

### Public endpoint mode

Not production-approved.

A future public deployment would require a separately reviewed TLS, OAuth/identity, authorization, abuse-control, audit, monitoring, recovery, and revocation design. Do not simply bind the current Development broker to a public interface.

## Relationship to GoreeCloud security architecture

The current implementation is a Development prototype. Future privileged operations are expected to align with the broader GoreeCloud authorization model, including accepted Identity, Wardveil Security, Privacy Shield, audit, monitoring, recovery, and rollback controls before production use.
