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

## Safety

- Requests outside configured allowed roots are rejected.
- Writes are disabled by default.
- Shell execution is disabled by default.
- The CLI does not expose write or shell tools.
- Do not broaden allowed roots merely for convenience.

For installation, service management, troubleshooting, rotation, and removal, use [Setup and Operations](SETUP-AND-OPERATIONS.md).
