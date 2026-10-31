#!/usr/bin/env python3
"""
verify_spec_plan_sync.py
Validates parity, version synchronization, and link integrity between
specifications (dev/specs, dev/tasks/task_specs) and implementation plans (dev/plans, dev/tasks/task_plans).
"""

import os
import re
import sys
from pathlib import Path

# Force UTF-8 output on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass


def find_repo_root() -> Path:
    current = Path.cwd()
    for parent in [current] + list(current.parents):
        if (parent / "dev").exists() or (parent / ".agents").exists():
            return parent
    return current


def extract_task_name_from_spec(filename: str) -> str:
    match = re.match(r"^spec_(.+)\.md$", filename, re.IGNORECASE)
    if match:
        return match.group(1)
    return ""


def extract_task_name_from_plan(filename: str) -> str:
    match = re.match(r"^implementation_plan_(.+)\.md$", filename, re.IGNORECASE)
    if match:
        return match.group(1)
    return ""


def extract_frontmatter(file_path: Path) -> dict:
    metadata = {}
    try:
        content = file_path.read_text(encoding="utf-8")
        match = re.match(r"^---\s*\n(.*?)\n---", content, re.DOTALL)
        if match:
            raw_yaml = match.group(1)
            for line in raw_yaml.splitlines():
                if ":" in line and not line.strip().startswith("#"):
                    k, v = line.split(":", 1)
                    metadata[k.strip()] = v.strip().strip('"').strip("'")
    except Exception:
        pass
    return metadata


def check_markdown_links(file_path: Path, root_dir: Path) -> list[str]:
    broken_links = []
    try:
        content = file_path.read_text(encoding="utf-8")
        links = re.findall(r"\[([^\]]+)\]\(([^)]+)\)", content)
        for text, link in links:
            if link.startswith("http://") or link.startswith("https://") or link.startswith("#"):
                continue
            if link.startswith("file:///"):
                clean_path = link.replace("file:///", "").replace("/", os.sep)
                if not Path(clean_path).exists():
                    broken_links.append(f"{link} (target missing)")
            else:
                target = (file_path.parent / link).resolve()
                if not target.exists():
                    broken_links.append(f"{link} (target missing)")
    except Exception as e:
        broken_links.append(f"Error reading file: {e}")
    return broken_links


def audit_spec_plan_parity(root: Path) -> int:
    specs_dir = root / "dev" / "specs"
    plans_dir = root / "dev" / "plans"
    task_specs_dir = root / "dev" / "tasks" / "task_specs"
    task_plans_dir = root / "dev" / "tasks" / "task_plans"

    print("=" * 60)
    print("Spec-Plan Synchronization & Version Audit")
    print(f"Workspace Root: {root}")
    print("=" * 60)

    errors = 0
    warnings = 0

    # 1. Check main spec & plan files
    spec_files = {}
    plan_files = {}

    if specs_dir.exists():
        for f in specs_dir.glob("*.md"):
            task_name = extract_task_name_from_spec(f.name)
            if task_name:
                spec_files[task_name] = f
    else:
        print(f"[WARN] {specs_dir} does not exist.")
        warnings += 1

    if plans_dir.exists():
        for f in plans_dir.glob("*.md"):
            task_name = extract_task_name_from_plan(f.name)
            if task_name:
                plan_files[task_name] = f
    else:
        print(f"[WARN] {plans_dir} does not exist.")
        warnings += 1

    print("\n[1] Main Spec <-> Implementation Plan Pairing & Version Alignment:")
    all_tasks = sorted(list(set(spec_files.keys()) | set(plan_files.keys())))
    if not all_tasks:
        print("  - No task-specific specs or plans found.")
    else:
        for task in all_tasks:
            spec_path = spec_files.get(task)
            plan_path = plan_files.get(task)

            if spec_path and plan_path:
                spec_meta = extract_frontmatter(spec_path)
                plan_meta = extract_frontmatter(plan_path)

                spec_ver = spec_meta.get("version", "N/A")
                plan_ver = plan_meta.get("version", "N/A")
                target_ver = plan_meta.get("target_spec_version", "N/A")

                ver_str = f"(Spec v{spec_ver} <-> Plan v{plan_ver}, targets v{target_ver})"

                if spec_ver != "N/A" and target_ver != "N/A" and spec_ver != target_ver:
                    print(f"  [VERSION DRIFT] Task '{task}': Spec is v{spec_ver} but Plan targets v{target_ver}!")
                    errors += 1
                else:
                    print(f"  [MATCH] Task '{task}': spec_{task}.md <---> implementation_plan_{task}.md {ver_str}")
            elif spec_path and not plan_path:
                print(f"  [ORPHAN SPEC] Task '{task}': has spec_{task}.md but MISSING implementation_plan_{task}.md")
                errors += 1
            elif not spec_path and plan_path:
                print(f"  [ORPHAN PLAN] Task '{task}': has implementation_plan_{task}.md but MISSING spec_{task}.md")
                errors += 1

    # 2. Check sub-tasks (dev/tasks)
    sub_spec_tasks = set()
    sub_plan_tasks = set()

    if task_specs_dir.exists():
        for f in task_specs_dir.glob("*.md"):
            t = extract_task_name_from_spec(f.name) or f.stem
            sub_spec_tasks.add(t)

    if task_plans_dir.exists():
        for f in task_plans_dir.glob("*.md"):
            t = extract_task_name_from_plan(f.name) or f.stem
            sub_plan_tasks.add(t)

    print("\n[2] Sub-Task Pairing (dev/tasks/):")
    all_subtasks = sorted(list(sub_spec_tasks | sub_plan_tasks))
    if not all_subtasks:
        print("  - No sub-tasks found in dev/tasks/ (Optional).")
    else:
        for sub in all_subtasks:
            has_s = sub in sub_spec_tasks
            has_p = sub in sub_plan_tasks
            if has_s and has_p:
                print(f"  [MATCH] Sub-task '{sub}'")
            elif has_s and not has_p:
                print(f"  [ORPHAN SUB-SPEC] Sub-task '{sub}' missing plan")
                errors += 1
            else:
                print(f"  [ORPHAN SUB-PLAN] Sub-task '{sub}' missing spec")
                errors += 1

    # 3. Check markdown links
    print("\n[3] Markdown Link Integrity Audit:")
    checked_files = 0
    broken_total = 0
    all_md_files = list(root.glob("dev/**/*.md")) + list(root.glob(".agents/**/*.md"))

    for md_file in all_md_files:
        checked_files += 1
        broken = check_markdown_links(md_file, root)
        if broken:
            print(f"  [BROKEN LINK] {md_file.relative_to(root)}:")
            for b in broken:
                print(f"     - {b}")
                broken_total += 1

    if broken_total == 0:
        print(f"  [OK] All relative links valid across {checked_files} markdown files.")
    else:
        errors += broken_total

    print("\n" + "=" * 60)
    print(f"Audit Summary: {errors} Error(s), {warnings} Warning(s)")
    print("=" * 60)

    return 0 if errors == 0 else 1


if __name__ == "__main__":
    repo_root = find_repo_root()
    sys.exit(audit_spec_plan_parity(repo_root))
