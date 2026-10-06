# GoreeCloud Remote MCP Benefits

## Control

- Keeps the broker and device agent under GoreeCloud/user control.
- Preserves explicit control over reachable devices and filesystem roots.
- Separates read, write, and execution authority.

## Privacy

- Supports private remote access without directly publishing the broker to the Internet in the validated tunnel mode.
- Returns only data required by requested tools.
- Avoids broker persistence of ordinary filesystem contents.

## Security

- Uses explicit device authentication and bounded capabilities.
- Fails closed for write and shell operations unless deliberately enabled.
- Keeps runtime secrets outside source control.

## Portability

- Uses MCP rather than tying the core device capability model to one client.
- Keeps the long-term design compatible with multiple approved MCP-capable clients.

These are Development benefits supported by the current architecture; they are not production-security guarantees.
