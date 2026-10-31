---
name: revert-checkpoint
description: >-
  Reverts tracked source changes back to the latest git commit, then restores
  the matching dev/plans/ implementation plan to its pre-change state,
  resyncs it with its dev/specs/ specification, and reports the resulting
  repository status. Use when an experimental change needs to be cleanly
  undone without losing the documented history of what was tried.
---

# Revert Checkpoint Skill

This skill guides the agent through safely reverting the working tree to the
latest git commit and reconciling the project's planning documents
(`dev/plans/`, `dev/specs/`) with the restored code state.

All output produced by this skill — status reports, plan/spec edits, revision
history entries — must be written in English only.

---

## Goal

Cleanly undo an unwanted change in three coordinated steps:

1. Return tracked source files to the latest git commit without silently
   discarding recoverable work.
2. Roll the relevant `dev/plans/implementation_plan_<task>.md` back to the
   state that matches the restored code, using an append-only revision
   history rather than deleting the record of what was tried.
3. Resync that plan with its `dev/specs/spec_<task>.md` counterpart so the
   two documents describe the same, currently-true state of the project.

---

## Critical Context: `dev/`, `.agents/`, `.claude/`, and `.codex/` Are Gitignored

Before touching anything, know this: this repository's `.gitignore` excludes
`dev/`, `.agents/`, `.claude/`, and `.codex/` entirely. That means:

- `dev/plans/*.md` and `dev/specs/*.md` have **no git history** — git has
  never tracked them, so `git revert`, `git checkout <sha> -- <path>`, and
  `git reset --hard` have **zero effect** on them.
- Reverting the git-tracked source code (Phase 2 below) will **not**
  automatically roll back the implementation plan or spec. That restoration
  is a manual, semantic editing step (Phase 3) — never assume git did it.
- Skill files under `.agents/skills/` and `.claude/skills/` are mirrored
  copies kept in sync by convention; if this skill is ever edited, apply the
  same edit to both paths.

---

## 📋 5-Phase Revert Lifecycle

```
   ┌────────────────────────────────────┐
   │ Phase 1: Pre-Revert Safety Audit   │  Inspect git state; stash, don't discard
   └────────────────┬───────────────────┘
                    │
   ┌────────────────▼───────────────────┐
   │ Phase 2: Git Revert (tracked only) │  Return source files to the target commit
   └────────────────┬───────────────────┘
                    │
   ┌────────────────▼───────────────────┐
   │ Phase 3: Restore the Plan (manual) │  Roll dev/plans/ back to match Phase 2
   └────────────────┬───────────────────┘
                    │
   ┌────────────────▼───────────────────┐
   │ Phase 4: Resync Plan ↔ Spec        │  Reconcile dev/plans/ with dev/specs/
   └────────────────┬───────────────────┘
                    │
   ┌────────────────▼───────────────────┐
   │ Phase 5: Status Report             │  Report HEAD, versions, recovery points
   └──────────────────────────────────────┘
```

---

## 🛠️ Step-by-Step Instructions

### Phase 1: Pre-Revert Safety Audit

1. Run:
   ```bash
   git status
   git log -3 --oneline
   ```
2. Confirm the target with the user:
   - **Default / most common** — "revert to the latest commit" means discard
     uncommitted edits to tracked files and return to current `HEAD`. No
     earlier commit is touched.
   - **Less common** — rolling back one or more *already-committed* commits.
     This needs an explicit target commit SHA from the user before Phase 2
     proceeds; never guess how far back to go.
3. If tracked files have uncommitted changes, stash them instead of
   discarding — this keeps the work recoverable:
   ```bash
   git stash push -u -m "revert-checkpoint-safety-<UTC timestamp>"
   ```
4. If the target is an earlier commit (not `HEAD`), create a safety ref
   first so the current tip is never lost:
   ```bash
   git branch pre-revert-checkpoint-<UTC timestamp>
   ```

### Phase 2: Execute the Git Revert (tracked files only)

1. **Uncommitted-changes case**: after the Phase 1 stash, tracked files
   already match `HEAD` — nothing further is required here.
2. **Already-committed case**: prefer `git revert <sha>` (adds an inverse
   commit; safe even if the commit was already pushed/shared) over
   `git reset --hard <sha>` (rewrites history; only ever use this for local,
   unpushed commits, and only after explicit user confirmation of the exact
   SHA and after the Phase 1 safety branch exists).
3. Never run `git clean -fd`, `git push --force`, or `git reset --hard`
   without the user explicitly confirming that exact command and target —
   these are destructive per this project's standing safety rules.
4. Remember: none of these commands touch `dev/`, `.agents/`, `.claude/`, or
   `.codex/` — proceed to Phase 3 regardless of which git command was used.

### Phase 3: Restore the Implementation Plan (manual, not git)

1. Identify the plan file that documents the reverted work:
   `dev/plans/implementation_plan_<task>.md`. Match it to the reverted
   change via the git commit message (phase name/number) and the plan's own
   Requirement Traceability table.
2. Read the plan's current **Revision History** table and Requirement
   Traceability rows to find the state that predates the reverted change.
3. Edit the plan **in place**, following this repository's existing
   convention (see the REQ-06 row in `implementation_plan_tandem.md` for a
   worked example):
   - Update the affected Requirement Traceability row(s) and task prose to
     reflect that the reverted work is no longer present in the codebase.
     Annotate what happened rather than deleting the record of the attempt
     (e.g. "fixed on `<date>` but discarded by the `<date>` revert to
     `<commit/phase>`").
   - Set the frontmatter `status` to whatever accurately describes the
     restored state (e.g. `Reopened`, `In Progress`) — do not leave it
     claiming a state the code no longer has.
   - **Append** a new Revision History row for the revert itself (bump
     `version`, e.g. `v1.32.0` → `v1.32.1`); never rewrite or delete a
     previous row. Include the date, a one-line summary, the trigger
     ("Reverted to <commit/phase>"), and the resulting status.
4. If no plan file exists for the reverted work (e.g. it was a small,
   undocumented fix), skip this phase and say so explicitly in the Phase 5
   report — do not fabricate a plan entry that never existed.

### Phase 4: Resync the Plan with Its Specification

1. Open the matching `dev/specs/spec_<task>.md` and compare its `version`
   against the plan's `target_spec_version`.
2. If the reverted work had added or changed a requirement in the spec,
   ask whether it is paused or abandoned:
   - **Paused** — mark the requirement `[DEFERRED]` or `[POST-MVP]` in the
     spec rather than deleting it, per this repo's spec-plan-sync
     convention.
   - **Abandoned** (only on explicit user confirmation) — remove it, and
     bump the spec's `version` (MINOR or PATCH, per its own semantic
     versioning rules) with a new Revision History row explaining why.
3. Only change `target_spec_version` in the plan if the spec's `version`
   itself changed in step 2; otherwise leave the pin as-is — the revert
   alone does not imply a new spec version.
4. Run the existing sync verifier to confirm no version drift or broken
   links remain:
   ```bash
   python .agents/skills/spec-plan-sync/scripts/verify_spec_plan_sync.py
   ```

### Phase 5: Status Report

1. Run the bundled helper for a consolidated view (see below), or run
   these individually:
   ```bash
   git log -5 --oneline
   git status
   git stash list
   ```
2. Report to the user, in English:
   - The current `HEAD` commit (hash + message) and confirmation the
     working tree is clean.
   - The plan file touched, its old → new `version`/`status`.
   - The spec file's `version` and whether it changed.
   - Which Requirement Traceability rows changed status and why.
   - The exact verification command(s) to re-run for the affected
     requirement(s), taken from the plan's own traceability table.
   - Where pre-revert work is recoverable from, if anything was stashed or
     branched in Phase 1 (`git stash list` ref or safety branch name).

---

## 🧰 Helper Script

`scripts/revert_checkpoint.py` automates the git mechanics of Phases 1, 2,
and 5 (status audit, safe stash, safety branch, and the final report). It
never touches `dev/plans/` or `dev/specs/` — those edits stay a manual,
reasoned step in Phase 3/4 because git has no history for those files.

```bash
# Inspect state and see what would happen (no changes made)
python .agents/skills/revert-checkpoint/scripts/revert_checkpoint.py

# Discard uncommitted tracked-file changes back to HEAD (stashes first)
python .agents/skills/revert-checkpoint/scripts/revert_checkpoint.py --yes

# Roll back to an earlier, already-committed commit (creates a safety branch)
python .agents/skills/revert-checkpoint/scripts/revert_checkpoint.py --target <sha> --style revert --yes
```

Without `--yes`, the script only prints what it would do and makes no
changes — always run the dry-run first and confirm the plan with the user
before adding `--yes`.

---

## 💡 Best Practices

* **Never delete history to make it disappear.** Both git (via `revert`
  over `reset --hard`) and the plan/spec Revision History tables should
  grow forward, recording that something was tried and undone, not erase
  the fact it happened.
* **Stash, don't discard.** Uncommitted work is recoverable via `git stash`
  at near-zero cost; discarding it outright is not.
* **Confirm the target commit explicitly.** "Latest commit" is unambiguous;
  anything further back requires the user to name the exact SHA.
* **Keep plan and spec versions honest.** A plan must never claim a
  requirement is `Complete` when the revert removed the code that satisfied
  it.
