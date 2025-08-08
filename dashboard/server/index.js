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
 * - If .plan exists and has tasks.json -> existing_project (NOT demo)
 * - If .plan exists but no tasks.json -> new_project (NOT demo, but needs setup)
 * - If .plan missing -> template (DEMO MODE)
 */
function detectRepositoryType() {
  const repoRoot = path.join(__dirname, '../../');
  const planDir = path.join(repoRoot, '.plan');
  const planTasksFile = path.join(planDir, 'tasks.json');

  const hasPlanDir = fs.existsSync(planDir);
  const hasPlanTasks = fs.existsSync(planTasksFile);

  // DEMO MODE: No .plan folder at repo root
  if (!hasPlanDir) {
    return 'template';
  }

  // .plan exists without tasks.json -> treat as new project needing setup
  if (hasPlanDir && !hasPlanTasks) {
    return 'new_project';
  }

  // .plan exists with tasks.json -> existing project
  return 'existing_project';
}

const REPO_TYPE = detectRepositoryType();
// DEMO MODE: when no './.plan' at repo root (REPO_TYPE === 'template')
const DEMO_MODE = REPO_TYPE === 'template';

// Base directories
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

// Get all tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await readWithDemoFallbackJson('tasks.json');
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read tasks' });
  }
});

// Update task
app.put('/api/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const updatedTask = req.body;
    
    const tasks = await FileManager.readJsonFile('tasks.json') || [];
    const taskIndex = tasks.findIndex(task => task.task_id === taskId);
    
    if (taskIndex === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    tasks[taskIndex] = { ...tasks[taskIndex], ...updatedTask };
    
    if (await FileManager.writeJsonFile('tasks.json', tasks)) {
      broadcast({ type: 'task_updated', data: tasks[taskIndex] });
      res.json(tasks[taskIndex]);
    } else {
      res.status(500).json({ error: 'Failed to update task' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

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
