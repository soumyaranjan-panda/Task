# GitHub Spec Kit — Spec-Driven Development (SDD) Complete Notes

> **How to use these notes:**
> - 🔴 **MUST REMEMBER** = Core concepts, actively memorize (frequently used in interviews/real work)
> - 🟡 **UNDERSTAND** = Know the concept, don't memorize definitions
> - ⚪ **DON'T MEMORIZE** = Background knowledge, low practical value
> - ⚡ **Practical Rule** = Quick rule you can apply immediately
> - 🧠 **What to Remember** = 2-5 key takeaways per topic
> - 🚫 **Don't Memorize** = Explicitly marked low-value info
> - 💡 **Pro Tip** = Battle-tested tricks from real projects
> - ⚠️ **Gotcha** = Common pitfalls that waste hours

---

## Table of Contents

1. [What is GitHub Spec Kit?](#1-what-is-github-spec-kit)
2. [Core Philosophy & Principles](#2-core-philosophy--principles)
3. [Installation & Setup](#3-installation--setup)
4. [The Two Workflow Paths](#4-the-two-workflow-paths)
5. [Detailed Step-by-Step Commands](#5-detailed-step-by-step-commands)
6. [Constitution-Driven Development](#6-constitution-driven-development)
7. [Feature Directory & State Management](#7-feature-directory--state-management)
8. [Quality Gates & Checklists](#8-quality-gates--checklists)
9. [Implementation & Convergence](#9-implementation--convergence)
10. [Extensions & Customization](#10-extensions--customization)
11. [Tricks & Tips](#11-tricks--tips)
12. [Common Gotchas](#12-common-gotchas)
13. [Interview Quick Reference](#13-interview-quick-reference)
14. [Practice Exercises](#14-practice-exercises)

---

## 1. What is GitHub Spec Kit?

### Definition
**Spec Kit** is GitHub's open-source toolkit for **Spec-Driven Development (SDD)**. It provides a structured, AI-assisted workflow where you describe **what** to build in natural language, and the toolkit guides you through specification → planning → task breakdown → implementation → verification using GitHub Copilot skills.

### 🔴 MUST REMEMBER — Key Differentiators

| Aspect | Traditional SDD | **GitHub Spec Kit** |
|--------|-----------------|---------------------|
| **Interface** | CLI commands | **Copilot Skills** (`/speckit-*`) |
| **Spec Format** | OpenAPI/AsyncAPI | **Markdown** (`spec.md`, `plan.md`, `tasks.md`) |
| **Automation** | Code generation | **Agentic implementation** (Copilot writes code) |
| **Verification** | Contract testing | **Convergence checking** (code vs spec) |
| **Governance** | Versioned contracts | **Constitution** (project principles) |

### 🟡 UNDERSTAND — The Artifacts Produced

```
.specify/
├── constitution.md          # Project principles (once per project)
├── feature.json             # Active feature pointer
├── features/
│   └── 001-feature-name/    # Feature branch directory
│       ├── spec.md          # WHAT & WHY (natural language → structured)
│       ├── plan.md          # HOW (tech stack, architecture, APIs)
│       ├── tasks.md         # ACTIONABLE steps (dependency-ordered)
│       └── checklists/      # Quality gates
│           └── requirements.md
```

---

## 2. Core Philosophy & Principles

### 🔴 MUST REMEMBER — Spec Kit Manifesto

> **"Specify what, not how. Plan how, not what. Implement exactly what was planned."**

### Three Phases (Strict Separation)

| Phase | Focus | Artifact | Who Decides |
|-------|-------|----------|-------------|
| **Specify** | **What & Why** | `spec.md` | **Human** (product/engineering) |
| **Plan** | **How** | `plan.md` | **Human + Agent** (tech stack, architecture) |
| **Implement** | **Execute** | Code + `tasks.md` | **Agent** (Copilot writes code) |

### 💡 Pro Tip — Why This Separation Matters

```
❌ Bad:  "Build a REST API with PostgreSQL and Redis caching"
✅ Good: "Users need to create projects, assign tasks, and track progress"
```

**Spec phase = problem space. Plan phase = solution space. Never mix them.**

---

## 3. Installation & Setup

### 🔴 MUST REMEMBER — Install Commands

```bash
# Prerequisites: uv (fast Python package manager)
# Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh

# Install Spec Kit CLI
uv tool install specify-cli

# Initialize project (interactive - picks Copilot, script type, etc.)
specify init my-project --integration copilot

# Non-interactive (CI/automation)
specify init my-project --integration copilot --non-interactive --script sh

# Enter project and open in Copilot-enabled editor
cd my-project
code .  # or cursor ., etc.
```

### 🟡 UNDERSTAND — Script Variants

| Variant | Use Case |
|---------|----------|
| **Bash (`.sh`)** | Linux/macOS, Git Bash on Windows |
| **PowerShell (`.ps1`)** | Windows native |
| **Python (`.py`)** | Cross-platform, no shell dependency |

**Default:** Auto-detected from OS. Override with `--script sh|ps|py`.

### ⚠️ Gotcha — Existing Projects

```bash
# If adding to existing repo, follow the adoption guide first
# See: guides/existing-projects.html
# Key: Don't run `specify init` in a repo with existing code without reading the guide
```

---

## 4. The Two Workflow Paths

### 🔴 MUST REMEMBER — Choose Your Path

#### **Shorter Path** (Small features, prototypes, spikes)
```
/speckit-constitution  (once per project)
/speckit-specify
/speckit-plan
/speckit-tasks
/speckit-implement
/speckit-converge
```

#### **Full Path** (Production features, quality-critical)
```
/speckit-constitution  (once per project)
/speckit-specify
/speckit-clarify       # Resolve ambiguities
/speckit-plan
/speckit-checklist     # Quality gate
/speckit-tasks
/speckit-analyze       # Consistency check
/speckit-implement
/speckit-converge
```

### 💡 Pro Tip — When to Use Which

| Scenario | Path |
|----------|------|
| Internal tool, spike, PoC | Shorter |
| Customer-facing feature | Full |
| Bug fix | Bug-fix quickstart (separate) |
| Idea validation | Assessment quickstart (separate) |
| Refactoring | Shorter (specify = "refactor X to Y") |

---

## 5. Detailed Step-by-Step Commands

### Step 0: `/speckit-constitution` — Project Ground Rules

**Run once per project.** Establishes principles that ALL later steps evaluate against.

```
/speckit-constitution Taskify is a "Security-First" application. All user inputs must be validated and sanitized. We use a microservices architecture with async communication. Code must be fully documented with XML comments. No direct database access from controllers — use repository pattern.
```

**Output:** `.specify/constitution.md`

```markdown
# Project Constitution

## Principles
1. **Security-First**: All user inputs must be validated and sanitized
2. **Microservices Architecture**: Async communication between services
3. **Documentation**: Full XML comments on all public APIs
4. **Layer Separation**: No direct DB access from controllers (repository pattern)
```

### Step 1: `/speckit-specify` — What & Why

**Creates `spec.md` from natural language.** Focus on **problem space only**.

```
/speckit-specify Develop Taskify, a team productivity platform where predefined users create projects, assign tasks, comment, and move tasks across Kanban columns (To Do, In Progress, In Review, Done). Five users (one product manager, four engineers), three sample projects, no login for this first phase.
```

**Output:** `.specify/features/001-taskify/spec.md`

```markdown
# Feature Specification: Taskify

## Overview
Team productivity platform with Kanban boards...

## User Stories
- As a Product Manager, I want to create projects so that...
- As an Engineer, I want to assign tasks to myself so that...

## Acceptance Criteria
- [ ] Users can create projects
- [ ] Tasks can move across 4 columns
- [ ] Comments on tasks
- [ ] 5 predefined users, 3 sample projects
- [ ] No authentication in v1

## Out of Scope
- Authentication/authorization
- Real-time notifications
- File attachments
```

### Step 2: `/speckit-clarify` — Resolve Ambiguities (Full Path)

**Asks targeted questions, folds answers back into spec.**

```
/speckit-clarify Focus on task card behavior — status changes, comment permissions, and user assignment.
```

**Example Interaction:**
```
🤖 Clarifying questions:

1. When a task moves to "Done", can it be moved back?
   → Yes, any column transition allowed

2. Can engineers comment on tasks they're not assigned to?
   → Yes, all 5 users can comment on any task

3. Who can assign tasks?
   → Product Manager assigns; engineers can self-assign

4. Are there required fields on task creation?
   → Title required, description optional
```

**Output:** Updated `spec.md` with clarified details.

### Step 3: `/speckit-plan` — How (Tech Stack & Architecture)

**Generates `plan.md` from spec + your tech choices.**

```
/speckit-plan Use .NET Aspire with PostgreSQL. The frontend is Blazor Server with drag-and-drop boards and real-time updates via SignalR. Expose REST APIs for projects, tasks, and notifications. Use MediatR for CQRS. Entity Framework Core for ORM.
```

**Output:** `.specify/features/001-taskify/plan.md`

```markdown
# Implementation Plan: Taskify

## Tech Stack
- **Runtime**: .NET 8 / Aspire
- **Database**: PostgreSQL (EF Core)
- **Frontend**: Blazor Server + SignalR
- **Architecture**: Modular monolith (CQRS with MediatR)
- **API**: REST (ASP.NET Core Minimal APIs)

## Project Structure
src/
├── Taskify.Api/           # REST endpoints
├── Taskify.Core/          # Domain, CQRS handlers
├── Taskify.Infrastructure/# EF Core, repositories
└── Taskify.Web/           # Blazor Server UI

## Data Model
- Project (Id, Name, Description, CreatedAt)
- Task (Id, ProjectId, Title, Description, Status, AssigneeId, ColumnOrder)
- Comment (Id, TaskId, AuthorId, Content, CreatedAt)
- User (Id, Name, Role, AvatarUrl)

## API Endpoints
GET    /api/projects
POST   /api/projects
GET    /api/projects/{id}
GET    /api/projects/{id}/tasks
POST   /api/projects/{id}/tasks
PATCH  /api/tasks/{id}          # Status, assignee, order
POST   /api/tasks/{id}/comments
```

### Step 4: `/speckit-checklist` — Quality Gate (Full Path)

**Generates reviewer-owned checklist from spec.**

```
/speckit-checklist
```

**Output:** `.specify/features/001-taskify/checklists/requirements.md`

```markdown
# Requirements Quality Checklist

## Completeness
- [ ] All user stories have acceptance criteria
- [ ] All acceptance criteria are testable
- [ ] Out of scope clearly defined

## Clarity
- [ ] No ambiguous terms ("fast", "user-friendly")
- [ ] Status transitions explicitly defined
- [ ] Permission model clear for all actions

## Consistency
- [ ] No conflicting requirements
- [ ] Data model supports all user stories
- [ ] API covers all required operations

## Feasibility
- [ ] Tech stack supports all requirements
- [ ] No hidden complexity in "simple" features
```

**Reviewer marks `[x]` when satisfied. Agent checks this before implementing.**

### Step 5: `/speckit-tasks` — Break Down Work

**Generates dependency-ordered `tasks.md` from plan.**

```
/speckit-tasks
```

**Output:** `.specify/features/001-taskify/tasks.md`

```markdown
# Implementation Tasks: Taskify

## Phase 1: Foundation
- [ ] T001: Create .NET Aspire solution with 4 projects
- [ ] T002: Configure PostgreSQL + EF Core in Infrastructure
- [ ] T003: Define domain entities (Project, Task, Comment, User)
- [ ] T004: Create database migrations
- [ ] T005: Seed 5 users + 3 sample projects

## Phase 2: Core API (depends on Phase 1)
- [ ] T010: Implement Project CRUD endpoints
- [ ] T011: Implement Task CRUD + status transitions
- [ ] T012: Implement Comment endpoints
- [ ] T013: Add MediatR handlers for all commands/queries

## Phase 3: Frontend (depends on Phase 2)
- [ ] T020: Blazor Server layout + navigation
- [ ] T021: Project list + create modal
- [ ] T022: Kanban board with drag-drop (SortableJS)
- [ ] T023: Task detail modal (comments, assignment)
- [ ] T024: SignalR real-time updates

## Phase 4: Polish (depends on Phase 3)
- [ ] T030: Input validation + error handling
- [ ] T031: XML documentation on all public APIs
- [ ] T032: Integration tests for API
- [ ] T033: Manual QA checklist
```

### Step 6: `/speckit-analyze` — Consistency Check (Full Path)

**Read-only check across spec, plan, tasks.**

```
/speckit-analyze
```

**Example Output:**
```
✅ Spec → Plan: All user stories covered in API design
✅ Plan → Tasks: All API endpoints have implementation tasks
⚠️  Spec → Tasks: "Real-time updates" mentioned in spec but no SignalR task
❌  Plan → Constitution: Direct EF Core usage in controllers violates repository pattern

Recommendations:
1. Add T024 for SignalR integration
2. Move EF Core to Repository classes in Infrastructure
```

### Step 7: `/speckit-implement` — Build It

**Executes tasks in dependency order. Checks checklist gate first.**

```
/speckit-implement
```

**Behavior:**
1. Reads checklist — if unchecked items, asks before proceeding
2. Executes tasks top-to-bottom (respects dependencies)
3. For each task: reads context, writes code, runs tests if specified
4. Can scope: `/speckit-implement --phase 1` for large features

**Phased Implementation Example:**
```
/speckit-implement --phase 1    # Foundation only
/speckit-implement --phase 2    # Core API
/speckit-implement --phase 3    # Frontend
```

### Step 8: `/speckit-converge` — Verify Completeness

**Checks codebase against spec, plan, tasks. Appends missing tasks.**

```
/speckit-converge
```

**Possible Outputs:**

```
✅ CONVERGED
All spec requirements implemented. All tasks complete.
No gaps detected between code and specifications.
```

```
⚠️  GAPS DETECTED - 3 tasks appended to tasks.md
- [ ] T034: Add PATCH /api/tasks/{id}/order for drag-drop reordering
- [ ] T035: Implement Comment.createdAt timestamp (missing in spec but in plan)
- [ ] T036: Add validation: task title required (constitution: security-first)

Run /speckit-implement to address gaps, then converge again.
```

---

## 6. Constitution-Driven Development

### 🔴 MUST REMEMBER — Constitution is the Supreme Law

Every artifact (spec, plan, tasks, code) is evaluated against the constitution.

### Constitution Patterns

| Pattern | Example Principle | Enforcement |
|---------|-------------------|-------------|
| **Security-First** | "All inputs validated" | `/speckit-analyze` flags missing validation |
| **Architecture** | "No direct DB in controllers" | Converge detects EF Core in API layer |
| **Quality** | "80% test coverage" | Tasks include test tasks; converge checks |
| **Documentation** | "XML comments on public APIs" | Implementation adds docs; converge verifies |
| **Performance** | "P95 < 200ms" | Plan includes perf tests; tasks implement |

### 💡 Pro Tip — Constitution as Team Contract

```markdown
# constitution.md (Team Agreement)

## Non-Negotiable
- Security-First: All inputs validated at boundary
- Observability: Structured logging + metrics on all endpoints
- Testing: Unit tests for domain logic; integration for API

## Architectural
- Modular Monolith: Clear module boundaries, no circular deps
- CQRS: Commands ≠ Queries; MediatR for dispatch
- Repository Pattern: EF Core only in Infrastructure

## Process
- Spec before Plan before Code (no exceptions)
- Checklist gate before implementation
- Converge before PR
```

---

## 7. Feature Directory & State Management

### 🔴 MUST REMEMBER — Feature State ≠ Git Branch

```
.specify/
├── feature.json              # Points to ACTIVE feature
└── features/
    ├── 001-taskify/          # Feature directory
    │   ├── spec.md
    │   ├── plan.md
    │   ├── tasks.md
    │   └── checklists/
    └── 002-user-auth/        # Another feature (not active)
```

### Key Commands

```bash
# View current feature
cat .specify/feature.json
# {"feature": "001-taskify", "created": "2024-01-15T10:30:00Z"}

# Switch feature (updates feature.json, NOT git checkout)
echo '{"feature": "002-user-auth"}' > .specify/feature.json

# Or use env var (overrides feature.json)
export SPECIFY_FEATURE_DIRECTORY=002-user-auth
/speckit-specify ...
```

### 💡 Pro Tip — Git Extension (Optional)

```bash
# Enable git integration (creates numbered branches)
specify init --extension git

# Now each feature gets a branch:
# 001-taskify → branch: 001-taskify
# 002-user-auth → branch: 002-user-auth

# But: git checkout alone does NOT change active feature!
# You must still update .specify/feature.json or use SPECIFY_FEATURE_DIRECTORY
```

---

## 8. Quality Gates & Checklists

### 🔴 MUST REMEMBER — Two Checklist Types

| Checklist | Owner | Purpose | Modified By |
|-----------|-------|---------|-------------|
| **Requirements** (`requirements.md`) | **Reviewer** | Spec quality gate | `/speckit-specify`, `/speckit-clarify` |
| **Custom** (any `.md` in `checklists/`) | **Reviewer** | Additional gates | Manual only |

### Checklist Lifecycle

```
/speckit-specify        → Generates/updates requirements.md
/speckit-clarify        → Updates requirements.md with clarifications
Reviewer reviews        → Marks [x] on satisfied items
/speckit-implement      → READS checklist, gates if unchecked
                        → Does NOT modify checklists
/speckit-converge       → Verifies code meets checked requirements
```

### 💡 Pro Tip — Custom Checklists

```markdown
# checklists/security.md (Custom)
## Security Review
- [ ] No SQL injection vectors (parameterized queries only)
- [ ] All endpoints have rate limiting
- [ ] Secrets in Azure Key Vault / env vars only
- [ ] CORS configured restrictively
- [ ] Input validation on ALL endpoints

# checklists/performance.md
## Performance Requirements
- [ ] P95 latency < 200ms for GET /api/projects
- [ ] P95 latency < 500ms for POST /api/tasks
- [ ] Database indexes on ProjectId, AssigneeId, Status
- [ ] Connection pooling configured
```

---

## 9. Implementation & Convergence

### 🔴 MUST REMEMBER — Implementation Flow

```
/speckit-implement
    │
    ├── Reads: tasks.md (dependency order)
    ├── Reads: plan.md (architecture context)
    ├── Reads: spec.md (requirements context)
    ├── Reads: constitution.md (principles)
    ├── Checks: checklists/requirements.md (gate)
    │
    ├── For each task:
    │   ├── Gathers context (relevant files, patterns)
    │   ├── Writes implementation
    │   ├── Runs associated tests (if any)
    │   └── Updates task status [x]
    │
    └── Outputs: Modified codebase + updated tasks.md
```

### Convergence Loop

```
┌─────────────────────────────────────┐
│        /speckit-implement           │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│        /speckit-converge            │
│  • Code vs Spec                     │
│  • Code vs Plan                     │
│  • Code vs Tasks                    │
│  • Constitution compliance          │
└──────────────┬──────────────────────┘
               ▼
        ┌──────┴──────┐
        │             │
   CONVERGED      GAPS FOUND
        │             │
        ▼             ▼
   DONE!        Appends tasks
                to tasks.md
                │
                └──→ Loop back to implement
```

### 💡 Pro Tip — Convergence Checks

| Check | What It Verifies |
|-------|------------------|
| **Spec Coverage** | Every acceptance criterion has code |
| **Plan Alignment** | APIs match plan; data model matches |
| **Task Completion** | All `[x]` tasks actually implemented |
| **Constitution** | Principles not violated (security, arch, quality) |
| **Checklist Satisfaction** | Code meets checked requirements |

---

## 10. Extensions & Customization

### 🔴 MUST REMEMBER — Extension Points

| Extension | Purpose | Example |
|-----------|---------|---------|
| **Git** | Feature branches, PR automation | `specify init --extension git` |
| **Presets** | Predefined constitutions, templates | `specify init --preset dotnet-microservices` |
| **Workflows** | Custom step sequences | `/speckit-my-workflow` |
| **Bundles** | Packaged extensions + config | Community bundles for React, Go, etc. |

### Creating Custom Skills

```bash
# Spec Kit skills are Copilot skill definitions
# Location: .github/copilot-skills/speckit-*.md

# Example: Custom skill for API review
# .github/copilot-skills/speckit-api-review.md
---
name: speckit-api-review
description: Review API design against REST best practices
---
Review the API endpoints in plan.md against:
- REST conventions (naming, status codes, versioning)
- Security (auth, rate limiting, validation)
- Performance (pagination, filtering, caching headers)
- Constitution compliance
Output: Markdown review with PASS/FAIL per endpoint
```

### Community Templates

```bash
# Browse templates
https://github.com/github/spec-kit/tree/main/templates

# Examples:
# - dotnet-aspire-blazor
# - python-fastapi-react
# - go-microservices
# - node-express-vue
```

---

## 11. Tricks & Tips

### 💡 Trick 1: Constitution as Living Document

```bash
# Update constitution when team learns
/speckit-constitution "Add: All new endpoints must include OpenAPI annotations. 
Add: Database migrations must be backward-compatible (expand-only)."
```

### 💡 Trick 2: Spec-Driven Bug Fixes (Separate Quickstart)

```bash
# For bugs, use the bug-fix quickstart
/speckit-bugfix "Users report tasks disappearing when moving between columns.
Steps: 1. Drag task from 'In Progress' to 'In Review'. 
2. Refresh page. Task gone.
Expected: Task persists in 'In Review'."
```

### 💡 Trick 3: Idea Assessment Before Specifying

```bash
# Validate if idea deserves investment
/speckit-assess "Add AI-powered task priority suggestions based on 
project history, user workload, and deadlines. 
Estimated effort: 2 weeks. 
Potential value: 20% faster sprint planning."
```

### 💡 Trick 4: Phased Implementation for Large Features

```bash
# Break into phases, implement one at a time
/speckit-tasks --phase 1    # Generate tasks for phase 1 only
/speckit-implement --phase 1
/speckit-converge --phase 1

/speckit-tasks --phase 2
/speckit-implement --phase 2
/speckit-converge --phase 2
```

### 💡 Trick 5: Parallel Feature Development

```bash
# Feature 1
export SPECIFY_FEATURE_DIRECTORY=001-taskify
/speckit-specify ...

# Feature 2 (different terminal)
export SPECIFY_FEATURE_DIRECTORY=002-user-auth
/speckit-specify ...

# Both can progress independently
# Converge each separately before merging
```

### 💡 Trick 6: Spec as Documentation Source

```bash
# Generate living documentation from spec
/speckit-docs --format openapi --output docs/api.yaml
/speckit-docs --format markdown --output docs/feature-spec.md
/speckit-docs --format html --output docs/
```

### 💡 Trick 7: Constitution Compliance in CI

```yaml
# .github/workflows/constitution.yml
name: Constitution Compliance
on: [pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Spec Kit
        run: uv tool install specify-cli
      - name: Analyze convergence
        run: |
          cd project
          /speckit-analyze --fail-on-gaps
          /speckit-converge --check-only
```

### 💡 Trick 8: Spec Review Checklist for PRs

```markdown
# PR Template (auto-generated from spec)

## Spec Alignment
- [ ] All acceptance criteria from spec.md addressed
- [ ] No new requirements added without spec update
- [ ] Plan.md reflects actual implementation

## Constitution Compliance
- [ ] Security-First: Input validation on all endpoints
- [ ] Architecture: No EF Core in API layer
- [ ] Documentation: XML comments on public APIs

## Quality Gates
- [ ] Requirements checklist: All items [x] by reviewer
- [ ] Custom checklists (security, performance): All [x]
- [ ] Converge: No gaps reported

## Testing
- [ ] Unit tests for domain logic
- [ ] Integration tests for API endpoints
- [ ] Manual QA: Kanban drag-drop, comments, assignment
```

---

## 12. Common Gotchas

### ⚠️ Gotcha 1: Mixing Spec & Plan Phases

**Problem:** Writing tech details in spec ("Use Redis for caching")
**Fix:** Spec = problem space only. Plan = solution space.

```
/speckit-specify "Users need fast task loading"  ✅
/speckit-specify "Use Redis caching for tasks"   ❌ (belongs in plan)
```

### ⚠️ Gotcha 2: Skipping Clarify for "Simple" Features

**Problem:** Ambiguities discovered during implementation (costly)
**Fix:** Always run `/speckit-clarify` for production features.

```bash
# Even 5 minutes of clarify saves hours of rework
/speckit-clarify "Focus on: task assignment rules, status transition permissions, comment editing"
```

### ⚠️ Gotcha 3: Ignoring Checklist Gate

**Problem:** Implementing against incomplete/unclear spec
**Fix:** Reviewer MUST mark checklist `[x]` before implement.

```
/speckit-implement
# Agent: "Checklist has 3 unchecked items. Proceed anyway? (y/N)"
# Say 'N', get reviewer to review, then re-run
```

### ⚠️ Gotcha 4: Git Checkout ≠ Feature Switch

**Problem:** `git checkout 002-user-auth` but `.specify/feature.json` still points to 001-taskify
**Fix:** Always update feature pointer.

```bash
# Wrong
git checkout 002-user-auth
/speckit-plan  # Operates on 001-taskify!

# Right
git checkout 002-user-auth
echo '{"feature": "002-user-auth"}' > .specify/feature.json
/speckit-plan  # Operates on 002-user-auth ✅
```

### ⚠️ Gotcha 5: Constitution Drift

**Problem:** Team agrees on principle but code violates it
**Fix:** Converge catches it, but prevent with CI gate.

```yaml
# CI must run converge --check-only
/speckit-converge --check-only
# Exit code 1 if gaps = PR blocked
```

### ⚠️ Gotcha 6: Tasks.md as Source of Truth

**Problem:** Editing tasks.md manually, then implement doesn't match
**Fix:** Tasks.md is GENERATED. Modify plan/spec, then re-run tasks.

```
❌ Edit tasks.md directly
✅ Edit plan.md → /speckit-tasks → /speckit-implement
```

---

## 13. Interview Quick Reference

### 🔴 MUST REMEMBER — Key Talking Points

| Question | Answer |
|----------|--------|
| **What is Spec Kit?** | GitHub's AI-assisted SDD toolkit using Copilot skills (`/speckit-*`) |
| **Spec Kit vs traditional SDD?** | Uses natural language specs + agentic implementation vs OpenAPI + code gen |
| **Three phases?** | Specify (what/why) → Plan (how) → Implement (execute) |
| **Constitution?** | Project principles that govern all artifacts; evaluated at each step |
| **Two workflow paths?** | Shorter (6 steps) vs Full (9 steps with quality gates) |
| **Feature state?** | Tracked in `.specify/feature.json`, NOT git branch |
| **Convergence?** | Automated verification that code matches spec/plan/tasks/constitution |
| **Checklists?** | Reviewer-owned quality gates; gate implementation; not modified by agent |
| **Extensions?** | Git, presets, workflows, bundles for customization |

### 🧠 What to Remember (Top 5)
1. **Spec = What/Why (human) → Plan = How (human+agent) → Code = Execute (agent)**
2. **Constitution is supreme** — every artifact evaluated against it
3. **Quality gates before code** — checklist, analyze, then implement
4. **Convergence loop** — implement → converge → fix gaps → repeat
5. **Feature directory ≠ git branch** — state in `.specify/feature.json`

---

## 14. Practice Exercises

### Exercise 1: Constitution Design
Create a constitution for a **fintech payment service**. Include: security, compliance, observability, architecture principles.

### Exercise 2: Specify a Feature
Write `/speckit-specify` prompt for: **"Add real-time collaborative editing to task descriptions (like Google Docs) with presence indicators."**

### Exercise 3: Clarify Ambiguities
Given the above spec, write 5 clarifying questions for `/speckit-clarify`.

### Exercise 4: Plan with Tech Stack
Write `/speckit-plan` for the collaborative editing feature using: **ASP.NET Core SignalR + Yjs/WebRTC + PostgreSQL + Blazor**.

### Exercise 5: Full Convergence Loop
1. Create spec → plan → tasks
2. Run `/speckit-analyze` — note gaps
3. Fix source artifacts → re-run analyze
4. Run `/speckit-implement --phase 1`
5. Run `/speckit-converge` — verify

### Exercise 6: Constitution Violation Detection
Add a violation to your code (e.g., EF Core in controller), run converge, observe detection.

---

## Quick Reference Card

```bash
# Project setup (once)
uv tool install specify-cli
specify init my-project --integration copilot
cd my-project

# Constitution (once per project)
/speckit-constitution "Security-First. Microservices. Full documentation. Repository pattern."

# Feature workflow (SHORTER PATH)
/speckit-specify "Build a task manager with projects, Kanban boards, comments, 5 users."
/speckit-plan "Use .NET Aspire + PostgreSQL. Blazor Server frontend. REST APIs. MediatR CQRS."
/speckit-tasks
/speckit-implement
/speckit-converge

# Feature workflow (FULL PATH - production)
/speckit-specify "..."
/speckit-clarify "Focus on permissions, status transitions, real-time"
/speckit-plan "..."
/speckit-checklist
/speckit-tasks
/speckit-analyze
/speckit-implement
/speckit-converge

# Feature management
cat .specify/feature.json                    # View active feature
echo '{"feature": "002-new-feature"}' > .specify/feature.json  # Switch feature
export SPECIFY_FEATURE_DIRECTORY=002-new-feature  # Or use env var

# Quality & verification
/speckit-analyze --fail-on-gaps              # CI gate
/speckit-converge --check-only               # CI gate (no modifications)
/speckit-docs --format openapi --output docs/ # Generate docs
```

---

> **Final Pro Tip:** Spec Kit changes **how you think** about development. The discipline of separating *what* from *how*, and validating *before* coding, pays compound interest on project quality. The constitution becomes your team's shared vocabulary for "good code."