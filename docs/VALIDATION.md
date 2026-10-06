# Validation Record

**Project:** GoreeCloud Remote MCP
**Status:** Development prototype
**Validation date:** 2026-10-06 local deployment time

## Environment

Validated on an authorized Linux x64 laptop.

Observed runtime versions during final documentation pass:

```text
Node.js: v24.19.0
npm: 11.17.0
OpenAI tunnel-client: 0.0.15
GoreeCloud Remote MCP: 0.1.0
```

## Repository checks

The following checks passed:

```bash
npm run check
npm audit --audit-level=high
npm run smoke
```

At the time of validation, `npm audit --audit-level=high` reported:

```text
found 0 vulnerabilities
```

This is a point-in-time dependency result, not a guarantee that future advisories will remain zero.

## Local service validation

The following systemd user services were enabled and active:

```text
goreecloud-remote-mcp-broker
goreecloud-remote-mcp-agent
goreecloud-remote-mcp-tunnel
```

Broker health returned:

```json
{
  "ok": true,
  "service": "goreecloud-remote-mcp",
  "version": "0.1.0",
  "mcpAuthMode": "none",
  "connectedDevices": 1
}
```

Tunnel health returned:

```text
live
```

Tunnel readiness returned:

```text
ready
```

## Safe configuration state

The validated deployment used:

```text
BROKER_HOST=127.0.0.1
BROKER_PORT=8788
MCP_AUTH_MODE=none
AGENT_ALLOW_WRITE=false
AGENT_ALLOW_SHELL=false
```

The MCP no-auth mode remained loopback-only. The remote transport boundary was the Secure MCP Tunnel.

Runtime credential files were stored outside the repository and protected with mode 600.

## Tunnel validation

`tunnel-client doctor --profile goreecloud-remote-mcp --explain` passed the required runtime checks after the local API key was installed.

Validated checks included:

- profile source;
- profile loading;
- tunnel resource ID;
- runtime control-plane API key reference;
- MCP target;
- MCP server reachability;
- local health listener.

The MCP target was:

```text
http://127.0.0.1:8788/mcp
```

## End-to-end Responses API validation

A real OpenAI Responses API request was issued with the configured Secure MCP Tunnel and a read-only MCP allowlist.

The model successfully:

1. discovered the remote MCP tool set;
2. called `goreecloud.remote.list_devices`;
3. received the connected local device;
4. returned the device summary to the API client.

That request completed with HTTP 200.

A second end-to-end test used the repository CLI:

```bash
npm run chat -- "Use the remote MCP to list connected devices. Return only the device name and whether write/shell access is enabled."
```

The response correctly reported the connected device with both write and shell access disabled.

## User acceptance test

The local operator independently executed:

```bash
npm run chat -- "List the files in my Documents folder"
```

The command successfully returned the contents of the local Documents directory through the complete path:

```text
CLI
 -> OpenAI Responses API
 -> Secure MCP Tunnel
 -> tunnel-client
 -> local MCP broker
 -> device agent
 -> local filesystem
```

The names of private user files are intentionally not recorded in this public validation document.

## Broker restart/reconnect validation

During development, the broker was restarted and the device agent successfully reconnected. The agent reconnect timer remains active rather than being unreferenced, allowing the service to survive transient broker outages.

## Dependency remediation performed during development

The initial dependency set produced high-severity audit findings in older direct versions of the MCP SDK and `ws`.

Direct dependencies were updated to:

```text
@modelcontextprotocol/sdk 1.32.1
ws 8.22.0
```

The final validation audit then reported zero known vulnerabilities at the selected audit threshold.

## Fail-closed controls validated

The smoke test verified that mutation capabilities are denied when their feature flags are disabled.

Current defaults remain:

```text
AGENT_ALLOW_WRITE=false
AGENT_ALLOW_SHELL=false
```

The OpenAI API CLI also excludes write and shell tools from its MCP `allowed_tools` list.

## Not validated or not production-approved

The following remain outside the current validation:

- production public Internet exposure;
- production OAuth/identity integration;
- Wardveil Security enforcement for privileged operations;
- Privacy Shield evaluation for sensitive reads;
- durable tamper-evident audit;
- multi-device independent credential lifecycle;
- production rate limits and abuse controls;
- automatic key rotation and revocation;
- production monitoring and alerting;
- disaster recovery and rollback;
- controlled write workflow;
- controlled shell workflow;
- destructive or administrative actions.

The current validation establishes a functioning private, read-only development path. It does not constitute a production security certification.
