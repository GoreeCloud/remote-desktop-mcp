# GoreeCloud Remote MCP Changelog

## 2026-10-06 — Connection Identity Security Hardening

### Fixed

- Prevented responses from one authenticated agent connection from fulfilling an RPC sent to another connection.
- Ensured replacement of an agent with the same device ID rejects only the old connection's pending requests.

### Added

- Adversarial security smoke coverage for MCP/agent authentication, invalid device IDs, disabled administrator access, cross-device RPC responses, and connection replacement.
- Additional real-agent regression coverage for allowed-root confinement, excessive pagination limits, and end-of-directory paging.

### Safety Boundary

All added controls preserve read-only operation. No write, shell, interactive-session, privileged administration, or public broker capability is enabled.

## 2026-10-06 — Read-Only Maturity Development Update

### Added

- Broker health MCP tool with bounded operational counters.
- Device capability discovery MCP tool.
- Device health/readiness MCP tool.
- Stable bounded directory pagination.
- New read-only tools in the OpenAI API CLI allowlist.
- Repository CI workflow for syntax, dependency audit, and smoke validation.
- Canonical repository documentation baseline under `docs/`.
- GoreeCloud Platform Contract declaration.

### Changed

- Connected device summaries now expose explicit online status.
- Broker `/healthz` returns the shared bounded health model.
- Security guidance moved to `.github/SECURITY.md`.
- Planned-feature documentation moved under `docs/` to match repository governance.

### Safety Boundary

Writes and shell execution remain disabled by default and excluded from the OpenAI API CLI. This update does not establish production approval.
