# Claude Code Agents Dashboard

A local web-based management interface for the Claude Code Agents system.

## Overview

This dashboard provides a visual interface for managing:
- Project roadmap and stages
- Task management and sprint planning
- Human requests and agent interactions
- Real-time agent status monitoring

## Quick Start

### Option 1: Automated Script (Recommended)
```bash
cd dashboard
./start-dashboard.sh
```

Deduplication note: When using the dashboard to file new feature/bug requests, scan existing items in `.plan/human-requests.md` and open entries in `tasks.json`. If there’s an existing pending item addressing the same area/intent, update that item instead of creating a new one. The Human-Concierge agent will consolidate duplicates to maintain a single canonical record.

**Note**: The script automatically detects if you're running in a template repository and switches to test mode, using the template files directly from `.templates/.plan/` instead of the real `.plan/` directory.

### Option 2: Manual Start
```bash
cd dashboard
npm install
npm start
```

### Option 3: Force Test Mode
```bash
cd dashboard
NODE_ENV=test npm start
```

### Option 4: Agent-Triggered Start
Use the Dashboard-Manager agent to automatically start the service:
```
@Dashboard-Manager start
```

## Operating Modes

### Real Mode
- Uses files from `.plan/` directory (read/write)
- Supports file watching and real-time updates
- Initializes missing files on first run from `.templates/.plan` (removing `.template` suffix) and `.templates/tests` (copied as-is)
- Recommended when working with actual project data

### Demo Mode
- Active when `.plan/` does not exist
- Uses files from `.demo/` (read/write)
- Watches `.demo/` and `.demo/tests/` for changes
- Ships with example demo data and tests under `.demo/` for quick demos

## Architecture

- **Frontend**: React with Material-UI
- **Backend**: Node.js with Express
- **Real-time**: WebSocket for live updates
- **Data**: File system integration with `.plan/` directory

## Features

### MVP (Phase 1)
- [x] Basic project setup
- [ ] Task management board
- [ ] Human requests panel
- [ ] Real-time file watching
- [ ] Basic roadmap view

### Future Phases
- [ ] Advanced sprint planning
- [ ] Analytics dashboard
- [ ] Agent performance metrics
- [ ] Drag-and-drop interfaces

## Integration with Claude Code

### Recommended Approach: Dashboard-Manager Agent

After investigating the Claude Code Agents system, the best approach is to create a dedicated **Dashboard-Manager** agent that handles the dashboard lifecycle. This follows the existing agent pattern and integrates seamlessly with the task-based system.

### Implementation Options

#### Option 1: Manual Start (MVP - Current)
```bash
cd dashboard
npm install
npm start
```
- **Pros**: Simple, immediate implementation
- **Cons**: Requires manual intervention, not integrated with agent system
- **Use Case**: Development and testing

#### Option 2: Dashboard-Manager Agent (Recommended)
Create a new agent that manages dashboard lifecycle:

**Agent Responsibilities:**
- Start/stop dashboard service
- Monitor dashboard health
- Handle service failures and restarts
- Integrate with DevOps-Engineer for deployment

**Task Example:**
```json
{
  "id": "dashboard-001",
  "type": "service_management",
  "status": "pending",
  "agent": "Dashboard-Manager",
  "payload": {
    "title": "Start Dashboard Service",
    "description": "Initialize and start the Claude Code Agents Dashboard",
    "action": "start",
    "port": 3001
  }
}
```

#### Option 3: DevOps-Engineer Integration
Extend the existing DevOps-Engineer agent to handle dashboard services:
- Add dashboard management to DevOps-Engineer responsibilities
- Create service management task types
- Integrate with deployment workflows

#### Option 4: Auto-start Integration (Future)
- Integrate with Claude Code startup sequence
- Add dashboard service to project initialization
- Automatic health monitoring and restart

### MVP Implementation Plan

**Phase 1: Manual Start (Current)**
- Dashboard works independently
- Manual startup via npm scripts
- Basic functionality testing

**Phase 2: Agent Integration**
- Create Dashboard-Manager agent
- Add service management task types
- Integrate with task.json system

**Phase 3: Full Integration**
- Auto-start capabilities
- Health monitoring and recovery
- Integration with deployment pipelines

## Port Configuration

- **Dashboard**: http://localhost:3001
- **API**: http://localhost:3002
- **WebSocket**: ws://localhost:3003

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```
