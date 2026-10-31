# 📖 TDD Workflow Example: Python Agent Orchestrator

This example demonstrates how to apply the Test-Driven Development (TDD) skill to implement an AI Orchestrator module by inspecting test assertions.

---

## 1. Inspecting the Test File (`tests/test_agent.py`)

Suppose `tests/test_agent.py` contains the following test suite:

```python
import pytest
from unittest.mock import AsyncMock, patch
from src.agent.orchestrator import AgentOrchestrator

@pytest.mark.asyncio
async def test_agent_orchestrator_initialization():
    orchestrator = AgentOrchestrator(model="gpt-4o", temperature=0.7)
    assert orchestrator.model == "gpt-4o"
    assert orchestrator.temperature == 0.7
    assert orchestrator.conversation_history == []

@pytest.mark.asyncio
async def test_agent_generate_response():
    orchestrator = AgentOrchestrator(model="gpt-4o")
    with patch.object(orchestrator, "_call_llm", new=AsyncMock(return_value="Hello! How can I help you today?")):
        response = await orchestrator.process_utterance(
            user_id="student_1",
            text="Hello teacher!",
            language="en"
        )
        assert response["text"] == "Hello! How can I help you today?"
        assert response["intervention_needed"] is False
        assert len(orchestrator.conversation_history) == 1
```

### Extracted Contracts & Requirements:
1. **Module Path**: `src/agent/orchestrator.py`
2. **Class**: `AgentOrchestrator`
3. **Constructor**:
   - `__init__(self, model: str = "gpt-4o", temperature: float = 0.7)`
   - Attributes: `self.model`, `self.temperature`, `self.conversation_history` (list)
4. **Methods**:
   - `async def process_utterance(self, user_id: str, text: str, language: str = "en") -> dict`
   - Internal helper: `async def _call_llm(self, prompt: str) -> str`
5. **Output Schema**:
   - Returns a dict with `text` (str) and `intervention_needed` (bool).
   - Appends message to `self.conversation_history`.

---

## 2. Red Phase: Verifying Baseline Failure

Execute the test command before writing the implementation:

```bash
uv run pytest tests/test_agent.py -v
```

**Expected Failure Output:**
```text
ModuleNotFoundError: No module named 'src.agent.orchestrator'
FAILED tests/test_agent.py::test_agent_orchestrator_initialization
```

Status is confirmed as **RED**.

---

## 3. Green Phase: Writing Minimal Implementation

Create `src/agent/orchestrator.py`:

```python
"""
Agent Orchestrator Module
Manages conversational turn-taking, LLM dialogue generation, and student intervention tracking.
"""

from typing import Dict, Any, List

class AgentOrchestrator:
    """Orchestrates real-time conversational agent responses and dialogue history."""

    def __init__(self, model: str = "gpt-4o", temperature: float = 0.7):
        # Step 1: Initialize model configuration and history state
        self.model = model
        self.temperature = temperature
        self.conversation_history: List[Dict[str, Any]] = []

    async def _call_llm(self, prompt: str) -> str:
        """Call external LLM API (mocked during testing)."""
        # Step 2: Placeholder for actual LLM API invocation
        return "Default response"

    async def process_utterance(self, user_id: str, text: str, language: str = "en") -> Dict[str, Any]:
        """Process a spoken utterance from a student and generate co-teacher response."""
        # Step 3: Record incoming utterance into conversation history
        entry = {"user_id": user_id, "text": text, "language": language}
        self.conversation_history.append(entry)

        # Step 4: Call LLM engine
        reply_text = await self._call_llm(prompt=text)

        # Step 5: Return structured response dictionary
        return {
            "text": reply_text,
            "intervention_needed": False,
            "user_id": user_id
        }
```

---

## 4. Verification: Achieving Green State

Run the test suite again:

```bash
uv run pytest tests/test_agent.py -v
```

**Output:**
```text
tests/test_agent.py::test_agent_orchestrator_initialization PASSED      [ 50%]
tests/test_agent.py::test_agent_generate_response PASSED               [100%]

============================== 2 passed in 0.12s ==============================
```

Status is confirmed as **GREEN**.

---

## 5. Refactor & Code Quality Check

1. Add type hints and docstrings.
2. Ensure consistent error handling.
3. Re-run tests to ensure 100% pass rate.
