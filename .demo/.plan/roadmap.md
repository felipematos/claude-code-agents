# Roadmap: TaskFlow Pro

This roadmap outlines stages, milestones, epics, and sprints to deliver TaskFlow Pro. It follows an iterative agile approach with clear quality gates and demo-ready artifacts.

## Stages

### Stage 1 – MVP Foundations
Milestones:
- M1.1: Core Data Model and API
- M1.2: Dashboard MVP
- M1.3: Agent Workflow Skeleton

Epics:
- E-001: Tasks and Human Requests Blackboards
- E-002: Dashboard MVP (Tasks Board, Human Requests, Roadmap View)
- E-003: Agent Orchestrator Skeleton

#### Sprints
- Sprint 1.1 (2 weeks)
  - Implement tasks.json and human-requests.md parsing
  - Build basic React dashboard shell
  - Implement server API endpoints (tasks, requests, roadmap)
- Sprint 1.2 (2 weeks)
  - Kanban board with drag-and-drop
  - Human requests create/edit
  - Initial roadmap rendering
- Sprint 1.3 (2 weeks)
  - WebSocket live updates
  - Notifications and toasts
  - Basic orchestration API placeholder

### Stage 2 – TDD and 4-Tier Testing
Milestones:
- M2.1: Unit & Smoke Test Harness
- M2.2: Sanity & Regression Pipelines
- M2.3: Test Visibility in Dashboard

Epics:
- E-004: 4-Tier Testing Infrastructure
- E-005: UI Test Logging and Visualization
- E-006: Test Gates before Deploy

#### Sprints
- Sprint 2.1 (2 weeks)
  - Unit tests execution baseline
  - Smoke tests for sprint end validation
- Sprint 2.2 (2 weeks)
  - Sanity/regression test runners
  - Dashboard test logs and pass/fail trends

### Stage 3 – Agent Automation
Milestones:
- M3.1: Orchestration Loop
- M3.2: Agent Roles and Tooling
- M3.3: Human-in-the-Loop Integration

Epics:
- E-007: Orchestration Loop with Prioritization
- E-008: Agent Role Prompts and Tool Permissions
- E-009: HITL Policies and Approvals

#### Sprints
- Sprint 3.1 (2 weeks)
  - Orchestrator loop scheduling
  - Agent triggers and queueing
- Sprint 3.2 (2 weeks)
  - HITL flows, approvals, escalations
  - Robust error handling and retries

## Active Epics (Stage 1)
- E-001: Tasks and Human Requests Blackboards
- E-002: Dashboard MVP (Tasks Board, Human Requests, Roadmap View)
- E-003: Agent Orchestrator Skeleton

## Notes
- Each sprint must meet the 4-tier quality gates once Stage 2 is active.
- Demo mode uses .demo data; real mode uses .plan.
