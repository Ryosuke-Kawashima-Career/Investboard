# Dual Update — worked example

Feedback: *"The token shouldn't expire after 24 hours — keep renewing it while the session is active."* Classified as **scope-change** (see `classification-examples.md`).

## 1. Feedback entry — `dev/feedback/2026-09-12-token-renewal.md`

```yaml
---
document_type: "feedback"
date: "2026-09-12"
classification: "scope-change"
status: "open"
affected_reqs: ["REQ-08"]
affected_tasks: ["TASK-14"]
spec_version_before: "1.4.0"
spec_version_after: ""
plan_version_before: "1.4.0"
plan_version_after: ""
---

## Feedback

"The token shouldn't expire after 24 hours — keep renewing it while the session is active."

## Resolution

Pending.
```

## 2. Spec update — `dev/specs/spec_auth.md`

```diff
- **REQ-08**: Server issues an access token with a fixed 24-hour TTL; the client re-authenticates from scratch on expiry.
+ **REQ-08**: Server issues an access token that auto-renews on a rolling basis while the session remains active; the client never has to re-authenticate from scratch mid-session.
```

```yaml
version: "1.5.0"   # was 1.4.0 — MINOR bump: additive behavior change, no breaking interface change
last_updated: "2026-09-12"
```

Revision History row appended:

```markdown
| `v1.5.0` | 2026-09-12 | REQ-08: token now auto-renews instead of fixed 24h TTL | dev/feedback/2026-09-12-token-renewal.md | Approved |
```

## 3. Plan update — `dev/plans/implementation_plan_auth.md`

```diff
- **TASK-14** `[DONE]`: Issue access token with 24h TTL; client re-auths on 401.
+ **TASK-14** `[SUPERSEDED by TASK-19]`: Issue access token with 24h TTL; client re-auths on 401.
+ **TASK-19**: Add background renewal — refresh the token at ~80% of its lifetime while the session is active; drop the client re-auth-on-401 path for the normal case.
```

Requirement Traceability Matrix row updated: `REQ-08 -> TASK-19` (was `TASK-14`).

```yaml
version: "1.5.0"
target_spec_version: "1.5.0"
last_updated: "2026-09-12"
```

## 4. Feedback entry closed out

```yaml
status: "applied"
spec_version_after: "1.5.0"
plan_version_after: "1.5.0"
```

At this point `check_feedback_sync.py` sees a `scope-change` entry where both `spec_version_after` and `plan_version_after` changed from their `_before` values, and both `REQ-08`/`TASK-19`-style ids resolve — no issues reported. Only then does the re-implementation pass (TASK-19, scoped narrowly) get handed to the build skill.
