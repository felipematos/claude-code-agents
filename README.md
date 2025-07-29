**THIS IS NOT AN AGENT! IT IS A README FILE ABOUT THE AGENT SYSTEM.**

# Claude Code Agents

A comprehensive multi-agent system for automated software development using Claude AI. This system implements a complete development workflow from product planning to deployment, following Scrum methodologies and a structured 4-tier testing approach.

## Overview

This repository contains a collection of specialized AI agents that work together to manage the entire software development lifecycle. Each agent has specific responsibilities and communicates through a shared task management system, implementing quality gates at every stage of development.

## Agent Architecture

### Core Development Agents
- **Product-Manager**: Creates epics, user stories, and manages product roadmap
- **Task-Coder**: Implements features and fixes based on tasks
- **Tester**: Implements 4-tier testing strategy following TDD principles
- **Code-Reviewer**: Reviews code quality and ensures standards compliance
- **DevOps-Engineer**: Manages deployment workflows and infrastructure

### Specialized Agents
- **UI-Test-Designer**: Designs comprehensive UI test workflows
- **UI-Tester**: Executes UI tests with detailed logging and failure handling
- **Human-Concierge**: Manages human-agent interaction, processes all human requests including feature requests, bug reports, agent clarifications, and strategic decisions

## Key Features

### 4-Tier Testing Strategy
Our testing approach provides quality gates at each development stage:
- **Unit Tests**: Per-task validation (1-3 min)
- **Smoke Tests**: Sprint completion validation (5-10 min)
- **Sanity Tests**: Pre-staging deployment validation (15-20 min)
- **Regression Tests**: Pre-production comprehensive validation (30-60 min)

### Development Excellence
- **Test-Driven Development**: Comprehensive TDD workflow with automated test generation
- **Scrum Integration**: Epic and user story management with sprint planning
- **Quality Assurance**: Multi-level code review and testing processes
- **UI Testing**: Specialized UI test design and execution with browser automation
- **Deployment Automation**: Automated deployment workflows with quality gates
- **Task Management**: JSON-based task tracking with status management

## Workflow

### Development Lifecycle
1. **Planning Phase**: Product-Manager creates epics and user stories
2. **Development Phase**: Task-Coder implements features following TDD
3. **Testing Phase**: 4-tier testing validation with quality gates
4. **Review Phase**: Code-Reviewer ensures quality standards
5. **Deployment Phase**: DevOps-Engineer manages deployment processes

### Quality Gates
- **Task Level**: Unit tests must pass (100% pass rate)
- **Sprint Level**: Smoke tests validate core functionality
- **Staging Level**: Sanity tests ensure business-critical paths
- **Production Level**: Regression tests provide comprehensive validation

## Testing Strategy

### Test Execution Matrix
| Test Level | Trigger | Duration | Priority | Pass Rate | Deployment Gate |
|------------|---------|----------|----------|-----------|----------------|
| Unit | Task completion | 1-3 min | All | 100% | Task approval |
| Smoke | Sprint completion | 5-10 min | Critical | 100% | Staging ready |
| Sanity | Pre-staging | 15-20 min | Critical + High | 100% | Staging deploy |
| Regression | Pre-production | 30-60 min | All levels | 95%+ | Production deploy |

### Testing Principles
- **Shift-Left Testing**: Catch issues early in development
- **Risk-Based Testing**: Focus on business-critical functionality
- **Automated Quality Gates**: Prevent deployment of defective code
- **Continuous Feedback**: Rapid feedback to development teams

## Getting Started

Refer to the individual agent files in the `agents/` directory for specific implementation details and workflows. Each agent contains detailed instructions for setup and operation.

## File Structure

```
├── agents/           # Agent definitions and workflows
├── .templates/       # Template files for project setup
│   ├── .plan/       # Planning templates (epics, user stories, roadmap)
│   └── tests/       # Testing templates and 4-tier test suites
└── README.md        # This file
```

## Quality Assurance

The system implements comprehensive quality assurance through:
- **Automated Testing**: 4-tier testing approach with clear quality gates
- **Code Review**: Mandatory review process with standards compliance
- **Deployment Gates**: Quality checks at each deployment stage
- **Continuous Monitoring**: Performance and reliability tracking
- **Failure Response**: Structured protocols for handling test failures

## Installation

To use these agents with Claude Code:

1.  Copy the agent `.md` files from the `agents` folder in this repository into the `.claude/agents` folder in your Claude Code folder (or project folder).

2. Add the prompt from the `.templates/CLAUDE.md.template` file to the begining of the `CLAUDE.md` file in your Claude Code or project folder.

2.  Restart Claude Code.

## Usage Instructions

### Submitting Feature and Fix Requests
- **Do NOT** request features or report bugs directly to Claude Code.
- Instead, add them to `.plan/human-requests.md` in your project.
- The Human-Concierge agent will process all new requests and coordinate with the Product-Manager for roadmap integration.

### Handling Agent Questions
- Regularly check `.plan/human-requests.md` for pending requests requiring your attention.
- If an agent is blocked (needs clarification or information), it will add a TODO here.
- Respond to the TODO in the same file to unblock the task.

## Template Files Reference

Templates for files that will be used by the agents (like the main orchestrator prompt) are stored in the `.templates` directory and have a `.template` extension.

### Core Agent Files (in `.templates/`)
- `CLAUDE.md.template` - Main orchestrator prompt. Used by the Orchestrator agent to coordinate all other agents.

### Planning Files (in `.templates/.plan/`)
- `tasks.json.template` - Central task list (the blackboard). Used by all agents to coordinate work.
- `review-report.md.template` - Code review findings. Written by Code-Reviewer, read by Task-Coder.
- `human-requests.md.template` - Unified file for all human-system interactions including feature requests, bug reports, agent clarifications, and strategic decisions. Written by agents and users, processed by Human-Concierge.

### Strategic Planning Files (in project root)
- `product_vision.md.template` - High-level project goals and stages. Written by Strategist, read by Product-Owner.
- `roadmap.md.template` - Product roadmap with stages, milestones, epics, and sprints. Organized by Product-Manager, enhanced by Product-Owner.
- `epic.md.template` - Epic definitions with technical architecture and sprint breakdown. Written by Product-Owner.
- `user_stories.md.template` - Detailed requirements and user stories. Written by Product-Owner, read by Product-Manager.

### Test Files (in `.templates/tests/`)
- `test_plan.md.template` - Test suite organization. Used by Tester to plan test cases.
- `test_example.py.template` - Example test file. Written/executed by Tester.
- `test_log.md.template` - Test execution results. Written by Tester, read by Tester/Product-Manager.
- `ui_test_log.md.template` - UI test execution logs. Written by UI-Tester with detailed browser automation results.

### Additional Templates
- `deployment_workflow.md.template` - Deployment process with UI testing integration and failure handling.
- `task_schema.json.template` - Complete task schema including UI test task types and structure.


