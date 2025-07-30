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

const app = express();
const PORT = process.env.PORT || 3002;
const WS_PORT = process.env.WS_PORT || 3003;

// Security and performance middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Determine if running in test mode (template repository)
const IS_TEST_MODE = process.env.NODE_ENV === 'test' || !fs.existsSync(path.join(__dirname, '../../.plan'));

// Path to the .plan directory
const PLAN_DIR = IS_TEST_MODE ? path.join(__dirname, '../../.templates/.plan') : path.join(__dirname, '../../.plan');
const TEMPLATES_DIR = path.join(__dirname, '../../.templates/.plan');

console.log(`🔧 Running in ${IS_TEST_MODE ? 'TEST' : 'PRODUCTION'} mode`);
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
    // In test mode, try to read template files with .template extension
    const actualFilename = IS_TEST_MODE && !filename.endsWith('.template') ? `${filename}.template` : filename;
    const filePath = path.join(PLAN_DIR, actualFilename);
    
    try {
      if (await fs.pathExists(filePath)) {
        const content = await fs.readFile(filePath, 'utf8');
        return JSON.parse(content);
      }
      return null;
    } catch (error) {
      console.error(`Error reading ${actualFilename}:`, error);
      return null;
    }
  }

  static async writeJsonFile(filename, data) {
    if (IS_TEST_MODE) {
      console.log(`⚠️  Test mode: Write operation to ${filename} simulated (read-only)`);
      return true; // Simulate successful write in test mode
    }
    
    const filePath = path.join(PLAN_DIR, filename);
    try {
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error(`Error writing ${filename}:`, error);
      return false;
    }
  }

  static async readMarkdownFile(filename) {
    // In test mode, try to read template files with .template extension
    const actualFilename = IS_TEST_MODE && !filename.endsWith('.template') ? `${filename}.template` : filename;
    const filePath = path.join(PLAN_DIR, actualFilename);
    
    try {
      if (await fs.pathExists(filePath)) {
        return await fs.readFile(filePath, 'utf8');
      }
      return null;
    } catch (error) {
      console.error(`Error reading ${actualFilename}:`, error);
      return null;
    }
  }

  static async writeMarkdownFile(filename, content) {
    if (IS_TEST_MODE) {
      console.log(`⚠️  Test mode: Write operation to ${filename} simulated (read-only)`);
      return true; // Simulate successful write in test mode
    }
    
    const filePath = path.join(PLAN_DIR, filename);
    try {
      await fs.writeFile(filePath, content);
      return true;
    } catch (error) {
      console.error(`Error writing ${filename}:`, error);
      return false;
    }
  }

  static async initializeFromTemplates() {
    if (IS_TEST_MODE) {
      console.log('🧪 Test mode: Using template files directly, no initialization needed');
      return;
    }
    
    await this.ensurePlanDir();
    
    const templateFiles = [
      'tasks.json.template',
      'human-requests.md.template',
      'roadmap.md.template'
    ];

    for (const templateFile of templateFiles) {
      const targetFile = templateFile.replace('.template', '');
      const targetPath = path.join(PLAN_DIR, targetFile);
      
      if (!(await fs.pathExists(targetPath))) {
        const templatePath = path.join(TEMPLATES_DIR, templateFile);
        if (await fs.pathExists(templatePath)) {
          await fs.copy(templatePath, targetPath);
          console.log(`Initialized ${targetFile} from template`);
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

// Get all tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await FileManager.readJsonFile('tasks.json') || [];
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
    const content = await FileManager.readMarkdownFile('human-requests.md');
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
    const content = await FileManager.readMarkdownFile('roadmap.md');
    res.json({ content: content || '' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to read roadmap' });
  }
});

// Get user stories
app.get('/api/user-stories', async (req, res) => {
  try {
    const content = await FileManager.readMarkdownFile('user_stories.md');
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

// File watcher for real-time updates
function setupFileWatcher() {
  if (IS_TEST_MODE) {
    console.log('🧪 Test mode: File watching disabled (read-only template files)');
    return;
  }
  
  const watcher = chokidar.watch(PLAN_DIR, {
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