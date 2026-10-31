---
name: iterative-feedback
description: >-
  Turns user feedback on already-built work into a synchronized dual update to dev/specs/ and dev/plans/, then re-drives implementation. Use when the user gives feedback that something built doesn't match their intent. Composes with spec-plan-sync and test-driven-development rather than duplicating them.
---

# Iterative Feedback

## Goal

Make sure feedback on delivered work always updates the spec (what should be true) and the plan (what implements it) together, atomically — never just the code, never just one of the two docs — and that repeated feedback loops don't degrade `dev/specs/`/`dev/plans/` into bloated or drifted documents the agent gets confused re-reading.

## When to use this skill

- The user reacts to something already built: "this isn't what I wanted", "actually it should…", "close, but…"
- **Not for**: drafting a brand-new spec from scratch (plain `spec-plan-sync` / `test-driven-development`), or reconciling drift that isn't feedback-triggered (`spec-plan-sync` alone), or splitting an oversized doc for its own sake (`context-partitioner` alone — this skill calls it when a dual update needs it).

## Relationship to other skills

This skill orchestrates a feedback loop; it doesn't reimplement any of these:
- [spec-plan-sync](../spec-plan-sync/SKILL.md) — actual drift detection, semver bumping, traceability matrix mechanics.
- [context-partitioner](../context-partitioner/SKILL.md) — keeps the target docs chunked and dependency-tracked so each feedback pass only touches a small file, not a monolith.
- [compact-context](../compact-context/SKILL.md) — slices only the changed requirement/task into the next prompt instead of the whole doc tree.
- `test-driven-development` (or whichever build skill produced the work) — the actual re-implementation.

## Phase 1: classify the feedback

Before touching any file, classify into exactly one bucket:

1. **Bug** — the implementation diverged from an already-correct, unambiguous spec. The spec doesn't change; only the plan gains a fix task.
2. **Scope/requirement change** — the user wants different behavior than what was specified. Both the spec (new/modified requirement, version bump) and the plan (task updates) change — this is the dual-update case this skill exists for.
3. **Clarification** — the spec was ambiguous and the feedback resolves it. The spec changes (tightened wording) and the plan changes too if the existing implementation now provably deviates from the clarified spec.

Misclassifying (2) or (3) as "just a bug" — editing code without touching the spec — is the exact failure this skill exists to prevent. When genuinely unsure, treat it as (2).

## Phase 2: dual update (classifications 2 and 3 only)

1. Check bloat with `context-partitioner`'s bloat checker before editing; chunk first if the target file is already over threshold so the edit lands in one clean chunk.
2. Update `dev/specs/…`: add or modify the requirement, bump the spec version per `spec-plan-sync`'s semver rules, append a Revision History row citing the feedback entry.
3. Update `dev/plans/…`: add or modify the task(s) implementing the change; mark any now-obsolete task `[SUPERSEDED]` rather than deleting it; bump the plan version; update the Requirement Traceability Matrix.
4. Update `depends_on`/`part_of` frontmatter on any chunk whose meaning shifted.

For classification (1), skip straight to logging a fix task in the plan against the unchanged requirement — no spec edit.

## Phase 3: verify, then re-implement

1. Run `spec-plan-sync`'s verifier and `context-partitioner`'s dependency-graph builder; resolve every issue before proceeding.
2. Record the resulting versions back into the feedback entry's frontmatter and set `status: applied`.
3. Hand off to the build skill in use, scoped to only the new/changed task ids — use `compact-context`'s JIT slicing so only the diff reaches the agent, not the full doc tree.
4. Run `scripts/check_feedback_sync.py` to confirm every applied entry updated the side(s) its classification requires, and that every referenced requirement/task id actually resolves.

## Feedback log convention

One file per feedback item: `dev/feedback/<date>-<slug>.md`

```yaml
---
document_type: "feedback"
date: "2026-09-12"
classification: "scope-change"   # bug | scope-change | clarification
status: "open"                    # open | applied | superseded
affected_reqs: []
affected_tasks: []
spec_version_before: ""
spec_version_after: ""
plan_version_before: ""
plan_version_after: ""
---

## Feedback

## Resolution
```

## Validation script

```bash
python .claude/skills/iterative-feedback/scripts/check_feedback_sync.py
```

Flags: an `applied` entry whose classification required a dual update but only one side's version changed, and any `affected_reqs`/`affected_tasks` id that doesn't resolve to a real `REQ-`/`TASK-` id anywhere under `dev/specs/` or `dev/plans/`.

## References

- `references/classification-examples.md` — worked examples distinguishing bug vs. scope-change vs. clarification.
- `references/dual-update-example.md` — a full before/after feedback entry plus its spec and plan diffs.
