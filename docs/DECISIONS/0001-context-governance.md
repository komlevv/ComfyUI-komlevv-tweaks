# 0001 - Context governance

- Status: stable
- Scope: durable rationale for the repository's multi-file context system and governance rules
- Applies to: `AGENTS.md`, `CLAUDE.md`, `docs/**`, nested `AGENTS.md`
- Source of truth level: decision
- Last verified commit: 4479a4521e2ea79e6855da1f843825aa95cb4957
- Update when: context governance strategy changes
- Supersedes: none
- Superseded by: none

## Decision

The repository uses a multi-file context system with:

- one canonical root instruction file: `AGENTS.md`
- one thin Claude-specific entrypoint: `CLAUDE.md`
- one central registry: `docs/INDEX.md`
- stable architecture docs
- stable feature docs
- separate tool playbooks
- separate active task docs
- separate historical handoff docs
- narrowly scoped nested `AGENTS.md` only in risky directories

## Why

A single giant handoff file drifts too quickly and mixes:

- stable project rules
- unstable task state
- branch/session-specific continuation notes
- operational workflow instructions

This makes agents regress into stale assumptions.

## Consequences

- current code is the primary factual source of truth
- docs exist to keep agents aligned, not to override code
- active task state must not be mixed into stable architecture docs
- historical handoffs must not compete with active task docs
- tool workflows must not be buried inside architecture docs

## Governance rules

- `AGENTS.md` is canonical for agent behavior rules
- `CLAUDE.md` must remain thin
- `docs/INDEX.md` is required and must be updated when docs are added or superseded
- each agent-facing doc must declare status, scope, applies-to, source-of-truth level, last verified commit, and update triggers
- non-trivial changes must update the narrowest relevant context file in the same commit

## Revisit

Revisit this decision only if the current system becomes materially too heavy or fails to keep docs aligned with the code.
