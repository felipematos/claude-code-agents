#!/usr/bin/env node
/*
 Version: 1.0.0
 Migration utility: Convert legacy .plan/tasks.json (array of tasks) into per-task files under .plan/tasks/<task_id>.json and create .plan/tasks/index.json.
 Supports demo mode via --demo flag to use .demo/.plan.
 - Reads legacy file only; leaves it intact unless --remove-legacy is provided.
 - Writes index entries with: task_id, title, status, agent, type, priority, updated_at.
 - Infers task_id from task.id || task.task_id || task.uuid || auto-generated.
 - Appends events to events.log for auditability.
*/

const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

async function main() {
  const args = process.argv.slice(2);
  const DEMO = args.includes('--demo');
  const REMOVE_LEGACY = args.includes('--remove-legacy');
  const ROOT = process.cwd();
  const BASE = DEMO ? path.join(ROOT, '.demo', '.plan') : path.join(ROOT, '.plan');
  const tasksJsonPath = path.join(BASE, 'tasks.json');
  const tasksDir = path.join(BASE, 'tasks');
  const indexPath = path.join(tasksDir, 'index.json');
  const eventsPath = path.join(BASE, 'events.log');
  const archiveDir = path.join(BASE, 'log-archive');
  const legacyArchivePath = path.join(archiveDir, 'tasks-archive.json');

  const nowIso = new Date().toISOString();

  function genId(prefix = 'T') {
    const r = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(8).toString('hex');
    return `${prefix}-${r}`;
  }

  if (!(await fs.pathExists(tasksJsonPath))) {
    console.log(`[migrate] No legacy tasks.json found at ${tasksJsonPath}. Nothing to migrate.`);
    process.exit(0);
  }

  const raw = await fs.readFile(tasksJsonPath, 'utf-8');
  let tasks;
  try {
    tasks = JSON.parse(raw);
  } catch (e) {
    console.error('[migrate] Failed parsing legacy tasks.json as JSON. Aborting.');
    process.exit(1);
  }
  if (!Array.isArray(tasks)) {
    console.error('[migrate] Expected an array of tasks in tasks.json. Aborting.');
    process.exit(1);
  }

  await fs.ensureDir(tasksDir);

  // Load any existing index to merge
  let index = [];
  if (await fs.pathExists(indexPath)) {
    try { index = JSON.parse(await fs.readFile(indexPath, 'utf-8')) || []; } catch { index = []; }
  }
  const indexMap = new Map(index.map((t) => [t.task_id, t]));

  const written = [];
  for (const t of tasks) {
    let taskId = t.task_id || t.id || t.uuid || null;
    if (!taskId) {
      taskId = genId('T');
    }
    // Ensure task has task_id field inside
    const taskData = { ...t, task_id: taskId };

    const filePath = path.join(tasksDir, `${taskId}.json`);
    await fs.writeFile(filePath, JSON.stringify(taskData, null, 2));

    // Build metadata for index
    const meta = {
      task_id: taskId,
      title: taskData.title || taskData.payload?.title || taskData.payload?.description?.slice(0, 80) || taskId,
      status: taskData.status || 'backlog',
      agent: taskData.agent || null,
      type: taskData.payload?.type || taskData.type || null,
      priority: taskData.priority || taskData.payload?.priority || null,
      updated_at: taskData.updated_at || nowIso,
    };
    indexMap.set(taskId, { ...indexMap.get(taskId), ...meta });
    written.push({ task_id: taskId, file: filePath });
  }

  // Persist merged index
  const merged = Array.from(indexMap.values());
  await fs.writeFile(indexPath, JSON.stringify(merged, null, 2));

  // Append migration event
  await fs.ensureFile(eventsPath);
  await fs.appendFile(eventsPath, JSON.stringify({ ts: nowIso, event: 'migrate_tasks', mode: DEMO ? 'demo' : 'real', migrated_count: written.length }) + '\n');

  // Optionally archive or remove legacy tasks.json
  if (REMOVE_LEGACY) {
    await fs.remove(tasksJsonPath);
    console.log(`[migrate] Removed legacy ${tasksJsonPath}`);
  } else {
    await fs.ensureDir(archiveDir);
    await fs.copy(tasksJsonPath, legacyArchivePath, { overwrite: true });
    console.log(`[migrate] Archived legacy tasks.json to ${legacyArchivePath}`);
  }

  console.log(`[migrate] Migrated ${written.length} tasks to per-task files under ${tasksDir}`);
  console.log(`[migrate] Wrote index at ${indexPath}`);
}

main().catch((err) => {
  console.error('[migrate] Unexpected error:', err);
  process.exit(1);
});
