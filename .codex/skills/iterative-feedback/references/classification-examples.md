# Classification Examples

Getting Phase 1's classification right is the whole point of this skill — the wrong bucket means the wrong side of the docs gets edited (or neither does).

## Bug

> "The join button crashes when the channel name has a space in it."

The spec already says (implicitly or explicitly) the app should join the given channel; nothing about "crash on spaces" was ever intended. Nothing to change in `dev/specs/` — file a fix task in `dev/plans/`, implement, verify.

## Scope/requirement change

> "Actually, I don't want the token to expire after 24 hours — make it renewable indefinitely while the session is active."

The current spec says something explicit and different ("token TTL: 24h") — the user is asking for different behavior than what was specified and built correctly. This requires:
- `dev/specs/…`: modify the requirement, bump version, note the change in Revision History.
- `dev/plans/…`: add/modify the task implementing renewal; mark the old fixed-TTL task `[SUPERSEDED]`.

## Clarification

> "When you said 'the agent should summarize the call,' I meant a running summary updated every few turns, not just one at the end."

The spec's original wording was ambiguous and both readings are defensible from the text alone — the user is resolving that ambiguity, not overriding an unambiguous spec. This still needs:
- `dev/specs/…`: tighten the wording so the ambiguity can't recur (even though "the spirit" of the requirement didn't change).
- `dev/plans/…`: only if the existing implementation took the other, now-wrong, reading — otherwise no plan change is needed (the implementation may already happen to satisfy the clarified wording).

## The trap to avoid

Feedback almost always arrives phrased like a bug report ("it doesn't do X") regardless of which bucket it's actually in — the user is describing the symptom, not the cause. Read the *current* spec text before classifying: if the spec already unambiguously demanded what the user is now asking for, it's a bug; if it demanded something else or was silent/ambiguous, it's (2) or (3), and skipping the spec edit is the failure mode this skill exists to catch.
