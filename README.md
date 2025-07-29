**THIS IS NOT AN AGENT! IT IS A README FILE ABOUT THE AGENT SYSTEM.**

# AI Agent Prompts for Software Development

This repository contains a collection of prompts for a multi-agent AI system designed to automate the software development lifecycle. This repository is for managing the **agent prompts**, not for the code of the project being developed by the agents.

## The Agent Team & Workflow

The system uses a Test-Driven Development (TDD) approach with a team of specialized AI agents:

1.  **`Strategist`**: Defines the high-level product vision and strategic stages.
2.  **`Product-Owner`**: Manages milestones, epics, and user stories based on strategic direction.
3.  **`Product-Manager`**: Organizes roadmap, manages sprints, breaks down work into tasks, and creates UI test design tasks.
4.  **`Tester`**: Receives a new task, writes a failing test that defines the requirements, and then passes it to the Coder.
5.  **`UI-Test-Designer`**: Designs JSON-based UI test workflows for user stories with browser automation steps.
6.  **`Task-Coder`**: Writes the necessary code to make the test pass and commits changes with changelog descriptions.
7.  **`Tester`** (again): Validates that the Coder's work passes the test.
8.  **`UI-Tester`**: Executes UI test workflows in staging environment before deployment.
9.  **`Code-Reviewer`**: Performs a final quality and style check on the code.
10. **`Cleaner`**: Maintains system performance by managing log files and ensuring archived logs are in .gitignore.

This entire process is managed by an **Orchestrator** agent (defined in `.templates/CLAUDE.md.template`) that dispatches tasks to the correct agent based on the status in a central `tasks.json` file.

## Installation

To use these agents with Claude Code:

1.  Copy the agent `.md` files from the `agents` folder in this repository into the `.claude/agents` folder in your Claude Code folder (or project folder).

2. Add the prompt from the `.templates/CLAUDE.md.template` file to the begining of the `CLAUDE.md` file in your Claude Code or project folder.

2.  Restart Claude Code.

## Usage Instructions

### Submitting Feature and Fix Requests
- **Do NOT** request features or report bugs directly to Claude Code.
- Instead, add them to `.plan/featurerequest.md` in your project.
- The Product-Manager agent will process all new requests at the start of the next development cycle.

### Handling Agent Questions
- Regularly check `.plan/human-in-the-loop.md` for TODOs.
- If an agent is blocked (needs clarification or information), it will add a TODO here.
- Respond to the TODO in the same file to unblock the task.

## Template Files Reference

Templates for files that will be used by the agents (like the main orchestrator prompt) are stored in the `.templates` directory and have a `.template` extension.

### Core Agent Files (in `.templates/`)
- `CLAUDE.md.template` - Main orchestrator prompt. Used by the Orchestrator agent to coordinate all other agents.

### Planning Files (in `.templates/.plan/`)
- `tasks.json.template` - Central task list (the blackboard). Used by all agents to coordinate work.
- `review-report.md.template` - Code review findings. Written by Code-Reviewer, read by Task-Coder.
- `human-in-the-loop.md.template` - Questions/blockers for the user. Written by any agent, read and written by user.
- `featurerequest.md.template` - Feature/bug requests. Written by users, read and processed by Product-Manager.

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


