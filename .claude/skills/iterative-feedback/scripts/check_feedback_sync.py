#!/usr/bin/env python3
"""Checks dev/feedback/ entries for two failure modes this skill exists to
prevent: an "applied" entry that only updated one of spec/plan when its
classification required both, and a dangling affected_reqs/affected_tasks
reference that doesn't resolve to a real REQ-/TASK- id anywhere in the docs.

Usage:
    python check_feedback_sync.py [dev/feedback]

Exit code 1 if any issue is found, 0 otherwise.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

FRONTMATTER_RE = re.compile(r"^---\r?\n(.*?)\r?\n---", re.DOTALL)
SCALAR_RE = re.compile(r'^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$')
BLOCK_LIST_ITEM_RE = re.compile(r'^\s*-\s*(.+?)\s*$')
ID_RE = re.compile(r'\b(?:REQ|TASK|DES|US)-[A-Za-z0-9]+\b')

DUAL_UPDATE_CLASSIFICATIONS = {"scope-change", "clarification"}


def strip_quotes(value: str) -> str:
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
        return value[1:-1]
    return value


def parse_inline_list(value: str) -> list[str]:
    inner = value.strip()[1:-1]
    if not inner.strip():
        return []
    return [strip_quotes(item) for item in inner.split(",") if item.strip()]


def parse_frontmatter(text: str) -> dict:
    match = FRONTMATTER_RE.match(text)
    if not match:
        return {}
    fm: dict = {}
    lines = match.group(1).splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        scalar = SCALAR_RE.match(line)
        if not scalar:
            i += 1
            continue
        key, rest = scalar.group(1), scalar.group(2).strip()
        if rest.startswith("[") and rest.endswith("]"):
            fm[key] = parse_inline_list(rest)
            i += 1
            continue
        if rest == "":
            items = []
            j = i + 1
            while j < len(lines):
                item_match = BLOCK_LIST_ITEM_RE.match(lines[j])
                if not item_match or not lines[j].startswith((" ", "\t", "-")):
                    break
                items.append(strip_quotes(item_match.group(1)))
                j += 1
            if items:
                fm[key] = items
                i = j
                continue
            fm[key] = ""
            i += 1
            continue
        fm[key] = strip_quotes(rest)
        i += 1
    return fm


def collect_known_ids(roots: list[Path]) -> set[str]:
    ids: set[str] = set()
    for root in roots:
        if not root.exists():
            continue
        for path in root.rglob("*.md"):
            text = path.read_text(encoding="utf-8", errors="replace")
            ids.update(ID_RE.findall(text))
    return ids


def main() -> int:
    args = sys.argv[1:]
    feedback_root = Path(args[0]) if args else Path("dev/feedback")
    doc_roots = [Path("dev/specs"), Path("dev/plans")]

    if not feedback_root.exists():
        print(f"No feedback directory at {feedback_root} — nothing to check.")
        return 0

    entries = sorted(feedback_root.rglob("*.md"))
    if not entries:
        print(f"No feedback entries found under {feedback_root}.")
        return 0

    known_ids = collect_known_ids(doc_roots)
    had_issue = False

    for path in entries:
        fm = parse_frontmatter(path.read_text(encoding="utf-8", errors="replace"))
        status = fm.get("status", "")
        classification = fm.get("classification", "")
        print(f"\n{path}  [{classification or 'unclassified'} / {status or 'no status'}]")
        entry_had_issue = False

        if status == "applied":
            spec_before = fm.get("spec_version_before", "")
            spec_after = fm.get("spec_version_after", "")
            plan_before = fm.get("plan_version_before", "")
            plan_after = fm.get("plan_version_after", "")

            spec_changed = bool(spec_after) and spec_after != spec_before
            plan_changed = bool(plan_after) and plan_after != plan_before

            if classification in DUAL_UPDATE_CLASSIFICATIONS:
                if not spec_changed:
                    entry_had_issue = True
                    print("  [issue] classification requires a spec update, but spec_version_after is empty or unchanged")
                if not plan_changed:
                    entry_had_issue = True
                    print("  [issue] classification requires a plan update, but plan_version_after is empty or unchanged")
            elif classification == "bug":
                if spec_changed:
                    entry_had_issue = True
                    print("  [issue] classified as 'bug' but the spec version changed — reclassify as scope-change/clarification or revert the spec edit")
                if not plan_changed:
                    entry_had_issue = True
                    print("  [issue] classified as 'bug' but plan_version_after is empty or unchanged — the fix task must be logged")
            else:
                print(f"  [info] unrecognized classification '{classification}' — expected bug | scope-change | clarification")

        for field in ("affected_reqs", "affected_tasks"):
            for ref_id in fm.get(field, []) or []:
                if ref_id and ref_id not in known_ids:
                    entry_had_issue = True
                    print(f"  [issue] {field} references '{ref_id}', which doesn't resolve to any REQ-/TASK-/DES-/US- id under dev/specs/ or dev/plans/")

        if entry_had_issue:
            had_issue = True
        else:
            print("  OK")

    return 1 if had_issue else 0


if __name__ == "__main__":
    sys.exit(main())
