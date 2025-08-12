# Human Requests – TaskFlow Pro

## 🔄 Pending Requests

### REQ-1001: Allow bulk task creation
**Type:** Feature Request
**Priority:** HIGH
**Requester:** Human
**Date:** 2025-08-02

**Description:**
Enable bulk creation of tasks by pasting multiple lines, one per task. Each line becomes a task with default status and agent.

**Context:**
Speeds up sprint planning by allowing quick capture of multiple tasks.

**Status:** pending

---

### REQ-1002: Clarify DnD status persistence
**Type:** Agent Clarification
**Priority:** MEDIUM
**Requester:** Human
**Date:** 2025-08-02

**Description:**
Confirm if drag-and-drop persists the task status immediately or queues it until batch save.

**Context:**
We need predictable behavior for demos.

**Status:** pending

---

### REQ-1003: Report bug when editing empty request
**Type:** Bug Report
**Priority:** HIGH
**Requester:** Human
**Date:** 2025-08-02

**Description:**
Editing an empty description triggers a runtime error. App should block save and show validation.

**Context:**
Observed during demo.

**Status:** pending

---

## 🚀 In Progress

### REQ-1004: Add request filters by priority
**Type:** Feature Request
**Priority:** MEDIUM
**Requester:** Human
**Date:** 2025-08-02

**Description:**
Add filter controls to view requests by priority and type.

**Context:**
Improves triage workflow.

**Status:** in_progress

---

### REQ-1005: Clarify notification toggles
**Type:** Agent Clarification
**Priority:** LOW
**Requester:** Human
**Date:** 2025-08-02

**Description:**
Where are notification settings stored and how to disable browser notifications?

**Context:**
Needed for live demos.

**Status:** in_progress

---

### REQ-1006: Fix WS reconnect regression
**Type:** Bug Report
**Priority:** URGENT
**Requester:** Human
**Date:** 2025-08-02

**Description:**
After network blip, reconnect does not resume events. Manual refresh required.

**Context:**
Seen on unstable wifi.

**Status:** in_progress

---

## ✅ Resolved

### REQ-1007: Normalize request parsing
**Type:** Bug Report
**Priority:** MEDIUM
**Requester:** Human
**Date:** 2025-08-02

**Description:**
Normalize parsed structure to avoid undefined .length errors when sections are missing.

**Context:**
Fixed by guarding access and normalizing arrays.

**Status:** resolved

---

### REQ-1008: Add demo mode note to docs
**Type:** Feature Request
**Priority:** LOW
**Requester:** Human
**Date:** 2025-08-02

**Description:**
Explain that demo mode uses .demo and real mode uses .plan in docs.

**Context:**
Reduce confusion for new users.

**Status:** resolved

---

### REQ-1009: Improve DnD hover feedback
**Type:** Feature Request
**Priority:** MEDIUM
**Requester:** Human
**Date:** 2025-08-02

**Description:**
Add subtle background highlight on droppable columns during drag.

**Context:**
Enhances user perception of valid drop targets.

**Status:** resolved

---
