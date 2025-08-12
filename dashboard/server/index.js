const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const chokidar = require('chokidar');
const fs = require('fs-extra');
const path = require('path');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const compression = require('compression');
const { spawn } = require('child_process');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3002;
const WS_PORT = process.env.WS_PORT || 3003;

// Security and performance middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

/**
 * Repository type detection (demo mode aware).
 * Demo mode is TRUE when project-relative './.plan' does not exist.
 * - If .plan exists and has tasks/ (with index.json or any task file) -> existing_project (NOT demo)
 * - If .plan exists but no tasks/ -> new_project (NOT demo, but needs setup)
 * - If .plan missing -> template (DEMO MODE)
 */
function detectRepositoryType() {
  // Server is at dashboard/server/index.js, repo root is two levels up
  const repoRoot = path.join(__dirname, '../../');
  const planDir = path.join(repoRoot, '.plan');
  const tasksDir = path.join(planDir, 'tasks');
  const indexPath = path.join(tasksDir, 'index.json');

  const hasPlanDir = fs.existsSync(planDir);
  const hasTasksDir = fs.existsSync(tasksDir);
  const hasIndex = fs.existsSync(indexPath);

  console.log('Detecting repository type:');
  console.log('  Repo root:', repoRoot);
  console.log('  .plan dir exists:', hasPlanDir);
  console.log('  .plan/tasks dir exists:', hasTasksDir);
  console.log('  .plan/tasks/index.json exists:', hasIndex);

  // DEMO MODE: No .plan folder at repo root
  if (!hasPlanDir) {
    return 'template';
  }

  // .plan exists but no tasks dir or index -> treat as new project needing setup
  if (!hasTasksDir) {
    return 'new_project';
  }

  // .plan exists with tasks structure -> existing project
  if (hasTasksDir && (hasIndex || fs.readdirSync(tasksDir).some(n => n.endsWith('.json')))) {
    return 'existing_project';
  }

  return 'new_project';
}

const REPO_TYPE = detectRepositoryType();
// DEMO MODE: when no './.plan' at repo root (REPO_TYPE === 'template')
const DEMO_MODE = REPO_TYPE === 'template';

// Base directories - Server is at dashboard/server/, repo root is two levels up
const REPO_ROOT = path.join(__dirname, '../../');
const PLAN_DIR_REAL = path.join(REPO_ROOT, '.plan');
const DEMO_DIR = path.join(REPO_ROOT, '.demo');
const TEMPLATES_DIR = path.join(REPO_ROOT, '.templates/.plan');
const TEST_TEMPLATES_DIR = path.join(REPO_ROOT, '.templates/tests');
const TESTS_DIR_REAL = path.join(REPO_ROOT, '.plan/tests');
const TESTS_DIR_DEMO = path.join(REPO_ROOT, '.demo/tests');

/**
 * Active data directory based on mode:
 * - Demo mode: use .demo (read/write)
 * - Real mode: use .plan (read/write)
 * No automatic copying/renaming at runtime.
 */
const PLAN_DIR = DEMO_MODE ? DEMO_DIR : PLAN_DIR_REAL;
const TESTS_DIR = DEMO_MODE ? TESTS_DIR_DEMO : TESTS_DIR_REAL;

console.log(`🔧 Repository type: ${REPO_TYPE}`);
console.log(`🧪 Demo mode: ${DEMO_MODE ? 'ON (using .demo)' : 'OFF (using .plan)'}`);
console.log(`📁 Using directory: ${PLAN_DIR}`);

// WebSocket server for real-time updates
const wss = new WebSocket.Server({ port: WS_PORT });
const clients = new Set();

wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket');
  clients.add(ws);
  
  ws.on('close', () => {
    console.log('Client disconnected from WebSocket');
    clients.delete(ws);
  });
});

// Broadcast to all connected clients
function broadcast(data) {
  const message = JSON.stringify(data);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// File system utilities
class FileManager {
  static async ensurePlanDir() {
    await fs.ensureDir(PLAN_DIR);
  }

  static async readJsonFile(filename) {
    const filePath = path.join(PLAN_DIR, filename);
    try {
      if (await fs.pathExists(filePath)) {
        const content = await fs.readFile(filePath, 'utf8');
        return JSON.parse(content);
      }
      return null;
    } catch (error) {
      console.error(`Error reading ${filename}:`, error);
      return null;
    }
  }

  static async writeJsonFile(filename, data) {
    // Both modes write to their active directory
    const filePath = path.join(PLAN_DIR, filename);
    try {
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error(`Error writing ${filename}:`, error);
      return false;
    }
  }

  static async readMarkdownFile(filename) {
    const filePath = path.join(PLAN_DIR, filename);
    try {
      if (await fs.pathExists(filePath)) {
        return await fs.readFile(filePath, 'utf8');
      }
      return null;
    } catch (error) {
      console.error(`Error reading ${filename}:`, error);
      return null;
    }
  }

  static async writeMarkdownFile(filename, content) {
    // Both modes write to their active directory
    const filePath = path.join(PLAN_DIR, filename);
    try {
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, content);
      return true;
    } catch (error) {
      console.error(`Error writing ${filename}:`, error);
      return false;
    }
  }

  static async initializeFromTemplates() {
    // No automatic seeding/copying behavior for demo mode at runtime.
    // Demo mode: ensure .demo directory exists; content is managed manually or by one-time setup scripts.
    if (DEMO_MODE) {
      await fs.ensureDir(DEMO_DIR);
      await fs.ensureDir(TESTS_DIR);
      return;
    }

    // Real mode: ensure .plan exists; optionally initialize from templates if missing files
    await this.ensurePlanDir();
    await fs.ensureDir(TESTS_DIR);

    const templateFiles = [
      'tasks.json.template',
      'human-requests.md.template',
      'roadmap.md.template',
      'user_stories.md.template',
      'product_vision.md.template'
    ];

    for (const templateFile of templateFiles) {
      const targetFile = templateFile.replace('.template', '');
      const targetPath = path.join(PLAN_DIR, targetFile);
      const templatePath = path.join(TEMPLATES_DIR, templateFile);

      if (!(await fs.pathExists(targetPath)) && (await fs.pathExists(templatePath))) {
        await fs.copy(templatePath, targetPath);
        console.log(`Initialized ${targetFile} from template`);
      }
    }

    // Initialize tests folder from .templates/tests (files copied as-is)
    if (await fs.pathExists(TEST_TEMPLATES_DIR)) {
      const testEntries = await fs.readdir(TEST_TEMPLATES_DIR);
      for (const entry of testEntries) {
        const src = path.join(TEST_TEMPLATES_DIR, entry);
        const dest = path.join(TESTS_DIR, entry);
        if (!(await fs.pathExists(dest))) {
          await fs.copy(src, dest);
          console.log(`Initialized tests/${entry} from templates`);
        }
      }
    }
  }

  // ---------- New Task Storage (per-task files) ----------
  /**
   * Read all tasks using the new structure if available:
   * - Directory: `${PLAN_DIR}/tasks/`
   * - Files: `${PLAN_DIR}/tasks/<task_id>.json` and `${PLAN_DIR}/tasks/index.json`
   * Falls back to legacy `${PLAN_DIR}/tasks.json` (and demo fallback handled by caller, if any)
   */
  static async readAllTasks() {
    const tasksDir = path.join(PLAN_DIR, 'tasks');
    const indexPath = path.join(tasksDir, 'index.json');

    try {
      if (await fs.pathExists(tasksDir)) {
        let ids = [];
        if (await fs.pathExists(indexPath)) {
          try {
            const idx = JSON.parse(await fs.readFile(indexPath, 'utf8')) || [];
            ids = Array.isArray(idx)
              ? idx.map(e => e.task_id || e.id).filter(Boolean)
              : [];
          } catch (e) {
            console.warn('Failed to read tasks/index.json, scanning directory instead');
          }
        }

        // If index.json missing or empty, scan directory
        if (!ids.length) {
          const entries = await fs.readdir(tasksDir);
          ids = entries
            .filter(name => name.endsWith('.json') && name !== 'index.json')
            .map(name => name.replace(/\.json$/, ''));
        }

        const tasks = [];
        for (const id of ids) {
          const p = path.join(tasksDir, `${id}.json`);
          if (await fs.pathExists(p)) {
            try {
              tasks.push(JSON.parse(await fs.readFile(p, 'utf8')));
            } catch (e) {
              console.warn(`Failed to parse task file ${p}:`, e.message);
            }
          }
        }
        return tasks;
      }
    } catch (e) {
      console.warn('readAllTasks() new-structure failed, falling back:', e.message);
    }

    // Legacy fallback
    return (await this.readJsonFile('tasks.json')) || [];
  }

  /**
   * Write/update a single task file and maintain `tasks/index.json`.
   */
  static async writeTaskById(taskId, taskData) {
    const tasksDir = path.join(PLAN_DIR, 'tasks');
    const indexPath = path.join(tasksDir, 'index.json');
    await fs.ensureDir(tasksDir);

    const filePath = path.join(tasksDir, `${taskId}.json`);
    await fs.writeFile(filePath, JSON.stringify(taskData, null, 2));

    // Update index.json (append or replace entry)
    let index = [];
    if (await fs.pathExists(indexPath)) {
      try {
        index = JSON.parse(await fs.readFile(indexPath, 'utf8')) || [];
      } catch (e) {
        console.warn('Corrupt tasks/index.json, reinitializing');
      }
    }

    const meta = {
      task_id: taskId,
      title: taskData.title || taskData.name || '',
      status: taskData.status || 'pending',
      agent: taskData.agent || taskData.assignee || '',
      updated_at: new Date().toISOString()
    };

    const i = index.findIndex(e => (e.task_id || e.id) === taskId);
    if (i >= 0) {
      index[i] = { ...index[i], ...meta };
    } else {
      index.push(meta);
    }

    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
  }

  /**
   * Append an event to `.plan/events.log` as NDJSON for auditability.
   */
  static async appendEvent(event) {
    const eventsPath = path.join(PLAN_DIR, 'events.log');
    const record = { ts: new Date().toISOString(), ...event };
    await fs.ensureFile(eventsPath);
    await fs.appendFile(eventsPath, JSON.stringify(record) + '\n');
  }
}

// Claude Code Instance Management
class OrchestrationManager {
  constructor() {
    this.instances = new Map();
    this.nextInstanceId = 1;
  }

  createInstance(config = {}) {
    const instanceId = `claude-${this.nextInstanceId++}`;
    const instance = {
      id: instanceId,
      status: 'starting',
      startTime: new Date().toISOString(),
      config: {
        model: config.model || 'claude-3-5-sonnet-20241022',
        maxTokens: config.maxTokens || 8192,
        temperature: config.temperature || 0.1,
        ...config
      },
      logs: [],
      metrics: {
        tokensUsed: 0,
        requestCount: 0,
        errorCount: 0,
        uptime: 0
      },
      process: null
    };

    this.instances.set(instanceId, instance);
    this.startInstance(instanceId);
    return instance;
  }

  startInstance(instanceId) {
    const instance = this.instances.get(instanceId);
    if (!instance) return false;

    try {
      // Simulate Claude Code process startup
      instance.status = 'running';
      instance.startTime = new Date().toISOString();
      
      // Add initial log
      this.addLog(instanceId, 'info', 'Claude Code instance started successfully');
      
      // Simulate periodic metrics updates
      instance.metricsInterval = setInterval(() => {
        this.updateMetrics(instanceId);
      }, 5000);

      // Broadcast instance update
      broadcast({ 
        type: 'instance_updated', 
        data: this.getInstanceData(instanceId) 
      });

      return true;
    } catch (error) {
      instance.status = 'error';
      this.addLog(instanceId, 'error', `Failed to start instance: ${error.message}`);
      return false;
    }
  }

  stopInstance(instanceId) {
    const instance = this.instances.get(instanceId);
    if (!instance) return false;

    try {
      if (instance.process) {
        instance.process.kill();
      }
      
      if (instance.metricsInterval) {
        clearInterval(instance.metricsInterval);
      }

      instance.status = 'stopped';
      instance.endTime = new Date().toISOString();
      
      this.addLog(instanceId, 'info', 'Claude Code instance stopped');
      
      // Broadcast instance update
      broadcast({ 
        type: 'instance_updated', 
        data: this.getInstanceData(instanceId) 
      });

      return true;
    } catch (error) {
      this.addLog(instanceId, 'error', `Failed to stop instance: ${error.message}`);
      return false;
    }
  }

  removeInstance(instanceId) {
    const instance = this.instances.get(instanceId);
    if (!instance) return false;

    this.stopInstance(instanceId);
    this.instances.delete(instanceId);
    
    // Broadcast instance removal
    broadcast({ 
      type: 'instance_removed', 
      data: { instanceId } 
    });

    return true;
  }

  addLog(instanceId, level, message) {
    const instance = this.instances.get(instanceId);
    if (!instance) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message
    };

    instance.logs.push(logEntry);
    
    // Keep only last 100 logs
    if (instance.logs.length > 100) {
      instance.logs = instance.logs.slice(-100);
    }

    // Broadcast log update
    broadcast({ 
      type: 'instance_log', 
      data: { instanceId, log: logEntry } 
    });
  }

  updateMetrics(instanceId) {
    const instance = this.instances.get(instanceId);
    if (!instance || instance.status !== 'running') return;

    // Simulate metrics updates
    instance.metrics.uptime = Date.now() - new Date(instance.startTime).getTime();
    instance.metrics.tokensUsed += Math.floor(Math.random() * 100);
    instance.metrics.requestCount += Math.floor(Math.random() * 3);
    
    // Occasionally simulate errors
    if (Math.random() < 0.1) {
      instance.metrics.errorCount += 1;
      this.addLog(instanceId, 'warning', 'Simulated processing warning');
    }

    // Broadcast metrics update
    broadcast({ 
      type: 'instance_metrics', 
      data: { instanceId, metrics: instance.metrics } 
    });
  }

  getInstanceData(instanceId) {
    const instance = this.instances.get(instanceId);
    if (!instance) return null;

    return {
      id: instance.id,
      status: instance.status,
      startTime: instance.startTime,
      endTime: instance.endTime,
      config: instance.config,
      metrics: instance.metrics,
      logs: instance.logs.slice(-10) // Return last 10 logs
    };
  }

  getAllInstances() {
    return Array.from(this.instances.keys()).map(id => this.getInstanceData(id));
  }
}

// Initialize orchestration manager
const orchestrationManager = new OrchestrationManager();

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Check for agents in .claude/agents
app.get('/api/setup/check-agents', async (req, res) => {
  try {
    const agentsDir = path.join(REPO_ROOT, '.claude', 'agents');
    
    if (!await fs.pathExists(agentsDir)) {
      return res.json({ 
        installed: false, 
        count: 0, 
        agents: [],
        error: 'Agents directory not found'
      });
    }
    
    const files = await fs.readdir(agentsDir);
    const agentFiles = files.filter(f => f.endsWith('.md'));
    const agents = agentFiles.map(f => f.replace('.md', ''));
    
    res.json({ 
      installed: agentFiles.length > 0, 
      count: agentFiles.length,
      agents,
      path: agentsDir
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check agents', details: error.message });
  }
});

// Check if project is already initialized
app.get('/api/setup/check-initialized', async (req, res) => {
  try {
    const checks = {
      hasPlanDir: await fs.pathExists(PLAN_DIR),
      hasClaudeMd: await fs.pathExists(path.join(REPO_ROOT, 'CLAUDE.md')),
      hasTasks: false,
      hasAgentContent: false
    };
    
    // Check for tasks
    if (checks.hasPlanDir) {
      const tasksDir = path.join(PLAN_DIR, 'tasks');
      if (await fs.pathExists(tasksDir)) {
        const indexPath = path.join(tasksDir, 'index.json');
        if (await fs.pathExists(indexPath)) {
          const index = JSON.parse(await fs.readFile(indexPath, 'utf8'));
          checks.hasTasks = index.tasks && index.tasks.length > 0;
        }
      }
      
      // Fallback to legacy
      if (!checks.hasTasks) {
        const legacyPath = path.join(PLAN_DIR, 'tasks.json');
        if (await fs.pathExists(legacyPath)) {
          const tasks = JSON.parse(await fs.readFile(legacyPath, 'utf8'));
          checks.hasTasks = tasks.tasks && tasks.tasks.length > 0;
        }
      }
    }
    
    // Check if CLAUDE.md has agent content
    if (checks.hasClaudeMd) {
      const content = await fs.readFile(path.join(REPO_ROOT, 'CLAUDE.md'), 'utf8');
      checks.hasAgentContent = content.includes('Claude Code Agents');
    }
    
    const initialized = checks.hasPlanDir && checks.hasClaudeMd && checks.hasAgentContent;
    
    res.json({ 
      initialized,
      details: checks
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check initialization', details: error.message });
  }
});

// Initialize Claude Code - simplified version without streaming for now
app.post('/api/setup/init-claude-code', async (req, res) => {
  try {
    const { spawn } = require('child_process');
    
    console.log('Initializing Claude Code at:', REPO_ROOT);
    
    // Check if CLAUDE.md already exists (might already be initialized)
    const claudeMdPath = path.join(REPO_ROOT, 'CLAUDE.md');
    if (await fs.pathExists(claudeMdPath)) {
      console.log('CLAUDE.md already exists, skipping initialization');
      return res.json({ 
        success: true, 
        output: 'Claude Code already initialized (CLAUDE.md exists)', 
        message: 'Claude Code already initialized',
        skipped: true
      });
    }
    
    const child = spawn('claude', ['code', 'init'], {
      cwd: REPO_ROOT,
      shell: true
    });
    
    let output = '';
    let error = '';
    let responded = false;
    
    // Set a timeout
    const timeout = setTimeout(() => {
      if (!responded) {
        responded = true;
        child.kill();
        res.status(500).json({ 
          success: false, 
          error: 'Initialization timed out after 30 seconds', 
          output,
          message: 'Claude Code initialization timed out'
        });
      }
    }, 30000);
    
    child.stdout.on('data', (data) => {
      output += data.toString();
      console.log('Claude init stdout:', data.toString());
    });
    
    child.stderr.on('data', (data) => {
      error += data.toString();
      console.log('Claude init stderr:', data.toString());
    });
    
    child.on('close', (code) => {
      clearTimeout(timeout);
      if (!responded) {
        responded = true;
        console.log('Claude init exited with code:', code);
        if (code === 0) {
          res.json({ success: true, output, message: 'Claude Code initialized successfully' });
        } else {
          res.status(500).json({ 
            success: false, 
            error: error || 'Claude Code init failed', 
            output,
            code,
            message: `Claude Code init failed with exit code ${code}`
          });
        }
      }
    });
    
    child.on('error', (err) => {
      clearTimeout(timeout);
      if (!responded) {
        responded = true;
        console.error('Failed to spawn claude process:', err);
        res.status(500).json({ 
          success: false, 
          error: err.message,
          message: 'Failed to start Claude Code process. Make sure Claude Code is installed.'
        });
      }
    });
    
  } catch (error) {
    console.error('Init endpoint error:', error);
    res.status(500).json({ 
      error: 'Failed to initialize Claude Code', 
      details: error.message 
    });
  }
});

// Update CLAUDE.md with orchestrator content
app.post('/api/setup/update-claude-md', async (req, res) => {
  try {
    const claudeMdPath = path.join(REPO_ROOT, 'CLAUDE.md');
    // Template is in the main repo, not in dashboard folder
    const templatePath = path.join(REPO_ROOT, '../.templates', 'CLAUDE.md.template');
    
    console.log('Looking for template at:', templatePath);
    console.log('REPO_ROOT is:', REPO_ROOT);
    
    // Read template
    if (!await fs.pathExists(templatePath)) {
      // Try alternative path (if dashboard is inside the repo)
      const altTemplatePath = path.join(REPO_ROOT, '.templates', 'CLAUDE.md.template');
      console.log('Template not found, trying:', altTemplatePath);
      
      if (!await fs.pathExists(altTemplatePath)) {
        return res.status(400).json({ 
          error: 'CLAUDE.md.template not found',
          tried: [templatePath, altTemplatePath],
          repoRoot: REPO_ROOT
        });
      }
      // Use the alternative path
      const templateContent = await fs.readFile(altTemplatePath, 'utf8');
      
      // Continue with the alternative path
      await processTemplate(claudeMdPath, templateContent, res);
      return;
    }
    
    const templateContent = await fs.readFile(templatePath, 'utf8');
    await processTemplate(claudeMdPath, templateContent, res);
    
  } catch (error) {
    console.error('Failed to update CLAUDE.md:', error);
    res.status(500).json({ error: 'Failed to update CLAUDE.md', details: error.message });
  }
});

// Helper function to process template
async function processTemplate(claudeMdPath, templateContent, res) {
  try {
    // Read existing CLAUDE.md if it exists
    let existingContent = '';
    if (await fs.pathExists(claudeMdPath)) {
      existingContent = await fs.readFile(claudeMdPath, 'utf8');
      
      // Check if already has orchestrator content
      if (existingContent.includes('Claude Code Agents')) {
        return res.json({ success: true, message: 'CLAUDE.md already contains orchestrator content', skipped: true });
      }
    }
    
    // Prepend template to existing content
    const newContent = templateContent + '\n\n' + existingContent;
    await fs.writeFile(claudeMdPath, newContent);
    
    res.json({ success: true, message: 'CLAUDE.md updated successfully' });
  } catch (error) {
    throw error;
  }
}

// Launch Strategist agent with context
app.post('/api/setup/launch-strategist', async (req, res) => {
  try {
    const { prompt, context } = req.body;
    const { spawn } = require('child_process');
    
    // Generate enhanced prompt with context
    const fullPrompt = `
Create a comprehensive product strategy for the following project:

PROJECT: ${context.projectName}
DESCRIPTION: ${context.projectDescription}
TYPE: ${context.projectType}

TECHNICAL DETAILS:
- Primary Language: ${context.primaryLanguage}
- Tech Stack: ${context.techStack?.join(', ')}
- Deployment: ${context.deploymentTarget}

BUSINESS CONTEXT:
- Target Users: ${context.targetUsers}
- Key Features: ${context.mainFeatures?.join(', ')}
- Success Metrics: ${context.successMetrics}
- Timeline: ${context.timeline}

Please create:
1. A detailed product vision document
2. A phased roadmap with clear milestones
3. Initial epic definitions
4. Sprint 1 planning with prioritized tasks
`;
    
    const sessionId = `strategist-${Date.now()}`;
    
    // Store process reference for monitoring
    const child = spawn('claude', ['code', '-a', 'Strategist', fullPrompt], {
      cwd: REPO_ROOT,
      shell: true
    });
    
    // Store session for WebSocket streaming
    global.strategistSessions = global.strategistSessions || {};
    global.strategistSessions[sessionId] = {
      process: child,
      output: [],
      status: 'running',
      startTime: new Date().toISOString()
    };
    
    child.stdout.on('data', (data) => {
      const text = data.toString();
      global.strategistSessions[sessionId].output.push(text);
      
      // Broadcast via WebSocket
      broadcast({
        type: 'strategist_output',
        sessionId,
        data: text
      });
    });
    
    child.stderr.on('data', (data) => {
      const text = data.toString();
      global.strategistSessions[sessionId].output.push(`[ERROR] ${text}`);
      
      broadcast({
        type: 'strategist_error',
        sessionId,
        data: text
      });
    });
    
    child.on('close', (code) => {
      global.strategistSessions[sessionId].status = code === 0 ? 'completed' : 'failed';
      global.strategistSessions[sessionId].exitCode = code;
      global.strategistSessions[sessionId].endTime = new Date().toISOString();
      
      broadcast({
        type: 'strategist_complete',
        sessionId,
        exitCode: code
      });
    });
    
    res.json({ 
      sessionId, 
      pid: child.pid,
      message: 'Strategist agent launched successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to launch Strategist', details: error.message });
  }
});

// Get Strategist session status
app.get('/api/setup/strategist-status/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = global.strategistSessions?.[sessionId];
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json({
      sessionId,
      status: session.status,
      startTime: session.startTime,
      endTime: session.endTime,
      exitCode: session.exitCode,
      outputLength: session.output.length,
      lastOutput: session.output.slice(-10)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get session status', details: error.message });
  }
});

/**
 * Repository type and demo-mode status
 */
app.get('/api/repo-type', (req, res) => {
  res.json({ 
    type: REPO_TYPE,
    demoMode: DEMO_MODE,
    isTemplate: REPO_TYPE === 'template',
    needsSetup: REPO_TYPE === 'new_project',
    isReady: REPO_TYPE === 'existing_project'
  });
});

// Setup simulation for template repos
app.post('/api/setup/simulate', async (req, res) => {
  if (REPO_TYPE !== 'template') {
    return res.status(400).json({ error: 'Simulation only available in template repositories' });
  }
  
  const { projectDescription, techStack, productVision } = req.body;
  
  // Simulate setup steps and generate report
  const simulationReport = {
    timestamp: new Date().toISOString(),
    projectDescription,
    techStack,
    productVision,
    steps: [
      {
        step: 1,
        action: 'Initialize Claude Code',
        command: `claude init --description "${projectDescription}"`,
        description: 'Would initialize Claude Code with project description'
      },
      {
        step: 2,
        action: 'Download Agent Files',
        command: 'git clone --depth 1 https://github.com/felipematos/claude-code-agents.git temp && mkdir -p .claude/agents && cp -r temp/agents/* .claude/agents/ && rm -rf temp',
        description: 'Would clone felipematos/claude-code-agents and copy only the agents folder contents to ./.claude/agents at the repository root'
      },
      {
        step: 3,
        action: 'Download Dashboard System',
        command: 'cp -r temp/dashboard ./dashboard/',
        description: 'Would download complete dashboard system to ./dashboard/'
      },
      {
        step: 4,
        action: 'Copy Starter Script',
        command: 'cp temp/dashboard/start-dashboard.sh ./start-dashboard.sh && chmod +x ./start-dashboard.sh',
        description: 'Would copy and make executable the dashboard starter script'
      },
      {
        step: 5,
        action: 'Initialize Project Structure',
        command: "mkdir -p .plan && cp -r temp/.templates/.plan/* .plan/ && find .plan -name \"*.template\" -exec bash -c 'for f; do mv \"$f\" \"${f%.template}\"; done' _ {} +",
        description: 'Would create .plan directory, copy template files, and rename all "*.template" files to remove the .template extension (e.g., plan.md.template -> plan.md)'
      },
      {
        step: 6,
        action: 'Update CLAUDE.md',
        command: "sh -c 'TMPFILE=$(mktemp) && if [ -f temp/.templates/CLAUDE.md.template ]; then cat temp/.templates/CLAUDE.md.template; fi; if [ -f CLAUDE.md ]; then cat CLAUDE.md; fi > \"$TMPFILE\" && mv \"$TMPFILE\" CLAUDE.md'",
        description: 'Would prepend orchestration instructions from template into CLAUDE.md in a cross-platform safe way'
      },
      {
        step: 7,
        action: 'Launch Strategist',
        command: 'claude --agent Strategist "Create product vision and orchestration tasks, based on this vision: ' + String(productVision || '').replace(/["$`\\]/g, '\\$&') + '"',
        description: 'Would launch Claude Code with Strategist using the provided Product Vision to create the initial roadmap and orchestration tasks'
      }
    ],
    summary: `Setup simulation completed for project: "${projectDescription}". In a real repository, this would fully configure the Claude Code Agents system with ${techStack} technology stack and initialize the orchestration workflow.`
  };
  
  res.json(simulationReport);
});

// Execute real setup for new project repos
app.post('/api/setup/execute', async (req, res) => {
  if (REPO_TYPE !== 'new_project') {
    return res.status(400).json({ error: 'Real setup only available in new project repositories' });
  }
  
  const { projectDescription, techStack, productVision } = req.body;

  // Helper to run shell commands and capture output
  const run = (cmd, opts = {}) => new Promise((resolve) => {
    const child = require('child_process').spawn(cmd, { shell: true, stdio: ['ignore', 'pipe', 'pipe'], ...opts });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => { stdout += d.toString(); });
    child.stderr.on('data', d => { stderr += d.toString(); });
    child.on('close', code => resolve({ code, stdout, stderr }));
  });

  // Steps to execute in real environment mirroring simulation steps
  const steps = [
    {
      step: 1,
      action: 'Initialize Claude Code',
      command: `claude init --description "${String(projectDescription || '').replace(/["$`\\]/g, '\\$&')}"`,
      exec: async () => await run(`claude init --description "${String(projectDescription || '').replace(/["$`\\]/g, '\\$&')}"`)
    },
    {
      step: 2,
      action: 'Download Agent Files',
      command: 'git clone --depth 1 https://github.com/felipematos/claude-code-agents.git temp && mkdir -p .claude/agents && cp -r temp/agents/* .claude/agents/ && rm -rf temp',
      exec: async () => await run('git clone --depth 1 https://github.com/felipematos/claude-code-agents.git temp && mkdir -p .claude/agents && cp -r temp/agents/* .claude/agents/ && rm -rf temp')
    },
    {
      step: 3,
      action: 'Download Dashboard System',
      command: 'cp -r temp/dashboard ./dashboard/',
      exec: async () => {
        // Only copy if temp exists with dashboard (in case step 2 created temp)
        return await run('if [ -d temp/dashboard ]; then cp -r temp/dashboard ./dashboard/; fi');
      }
    },
    {
      step: 4,
      action: 'Copy Starter Script',
      command: 'cp temp/dashboard/start-dashboard.sh ./start-dashboard.sh && chmod +x ./start-dashboard.sh',
      exec: async () => await run('if [ -f temp/dashboard/start-dashboard.sh ]; then cp temp/dashboard/start-dashboard.sh ./start-dashboard.sh && chmod +x ./start-dashboard.sh; fi')
    },
      {
        step: 5,
        action: 'Initialize Project Structure',
        command: "mkdir -p .plan && cp -r temp/.templates/.plan/* .plan/ && find .plan -name \"*.template\" -exec bash -c 'for f; do mv \"$f\" \"${f%.template}\"; done' _ {} +",
        exec: async () => await run("mkdir -p .plan && if [ -d temp/.templates/.plan ]; then cp -r temp/.templates/.plan/* .plan/; fi && find .plan -name \"*.template\" -exec bash -c 'for f; do mv \"$f\" \"${f%.template}\"; done' _ {} +")
      },
      {
        step: 6,
        action: 'Update CLAUDE.md',
        command: "sh -c 'TMPFILE=$(mktemp) && if [ -f temp/.templates/CLAUDE.md.template ]; then cat temp/.templates/CLAUDE.md.template; fi; if [ -f CLAUDE.md ]; then cat CLAUDE.md; fi > \"$TMPFILE\" && mv \"$TMPFILE\" CLAUDE.md'",
        exec: async () => await run("sh -c 'TMPFILE=$(mktemp) && if [ -f temp/.templates/CLAUDE.md.template ]; then cat temp/.templates/CLAUDE.md.template; fi; if [ -f CLAUDE.md ]; then cat CLAUDE.md; fi > \"$TMPFILE\" && mv \"$TMPFILE\" CLAUDE.md'")
      },
    {
      step: 7,
      action: 'Launch Strategist',
      command: 'claude --agent Strategist "Create product vision and orchestration tasks, based on this vision: ' + String(productVision || '').replace(/["$`\\]/g, '\\$&') + '"',
      exec: async () => await run('claude --agent Strategist "Create product vision and orchestration tasks, based on this vision: ' + String(productVision || '').replace(/["$`\\]/g, '\\$&') + '"')
    }
  ];

  const results = [];
  try {
    for (const s of steps) {
      const r = await s.exec();
      results.push({
        step: s.step,
        action: s.action,
        command: s.command,
        exitCode: r.code,
        stdout: r.stdout?.slice(0, 4000), // avoid huge payloads
        stderr: r.stderr?.slice(0, 4000)
      });
      // Do not stop on non-zero exits; return a full report of successes/failures
    }

    res.json({
      status: 'completed',
      summary: 'Setup execution finished. See per-step results for details.',
      steps: results,
      projectDescription,
      techStack,
      productVision
    });
  } catch (error) {
    res.status(500).json({ error: 'Setup execution failed', details: error.message, steps: results });
  }
});

// Get setup status (augmented with demoMode)
app.get('/api/setup/status', (req, res) => {
  res.json({
    repoType: REPO_TYPE,
    demoMode: DEMO_MODE,
    canSimulate: REPO_TYPE === 'template',
    canExecute: REPO_TYPE === 'new_project',
    isReady: REPO_TYPE === 'existing_project'
  });
});

/**
 * Helper: If file missing in current PLAN_DIR and we're in demo mode,
 * try to read the corresponding file from the repository root .demo fallback.
 */
async function readWithDemoFallbackJson(filename) {
  const primary = await FileManager.readJsonFile(filename);
  if (primary && Array.isArray(primary)) return primary;

  // Fallback for demo mode: read from repo root .demo if present
  if (DEMO_MODE) {
    try {
      const demoPath = path.join(REPO_ROOT, '.demo', '.plan', filename);
      if (await fs.pathExists(demoPath)) {
        const content = await fs.readFile(demoPath, 'utf8');
        const parsed = JSON.parse(content);
        return parsed;
      }
    } catch (e) {
      console.warn(`Demo fallback read failed for ${filename}:`, e.message);
    }
  }
  return primary || [];
}

async function readWithDemoFallbackMarkdown(filename) {
  const primary = await FileManager.readMarkdownFile(filename);
  if (primary) return primary;

  if (DEMO_MODE) {
    try {
      const demoPath = path.join(REPO_ROOT, '.demo', filename);
      if (await fs.pathExists(demoPath)) {
        return await fs.readFile(demoPath, 'utf8');
      }
    } catch (e) {
      console.warn(`Demo fallback read failed for ${filename}:`, e.message);
    }
  }
  return primary || '';
}

// Get all tasks (supports new per-task structure with fallback)
app.get('/api/tasks', async (req, res) => {
  try {
    const tasksDir = path.join(PLAN_DIR, 'tasks');
    let tasks = [];
    let structure = 'unknown';
    
    if (await fs.pathExists(tasksDir)) {
      tasks = await FileManager.readAllTasks();
      structure = 'per-task';
    } else {
      // Try legacy structure
      const legacyTasks = await readWithDemoFallbackJson('tasks.json');
      if (legacyTasks && legacyTasks.tasks) {
        tasks = legacyTasks.tasks;
        structure = 'monolithic';
      } else if (Array.isArray(legacyTasks)) {
        tasks = legacyTasks;
        structure = 'monolithic';
      }
    }
    
    res.json({ 
      tasks, 
      structure,
      isLegacy: structure === 'monolithic'
    });
  } catch (error) {
    console.error('Failed to read tasks:', error);
    res.status(500).json({ error: 'Failed to read tasks' });
  }
});

// Create new task
app.post('/api/tasks', async (req, res) => {
  try {
    const task = req.body;
    task.id = task.id || task.task_id || `T-${Date.now()}`;
    task.task_id = task.id; // Ensure both fields
    task.createdAt = task.createdAt || new Date().toISOString();
    
    const tasksDir = path.join(PLAN_DIR, 'tasks');
    
    // Use new structure if available
    if (await fs.pathExists(tasksDir) || !await fs.pathExists(path.join(PLAN_DIR, 'tasks.json'))) {
      // Create tasks dir if needed
      await fs.ensureDir(tasksDir);
      await FileManager.writeTaskById(task.id, task);
      await FileManager.appendEvent({ 
        type: 'TASK_CREATED', 
        taskId: task.id,
        task 
      });
    } else {
      // Legacy mode
      const tasksData = await FileManager.readJsonFile('tasks.json') || { tasks: [] };
      if (!tasksData.tasks) tasksData.tasks = [];
      tasksData.tasks.push(task);
      await FileManager.writeJsonFile('tasks.json', tasksData);
    }
    
    broadcast({ type: 'task_created', data: task });
    res.json({ success: true, task });
  } catch (error) {
    console.error('Failed to create task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Delete task
app.delete('/api/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const tasksDir = path.join(PLAN_DIR, 'tasks');
    
    if (await fs.pathExists(tasksDir)) {
      // New structure
      const taskPath = path.join(tasksDir, `${taskId}.json`);
      if (await fs.pathExists(taskPath)) {
        await fs.unlink(taskPath);
      }
      
      // Update index
      const indexPath = path.join(tasksDir, 'index.json');
      if (await fs.pathExists(indexPath)) {
        const index = JSON.parse(await fs.readFile(indexPath, 'utf8'));
        index.tasks = (index.tasks || []).filter(t => t.task_id !== taskId && t.id !== taskId);
        await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
      }
      
      await FileManager.appendEvent({ 
        type: 'TASK_DELETED', 
        taskId 
      });
    } else {
      // Legacy mode
      const tasksData = await FileManager.readJsonFile('tasks.json') || { tasks: [] };
      tasksData.tasks = (tasksData.tasks || []).filter(t => t.task_id !== taskId && t.id !== taskId);
      await FileManager.writeJsonFile('tasks.json', tasksData);
    }
    
    broadcast({ type: 'task_deleted', data: { taskId } });
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Update task (writes to per-task structure when present; legacy fallback otherwise)
app.put('/api/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const updatedTask = req.body;
    updatedTask.id = updatedTask.id || taskId;
    updatedTask.task_id = updatedTask.task_id || taskId;
    updatedTask.updatedAt = new Date().toISOString();

    const tasksDir = path.join(PLAN_DIR, 'tasks');
    if (await fs.pathExists(tasksDir)) {
      await FileManager.writeTaskById(taskId, updatedTask);
      await FileManager.appendEvent({ 
        type: 'TASK_UPDATED', 
        taskId, 
        changes: updatedTask 
      });
      broadcast({ type: 'task_updated', data: updatedTask });
      return res.json(updatedTask);
    }

    // Legacy mode: update tasks.json
    const tasksData = await FileManager.readJsonFile('tasks.json') || { tasks: [] };
    if (!tasksData.tasks) tasksData.tasks = [];
    
    const taskIndex = tasksData.tasks.findIndex(task => 
      task.task_id === taskId || task.id === taskId
    );

    if (taskIndex === -1) {
      tasksData.tasks.push(updatedTask);
    } else {
      tasksData.tasks[taskIndex] = { ...tasksData.tasks[taskIndex], ...updatedTask };
    }

    const ok = await FileManager.writeJsonFile('tasks.json', tasksData);
    if (!ok) return res.status(500).json({ error: 'Failed to update task' });

    const result = taskIndex === -1 ? updatedTask : tasksData.tasks[taskIndex];
    broadcast({ type: 'task_updated', data: result });
    res.json(result);
  } catch (error) {
    console.error('Failed to update task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Migrate tasks from legacy to new structure
app.post('/api/tasks/migrate', async (req, res) => {
  try {
    const legacyPath = path.join(PLAN_DIR, 'tasks.json');
    const tasksDir = path.join(PLAN_DIR, 'tasks');
    
    if (!await fs.pathExists(legacyPath)) {
      return res.status(400).json({ error: 'No legacy tasks.json found' });
    }
    
    // Read legacy
    const legacy = JSON.parse(await fs.readFile(legacyPath, 'utf8'));
    const tasks = legacy.tasks || [];
    
    // Create new structure
    await fs.ensureDir(tasksDir);
    
    // Create index
    const index = {
      tasks: [],
      migrated: true,
      migratedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
    
    // Write individual task files
    for (const task of tasks) {
      const taskId = task.id || task.task_id || `T-${Date.now()}`;
      task.id = taskId;
      task.task_id = taskId;
      
      const taskPath = path.join(tasksDir, `${taskId}.json`);
      await fs.writeFile(taskPath, JSON.stringify(task, null, 2));
      
      // Add to index
      index.tasks.push({
        task_id: taskId,
        id: taskId,
        title: task.title || task.name || '',
        status: task.status || 'pending',
        assignee: task.assignee || task.agent || '',
        priority: task.priority,
        createdAt: task.createdAt
      });
    }
    
    // Write index
    await fs.writeFile(path.join(tasksDir, 'index.json'), JSON.stringify(index, null, 2));
    
    // Create events.log
    await FileManager.appendEvent({
      type: 'MIGRATION_COMPLETED',
      tasksCount: tasks.length,
      from: 'legacy',
      to: 'per-task'
    });
    
    // Optionally backup legacy file
    await fs.copy(legacyPath, `${legacyPath}.backup`);
    
    res.json({ 
      success: true, 
      migratedCount: tasks.length,
      message: 'Tasks migrated successfully to new structure'
    });
  } catch (error) {
    console.error('Migration failed:', error);
    res.status(500).json({ error: 'Failed to migrate tasks', details: error.message });
  }
});

// ... rest of the code remains the same ...
// Get human requests
app.get('/api/human-requests', async (req, res) => {
  try {
    const content = await readWithDemoFallbackMarkdown('human-requests.md');
    res.json({ content: content || '' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to read human requests' });
  }
});

// Update human requests
app.put('/api/human-requests', async (req, res) => {
  try {
    const { content } = req.body;
    
    if (await FileManager.writeMarkdownFile('human-requests.md', content)) {
      broadcast({ type: 'human_requests_updated', data: { content } });
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to update human requests' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update human requests' });
  }
});

// Get roadmap
app.get('/api/roadmap', async (req, res) => {
  try {
    const content = await readWithDemoFallbackMarkdown('roadmap.md');
    res.json({ content: content || '' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to read roadmap' });
  }
});

// Get user stories
app.get('/api/user-stories', async (req, res) => {
  try {
    const content = await readWithDemoFallbackMarkdown('user_stories.md');
    if (!content) {
      return res.json({ stories: [] });
    }
    
    // Parse markdown content to extract story IDs and titles
    const stories = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Look for story headers like "### US-001 – User Authentication"
      const match = line.match(/^###\s+([A-Z]+-\d+)\s+–\s+(.+)$/);
      if (match) {
        const [, id, title] = match;
        stories.push({ id, title });
      }
    }
    
    res.json({ stories });
  } catch (error) {
    console.error('Error reading user stories:', error);
    res.status(500).json({ error: 'Failed to read user stories' });
  }
});

// Initialize dashboard data
app.post('/api/initialize', async (req, res) => {
  try {
    await FileManager.initializeFromTemplates();
    res.json({ success: true, message: 'Dashboard initialized successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to initialize dashboard' });
  }
});

// Orchestration API Routes

// Get all Claude Code instances
app.get('/api/orchestration/instances', (req, res) => {
  try {
    const instances = orchestrationManager.getAllInstances();
    res.json(instances);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get instances' });
  }
});

// Create new Claude Code instance
app.post('/api/orchestration/instances', (req, res) => {
  try {
    const config = req.body;
    const instance = orchestrationManager.createInstance(config);
    res.json(instance);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create instance' });
  }
});

// Get specific instance details
app.get('/api/orchestration/instances/:instanceId', (req, res) => {
  try {
    const { instanceId } = req.params;
    const instance = orchestrationManager.getInstanceData(instanceId);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }
    
    res.json(instance);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get instance' });
  }
});

// Stop Claude Code instance
app.post('/api/orchestration/instances/:instanceId/stop', (req, res) => {
  try {
    const { instanceId } = req.params;
    const success = orchestrationManager.stopInstance(instanceId);
    
    if (!success) {
      return res.status(404).json({ error: 'Instance not found or failed to stop' });
    }
    
    res.json({ success: true, message: 'Instance stopped successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to stop instance' });
  }
});

// Start Claude Code instance
app.post('/api/orchestration/instances/:instanceId/start', (req, res) => {
  try {
    const { instanceId } = req.params;
    const success = orchestrationManager.startInstance(instanceId);
    
    if (!success) {
      return res.status(404).json({ error: 'Instance not found or failed to start' });
    }
    
    res.json({ success: true, message: 'Instance started successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start instance' });
  }
});

// Remove Claude Code instance
app.delete('/api/orchestration/instances/:instanceId', (req, res) => {
  try {
    const { instanceId } = req.params;
    const success = orchestrationManager.removeInstance(instanceId);
    
    if (!success) {
      return res.status(404).json({ error: 'Instance not found' });
    }
    
    res.json({ success: true, message: 'Instance removed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove instance' });
  }
});

// Get instance logs
app.get('/api/orchestration/instances/:instanceId/logs', (req, res) => {
  try {
    const { instanceId } = req.params;
    const instance = orchestrationManager.getInstanceData(instanceId);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }
    
    res.json({ logs: instance.logs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get instance logs' });
  }
});

// Start orchestration cycle (creates a new instance)
app.post('/api/orchestration/start', (req, res) => {
  try {
    const config = req.body.config || {};
    const instance = orchestrationManager.createInstance({
      ...config,
      type: 'orchestration_cycle'
    });
    
    // Add orchestration-specific log
    orchestrationManager.addLog(instance.id, 'info', 'Orchestration cycle started');
    
    res.json({ 
      success: true, 
      message: 'Orchestration cycle started', 
      instanceId: instance.id,
      instance 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start orchestration cycle' });
  }
});

// Self-Improvement API Routes

app.get('/api/learnings', async (req, res) => {
  try {
    const learnings = await readWithDemoFallbackJson('learnings.json');
    res.json(learnings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read learnings' });
  }
});

app.post('/api/learnings/approve', async (req, res) => {
  try {
    const { id } = req.body;
    const learningsPath = path.join(REPO_ROOT, 'learnings.json');
    const approvedLearningsPath = path.join(REPO_ROOT, 'approved_learnings.json');

    let learnings = [];
    if (await fs.pathExists(learningsPath)) {
      learnings = JSON.parse(await fs.readFile(learningsPath, 'utf8'));
    }

    const learningIndex = learnings.findIndex(l => l.id === id);
    if (learningIndex === -1) {
      return res.status(404).json({ error: 'Learning not found' });
    }

    const [approvedLearning] = learnings.splice(learningIndex, 1);

    let approvedLearnings = [];
    if (await fs.pathExists(approvedLearningsPath)) {
      approvedLearnings = JSON.parse(await fs.readFile(approvedLearningsPath, 'utf8'));
    }

    approvedLearnings.push(approvedLearning);

    await fs.writeFile(learningsPath, JSON.stringify(learnings, null, 2));
    await fs.writeFile(approvedLearningsPath, JSON.stringify(approvedLearnings, null, 2));

    console.log(`Agent Improver dispatched for ${id}`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve learning' });
  }
});

app.get('/api/agents/changelog', async (req, res) => {
  try {
    // In demo mode, use mocked changelog data
    if (DEMO_MODE) {
      const demoChangelogPath = path.join(REPO_ROOT, '.demo', 'agent_changelog.json');
      if (await fs.pathExists(demoChangelogPath)) {
        const demoChangelog = JSON.parse(await fs.readFile(demoChangelogPath, 'utf8'));
        return res.json(demoChangelog);
      }
    }

    // Real mode: use git log
    const agentsDir = path.join(REPO_ROOT, 'agents');
    fs.readdir(agentsDir, (err, files) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to read agents directory' });
      }

      const changelog = {};
      const gitLogPromises = files.filter(file => file.endsWith('.md')).map(file => {
        const agentName = file.replace('.md', '');
        const command = `git log --pretty=format:'{%n  "commit": "%H",%n  "author": "%an",%n  "date": "%ad",%n  "message": "%f"%n},' -- ${path.join(agentsDir, file)}`;

        return new Promise((resolve, reject) => {
          exec(command, (err, stdout) => {
            if (err) {
              return reject(err);
            }
            const logData = `[${stdout.slice(0, -1)}]`;
            changelog[agentName] = JSON.parse(logData);
            resolve();
          });
        });
      });

      Promise.all(gitLogPromises)
        .then(() => res.json(changelog))
        .catch(() => res.status(500).json({ error: 'Failed to get git log' }));
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get agent changelog' });
  }
});

app.get('/api/agents/:agentName/diff/:commitHash', (req, res) => {
  const { agentName, commitHash } = req.params;
  const agentFile = `${agentName}.md`;
  const command = `git show ${commitHash} -- ${path.join(REPO_ROOT, 'agents', agentFile)}`;

  exec(command, (err, stdout) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to get diff' });
    }
    res.send(stdout);
  });
});

app.post('/api/agents/:agentName/revert/:commitHash', (req, res) => {
  const { agentName, commitHash } = req.params;
  const agentFile = `${agentName}.md`;
  const command = `git checkout ${commitHash} -- ${path.join(REPO_ROOT, 'agents', agentFile)}`;

  exec(command, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to revert agent' });
    }
    res.json({ success: true });
  });
});

// File watcher for real-time updates
function setupFileWatcher() {
  // Watch the active directory in both modes (.demo or .plan)
  const watcher = chokidar.watch([PLAN_DIR, TESTS_DIR], {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true
  });

  watcher.on('change', async (filePath) => {
    const filename = path.basename(filePath);
    console.log(`File changed: ${filename}`);
    
    try {
      if (filename === 'tasks.json') {
        const tasks = await FileManager.readJsonFile('tasks.json');
        broadcast({ type: 'tasks_updated', data: tasks });
      } else if (filePath.startsWith(path.join(PLAN_DIR, 'tasks') + path.sep)) {
        // Any change within the tasks directory (new structure)
        const tasks = await FileManager.readAllTasks();
        broadcast({ type: 'tasks_updated', data: tasks });
      } else if (filename === 'human-requests.md') {
        const content = await FileManager.readMarkdownFile('human-requests.md');
        broadcast({ type: 'human_requests_updated', data: { content } });
      } else if (filename === 'roadmap.md') {
        const content = await FileManager.readMarkdownFile('roadmap.md');
        broadcast({ type: 'roadmap_updated', data: { content } });
      } else if (filePath.startsWith(TESTS_DIR)) {
        // Basic broadcast for test file changes so client can react if needed
        broadcast({ type: 'tests_updated', data: { filename, path: filePath.replace(REPO_ROOT + path.sep, '') } });
      }
    } catch (error) {
      console.error('Error processing file change:', error);
    }
  });

  console.log(`Watching for file changes in: ${PLAN_DIR}`);
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function startServer() {
  try {
    await FileManager.initializeFromTemplates();
    setupFileWatcher();
    
    app.listen(PORT, () => {
      console.log(`🚀 Dashboard API server running on http://localhost:${PORT}`);
      console.log(`🔌 WebSocket server running on ws://localhost:${WS_PORT}`);
      console.log(`📁 Watching files in: ${PLAN_DIR}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  wss.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  wss.close();
  process.exit(0);
});
