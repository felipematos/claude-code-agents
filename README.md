**THIS IS NOT AN AGENT! IT IS A README FILE ABOUT THE AGENT SYSTEM.**

# AI Agent Prompts for Software Development

This repository contains a collection of prompts for a multi-agent AI system designed to automate the software development lifecycle. This repository is for managing the **agent prompts**, not for the code of the project being developed by the agents.

## The Agent Team & Workflow

The system uses a Test-Driven Development (TDD) approach with a team of specialized AI agents:

1.  **`Strategist`**: Defines the high-level product vision and user stories.
2.  **`Product-Manager`**: Translates the vision into concrete, prioritized tasks.
3.  **`Tester`**: Receives a new task, writes a failing test that defines the requirements, and then passes it to the Coder.
4.  **`Task-Coder`**: Writes the necessary code to make the test pass.
5.  **`Tester`** (again): Validates that the Coder's work passes the test.
6.  **`Code-Reviewer`**: Performs a final quality and style check on the code.

This entire process is managed by an **Orchestrator** agent (defined in `.templates/CLAUDE.md.template`) that dispatches tasks to the correct agent based on the status in a central `tasks.json` file.

## Installation

To use these agents with Claude Code:

1.  Copy the agent `.md` files from the `agents` folder in this repository into the `.claude/agents` folder in your Claude Code folder (or project folder).

2. Add the prompt from the `.templates/CLAUDE.md.template` file to the begining of the `CLAUDE.md` file in your Claude Code or project folder.

2.  Restart Claude Code.

## Templates

Templates for files that can be used by the agents (like the main orchestrator prompt) are stored in the `.templates` directory and have a `.template` extension.
