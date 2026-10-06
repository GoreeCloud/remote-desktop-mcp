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

## Fail-Closed Foundations

- `goreecloud.remote.write_file` remains agent opt-in and disabled by default.
- `goreecloud.remote.execute_command` remains agent opt-in and disabled by default.
- The OpenAI API CLI does not expose either mutation capability.

See [Validation Record](VALIDATION.md) for the exact evidence boundary and [Planned Features](PLANNED-FEATURES.md) for capabilities that remain planned.
