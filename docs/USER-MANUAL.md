# GoreeCloud Remote MCP User Manual

**Status:** Development
**Current mode:** private read-only access

## Basic Use

After the broker, agent, and Secure MCP Tunnel are running:

```bash
npm run chat -- "List my connected devices"
npm run chat -- "Show the health and capabilities of my connected device"
npm run chat -- "List the files in my Documents folder"
npm run chat -- "Read ~/Documents/example.md and summarize it"
npm run chat -- "Search my home directory for files containing Wardveil"
```

## Current Read-Only Tools

The CLI can list devices, inspect broker/device health, inspect device capabilities, ping devices, page through directories, read approved text files, search approved roots, and inspect metadata.

## Large Files and Search

The ordinary `read_file` tool retains its size ceiling. Use `goreecloud.remote.read_file_chunk` to read an approved large file from byte offset 0, advancing with `nextOffset` until `eof` is true. Each returned `content` field is base64-encoded file bytes, not decoded text. UTF-8 code points can span multiple chunks, so decode only after reassembling the bytes. There is no snapshot guarantee if the source changes between calls.

The `search_files` tool accepts optional `caseSensitive` (default false) and `maxResults` (up to 200). Results expose `truncationReason` as `result_limit`, `scan_limit`, or `time_limit`. The agent checks the configured search deadline between operations but does not interrupt an active filesystem call.

## Safety

- Requests outside configured allowed roots are rejected.
- Writes are disabled by default.
- Shell execution is disabled by default.
- The CLI does not expose write or shell tools.
- Do not broaden allowed roots merely for convenience.

For installation, service management, troubleshooting, rotation, and removal, use [Setup and Operations](SETUP-AND-OPERATIONS.md).
