# Validation Record

**Project:** GoreeCloud Remote MCP
**Lifecycle:** Forge
**Deployment state:** Development
**Production status:** Not production-approved
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

Broker health returned the bounded Development health model:

```json
{
  "ok": true,
  "status": "ready",
  "service": "goreecloud-remote-mcp",
  "version": "0.1.0",
  "mcpAuthMode": "none",
  "connectedDevices": 1,
  "stats": {
    "agentErrors": 0
  }
}
```

The live endpoint also reported bounded start-time, uptime, MCP-request, and agent-request counters. Those changing values are intentionally omitted from this retained example.

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

## Read-only maturity candidate validation

The exact source commit validated for this Development capability increment was:

```text
6ab64325aef986ec2343428c694f74745080c39c
```

That source commit was run on the authorized Linux x64 Development laptop through the existing systemd broker, device-agent, and Secure MCP Tunnel services.

Direct live MCP checks verified:

- `goreecloud.remote.get_health` returned broker status `ready` with one connected device.
- `goreecloud.remote.get_device_capabilities` reported protocol version 1 and agent version 0.1.0.
- Device capabilities reported read and search enabled.
- Device capabilities reported write disabled and shell disabled.
- Device capabilities reported interactive sessions and process management disabled.
- Directory pagination was reported enabled with a maximum page size of 1000.
- Read-size, write-size, search-result, search-entry, command-output, and command-time limits were returned as bounded policy information.
- `goreecloud.remote.get_device_health` returned device status `ready`.
- Two consecutive one-entry directory pages returned offsets 0 and 1, distinct deterministically ordered entries, and advancing `nextOffset` values.
- No private directory entry names are retained in this public validation record.

The OpenAI Responses API CLI was then exercised through the live Secure MCP Tunnel with the expanded read-only allowlist. The end-to-end response reported:

```text
Broker status: ready
Device status: online
Write enabled: false
Shell enabled: false
Directory pagination enabled: true
```

This confirms the new read-only maturity tools through the complete Development path:

```text
CLI
 -> OpenAI Responses API
 -> Secure MCP Tunnel
 -> tunnel-client
 -> local MCP broker
 -> authenticated device agent
```

The read-only maturity work was merged through [Pull Request #3](https://github.com/GoreeCloud/remote-mcp/pull/3) as authoritative main commit `a4ac1eac8d61dc4d11c98905c675790ede6b8fce`. Both exact-head pull-request checks and post-merge main checks passed: Node CI and Platform Contract 2.0 conformance. These checks validate Development source and declared conformance state, not production approval.

## Connection identity security regression

A subsequent Development hardening candidate added a dedicated `scripts/security-smoke.mjs` suite, run automatically by `npm run smoke`. It uses a disposable loopback broker and bounded mock agent connections rather than exposing or changing the live broker.

The local candidate security suite passed checks for:

- MCP bearer-token enforcement (unauthorized calls denied).
- Broker dashboard disabled when administrator credentials are absent.
- Agent bearer-token enforcement and invalid device ID rejection.
- Cross-device RPC reply isolation: a forged reply from another authenticated device is ignored in favor of the original connection's reply.
- Same-ID agent replacement: old in-flight RPCs fail closed and a new connection's independent requests still complete.

The extended real-agent smoke suite passed allowed-root rejection, excessive directory-page limit rejection, end-of-directory paging, read access, and disabled write/shell checks. Both local syntax checking and the dependency audit passed; the audit reported zero known vulnerabilities at the selected threshold.

Those tests subsequently passed GitHub Node CI and Platform Contract 2.0 conformance on Pull Request #4. PR #4 was merged and confirmed in `main` at commit `988d0fc7e68421973ce844806860db3728e28596`; local development services were restarted on that commit and reported broker/agent/tunnel active with one connected device and tunnel readiness. This is Development validation, not public-exposure, production-identity, or release acceptance evidence.

## Large-File Read and Search Maturity — Development Candidate

**Source candidate:** `58b687b0fc40b0f95f57428070081ce8a72569ed` (Pull Request #5). This is candidate-stage evidence; merging and deployment require separate verification.

The authorized Linux x64 Development laptop's local isolated broker/agent smoke run passed the following checks:

- The ordinary text reader still refuses a file exceeding `AGENT_MAX_READ_BYTES`.
- The new `goreecloud.remote.read_file_chunk` reads bounded base64-encoded byte ranges from a file exceeding 1 MiB without requiring the entire file in memory.
- Consecutive 16-byte and 64-byte pages preserve exact byte values and return advancing continuation offsets.
- The final two bytes of a Unicode character remain intact, and the EOF response reports an empty page and no continuation.
- Requests exceeding 65,536 bytes are rejected; requests outside configured allowed roots are denied.
- Filename search supports optional case-sensitive matching and reports `result_limit` when results reach the configured bound.
- Previously implemented authorization, connection-isolation, pagination, and disabled write/shell smoke checks still pass.

The local source-candidate syntax checks, high-severity dependency audit (zero reported vulnerabilities at that point in time), and patch-whitespace checks passed. GitHub Node CI and Platform Contract 2.0 conformance passed on source head `58b687b`, before this documentation reconciliation. The updated documentation commit must receive its **own exact-head CI validation** before the PR can be made ready and considered for merge.

**Limitations:** The search time budget is cooperative and may overrun during an active filesystem call. Chunk reads are not a stable file snapshot if source content changes between calls. The current tests do not qualify Windows/macOS, production public access, production authorization, privileged operations, or production recovery.

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
