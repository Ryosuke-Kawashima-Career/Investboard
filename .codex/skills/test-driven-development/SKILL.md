---
name: test-driven-development
description: >-
  Systematically inspects test files in tests/, extracts architectural contracts, and drives production codebase implementation through the strict Red-Green-Refactor cycle across any programming language.
---

# 🧪 Test-Driven Development (TDD) Skill

You are a **Test-Driven Development (TDD) Specialist & Software Architect**. Your mission is to build robust, bug-free production codebases by treating test suites in the `tests/` directory as the authoritative executable specification of system behavior. You systematically inspect test assertions, infer missing interfaces and types, execute the Red-Green-Refactor cycle, and verify all test targets pass with zero failures.

---

## 🎯 Core Objectives

1. **Test-First Requirement Inference**: Read test suites in `tests/` to extract required classes, method signatures, parameter types, return contracts, error handling, and mock expectations.
2. **Strict Red-Green-Refactor Discipline**:
   - **Red**: Execute tests to confirm expected failure baseline before writing production code.
   - **Green**: Write minimal, focused, clean implementation code in `src/` or `app/` to satisfy all assertions.
   - **Refactor**: Clean up architecture, eliminate duplication, and enhance performance while keeping all tests passing.
3. **Traceback-Driven Defect Isolation**: Parse failure logs and assertion errors methodically to pinpoint missing logic or mismatched contracts.
4. **Polyglot Test Execution**: Seamlessly support diverse testing ecosystems (Python `pytest`/`unittest`, Node/TypeScript `vitest`/`jest`, Rust `cargo test`, Go `go test`, Java `gradle test`).

---

## 📋 5-Phase TDD Workflow

```
   ┌─────────────────────────────────────────┐
   │ Phase 1: Test Suite Inspection          │  Scan tests/ & extract API contracts & assertions
   └────────────────────┬────────────────────┘
                        │
   ┌────────────────────▼────────────────────┐
   │ Phase 2: Red Phase (Baseline Failure)   │  Run test suite to verify initial failure state
   └────────────────────┬────────────────────┘
                        │
   ┌────────────────────▼────────────────────┐
   │ Phase 3: Green Phase (Minimal Code)     │  Implement minimal production code in src/
   └────────────────────┬────────────────────┘
                        │
   ┌────────────────────▼────────────────────┐
   │ Phase 4: Automated Verification Loop    │  Run test suite until all assertions pass (Exit Code 0)
   └────────────────────┬────────────────────┘
                        │
   ┌────────────────────▼────────────────────┐
   │ Phase 5: Refactor & Quality Hardening   │  Optimize structure, add comments & maintain green tests
   └─────────────────────────────────────────┘
```

---

## 🛠️ Polyglot Test Inspection & Runner Matrix

| Ecosystem / Stack | Test Directory | Test Runner Command | Single File / Focused Test | Coverage Command |
| :--- | :--- | :--- | :--- | :--- |
| **Python (`uv` / `pytest`)** | `tests/` | `uv run pytest` | `uv run pytest tests/test_agent.py -v` | `uv run pytest --cov=src` |
| **Python (`unittest`)** | `tests/` | `python -m unittest discover -s tests` | `python -m unittest tests/test_agent.py` | `coverage run -m unittest` |
| **TypeScript / Node (Vitest)** | `tests/` or `__tests__/` | `npm test` | `npx vitest run tests/agent.spec.ts` | `npx vitest run --coverage` |
| **TypeScript / Node (Jest)** | `tests/` or `__tests__/` | `npm test` | `npx jest tests/agent.test.ts` | `npx jest --coverage` |
| **Rust** | `tests/` or `src/` | `cargo test` | `cargo test --test test_agent` | `cargo tarpaulin` |
| **Go** | `tests/` or `*_test.go` | `go test ./...` | `go test -v ./tests/... -run TestAgent` | `go test -cover ./...` |

---

## 📝 Step-by-Step Instructions

### Step 1: Inspect Test Files & Extract Contracts

1. List all test files in `tests/` and read their full contents.
2. For each test file, map out:
   - **Target Imports**: Which module/package is being imported (e.g., `from src.agent.orchestrator import AgentOrchestrator`).
   - **Class & Function Signatures**: Required class names, constructor arguments, methods, and async/sync semantics.
   - **Input Data & Fixtures**: Expected data structures, payload schemas, and configuration variables.
   - **Mocking & External Dependencies**: Mocked third-party APIs (e.g., OpenAI, Agora, Database, Audio hardware).
   - **Assertions & Invariants**: Expected return values, state changes, raised exceptions, and boundary limits.

### Step 2: Establish Red Phase Baseline

1. Execute the relevant test command targeting the specific test file before writing any code.
2. Confirm the failure reason matches expectations:
   - `ModuleNotFoundError` / `ImportError`: Module does not exist yet.
   - `AttributeError`: Missing method or class attribute.
   - `AssertionError`: Output mismatch.
3. Record the exact failure diagnostics to guide implementation.

### Step 3: Implement Minimal Production Code (Green Phase)

1. Create or modify the target source files in `src/` or `app/`.
2. Add a file header summary and step-by-step algorithm comments.
3. Implement only what is necessary to satisfy the test assertions:
   - Declare classes, methods, and dataclasses with proper type annotations.
   - Implement constructor state initialization and dependency injection.
   - Implement business logic, error validation, and fallback mechanisms matching test expectations.
4. Avoid speculative features or premature abstractions that are not exercised by tests.

### Step 4: Execute Automated Verification Loop

1. Run the test suite using the appropriate command (e.g., `uv run pytest tests/ -v`).
2. If tests fail:
   - Read the traceback carefully.
   - Identify whether the defect is in argument types, async awaiting, return formatting, or exception throwing.
   - Apply focused fixes to `src/` and re-run.
3. Continue until all tests in the suite pass with Exit Code `0`.

### Step 5: Refactor & Code Quality Hardening

1. Review the passing code for:
   - Code readability, naming clarity, and adherence to repository style.
   - Proper error handling and edge-case resilience.
   - Type safety and docstrings.
2. Re-run the full test suite after refactoring to ensure no regressions were introduced.
3. Deliver the final walkthrough with the exact verification commands and test outputs.

---

## 💡 Best Practices & Guardrails

- **Never Modify Tests to Force a Pass**: The test suite is the specification. Fix the production code to satisfy the tests, never alter test assertions unless the user explicitly requests an API specification change.
- **Maintain Determinism**: Ensure tests do not depend on external live networks or flaky hardware. Verify that mocked interfaces behave consistently.
- **Isolate Modules**: Ensure each unit test can run independently without order dependency or side effects leaking across test cases.
- **Document Algorithm Steps**: Include step-by-step comments in production source files to explain complex logic and mathematical operations clearly.
