# GoreeCloud Remote MCP Features

**Lifecycle:** Forge
**Deployment state:** Development
**Current accepted scope:** private read-only remote-device path

## Device and Broker

- Connected-device discovery with explicit device identifiers.
- Device ping and connectivity confirmation.
- Broker health with bounded operational counters.
- Device health and readiness reporting.
- Device capability and enforced-limit discovery.

## Filesystem

- Allowed-root path enforcement using resolved paths.
- Stable bounded directory pagination with offset, limit, total count, and next offset.
- UTF-8 text reads with bounded line ranges.
- File and directory metadata.
- Bounded filename and content search.
- Read/write separation at the agent capability boundary.

## Security and Operations

- Loopback-only no-auth tunnel mode.
- Separate broker-to-agent device credential.
- Explicit read-only OpenAI API CLI tool allowlist.
- Writes disabled by default.
- Shell execution disabled by default.
- Persistent systemd user-service templates.
- Runtime credentials stored outside the repository.

## Not Accepted as Current Production Features

Controlled writes, command execution, interactive sessions, process management, administrative operations, destructive operations, public broker exposure, Wardveil Security enforcement, Privacy Shield enforcement, and production authorization/audit remain unaccepted.
