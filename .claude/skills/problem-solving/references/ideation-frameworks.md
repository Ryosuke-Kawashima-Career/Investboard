# 📐 Hackathon Ideation Frameworks & Templates

This reference guide provides ready-to-use frameworks and templates for diagnosing hackathon problem statements, scoring candidate solutions, and drafting winning judge presentations.

---

## 1. The 5-Whys Problem Decomposition Sheet

Use this template during **Phase 1** to drill down into the root issue:

```markdown
### 1. Problem Statement
- **Surface Symptom**: [What is visibly failing or inefficient?]
- **Target User**: [Who experiences this friction?]

### 2. The 5-Whys Analysis
1. *Why is this a problem?* -> [Immediate reason]
2. *Why does that happen?* -> [Technical or operational bottleneck]
3. *Why haven't existing tools fixed it?* -> [Limitations of current solutions / chatbots / portals]
4. *Why is solving it high-value?* -> [Economic, time, or accuracy impact]
5. *Why now?* -> [What breakthrough technology (e.g. Agora RTC, Real-Time LLM) makes this solvable today?]
```

---

## 2. Solution Scoring & Adoption Matrix Template

Use this rubric during **Phase 3** to quantitatively score and rank candidate ideas (1 to 5 scale):

```markdown
| Criteria | Weight | Option 1: [Name] | Option 2: [Name] | Option 3: [Name] |
|---|:---:|:---:|:---:|:---:|
| **Sponsor Tech Synergy** (Depth of API/SDK utilization) | 25% | [Score] | [Score] | [Score] |
| **Demo WOW-Factor** (Real-time, visual, audible impact) | 25% | [Score] | [Score] | [Score] |
| **Hackathon Feasibility** (MVP buildable in 24-48 hours) | 25% | [Score] | [Score] | [Score] |
| **Differentiation** (Avoids standard chatbot wrapper) | 15% | [Score] | [Score] | [Score] |
| **Market / Practical Impact** | 10% | [Score] | [Score] | [Score] |
| **Weighted Total Score** | 100% | **[Total]** | **[Total]** | **[Total]** |

### Adoption Justification:
- **Adopted Concept**: Option [X]
- **Why We Selected Option [X] Over [Y] and [Z]**:
  1. *Versus Option [Y]*: [Explain why Option X has higher demo impact or lower failure risk]
  2. *Versus Option [Z]*: [Explain why Option X better showcases core hackathon tech]
```

---

## 3. The 3-Minute Winning Demo Script Outline

Use this template during **Phase 4** to ensure the live demonstration tells a compelling narrative:

```markdown
### ⏱️ 3-Minute Live Judge Pitch Flow

- **[0:00 - 0:45] The Problem Hook & Baseline**:
  - State the painful reality in 1 sentence.
  - Start the live application and trigger the first normal user interaction.

- **[0:45 - 1:45] The Unfair Advantage (The "WOW" Moment)**:
  - Demonstrate the core breakthrough feature that competitors cannot do.
  - *Examples*: Live barge-in interruption, real-time visual canvas sync, dynamic tool execution, instant voice translation.

- **[1:45 - 2:30] Stress-Test & Real-World Resilience**:
  - Show how the application handles an unexpected objection, edge case, or messy input gracefully.
  - Showcase human handoff or fallback mechanisms if relevant.

- **[2:30 - 3:00] Architecture, Tech Stack & Impact Summary**:
  - Display the high-level architecture diagram.
  - Reiterate the business metric (e.g. 5x faster qualification, 80% cost reduction).
```
