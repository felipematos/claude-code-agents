# User Stories: TaskFlow Pro

## Stage 1 – MVP Foundations

### US-001 – Create and manage tasks
As a Product Manager, I want to create and manage tasks with status, priority, and agent assignment so that the team can plan and track work.

Acceptance Criteria:
- Create tasks with id, title, description, status, agent, priority
- Update tasks, change status, and reassign agents
- View tasks grouped by status

### US-002 – Kanban drag-and-drop
As a Developer, I want to move tasks between columns using drag-and-drop so that I can quickly update progress.

Acceptance Criteria:
- Drag-and-drop moves tasks across columns
- Status updates are persisted to storage
- Visual confirmation (toast) on update

### US-003 – Human requests intake
As a Stakeholder, I want to submit human requests (bug reports, features, clarifications) so that the team can triage and plan them.

Acceptance Criteria:
- Create requests with id, type, priority, description, context
- Requests appear in Pending by default
- Requests can be edited and moved between statuses

### US-004 – Roadmap visualization
As a Stakeholder, I want to view the product roadmap with stages, milestones, epics, and sprints so that I understand plan and progress.

Acceptance Criteria:
- Render stages with milestones and epics
- Show current stage and next milestones
- Sprint list for active stage

### US-005 – Real-time updates
As a Team Member, I want live updates to the board when files change so that I see the latest information without refreshing.

Acceptance Criteria:
- WebSocket push updates for tasks/human requests/roadmap
- Smooth UI refresh without losing context

### US-006 – Notifications
As a Team Member, I want to receive notifications when tasks are completed or blocked so that I can react quickly.

Acceptance Criteria:
- Toast success when task is completed
- Toast error when task is blocked
- Configurable notification toggle
