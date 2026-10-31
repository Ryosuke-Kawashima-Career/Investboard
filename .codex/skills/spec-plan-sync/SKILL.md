---
name: spec-plan-sync
description: >-
  Audits, synchronizes, and continuously aligns software specifications (requirements, user stories, architecture designs) with actionable implementation plans and task lists, detecting drift, unfulfilled requirements, and outdated architectural assumptions.
---

# 🔄 Spec-Plan Synchronization Skill

You are a **Software Architecture & Specification Alignment Specialist**. Your responsibility is to ensure that specifications (`dev/specs/`, `dev/tasks/task_specs/`) and implementation plans (`dev/plans/`, `dev/tasks/task_plans/`) remain fully synchronized, bidirectional, and up-to-date throughout the entire development lifecycle.

---

## 🎯 Core Objectives

1. **Eliminate Specification-Plan Drift**: Prevent divergence between what is designed in `dev/specs/` and what is scheduled or built in `dev/plans/`.
2. **Ensure Bidirectional Traceability**:
   - **Top-Down**: Every requirement, user story, or design contract must map to concrete implementation steps and verification tasks.
   - **Bottom-Up**: Technical constraints, architectural discoveries, and runtime changes encountered during execution must be reflected back into specification documents.
3. **Detect Orphan Work & Unplanned Scope**: Flag unplanned implementation tasks that lack backing requirements, as well as unaddressed requirements left out of implementation plans.

---

## 📋 4-Phase Synchronization Workflow

```
   ┌──────────────────────────────────────────────┐
   │ Phase 1: Traceability & Inventory Discovery  │  Scan dev/specs/ & dev/plans/ to index requirements & tasks
   └──────────────────────┬───────────────────────┘
                          │
   ┌──────────────────────▼───────────────────────┐
   │ Phase 2: Drift & Consistency Audit           │  Detect orphans, scope mismatches, and broken cross-references
   └──────────────────────┬───────────────────────┘
                          │
   ┌──────────────────────▼───────────────────────┐
   │ Phase 3: Bidirectional Reconciliation        │  Propagate updates top-down and feed technical discoveries bottom-up
   └──────────────────────┬───────────────────────┘
                          │
   ┌──────────────────────▼───────────────────────┐
   │ Phase 4: Automated Verification & Check      │  Run verification script to guarantee 100% link & task integrity
   └──────────────────────────────────────────────┘
```

---

## 📝 Step-by-Step Instructions

### Phase 1: Inventory & Traceability Discovery
1. **Locate Specification Artifacts**:
   - Main specs: `dev/specs/user_story.md`, `dev/specs/requirements.md`, `dev/specs/design.md`, `dev/specs/spec_<task>.md`.
   - Sub-task specs: `dev/tasks/task_specs/spec_<subtask>.md`.
2. **Locate Implementation Plans**:
   - Main plans: `dev/plans/implementation_plan.md`, `dev/plans/implementation_plan_<task>.md`, `dev/plans/task_list.md`.
   - Sub-task plans: `dev/tasks/task_plans/implementation_plan_<subtask>.md`.
3. **Index Requirement & Task Identifiers**:
   - Extract requirement keys (`REQ-01`, `REQ-02`, `DES-01`, `US-01`).
   - Extract plan task items (`TASK-01`, `PHASE-01`, `- [ ] Step X`).

### Phase 2: Drift & Consistency Audit
Inspect and classify discrepancies across three critical categories:
1. **Orphan Requirements (Unplanned Work)**:
   - Requirements defined in `dev/specs/` that do not have corresponding tasks or milestones in `dev/plans/`.
2. **Ghost Tasks (Unspecified Work / Scope Creep)**:
   - Steps or milestones in `dev/plans/` that implement functionality never specified or justified in `dev/specs/`.
3. **Architectural Divergence**:
   - Code components, dependencies, or API signatures in implementation plans that contradict Mermaid diagrams or interface contracts in `dev/specs/design.md`.
4. **Stale Completion States**:
   - Tasks marked completed in implementation plans whose verification commands failed or were never run.

### Phase 3: Bidirectional Reconciliation
Apply targeted updates to restore complete alignment:

1. **Top-Down Synchronization**:
   - When a requirement or user story is added or modified in `dev/specs/`, immediately add or update corresponding tasks in `dev/plans/implementation_plan_<task>.md` and `dev/plans/task_list.md`.
   - Include specific verification criteria for the new requirement.
2. **Bottom-Up Synchronization**:
   - When implementation uncovers new technical constraints (e.g. library deprecations, runtime limitations, protocol modifications), update `dev/specs/design.md` and `dev/specs/spec_<task>.md` before modifying production code.
3. **Maintain Traceability Matrix**:
   - Add or update the Requirement Traceability Matrix table in `dev/plans/implementation_plan_<task>.md` linking each `REQ-xxx` directly to its `TASK-xxx`.

### Phase 4: Automated Verification
1. Run the synchronization verification tool:
   ```powershell
   python .agents/skills/spec-plan-sync/scripts/verify_spec_plan_sync.py
   ```
2. Confirm:
   - Every `spec_<task>.md` in `dev/specs/` has a counterpart `implementation_plan_<task>.md` in `dev/plans/`.
   - All markdown links between `dev/specs/` and `dev/plans/` resolve to valid files.
   - All tasks have corresponding verification commands specified.

---

## 🏷️ Versioning System in Spec-Driven Development (SDD)

To ensure full historical traceability and prevent architectural drift, every specification and implementation plan must adhere to a standardized versioning function.

```
  ┌───────────────────────────────┐                  ┌────────────────────────────────────┐
  │  Specification (dev/specs/)   │                  │   Implementation Plan (dev/plans/) │
  │  version: "1.2.0"             │ ─── Verified ─── │   version: "1.2.0"                 │
  │  status: "Approved"           │     Alignment    │   target_spec_version: "1.2.0"     │
  └───────────────────────────────┘                  └────────────────────────────────────┘
```

### 1. Semantic Versioning for Specs & Plans (`MAJOR.MINOR.PATCH`)
- **MAJOR (`v2.0.0`)**: Breaking architectural changes, core system redesigns, fundamental scope pivots, or major schema overhauls.
- **MINOR (`v1.1.0`)**: Additive features, new user stories, additional functional requirements, or new plan milestones that preserve existing interfaces.
- **PATCH (`v1.0.1`)**: Clarifications, edge-case refinements, minor task step reordering, typo fixes, or parameter value updates.

### 2. Standard Document Metadata Headers
Place a YAML frontmatter block at the top of every spec and plan document:

**Specification Header (`dev/specs/spec_<task>.md`):**
```yaml
---
document_type: "specification"
version: "1.2.0"
status: "Approved" # Options: Draft | Review | Approved | Superseded
last_updated: "2026-08-26"
author: "AI Agent & Lead Architect"
---
```

**Implementation Plan Header (`dev/plans/implementation_plan_<task>.md`):**
```yaml
---
document_type: "implementation_plan"
version: "1.2.0"
target_spec_version: "1.2.0" # MUST match the active specification version
status: "In Progress" # Options: Draft | Approved | In Progress | Verified | Deprecated
last_updated: "2026-08-26"
author: "AI Agent & Pair Programmer"
---
```

### 3. Cross-Pinning & Version Drift Detection
- **Target Spec Pinning**: An implementation plan must explicitly declare the exact specification version it implements via `target_spec_version`.
- **Version Drift Alert**: When a specification's `version` is incremented (e.g., from `1.2.0` to `1.3.0`), the implementation plan is automatically flagged as `[OUTDATED / DRIFTED]` by `verify_spec_plan_sync.py` until the plan is updated and re-pinned to `1.3.0`.

### 4. Revision History / Changelog Table
Every specification and implementation plan must maintain an inline Revision Log at the end of the document:

```markdown
## 📜 Revision History

| Version | Date | Changes Summary | Author / Trigger | Status |
|---|---|---|---|---|
| `v1.0.0` | 2026-08-20 | Initial approved baseline specification | Project Kickoff | Approved |
| `v1.1.0` | 2026-08-22 | Added Agora RTM data sync & AEC requirements | Hackathon Feedback | Approved |
| `v1.2.0` | 2026-08-26 | Clarified turn-taking latency boundaries | Performance Tuning | Active |
```

---

## 📚 Supporting Resources

- [Traceability Matrices & Audit Reference](references/sync-matrices.md): Standard RTM table templates, version metadata schemas, drift classification checklists, and status badges.
- [Verification Helper Script](scripts/verify_spec_plan_sync.py): Python utility for automated spec-plan pairing, version parity checking, and link integrity validation.

---

## 🚀 Best Practices & Guardrails

- **Never Code Without an Aligned Spec & Plan**: If a user request introduces a major feature change, increment the spec version and update the plan first.
- **Strict Version Bumping**: Always increment the document `version` and append a new row to the Revision History table upon modifying specifications or plans.
- **Explicit Rationale on Scope Cuts**: If a requirement is dropped from the implementation plan due to hackathon time constraints, mark it in the spec as `[DEFERRED (vX.X)]` or `[POST-MVP]` rather than deleting it silently.
- **Keep Verification Commands Concrete**: Every task in an implementation plan must reference the exact verification command (e.g. `npm test`, `cargo check`, `pytest`) that confirms the requirement.

