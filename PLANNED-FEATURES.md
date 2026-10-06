# GoreeCloud Remote MCP — Planned Features and Capabilities

**Repository:** GoreeCloud/remote-mcp  
**Status:** Development  
**Current baseline:** Private read-only remote-device path validated  
**Production status:** Not production-approved  
**Planning record date:** 2026-10-06

> **Status boundary:** This document records the planned direction for GoreeCloud Remote MCP. The current validated foundation is limited to the read-only Development path described in the repository README and validation record. Planned capabilities in this document must not be represented as implemented, accepted, or production-approved until separately verified.

## 1. Purpose

GoreeCloud Remote MCP is planned as a self-hosted, GoreeCloud-controlled remote Model Context Protocol bridge that allows approved artificial-intelligence clients to interact with authorized computers without surrendering device control, filesystem authority, execution policy, or operational trust boundaries to a third-party relay service.

The project will provide a controlled bridge between an approved MCP-capable client and a local GoreeCloud device agent.

The intended architecture remains:

~~~text
Approved AI client
        |
        v
Remote MCP transport
        |
        v
GoreeCloud Remote MCP broker
        |
        v
Authenticated GoreeCloud device agent
        |
        v
Approved local device capabilities
~~~

The broker must remain an authorization and transport boundary rather than becoming an unrestricted proxy into the host operating system.

Remote capabilities will be exposed through explicit MCP tools with defined schemas, limits, authorization requirements, audit behavior, failure behavior, and device-side policy enforcement.

---

## 2. Current Validated Foundation

The current Development prototype has validated the private read-only remote-device path.

The existing validated capability baseline includes:

- List connected devices.
- Verify device connectivity.
- List approved filesystem directories.
- Read approved files.
- Search approved filesystem roots.
- Retrieve file and directory metadata.
- Operate through the OpenAI Secure MCP Tunnel without directly exposing the broker to the public Internet.
- Maintain the broker, device agent, and tunnel client as persistent user services.
- Restrict filesystem operations to configured roots.
- Keep filesystem writes disabled by default.
- Keep shell execution disabled by default.
- Apply an explicit read-only MCP tool allowlist to the current chat CLI.
- Bound requests, reads, outputs, writes, and command durations.
- Keep runtime credentials outside source control.
- Avoid persisting ordinary filesystem contents in the broker.

Current prototype tools include:

~~~text
goreecloud.remote.list_devices
goreecloud.remote.ping
goreecloud.remote.list_directory
goreecloud.remote.read_file
goreecloud.remote.search_files
goreecloud.remote.get_file_info
~~~

The repository also contains opt-in foundations for:

~~~text
goreecloud.remote.write_file
goreecloud.remote.execute_command
~~~

These higher-risk capabilities are not part of the currently accepted read-only ChatGPT/API path.

---

## 3. Planned Device Management

GoreeCloud Remote MCP is planned to support multiple authorized computers from one authenticated remote MCP environment.

Planned device-management capabilities include:

- Discover all devices registered to the authorized GoreeCloud Remote MCP account or deployment.
- Report device online, offline, unavailable, degraded, or unauthorized state.
- Address a specific device by stable device identifier.
- Display human-readable device labels without relying on labels as security identifiers.
- Ping a selected device and measure connectivity.
- Retrieve device-agent version information.
- Retrieve operating-system and environment information where authorized.
- Retrieve device capability declarations.
- Determine which tools a specific device currently permits.
- Report agent health and readiness.
- Gracefully disconnect or stop a device agent where permitted.
- Support controlled device registration and removal.
- Support credential revocation for a lost or retired device.
- Prevent one device identity from impersonating another.
- Support multiple simultaneously connected devices.
- Provide explicit device selection when more than one device is available.

Possible future tools include:

~~~text
goreecloud.remote.list_devices
goreecloud.remote.get_device
goreecloud.remote.get_device_capabilities
goreecloud.remote.ping
goreecloud.remote.get_device_health
goreecloud.remote.disconnect_device
~~~

Device-management operations must distinguish ordinary connectivity actions from privileged device enrollment, revocation, and policy changes.

---

## 4. Planned Filesystem Discovery

Filesystem discovery will expand beyond the current directory-listing foundation while remaining constrained to explicitly authorized roots.

Planned capabilities include:

- List files and directories.
- Traverse directory structures to a controlled depth.
- Distinguish files, directories, links, inaccessible paths, and unsupported objects.
- Retrieve file size, timestamps, type, permissions, and other approved metadata.
- Inspect text-file line counts.
- Identify spreadsheet worksheets and dimensions.
- Detect supported file formats.
- Resolve files within configured filesystem roots.
- Retrieve recent or modified files where policy allows.
- Support bounded directory pagination for very large trees.
- Protect model context from extremely large directory listings.
- Prevent path traversal outside approved filesystem roots.
- Normalize paths safely across Linux, macOS, and Windows where supported.

The agent must remain the final authority on whether a path is accessible.

---

## 5. Planned Filesystem Search

The current search capability is planned to mature into a general bounded filesystem search service.

### Filename Search

Search files and directories by:

- Exact name.
- Partial name.
- Extension.
- Wildcard or glob pattern.
- Regular expression where explicitly supported.
- File type.
- Directory scope.

### Content Search

Search approved file contents for:

- Words and phrases.
- Source-code identifiers.
- Function names.
- Configuration values.
- Documentation text.
- TODO and FIXME markers.
- Error strings.
- Regular-expression patterns.
- Exact literal strings.

### Search Controls

Planned controls include:

- Case-sensitive or case-insensitive operation.
- File-type filters.
- Hidden-file inclusion controls.
- Context lines around content matches.
- Result limits.
- Search time limits.
- Streaming results.
- Incremental result retrieval.
- Search cancellation.
- Search-session inspection.

Possible future tool family:

~~~text
goreecloud.remote.start_search
goreecloud.remote.get_search_results
goreecloud.remote.list_searches
goreecloud.remote.stop_search
~~~

Large searches must not require loading the complete result set into the model context before useful results can be returned.

---

## 6. Planned File Reading

The existing file-reading capability is planned to support structured, format-aware local document access.

### Text Files

Planned support includes:

- Full-file reads.
- Line-range reads.
- Tail reads.
- Incremental reads of large files.
- Character-encoding validation.
- Context-size protection.

### Images

Planned supported image formats may include:

~~~text
PNG
JPEG
GIF
WebP
~~~

The remote MCP path may return image content to compatible clients when explicitly requested and permitted.

### Microsoft Excel

Planned spreadsheet-reading capabilities include:

- .xlsx
- .xls
- .xlsm
- Worksheet selection.
- Cell-range selection.
- Row pagination.
- Worksheet metadata.
- Structured two-dimensional values suitable for analysis.

### Microsoft Word

Planned DOCX capabilities include:

- Extract document text.
- Inspect paragraphs.
- Inspect tables.
- Preserve document structural information where feasible.
- Identify styles.
- Identify embedded-image references.
- Support bounded inspection of underlying document XML for advanced editing workflows.

### PDF

Planned PDF-reading capabilities include:

- Extract text.
- Preserve page boundaries.
- Read selected page ranges.
- Return structured Markdown where useful.
- Retrieve embedded images where supported.
- Inspect document metadata.

Format-specific readers must not silently broaden filesystem authorization.

---

## 7. Planned File Creation and Modification

Write operations will remain disabled by default and require explicit device-side enablement.

Planned controlled-write capabilities include:

- Create new files.
- Replace approved file contents.
- Append to approved files.
- Create directories.
- Rename files.
- Rename directories.
- Move files.
- Move directories.
- Perform targeted text replacements.
- Update approved spreadsheet ranges.
- Make bounded DOCX changes.
- Create new supported documents.

Possible tool family:

~~~text
goreecloud.remote.write_file
goreecloud.remote.edit_file
goreecloud.remote.create_directory
goreecloud.remote.move_file
~~~

Write authorization must be separate from read authorization.

A filesystem root that permits reading must not automatically permit modification.

Where practical, a write should support:

1. Target validation.
2. Authorization validation.
3. Existing-state inspection.
4. Bounded modification.
5. Result readback.
6. Audit recording.
7. Recovery or rollback when applicable.

Destructive overwrite behavior must be distinguishable from append or surgical-edit operations.

---

## 8. Planned Surgical File Editing

GoreeCloud Remote MCP is planned to provide bounded editing operations that minimize unnecessary file rewrites.

Planned features include:

- Exact text replacement.
- Expected-match counts.
- Context-aware replacements.
- Detection of ambiguous matches.
- Safe failure when the target cannot be uniquely identified.
- Change-result verification.
- Spreadsheet range replacement.
- DOCX XML-based targeted editing where necessary.
- Header and footer editing for supported Word documents.
- Diff-oriented validation before or after material edits.

The design should favor small, inspectable changes over unnecessarily rewriting an entire document.

---

## 9. Planned Spreadsheet Capabilities

GoreeCloud Remote MCP is planned to provide native local spreadsheet handling for approved files.

Capabilities may include:

- Read Excel workbooks.
- List worksheets.
- Retrieve worksheet dimensions.
- Read individual cells.
- Read cell ranges.
- Read large sheets incrementally.
- Write structured two-dimensional values.
- Update specific cell ranges.
- Add data to existing sheets.
- Perform local data transformation through authorized execution tools.
- Validate workbook structure after modification.
- Preserve existing workbook content outside the requested range where technically feasible.

Remote MCP spreadsheet access is intended for local file manipulation and analysis rather than replacing a dedicated collaborative spreadsheet service.

---

## 10. Planned Word Document Capabilities

Planned DOCX support includes:

- Read document text.
- Read tables.
- Inspect styles.
- Inspect document structure.
- Identify image references.
- Create new DOCX files from structured content.
- Convert supported Markdown headings into document heading styles.
- Perform precise text changes.
- Perform controlled structural XML changes.
- Modify headers and footers.
- Repack modified content into a valid DOCX file.
- Validate the resulting document after modification.

Higher-level document editing should be preferred over direct XML manipulation whenever a reliable structured interface exists.

---

## 11. Planned PDF Capabilities

GoreeCloud Remote MCP is planned to support local PDF creation and controlled modification.

Planned creation features include:

- Create PDF files from Markdown.
- Headers and paragraphs.
- Lists.
- Tables.
- Code blocks.
- Page breaks.
- Images.
- HTML/CSS-based presentation where supported.
- Inline SVG diagrams and graphics.

Planned PDF modification features include:

- Insert newly generated pages.
- Insert pages from another PDF.
- Delete selected pages.
- Combine approved PDF material.
- Produce a new output file rather than silently destroying the source document.

Existing PDF modification should default to non-destructive output.

---

## 12. Planned Terminal and Command Execution

Remote command execution is a high-risk capability and will remain disabled by default.

When explicitly enabled, GoreeCloud Remote MCP is planned to support bounded terminal execution on an authorized device.

Capabilities may include:

- Run one-shot shell commands.
- Execute scripts.
- Run compilers.
- Run test suites.
- Run package-management commands.
- Run local data-processing utilities.
- Execute Git commands.
- Run build systems.
- Start development servers.
- Start database command-line tools.
- Start supported interactive programs.
- Start long-running processes.
- Select an approved shell.
- Capture standard output.
- Capture standard error.
- Return process exit status.
- Enforce command duration limits.
- Enforce output-size limits.

Command execution must respect the device's configured policy and operating-system permissions.

Remote MCP authorization must not be interpreted as operating-system privilege escalation.

---

## 13. Planned Interactive Process Sessions

A mature GoreeCloud Remote MCP execution model may provide persistent process sessions.

Planned capabilities include:

- Start an interactive process.
- Return a stable process/session identifier.
- Detect whether the process completed.
- Detect whether the process remains active.
- Detect whether a program is waiting for input.
- Send additional input to a process.
- Retrieve newly produced output.
- Retrieve selected historical output.
- Tail recent process output.
- List active Remote MCP sessions.
- Gracefully terminate an approved session.
- Force-terminate a stuck Remote MCP session where authorized.

This can support workflows involving:

~~~text
Python REPL
Node.js REPL
interactive shells
database consoles
SSH clients
development servers
build watchers
debugging utilities
other approved terminal applications
~~~

Interactive sessions must remain bounded and auditable.

---

## 14. Planned Operating-System Process Management

A separate privileged capability class may expose host-process inspection.

Possible capabilities include:

- List running processes.
- Retrieve process identifiers.
- Retrieve process names.
- Retrieve bounded CPU-use information.
- Retrieve bounded memory-use information.
- Identify processes started by Remote MCP.
- Terminate a Remote MCP-created process.
- Terminate another process only when separately authorized.

Possible tools include:

~~~text
goreecloud.remote.list_processes
goreecloud.remote.kill_process
~~~

Arbitrary process termination must not be granted merely because command execution has been enabled.

---

## 15. Planned Local Development Workflows

The combination of filesystem and bounded command tools is intended to support complete local development workflows.

### Repository Exploration

- Locate source files.
- Search code.
- Inspect configuration.
- Read documentation.
- Examine dependency definitions.
- Trace implementation relationships.

### Coding

- Create source files.
- Modify source files.
- Apply surgical patches.
- Generate configuration.
- Update documentation.

### Build and Validation

- Run linting.
- Run type checking.
- Run unit tests.
- Run integration tests.
- Compile software.
- Build packages.
- Inspect failures.
- Apply corrections.
- Rerun validation.

### Git

Where Git is installed and explicitly authorized:

- Inspect repository status.
- Inspect diffs.
- Inspect branches.
- Create branches.
- Stage changes.
- Create commits.
- Fetch.
- Pull.
- Push.
- Inspect logs.
- Perform other approved local Git operations.

Git credentials remain outside GoreeCloud Remote MCP and must continue to follow the authorization model of the host environment.

---

## 16. Planned Local Data Analysis

GoreeCloud Remote MCP is planned to make approved local datasets available for analysis without requiring the entire source dataset to be permanently copied into an external service.

Potential workflows include:

- Analyze CSV files.
- Analyze JSON files.
- Analyze spreadsheets.
- Parse logs.
- Summarize structured datasets.
- Validate records.
- Compare files.
- Transform local data.
- Generate reports.
- Run Python analysis.
- Run Node.js analysis.
- Run R analysis where installed.
- Use other approved local analysis environments.

Programmatic analysis should execute on the authorized device whenever the task can reasonably remain local.

Only results required by the requesting client should be returned across the Remote MCP boundary.

---

## 17. Planned Configuration and Policy Controls

The device agent is planned to expose inspectable and enforceable configuration.

Possible configuration controls include:

### Filesystem

~~~text
allowedRoots
readEnabled
writeEnabled
maximumReadSize
maximumWriteSize
~~~

### Commands

~~~text
commandExecutionEnabled
allowedCommands
blockedCommands
defaultShell
commandTimeout
maximumOutputSize
~~~

### Search

~~~text
maximumSearchResults
searchTimeout
hiddenFilesEnabled
~~~

### Sessions

~~~text
maximumConcurrentSessions
sessionIdleTimeout
maximumSessionRuntime
~~~

### Telemetry and Audit

~~~text
telemetryEnabled
auditEnabled
auditRetention
~~~

Configuration changes must be more privileged than ordinary file and command operations.

A remote client must not be able to remove its own restrictions merely because it possesses ordinary execution permission.

---

## 18. Planned Capability Discovery

Each device should be able to advertise its actual enabled capability set.

The broker may expose structured information describing:

- Supported operating system.
- Agent version.
- Supported protocol version.
- Available filesystem capabilities.
- Available search capabilities.
- Supported file formats.
- Whether writing is enabled.
- Whether command execution is enabled.
- Whether interactive execution is enabled.
- Whether process management is enabled.
- Available limits.
- Applicable policy restrictions.

This allows the client to determine what the device can safely perform without probing through failed privileged operations.

---

## 19. Planned Diagnostics and Operational Visibility

GoreeCloud Remote MCP is planned to provide operational diagnostics without exposing protected information.

Capabilities may include:

- Broker health.
- Broker readiness.
- Agent health.
- Agent readiness.
- Tunnel state.
- Device connectivity.
- Request counts.
- Tool invocation counts.
- Successful operation counts.
- Failed operation counts.
- Execution-duration metrics.
- Search-duration metrics.
- File-operation metrics.
- Active session counts.
- Recent bounded operational events.
- Protocol/version information.

Diagnostic information must not reproduce active credentials or unnecessary private content.

---

## 20. Planned Tool Activity History

A bounded local history may assist troubleshooting and continuity.

Possible capabilities include:

- Retrieve recent Remote MCP tool calls.
- Filter by tool name.
- Filter by time.
- Inspect request status.
- Inspect sanitized input metadata.
- Inspect sanitized result metadata.
- Determine what operation last changed a resource.
- Reconstruct a recent Remote MCP workflow after conversational context is lost.

Tool history must not become an uncontrolled store of file contents, secrets, terminal output, personal data, or credentials.

Sensitive arguments and outputs must be redacted or excluded according to policy.

---

## 21. Planned Multi-Device Workflows

GoreeCloud Remote MCP is intended to support controlled workflows spanning more than one authorized device.

Examples include:

- Inspect a project on a workstation while reading logs from a server.
- Compare configuration between two devices.
- Validate that the same software version exists on several systems.
- Retrieve a file from one approved device and compare it against another approved copy.
- Run a bounded validation command on several devices.
- Inspect deployment state across a small device fleet.

Every operation must retain explicit device identity.

The system must never silently substitute another device because the requested device is unavailable.

---

## 22. Planned Remote Administration Boundary

Remote MCP may eventually support selected administration workflows, but ordinary remote access will not imply unrestricted administrative authority.

Privileged operations may include:

- Service control.
- Package installation.
- System configuration.
- Network configuration.
- User administration.
- Permission modification.
- Security-policy changes.
- Credential-management actions.
- System shutdown or restart.
- Destructive filesystem operations.

These capabilities require separate design, authorization, Wardveil Security evaluation, recovery planning, audit requirements, and explicit acceptance before becoming production capabilities.

---

## 23. Wardveil Security Integration

Wardveil Security is planned to govern security-sensitive Remote MCP operations.

Applicable responsibilities include:

- Classify requested operations by risk.
- Distinguish read, write, execute, administrative, and destructive actions.
- Validate capability scope.
- Validate target device.
- Validate target filesystem root.
- Validate execution authorization.
- Reject requests exceeding authorized scope.
- Require stronger controls for privileged operations.
- Present meaningful security state.
- Record security-relevant audit metadata.
- Fail closed when authorization cannot be established.
- Avoid logging reusable secrets.
- Support credential-revocation workflows.

Wardveil status must be derived from actual controls and evidence rather than displayed as a decorative trust indicator.

---

## 24. Privacy Shield Requirements

Remote access to a computer can expose highly sensitive information.

Privacy controls are therefore planned as a first-class system requirement.

The Remote MCP architecture should:

- Apply privacy by default.
- Restrict access to explicitly approved filesystem roots.
- Avoid transmitting unrelated files.
- Avoid unrestricted home-directory access by default in production configurations.
- Return only data necessary for the requested operation.
- Avoid persistent broker storage of ordinary file contents.
- Minimize transmission of terminal output.
- Redact protected information from diagnostics where practical.
- Preserve user and device boundaries.
- Prevent one authorized user from inheriting another user's filesystem rights.
- Support auditable revocation.
- Provide clear local controls for disabling remote access.

The existence of operating-system access does not imply authorization to expose every accessible file to an external model.

---

## 25. Authentication and Authorization

The production Remote MCP architecture must provide distinct trust boundaries for:

~~~text
AI client → Remote MCP service
Remote MCP service → broker
broker → device agent
device agent → local capability
~~~

Planned requirements include:

- Strong client authentication.
- Device authentication.
- Short-lived authorization where practical.
- Credential rotation.
- Credential revocation.
- Separate device credentials.
- Separate service credentials.
- Least privilege.
- Scoped capabilities.
- Explicit read/write/execute distinctions.
- Protection against replay.
- Protection against device impersonation.
- Fail-closed behavior.
- Auditable authorization decisions.

No single broad credential should unnecessarily authorize every device and every high-risk capability.

---

## 26. Capability and Risk Classes

Remote MCP capabilities should be classified according to effect.

### Class 1 — Discovery

Examples:

~~~text
list_devices
ping
get_device_health
list_directory
get_file_info
~~~

### Class 2 — Read

Examples:

~~~text
read_file
search_files
read_document
read_spreadsheet_range
~~~

### Class 3 — Controlled Write

Examples:

~~~text
write_file
edit_file
create_directory
move_file
edit_spreadsheet
~~~

### Class 4 — Execute

Examples:

~~~text
start_process
interact_with_process
run_validation
~~~

### Class 5 — Privileged Administrative

Examples:

~~~text
change_agent_policy
manage_device_credentials
manage_system_service
change_host_configuration
~~~

### Class 6 — Destructive

Examples:

~~~text
delete_file
terminate_unrelated_process
remove_device
destroy_persistent_state
~~~

Higher-risk classes must require progressively stronger controls.

---

## 27. Planned Safety Defaults

The safe production default should remain substantially more restrictive than the theoretical maximum capability set.

Default policy should favor:

~~~text
Read filesystem: restricted
Write filesystem: disabled
Command execution: disabled
Interactive execution: disabled
Process termination: disabled
Administrative operations: disabled
Destructive operations: disabled
Public broker exposure: disabled
~~~

Capabilities should be enabled deliberately and independently.

Enabling one capability must not implicitly enable a more privileged class.

---

## 28. Planned Cross-Platform Support

The long-term device agent should provide a consistent MCP contract across supported host platforms while respecting platform-specific behavior.

Potential target environments include:

~~~text
Linux
Windows
macOS
~~~

The protocol should normalize common concepts while retaining platform-specific information where necessary for correctness.

Examples include:

- Path syntax.
- Shell selection.
- Permission models.
- Service management.
- Process behavior.
- Filesystem semantics.
- Environment variables.
- Command quoting.
- File metadata.

Cross-platform abstraction must not conceal security-relevant operating-system differences.

---

## 29. Planned Client Independence

GoreeCloud Remote MCP should remain usable by more than one artificial-intelligence client.

The core service should remain based on MCP and GoreeCloud-controlled protocols rather than embedding critical functionality exclusively in a ChatGPT-specific interface.

Potential clients may include:

- ChatGPT.
- OpenAI API applications.
- Codex-compatible workflows.
- GoreeCloud-native artificial-intelligence clients.
- Locally hosted models.
- Other approved MCP-compatible applications.

Client independence is necessary to preserve GoreeCloud's long-term technology-independence objective.

---

## 30. Planned Tool Families

The mature tool surface may be organized approximately as follows.

~~~text
Device
goreecloud.remote.list_devices
goreecloud.remote.get_device
goreecloud.remote.get_device_capabilities
goreecloud.remote.ping
goreecloud.remote.get_device_health

Filesystem
goreecloud.remote.list_directory
goreecloud.remote.get_file_info
goreecloud.remote.read_file
goreecloud.remote.read_files
goreecloud.remote.write_file
goreecloud.remote.edit_file
goreecloud.remote.create_directory
goreecloud.remote.move_file

Search
goreecloud.remote.start_search
goreecloud.remote.get_search_results
goreecloud.remote.list_searches
goreecloud.remote.stop_search

Documents
goreecloud.remote.read_document
goreecloud.remote.edit_document
goreecloud.remote.read_spreadsheet
goreecloud.remote.edit_spreadsheet
goreecloud.remote.read_pdf
goreecloud.remote.write_pdf

Execution
goreecloud.remote.start_process
goreecloud.remote.read_process_output
goreecloud.remote.interact_with_process
goreecloud.remote.list_sessions
goreecloud.remote.terminate_session

Processes
goreecloud.remote.list_processes
goreecloud.remote.terminate_process

Configuration
goreecloud.remote.get_policy
goreecloud.remote.get_config
goreecloud.remote.update_config

Diagnostics
goreecloud.remote.get_usage
goreecloud.remote.get_recent_activity
goreecloud.remote.get_health
~~~

These names represent planning direction and do not establish an implemented or accepted API contract.

Individual tools should be added only when their schema, authorization boundary, validation requirements, security controls, audit requirements, and recovery behavior have been defined and accepted.

---

## 31. Production Acceptance Requirements

The full planned capability set must not be interpreted as production approval.

Before privileged Remote MCP operation is accepted, the project must separately verify:

- Authentication.
- Authorization.
- Device identity.
- Credential rotation.
- Credential revocation.
- Least-privilege capability policy.
- Filesystem-root enforcement.
- Read/write separation.
- Command authorization.
- Process isolation expectations.
- Sensitive-information handling.
- Wardveil Security integration.
- Privacy Shield requirements.
- Durable audit behavior.
- Rate limiting.
- Abuse controls.
- Monitoring.
- Failure behavior.
- Reconnection behavior.
- Recovery.
- Rollback.
- Service update behavior.
- Device removal.
- Remote-access disablement.
- Representative Linux acceptance.
- Applicable Windows acceptance.
- Applicable macOS acceptance.
- End-to-end security testing.
- Documentation.
- Operational runbooks.

A successful local demonstration or source-level test does not by itself establish production acceptance.

---

## 32. Development Direction

The planned progression for GoreeCloud/remote-mcp is:

### Phase 1 — Read-Only Foundation

Maintain and harden the currently validated capabilities:

~~~text
list devices
ping device
list directories
read files
search files
inspect metadata
~~~

### Phase 2 — Read-Only Maturity

Add:

~~~text
structured file readers
large-file pagination
streaming searches
search-session management
capability discovery
diagnostics
cross-platform normalization
~~~

### Phase 3 — Controlled Filesystem Write

Add explicitly enabled and separately authorized:

~~~text
file creation
file modification
directory creation
move/rename
surgical editing
structured spreadsheet/document editing
~~~

### Phase 4 — Controlled Execution

Add explicitly enabled:

~~~text
one-shot commands
build/test workflows
long-running processes
process output retrieval
interactive sessions
session management
~~~

### Phase 5 — Advanced Local Workflows

Add controlled support for:

~~~text
local development
data analysis
document generation
PDF manipulation
multi-device workflows
structured automation
~~~

### Phase 6 — Security and Operational Maturity

Complete:

~~~text
Wardveil Security
Privacy Shield
authorization policy
credential lifecycle
durable audit
monitoring
rate limiting
recovery
rollback
device revocation
production operations
~~~

### Phase 7 — Production Qualification

Production qualification requires representative end-to-end validation of the approved capability subset.

Not every theoretically available Remote MCP capability is required to be enabled in production.

---

## 33. Target Outcome

The long-term objective is for GoreeCloud/remote-mcp to provide a GoreeCloud-controlled equivalent of a capable remote computer MCP environment while maintaining substantially stronger control over:

- Where the broker runs.
- How devices authenticate.
- Which devices are reachable.
- Which filesystem roots are exposed.
- Whether writes are permitted.
- Whether command execution is permitted.
- Which commands may execute.
- Which processes may be controlled.
- What information leaves the device.
- What activity is audited.
- How credentials are stored.
- How access is revoked.
- How the system is monitored.
- How failures are recovered.
- How privileged operations are authorized.

The goal is not unrestricted remote shell access disguised as an MCP service.

The goal is a **self-hosted, capability-scoped, device-controlled remote MCP platform** that can provide powerful filesystem, development, document, data-analysis, process, and automation capabilities while preserving GoreeCloud security, privacy, auditability, recoverability, and technology independence.

Until those controls and their acceptance evidence are complete, GoreeCloud/remote-mcp remains **Development** and must not be represented as production-approved.
