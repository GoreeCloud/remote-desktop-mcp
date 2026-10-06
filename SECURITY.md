# Security Notes

## Current classification

Development prototype only.

The currently validated operating mode is private, read-only access through the OpenAI Responses API and Secure MCP Tunnel. It is not a production security certification.

## Current trust zones

### 1. OpenAI API client to OpenAI

The repository CLI sends the prompt and an explicit MCP tool allowlist to the OpenAI Responses API.

The API key is stored locally outside the repository.

### 2. OpenAI Secure MCP Tunnel to local broker

`tunnel-client` runs on the laptop and connects outbound to OpenAI.

The MCP broker remains on:

```text
127.0.0.1:8788
```

In tunnel mode the broker uses `MCP_AUTH_MODE=none`, but the broker enforces that this mode can only be used when the configured broker host is literal loopback.

Do not expose the current no-auth broker on a public or LAN interface.

### 3. Broker to agent

The device agent establishes an outbound WebSocket connection to the broker and authenticates with a separate device token.

The device token is a different trust boundary from the OpenAI API credential and any MCP client credential.

### 4. Agent to local machine

The agent is constrained by:

- operating-system account permissions;
- `AGENT_ALLOWED_ROOTS`;
- realpath containment checks;
- write capability flag;
- shell capability flag;
- read/write/output size limits;
- command timeout;
- systemd sandboxing.

## Defense in depth for the current CLI

The agent defaults to:

```text
AGENT_ALLOW_WRITE=false
AGENT_ALLOW_SHELL=false
```

In addition, `scripts/chat.mjs` has its own read-only `allowed_tools` list and does not send `write_file` or `execute_command` to the OpenAI Responses API.

This means enabling an agent feature alone does not automatically make that feature available through the chat CLI.

## Secret handling

Never commit:

- OpenAI API keys;
- device tokens;
- MCP bearer tokens;
- administrator passwords;
- populated runtime environment files.

Current runtime files are stored outside the repository under the local user's configuration directories and should be mode 600 where they contain secrets.

The public repository should contain examples and placeholders only.

## systemd hardening

The committed user-service templates use controls including:

- `NoNewPrivileges=yes`
- `PrivateTmp=yes`
- `ProtectSystem=strict`
- `ProtectHome=read-only`
- restricted writable paths
- `LockPersonality=yes`

The agent service currently treats the home directory as read-only at the systemd layer. This intentionally prevents a simple feature-flag change from silently turning the current read-only deployment into an unrestricted write deployment.

## Command execution

The command tool is intentionally high risk.

Even when agent shell support is enabled, command execution uses additional limits and a baseline block list. That is not equivalent to a complete authorization system.

Keep shell execution disabled until a separately accepted command-authorization, approval, audit, and recovery model exists.

## Public deployment warning

Do not publish this Development broker directly to the Internet.

A public endpoint requires a separately reviewed design covering at least:

- TLS termination;
- standards-compliant authentication;
- authorization;
- identity lifecycle;
- per-device credentials and revocation;
- abuse controls and rate limiting;
- audit records;
- secret rotation;
- monitoring;
- backup/recovery;
- rollback;
- update authenticity.

## GoreeCloud production blockers

Before privileged or production use, design and verify:

- per-device credentials with independent revocation;
- GoreeCloud Identity or another accepted identity authority;
- Wardveil Security controls for privileged actions;
- Privacy Shield policy evaluation for sensitive reads;
- durable tamper-evident audit records;
- request rate limiting and abuse controls;
- key rotation and secret storage;
- agent update authenticity;
- monitoring and alerting;
- backup, recovery, and rollback;
- explicit write approval policy;
- explicit command approval policy;
- explicit destructive-action confirmation policy.
