# GoreeCloud Remote MCP Privacy

**Status:** Development privacy record
**Production Privacy Shield acceptance:** Not established

## Current Data Flow

Approved prompts may cause the configured AI client to request data through the MCP broker and authenticated device agent. The agent may return only data reachable through explicitly configured filesystem roots and supported read-only tools.

## Current Privacy Controls

- Filesystem access is restricted to configured allowed roots.
- Broker storage does not persist ordinary filesystem contents.
- Read and search sizes are bounded.
- Diagnostics are designed to avoid credentials and ordinary file contents.
- Runtime credentials are stored outside the repository.
- Write and shell capabilities remain disabled by default.

## User Responsibilities

Configure the smallest practical allowed-root set. Do not expose a broad home directory or sensitive collection merely because the operating-system account can read it.

## Unaccepted Areas

Privacy Shield policy evaluation, multi-user privacy isolation, production retention/audit policy, and privileged-operation privacy controls remain planned and must not be represented as accepted.
