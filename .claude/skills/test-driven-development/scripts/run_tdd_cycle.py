#!/usr/bin/env python3
"""
TDD Cycle Runner & Diagnostic Tool
Scans test directories, discovers test targets, executes tests, and provides structured feedback.
"""

import sys
import os
import argparse
import subprocess
from pathlib import Path

def discover_test_files(tests_dir: Path) -> list:
    """Discover all test files in the specified directory."""
    if not tests_dir.exists():
        return []
    
    test_patterns = ["test_*.py", "*_test.py", "*.spec.ts", "*.test.ts", "*.spec.js", "*.test.js", "*_test.go"]
    test_files = []
    for pattern in test_patterns:
        test_files.extend(tests_dir.rglob(pattern))
    return sorted(test_files)

def detect_runner(workspace_root: Path) -> list:
    """Detect appropriate test runner command based on repository configuration."""
    if (workspace_root / "pyproject.toml").exists() or (workspace_root / "pytest.ini").exists() or (workspace_root / "tests").exists():
        # Check for uv
        return ["uv", "run", "pytest", "-v"]
    if (workspace_root / "package.json").exists():
        return ["npm", "test"]
    if (workspace_root / "Cargo.toml").exists():
        return ["cargo", "test"]
    if (workspace_root / "go.mod").exists():
        return ["go", "test", "./..."]
    return ["python", "-m", "unittest", "discover", "-s", "tests"]

def run_tests(command: list, target_file: str = None) -> tuple:
    """Execute test command and return exit code, stdout, and stderr."""
    cmd = list(command)
    if target_file:
        cmd.append(target_file)
    
    print(f"[*] Executing: {' '.join(cmd)}")
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=False
        )
        return result.returncode, result.stdout, result.stderr
    except FileNotFoundError:
        # Fallback if uv or specific binary is not in PATH
        if cmd[0] == "uv":
            fallback = ["pytest"] + cmd[3:]
            print(f"[*] 'uv' not found, trying fallback: {' '.join(fallback)}")
            res = subprocess.run(fallback, capture_output=True, text=True, check=False)
            return res.returncode, res.stdout, res.stderr
        raise

def main():
    parser = argparse.ArgumentParser(description="TDD Cycle Runner & Diagnostic Tool")
    parser.add_argument("--dir", default="tests", help="Path to tests directory (default: tests)")
    parser.add_argument("--file", help="Specific test file to run")
    parser.add_argument("--scan", action="store_true", help="Scan and list all discovered test files")
    
    args = parser.parse_args()
    workspace_root = Path.cwd()
    tests_dir = workspace_root / args.dir
    
    if args.scan:
        test_files = discover_test_files(tests_dir)
        print(f"[*] Discovered {len(test_files)} test file(s) in '{args.dir}':")
        for tf in test_files:
            print(f"  - {tf.relative_to(workspace_root)}")
        return 0
    
    runner_cmd = detect_runner(workspace_root)
    target = args.file
    
    exit_code, stdout, stderr = run_tests(runner_cmd, target)
    
    print("\n--- STDOUT ---")
    print(stdout)
    if stderr:
        print("\n--- STDERR ---")
        print(stderr)
        
    if exit_code == 0:
        print("\n[+] STATUS: GREEN (All tests passed)")
    else:
        print(f"\n[-] STATUS: RED (Tests failed with exit code {exit_code})")
        
    return exit_code

if __name__ == "__main__":
    sys.exit(main())
