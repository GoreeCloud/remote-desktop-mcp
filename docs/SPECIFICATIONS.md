# GoreeCloud Remote MCP Specifications

**Lifecycle:** Forge
**Deployment state:** Development
**Production status:** Not production-approved
**Current operating mode:** private, read-only remote-device access

## Purpose

GoreeCloud Remote MCP provides a GoreeCloud-controlled MCP broker and authenticated device agent for approved remote access to explicitly authorized local capabilities.

## Current Development Requirements

- The broker binds to loopback by default and must reject unauthenticated MCP mode on non-loopback hosts.
- The device agent authenticates separately from the MCP client boundary.
- Each in-flight agent RPC is tied to the exact authenticated WebSocket that received it; a response from another agent connection must not satisfy it.
- Replacing an agent connection must fail closed for the old connection's pending requests without invalidating requests on the replacement.
- Filesystem access is restricted to resolved paths under configured allowed roots.
- Read-only client access exposes device discovery, health, capability discovery, directory listing, text reads, search, and file metadata.
- Directory listing supports bounded deterministic pagination.
- Approved large-file byte reads are limited to 65,536 base64-encoded bytes per call with continuation and EOF metadata; ordinary text reads retain their file-size ceiling.
- Search uses deterministic traversal and result/scan limits with a cooperative configurable deadline, which cannot interrupt in-progress filesystem I/O.
- Filesystem writes and shell execution remain disabled by default and are excluded from the OpenAI API CLI allowlist.
- Requests, file reads/writes, search results, command output, and command duration remain bounded.
- Runtime credentials remain outside source control.
- The broker must not persist ordinary filesystem contents.

## Current Read-Only MCP Surface

```text
goreecloud.remote.list_devices
goreecloud.remote.get_health
goreecloud.remote.get_device_capabilities
goreecloud.remote.get_device_health
goreecloud.remote.ping
goreecloud.remote.list_directory
goreecloud.remote.read_file
goreecloud.remote.read_file_chunk
goreecloud.remote.search_files
goreecloud.remote.get_file_info
```

## Acceptance Boundary

Source implementation, local smoke validation, and Development deployment evidence do not establish production approval. Privileged writes, execution, administration, destructive actions, public exposure, and lifecycle promotion require separate authorization, security, privacy, audit, recovery, and acceptance evidence.
