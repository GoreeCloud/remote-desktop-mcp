# GoreeCloud Remote MCP — Implemented Features

**Lifecycle:** Forge
**Deployment state:** Development
**Record type:** Implemented-source feature record
**Production status:** Not production-approved

This record describes features present in the authoritative repository source after their merge. It does not imply release, deployment, production, certification, or Stable status.

## Read-Only Foundation

- Device listing and ping.
- Allowed-root directory listing.
- UTF-8 file reading.
- File and directory metadata.
- Bounded filename/content search.
- OpenAI Secure MCP Tunnel support.
- Explicit read-only OpenAI API CLI allowlist.
- Persistent broker, agent, and tunnel systemd templates.

## Read-Only Maturity

- Broker health diagnostics with bounded request/error counters.
- Device health/readiness reporting.
- Device capability discovery including enabled read/search/write/shell state and configured limits.
- Stable directory pagination using `offset`, `limit`, `totalEntries`, and `nextOffset`.
- Connected-device summaries include explicit online state and richer agent metadata.
- Base64 byte-range file reads with offset continuation, EOF, and a per-call output ceiling, including files above ordinary text-read limits.
- Deterministically ordered bounded search with case-sensitive matching and explicit result, scan, and cooperative time-limit reasons.

## Connection Identity Hardening

- In-flight RPC responses can only be fulfilled by the authenticated agent WebSocket to which the request was sent.
- A same-ID agent replacement fails the previous connection's in-flight requests without cancelling requests from the new connection.
- A separate adversarial security-smoke suite validates MCP token enforcement, agent token enforcement, invalid device IDs, disabled administrator access, cross-device response isolation, and replacement behavior.
- The real-agent smoke suite additionally validates allowed-root confinement and bounded directory pagination rejection and completion behavior.

## Fail-Closed Foundations

- `goreecloud.remote.write_file` remains agent opt-in and disabled by default.
- `goreecloud.remote.execute_command` remains agent opt-in and disabled by default.
- The OpenAI API CLI does not expose either mutation capability.

See [Validation Record](VALIDATION.md) for the exact evidence boundary and [Planned Features](PLANNED-FEATURES.md) for capabilities that remain planned.
