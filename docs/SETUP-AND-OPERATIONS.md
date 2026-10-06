# Setup and Operations Guide

**Status:** Development prototype
**Validated platform:** Linux x64, Node.js 24
**Current mode:** read-only laptop access through OpenAI Responses API and Secure MCP Tunnel

This guide documents the complete working setup for GoreeCloud Remote MCP.

## 1. What the system does

The working deployment allows a command such as:

```bash
npm run chat -- "List the files in my Documents folder"
```

to travel through the following path:

```text
local CLI
  -> OpenAI Responses API
  -> OpenAI Secure MCP Tunnel
  -> tunnel-client on laptop
  -> 127.0.0.1:8788/mcp
  -> GoreeCloud Remote MCP broker
  -> authenticated device agent
  -> approved local filesystem
```

The current CLI is read-only.

## 2. Prerequisites

- Linux laptop or workstation
- Node.js 22 or newer
- npm
- systemd user services
- OpenAI Platform account with API access and billing/credits configured
- OpenAI Secure MCP Tunnel resource
- OpenAI `tunnel-client`
- this repository cloned locally

Example:

```bash
git clone https://github.com/GoreeCloud/remote-mcp.git
cd remote-mcp
npm install --ignore-scripts
```

## 3. Repository validation

Run:

```bash
npm run check
npm audit --audit-level=high
npm run smoke
```

The smoke test validates local MCP connectivity, broker/device diagnostics, capability discovery, deterministically ordered directory pagination, read operations, and fail-closed mutation controls.

## 4. Generate local secrets

Do not commit runtime secrets.

Create a configuration directory:

```bash
mkdir -p ~/.config/goreecloud-remote-mcp
chmod 700 ~/.config/goreecloud-remote-mcp
```

Generate separate broker/device credentials as appropriate. The agent credential must match the broker's device credential, but it should remain separate from any MCP-facing credential.

A simple secret generator is:

```bash
python3 - <<'PY'
import secrets
print(secrets.token_urlsafe(48))
PY
```

## 5. Broker configuration

Create:

```text
~/.config/goreecloud-remote-mcp/broker.env
```

For Secure MCP Tunnel mode:

```bash
BROKER_HOST=127.0.0.1
BROKER_PORT=8788
MCP_AUTH_MODE=none
BROKER_DEVICE_TOKEN=<long-random-device-token>
RPC_TIMEOUT_MS=30000

ADMIN_USER=
ADMIN_PASSWORD=
```

Protect it:

```bash
chmod 600 ~/.config/goreecloud-remote-mcp/broker.env
```

Important: `MCP_AUTH_MODE=none` is acceptable here only because `BROKER_HOST` is loopback. The broker itself rejects no-auth mode on non-loopback bindings.

For local bearer-token testing instead, use:

```bash
MCP_AUTH_MODE=token
MCP_BEARER_TOKEN=<long-random-mcp-token>
```

## 6. Agent configuration

Create:

```text
~/.config/goreecloud-remote-mcp/agent.env
```

Example:

```bash
BROKER_WS_URL=ws://127.0.0.1:8788/agent
DEVICE_ID=my-laptop
AGENT_DEVICE_TOKEN=<same-device-token-as-broker>
AGENT_ALLOWED_ROOTS=/home/username

AGENT_ALLOW_WRITE=false
AGENT_ALLOW_SHELL=false

AGENT_MAX_READ_BYTES=1048576
AGENT_MAX_WRITE_BYTES=1048576
AGENT_MAX_COMMAND_OUTPUT_BYTES=1048576
AGENT_COMMAND_TIMEOUT_MS=30000
```

Protect it:

```bash
chmod 600 ~/.config/goreecloud-remote-mcp/agent.env
```

Keep write and shell disabled for the read-only deployment.

## 7. Install broker and agent user services

Copy the service units:

```bash
mkdir -p ~/.config/systemd/user

cp deploy/systemd/goreecloud-remote-mcp-broker.service \
  ~/.config/systemd/user/

cp deploy/systemd/goreecloud-remote-mcp-agent.service \
  ~/.config/systemd/user/

systemctl --user daemon-reload
systemctl --user enable --now goreecloud-remote-mcp-broker
systemctl --user enable --now goreecloud-remote-mcp-agent
```

Check:

```bash
systemctl --user status goreecloud-remote-mcp-broker
systemctl --user status goreecloud-remote-mcp-agent
curl http://127.0.0.1:8788/healthz
```

A healthy broker should report one connected device after the agent connects.

## 8. Create an OpenAI Secure MCP Tunnel

Create a tunnel in the OpenAI Platform Tunnels interface and associate it with the Platform organization that will make the Responses API calls.

Record the returned tunnel ID locally. A tunnel ID is a resource identifier, not the API secret, but it still does not need to be committed to this public repository.

## 9. Install tunnel-client

Use the current official OpenAI tunnel-client release for the laptop architecture.

For the validated Linux amd64 deployment, the release archive checksum was verified before installation.

Install the binaries somewhere on the user's PATH, for example:

```text
~/.local/bin/tunnel-client
~/.local/bin/cloudflared
```

Verify:

```bash
tunnel-client --version
```

## 10. Create the tunnel profile

Initialize:

```bash
tunnel-client init \
  --profile goreecloud-remote-mcp \
  --tunnel-id <tunnel_id> \
  --mcp-server-url http://127.0.0.1:8788/mcp \
  --force
```

This creates:

```text
~/.config/tunnel-client/goreecloud-remote-mcp.yaml
```

The important target is:

```text
http://127.0.0.1:8788/mcp
```

## 11. Store the OpenAI runtime API key locally

Never paste the key into documentation, source code, issue comments, or commits.

Interactive setup:

```bash
mkdir -p ~/.config/goreecloud-remote-mcp

read -rsp "OpenAI API key: " KEY; echo
printf 'CONTROL_PLANE_API_KEY=%s\n' "$KEY" \
  > ~/.config/goreecloud-remote-mcp/tunnel.env

chmod 600 ~/.config/goreecloud-remote-mcp/tunnel.env
unset KEY
```

The repository's chat CLI can use either `OPENAI_API_KEY` or `CONTROL_PLANE_API_KEY`.

## 12. Validate the tunnel before enabling the service

Load the local secret and run diagnostics:

```bash
set -a
. ~/.config/goreecloud-remote-mcp/tunnel.env
set +a

tunnel-client doctor \
  --profile goreecloud-remote-mcp \
  --explain
```

Expected checks include:

- profile load: PASS
- tunnel ID: PASS
- control-plane API key: PASS
- MCP target: PASS
- MCP server reachable: PASS
- health listener: PASS

An HTTP 406 from the raw MCP target can still be a successful reachability result because the MCP endpoint expects a protocol-appropriate request rather than an ordinary browser GET.

## 13. Install the tunnel service

Copy:

```bash
cp deploy/systemd/goreecloud-remote-mcp-tunnel.service \
  ~/.config/systemd/user/

systemctl --user daemon-reload
systemctl --user enable --now goreecloud-remote-mcp-tunnel
```

Verify:

```bash
systemctl --user is-enabled goreecloud-remote-mcp-tunnel
systemctl --user is-active goreecloud-remote-mcp-tunnel

curl http://127.0.0.1:8080/healthz
curl http://127.0.0.1:8080/readyz
```

Expected results:

```text
live
ready
```

## 14. Use the OpenAI API chat CLI

From the repository:

```bash
npm run chat -- "List my connected devices"
```

Example filesystem request:

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

Choose a different available model:

```bash
npm run chat -- --model gpt-6-astra \
  "Search my home directory for files named privacy"
```

Return the complete Responses API JSON for debugging:

```bash
npm run chat -- --json "List my connected devices"
```

## 15. Read-only tool policy

The CLI currently sends this MCP allowlist to OpenAI:

```text
goreecloud.remote.list_devices
goreecloud.remote.get_health
goreecloud.remote.get_device_capabilities
goreecloud.remote.get_device_health
goreecloud.remote.ping
goreecloud.remote.list_directory
goreecloud.remote.read_file
goreecloud.remote.search_files
goreecloud.remote.get_file_info
```

The CLI does not offer these tools:

```text
goreecloud.remote.write_file
goreecloud.remote.execute_command
```

This is deliberate.

## 16. Routine health checks

Broker and agent:

```bash
systemctl --user is-active \
  goreecloud-remote-mcp-broker \
  goreecloud-remote-mcp-agent

curl http://127.0.0.1:8788/healthz
```

Tunnel:

```bash
systemctl --user is-active goreecloud-remote-mcp-tunnel
curl http://127.0.0.1:8080/healthz
curl http://127.0.0.1:8080/readyz
```

Logs:

```bash
journalctl --user -u goreecloud-remote-mcp-broker -n 100
journalctl --user -u goreecloud-remote-mcp-agent -n 100
journalctl --user -u goreecloud-remote-mcp-tunnel -n 100
```

Follow live logs:

```bash
journalctl --user -fu goreecloud-remote-mcp-tunnel
```

## 17. Restart procedure

```bash
systemctl --user restart goreecloud-remote-mcp-broker
systemctl --user restart goreecloud-remote-mcp-agent
systemctl --user restart goreecloud-remote-mcp-tunnel
```

The agent contains reconnect behavior so it can re-register after a broker restart.

## 18. Updating the repository

```bash
cd ~/GoreeCloud-work/goreecloud-remote-mcp
git pull --ff-only
npm install --ignore-scripts
npm run check
npm audit --audit-level=high
npm run smoke

systemctl --user restart goreecloud-remote-mcp-broker
systemctl --user restart goreecloud-remote-mcp-agent
systemctl --user restart goreecloud-remote-mcp-tunnel
```

## 19. Cost model

The GoreeCloud code has no built-in monthly relay subscription or metered MCP-tool-call quota.

External costs can still exist, including OpenAI API usage and any networking or hosting products chosen for other deployment modes. The current CLI prints the model name and total tokens after each request so usage can be observed.

## 20. Troubleshooting

### `CONTROL_PLANE_API_KEY` is not set

Confirm:

```bash
ls -l ~/.config/goreecloud-remote-mcp/tunnel.env
```

It should be mode 600 and contain a local `CONTROL_PLANE_API_KEY` assignment.

Do not print the key to the terminal while screen sharing or paste it into support messages.

### Tunnel doctor cannot reach MCP target

Check:

```bash
curl http://127.0.0.1:8788/healthz
systemctl --user status goreecloud-remote-mcp-broker
```

### Broker reports zero devices

Check:

```bash
systemctl --user status goreecloud-remote-mcp-agent
journalctl --user -u goreecloud-remote-mcp-agent -n 100
```

Confirm the broker and agent device tokens match.

### Chat CLI says tunnel is not ready

Check:

```bash
curl http://127.0.0.1:8080/readyz
systemctl --user status goreecloud-remote-mcp-tunnel
```

### Access denied for a filesystem path

The requested path must resolve under one of the configured `AGENT_ALLOWED_ROOTS`. Add roots only after reviewing the additional exposure.

## 21. Enabling writes or shell

Do not enable these merely to make the prototype more convenient.

Write access requires:

```text
AGENT_ALLOW_WRITE=true
```

Shell access requires:

```text
AGENT_ALLOW_SHELL=true
```

However, the current systemd agent sandbox is intentionally read-only for the home directory, and the current chat CLI does not offer either mutation tool. A production write path needs an explicit authorization, approval, audit, and rollback design before those controls should be relaxed.

## 22. Secret rotation

If an OpenAI runtime API key is rotated:

1. replace only the local value in `~/.config/goreecloud-remote-mcp/tunnel.env`;
2. keep file permissions at 600;
3. restart the tunnel service;
4. rerun `tunnel-client doctor`;
5. verify `/readyz`.

If the agent device token is rotated, update both the broker and agent environment files, then restart both services.

## 23. Removing the local deployment

Disable services:

```bash
systemctl --user disable --now goreecloud-remote-mcp-tunnel
systemctl --user disable --now goreecloud-remote-mcp-agent
systemctl --user disable --now goreecloud-remote-mcp-broker
```

Remove runtime credentials only when they are no longer needed:

```text
~/.config/goreecloud-remote-mcp/
```

Delete or revoke the associated OpenAI tunnel and API key separately through the OpenAI Platform if retiring the deployment.

## 24. Current production blockers

The working read-only prototype is not a production approval.

Before privileged or public deployment, complete separate design and acceptance for:

- identity and authorization;
- per-device credential lifecycle and revocation;
- Wardveil Security controls;
- Privacy Shield evaluation for sensitive reads;
- durable audit records;
- abuse controls and rate limiting;
- secret management and rotation;
- monitoring and alerting;
- backup, recovery, and rollback;
- authenticated agent update distribution;
- explicit approvals for writes, shell, destructive, and administrative actions.
