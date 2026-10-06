# GoreeCloud Remote MCP Changelog

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
