# Security notes

## Current classification
Development prototype only.

## Trust zones
1. MCP client to broker: bearer-authenticated HTTPS in production.
2. Broker to agent: token-authenticated WSS initiated by the agent.
3. Agent to local machine: constrained by the OS account, file roots, and capability flags.

## Fail-closed defaults
`AGENT_ALLOW_WRITE` and `AGENT_ALLOW_SHELL` default to false. Missing MCP or device tokens prevent startup.

## Production blockers
Before remote publication, design and verify:
- per-device credentials with independent revocation;
- GoreeCloud Identity or another approved identity authority;
- Wardveil Security controls for privileged actions;
- Privacy Shield policy evaluation for sensitive reads;
- durable tamper-evident audit records;
- request rate limiting and abuse controls;
- key rotation and secret storage;
- reverse-proxy TLS policy;
- agent update authenticity;
- monitoring, backup, recovery, and rollback;
- explicit destructive-action confirmation policy.

The command tool is intentionally high-risk. Keep it disabled unless required and separately accepted.
