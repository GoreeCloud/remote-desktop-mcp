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

## Byte-Range Reading and AI Data Exposure

The Development candidate adds `goreecloud.remote.read_file_chunk`. Unlike the ordinary UTF-8 text reader, this tool can retrieve arbitrary file bytes, including binary formats, from approved roots even when a file exceeds the normal text-read size ceiling. Each individual call is bounded to at most 65,536 bytes, but successive requests may retrieve substantially more. The encoded bytes are returned through the MCP tool response to the configured AI client and may be included in data processed by the OpenAI API.

**Read-only does not mean data remains local.** Treat this as an intentional data-sharing capability. Restrict `AGENT_ALLOWED_ROOTS` to narrow, non-sensitive folders rather than a full home directory, and avoid enabling access to credentials, SSH keys, password stores, private records, or other confidential material. Base64 is encoding, not encryption or anonymization.

The current Development system does not implement Privacy Shield evaluation, per-file interactive consent, sensitive-content classification, session-wide read budgets, or production data-retention controls. The tool is not production-approved.

## User Responsibilities

Configure the smallest practical allowed-root set. Do not expose a broad home directory or sensitive collection merely because the operating-system account can read it.

## Unaccepted Areas

Privacy Shield policy evaluation, multi-user privacy isolation, production retention/audit policy, and privileged-operation privacy controls remain planned and must not be represented as accepted.
