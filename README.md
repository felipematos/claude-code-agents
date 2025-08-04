**THIS IS NOT AN AGENT! IT IS A README FILE ABOUT THE AGENT SYSTEM.**

# Claude Code Agents

A comprehensive multi-agent system for automated software development using Claude AI. This system implements a complete development workflow from product planning to deployment, following Scrum methodologies and a structured 4-tier testing approach.

## Overview

This repository contains a collection of specialized AI agents that work together to manage the entire software development lifecycle. Each agent operates independently but coordinates through a shared task management system (`tasks.json`) and follows strict Test-Driven Development (TDD) principles.

### Key System Features

#### Self-Improvement Workflow
- **Learning Capture**: Agents submit learnings to the Learner for validation
- **Human Validation**: Dashboard Self-Improvement tab for learning review
- **Instruction Updates**: Agent-Improver converts validated learnings into agent instructions
- **Change Tracking**: Complete audit trail of all agent modifications with revert capability

#### Performance Optimization
- **Selective Task Reading**: Agents filter tasks.json by relevance to reduce token usage
- **Instruction Area Management**: Maximum 20 concise instructions per agent
- **Prompt Optimization**: Agent-Improver can propose full prompt integration with human approval

#### Escalation Chain
- **Coder/Tester/Reviewer** → **Product-Manager** → **Product-Owner** → **Strategist**
- Higher-level agents notify delegated agents after decisions
- Strict task-based communication (no direct agent-to-agent communication)

### Core Development Agents
- **Strategist**: High-level strategy and architecture decisions
- **Product-Owner**: Requirements gathering and user story creation
- **Product-Manager**: Project coordination and timeline management
- **Task-Coder**: Feature implementation and bug fixes
- **Code-Reviewer**: Code quality and security review
- **Tester**: Testing strategy and quality assurance
- **DevOps-Engineer**: Deployment and infrastructure management

### UI Testing Agents
- **UI-Test-Designer**: UI test workflow design
- **UI-Tester**: Automated UI test execution

### System Management Agents
- **Cleaner**: Code cleanup and maintenance
- **Human-Concierge**: Human-agent bridge, request processing, escalation management

### Self-Improvement Agents
- **Architecturer**: Technology research, architectural guidance, performance optimization analysis
- **Learner**: Learning management, knowledge organization, system improvement tracking
- **Agent-Improver**: Agent instruction updates, prompt optimization, change management
- **Compliance-Officer**: Ensures regulatory compliance, data protection, and audit readiness

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

## Dashboard

The Claude Code Agents Dashboard provides a web-based interface for monitoring and managing your agents, tasks, and human requests.

### Quick Start

```bash
# Navigate to dashboard directory
cd dashboard

# Start the dashboard (installs dependencies automatically)
./start-dashboard.sh

# Or start manually
npm install
npm start
```

The dashboard will be available at:
- **Client**: http://localhost:3001
- **Server API**: http://localhost:3002

### Demo Mode vs Real Mode
The dashboard determines its mode dynamically:
- Demo Mode: Active when there is no .plan directory at the repository root. Data is read/written under .demo and test artifacts under .demo/tests. This mode is writable and file watching is enabled.
- Real Mode: Active when .plan exists. Data is read/written under .plan and tests under .plan/tests. On first run, any missing files are initialized from .templates/.plan and .templates/tests (templates copied as-is; .template suffix removed for .plan files).

### Dashboard Features

- **Real-time Task Monitoring**: View and manage tasks with drag-and-drop functionality
- **Human Request Management**: Handle and respond to human input requests
- **Roadmap Visualization**: View and edit project roadmaps
- **Agent Status**: Monitor agent activity and system health
- **WebSocket Integration**: Real-time updates without page refresh

### Dashboard Service

The dashboard service is managed externally through starter scripts, not through the agent system. The dashboard orchestrates Claude Code instances rather than being managed by them.

To start the dashboard:
```bash
cd dashboard
npm start
```

The dashboard will then be available to spawn and manage Claude Code agent instances.

## Usage Instructions

### Submitting Feature and Fix Requests
- **Do NOT** request features or report bugs directly to Claude Code.
- Instead, add them to `.plan/human-requests.md` in your project.
- The Human-Concierge agent will process all new requests and coordinate with the Product-Manager for roadmap integration.
- Deduplication: Before adding a new item, scan existing entries in `.plan/human-requests.md` and open items in `tasks.json`. If a pending item already addresses the same area or intent, update that existing entry with additional details instead of creating a new one. The Human-Concierge will consolidate duplicates and maintain a single canonical record.

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

## Security Notes

- **Agent Tools** - Most agents have access to all tools by default. Change this in your agent .md file by adding a `tools` section for enhanced secutiry. Check Claude Code docs.

- **Full Permissions** - Claude Code instances triggered by our system have the --dangerouslyskippermissions flag set to true. This is needed for system to work, and permit Claude Code to access to all system resources and tools without restrictions, but introduces risks, that can lead to security breaches or unexpected bad behaviour, including data loss. 

- **We recommend some good practices:**
    - Use Git cloud providers (Github/Gitlab/Bitbucket), and commit changes regularly. Out Task-Coder is trained to commit after every succeded task, but you need to initialize the repository first.
    - Monitor Claude Code's behaviour and logs closely.
    - Restrict access of tools to only those that are necessary for the agent to perform its tasks.
    - Regularly review and update tool access permissions.
