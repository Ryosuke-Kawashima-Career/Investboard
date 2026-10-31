#!/usr/bin/env python3
"""
revert_checkpoint.py
Safely reverts git-tracked source files to a target commit (default: HEAD,
i.e. discard uncommitted changes) and reports the resulting repository
status. Never touches dev/plans/, dev/specs/, .agents/, .claude/, or
.codex/ -- those paths are gitignored in this repository and have no git
history to revert to; restoring them is a separate, manual step documented
in SKILL.md Phase 3/4.

Without --yes this script only prints what it would do and makes no changes.
"""

import argparse
import subprocess
import sys
from datetime import datetime, timezone


def run(args, check=True):
    result = subprocess.run(
        args, capture_output=True, text=True, encoding="utf-8", errors="replace"
    )
    if check and result.returncode != 0:
        print(f"[ERROR] Command failed: {' '.join(args)}")
        print(result.stderr.strip())
        sys.exit(result.returncode)
    return result.stdout.strip()


def timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def print_header(title: str):
    print("\n" + "=" * 60)
    print(title)
    print("=" * 60)


def show_status():
    print_header("Current Git State")
    print(run(["git", "log", "-3", "--oneline"]))
    print()
    status = run(["git", "status", "--porcelain"], check=False)
    if status:
        print("[DIRTY] Uncommitted changes present:")
        print(status)
    else:
        print("[CLEAN] Working tree matches HEAD.")
    return status


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--target",
        default="HEAD",
        help="Commit-ish to revert to (default: HEAD, i.e. discard uncommitted changes).",
    )
    parser.add_argument(
        "--style",
        choices=["revert", "hard-reset"],
        default="revert",
        help=(
            "How to move to --target when it is not HEAD: 'revert' adds an inverse "
            "commit (safe for shared history, default); 'hard-reset' rewrites history "
            "and must only be used on local, unpushed commits."
        ),
    )
    parser.add_argument(
        "--yes",
        action="store_true",
        help="Actually perform the revert. Without this flag, only a dry-run report is printed.",
    )
    args = parser.parse_args()

    dirty = show_status()

    ts = timestamp()
    plan = []

    if dirty:
        plan.append(("stash", ["git", "stash", "push", "-u", "-m", f"revert-checkpoint-safety-{ts}"]))

    if args.target != "HEAD":
        plan.append(("safety-branch", ["git", "branch", f"pre-revert-checkpoint-{ts}"]))
        if args.style == "revert":
            plan.append(("revert", ["git", "revert", "--no-edit", args.target]))
        else:
            plan.append(("hard-reset", ["git", "reset", "--hard", args.target]))

    print_header("Planned Actions")
    if not plan:
        print("Working tree is already clean and target is HEAD -- nothing to do.")
    for name, cmd in plan:
        print(f"  [{name}] {' '.join(cmd)}")

    if not args.yes:
        print("\nDry run only (no --yes given). Re-run with --yes to execute the above.")
        print("Remember: dev/plans/, dev/specs/, .agents/, .claude/, .codex/ are")
        print("gitignored -- none of these commands touch them. Restore the matching")
        print("implementation plan and spec manually per SKILL.md Phase 3/4.")
        return

    for name, cmd in plan:
        print(f"\n[RUNNING] {' '.join(cmd)}")
        print(run(cmd))

    print_header("Post-Revert Status")
    print(run(["git", "log", "-5", "--oneline"]))
    print()
    print(run(["git", "status"]))
    print()
    stash_list = run(["git", "stash", "list"], check=False)
    print("Stash list:")
    print(stash_list if stash_list else "  (empty)")

    print("\nNext: restore the matching dev/plans/implementation_plan_<task>.md and")
    print("resync dev/specs/spec_<task>.md per SKILL.md Phase 3/4 -- git did not do this.")


if __name__ == "__main__":
    main()
