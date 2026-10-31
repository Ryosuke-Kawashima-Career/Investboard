# 📊 Traceability Matrices & Drift Audit Reference

This document provides standardized templates and auditing checklists for keeping specifications (`dev/specs/`) and implementation plans (`dev/plans/`) synchronized.

---

## 1. Requirement Traceability Matrix (RTM) Template

Include this table in `dev/plans/implementation_plan_<task>.md` or `dev/plans/task_list.md`:

```markdown
## 📋 Requirement Traceability Matrix (RTM)

| Requirement ID | Requirement Description | Spec Source File | Implementation Task | Verification Strategy / Command | Status |
|---|---|---|---|---|:---:|
| **REQ-01** | Sub-300ms Conversational Voice Turnaround | `dev/specs/spec_voice_agent.md` | Task 1.2: Integrate Agora SDRTN client | `npm test -- test/latency.test.ts` | 🟢 Verified |
| **REQ-02** | Real-time Speech Interruption (Barge-In) | `dev/specs/spec_voice_agent.md` | Task 2.1: Enable AEC & mute-on-speak | `npm test -- test/barge_in.test.ts` | 🟡 In Progress |
| **REQ-03** | RTM Dynamic UI Card Synchronization | `dev/specs/spec_voice_agent.md` | Task 3.1: Bind RTM state to React canvas | `npm run build` & browser check | ⚪ Pending |
```

### Status Badges Legend
- 🟢 **Verified**: Implementation complete and verified via automated test (Exit Code 0).
- 🟡 **In Progress**: Active development; partial test coverage.
- ⚪ **Pending**: Planned work, not yet started.
- 🔴 **Blocked**: Dependency or architectural blocker preventing progress.
- ⏸️ **Deferred / Post-MVP**: Explicitly postponed from the current milestone.

---

## 2. Specification-to-Plan Drift Audit Checklist

Perform this audit when reviewing PRs or before initiating execution:

```markdown
### 🔍 Drift Detection Audit Checklist

- [ ] **1. Spec Coverage**: Does every requirement in `dev/specs/` map to at least one task in `dev/plans/`?
- [ ] **2. Justified Scope**: Is every task in `dev/plans/` traced back to a defined requirement or design rationale?
- [ ] **3. Architectural Parity**: Do data structures, class names, and API contracts in `dev/plans/` match `dev/specs/design.md`?
- [ ] **4. Concrete Verification**: Does every plan milestone specify an automated verification command (e.g. `pytest`, `npm test`)?
- [ ] **5. File Link Integrity**: Do all markdown links between `dev/specs/`, `dev/plans/`, and `dev/context/` resolve to existing files?
```

---

## 3. Sub-Task Pairing Pattern (`dev/tasks/`)

When decomposing complex parent tasks into sub-tasks, maintain strict 1:1 pairing:

```
dev/tasks/
├── task_specs/
│   ├── spec_subtask_auth.md       <───┐ (1:1 Paired)
│   └── spec_subtask_payment.md    <─┐ │
└── task_plans/                      │ │
    ├── implementation_plan_auth.md ─┴─┘
    └── implementation_plan_payment.md
```

---

## 4. Versioning & Metadata Schema

Every document in `dev/specs/` and `dev/plans/` must include frontmatter version metadata:

```markdown
<!-- Specification Frontmatter Example -->
---
document_type: "specification"
version: "1.2.0"
status: "Approved"
last_updated: "2026-08-26"
author: "AI Agent & User"
---

<!-- Implementation Plan Frontmatter Example -->
---
document_type: "implementation_plan"
version: "1.2.0"
target_spec_version: "1.2.0"
status: "In Progress"
last_updated: "2026-08-26"
author: "AI Agent & User"
---
```

### Version Drift Resolution Rule
If `implementation_plan.target_spec_version` != `spec.version`:
1. Audit the specification's **Revision History** to identify what changed in the new spec version.
2. Update the implementation plan tasks, milestones, or test commands to satisfy the updated requirements.
3. Bump the plan's `version` and update `target_spec_version` to match the spec.

