# GitHub connector playbook

- Status: stable
- Scope: operational workflow for reading from and writing to GitHub through the connector
- Applies to: GitHub connector sessions for this repository
- Source of truth level: tool-playbook
- Last verified commit: 4479a4521e2ea79e6855da1f843825aa95cb4957
- Update when: the connector workflow changes, branch creation flow changes, or new connector failure modes are learned
- Supersedes: `github-connector.md` chat handoff notes
- Superseded by: none

## Purpose

This file documents the working GitHub connector strategy for this repository.

Use it as an explicit SOP.
Do not improvise a new write workflow unless the documented one clearly cannot work.

## Core model

Treat the connector as a content-addressed pipeline:

1. resolve branch head
2. read current file contents from that branch
3. build full replacement contents locally
4. create blob(s)
5. create tree on top of the current head
6. create commit on top of that head
7. update branch ref
8. verify the new head

Think in terms of:

- blobs
- trees
- commits
- refs

Do not think of it as a local git shell.
Do not think of it as a fragile line-patch editor.

## Canonical write workflow

### 1. Resolve the current head first

Before any write:

- fetch the current target branch head
- capture its SHA
- build on that exact SHA

Do not stack writes on a remembered old SHA.

### 2. Read the current file from the same target branch

Before replacing a file:

- fetch the current file content from the same branch you will update

Do not rely on chat memory or an older snapshot of the file.

### 3. Prefer full-file replacement over fragile patch logic

The most reliable connector pattern in this repository is:

- generate the full desired file contents
- create blob(s)
- replace the target path(s) in the new tree

This is preferred over brittle partial patch behavior.

### 4. Create the tree from the current head

Create the new tree using the fresh current head as base.

### 5. Create the commit on top of the same head

Use the current branch head SHA as `parent_sha`.

### 6. Update the ref with all required arguments

When moving the branch ref, ensure the call includes the full required argument set.
Do not assume missing parameters will be inferred.

### 7. Verify after writing

After ref update, resolve the branch head again if needed and verify that the branch moved to the new commit.

## Branch creation SOP

When a new branch is needed:

1. resolve the source branch head
2. create the new branch from that exact SHA
3. verify that the new branch now resolves
4. only then start normal read/write work on it

Do not diagnose branch creation failure before checking that the source head was resolved correctly.

## Failure taxonomy

When the workflow fails, classify the failed step precisely:

- branch head resolution failure
- file read failure
- blob creation failure
- tree creation failure
- commit creation failure
- ref update failure
- verified permission failure

Report the failed step, not a vague statement like "GitHub connector is unstable".

## Misdiagnosis rule

A single failed write does not prove missing write access.

Before concluding that the connector cannot write, check all of the following:

- was the target branch head fresh?
- was the file read from the same branch?
- were all required arguments supplied?
- did the branch move between read and write?
- did the attempted write rely on a fragile patch instead of a full replacement?
- was the failure actually at the ref-update step rather than a permission boundary?

Only after that should you diagnose a likely permission problem.

## Retry policy

One procedural retry is allowed after a write-path failure.

That retry must begin by:

1. resolving the current branch head again
2. rebuilding the tree and commit against that fresh head if necessary
3. retrying the failed write path with corrected arguments

Do not blindly repeat the same call without refreshing state.

## Working style rules

- prefer direct branch commits over abstract advice when the user wants actual changes
- keep commits narrow and topical
- read before writing
- do not overuse force updates unless the user explicitly wants history rewritten
- do not push the user toward local git after one connector failure if the SOP was not yet exhausted

## Reporting contract

If the write succeeds, report:

- branch name
- commit SHA
- touched files
- concise change summary

If the write fails, report:

- the exact failed step
- what was checked
- why the remaining failure still appears unresolved

## Repository-specific note

This repository already uses a modular `web/js` subfolder layout.
Read the actual current files before changing them.
Do not assume older file paths or older flat layouts.
