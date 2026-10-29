# MRLess UI

SolidJS client for MRLess, an experimental local mesh messenger. The UI talks
to a local Rust node over WebSocket; the node handles discovery, peer links,
message delivery, storage, and relaying between devices.

There is no central account or cloud backend. Each device keeps its own
identity and local data.

## What is here

- SolidJS + TypeScript interface for chats, groups, contacts, files, and settings
- Vite development workflow with Bun
- Desktop launcher that starts the local node and the UI together
- Shared UI bundle used by the macOS, iOS, Android, and Windows shells

The Rust node and native/platform wrappers live in the companion repository:
[MRLess node](https://github.com/nimeview/MRLess_server).

## Quick start

The two repositories should be next to each other:

```text
MRLess/
MRLess_server/
```

Then run:

```bash
bun install
bun run app
```

The launcher builds the node when needed and starts the UI at
`http://127.0.0.1:3000`. A second local node can be started with:

```bash
bun run dev:bob
```

## Documentation

- [Architecture](docs/architecture.md)
- [Usage](docs/usage.md)
- [Builds and platform shells](docs/build.md)

## Status

Personal experimental project. The protocol, storage format, and platform
packaging are still evolving.
