const API_BASE_URL = 'http://localhost:3002/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }
  async get(endpoint) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${endpoint}`);
    }
    return response.json();
  }

  async post(endpoint, data) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Failed to post to ${endpoint}`);
    }
    return response.json();
  }

  async put(endpoint, data) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Failed to put to ${endpoint}`);
    }
    return response.json();
  }

  async getRepositoryType() {
    try {
      const response = await this.get('/repo-type');
      return response.type;
    } catch (error) {
      console.error('Failed to get repository type:', error);
      return 'unknown';
    }
  }

  async getSetupStatus() {
    return this.get('/setup/status');
  }

  async simulateSetup(setupData) {
    return this.post('/setup/simulate', setupData);
  }

  async executeSetup(setupData) {
    return this.post('/setup/execute', setupData);
  }

  async healthCheck() {
    return this.get('/health');
  }

  async getTasks() {
    return this.get('/tasks');
  }

  async updateTask(taskId, taskData) {
    return this.put(`/tasks/${taskId}`, taskData);
  }

  async createTask(taskData) {
    return this.post('/tasks', taskData);
  }

  async getHumanRequests() {
    const response = await fetch(`${API_BASE_URL}/human-requests`);
    if (!response.ok) {
      throw new Error('Failed to fetch human requests');
    }
    return response.text();
  }

  async updateHumanRequests(content) {
    const response = await fetch(`${API_BASE_URL}/human-requests`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: content,
    });
    if (!response.ok) {
      throw new Error('Failed to update human requests');
    }
    return response.text();
  }

  parseHumanRequests(content) {
    const sections = {
      pending: [],
      in_progress: [],
      completed: []
    };

    const lines = content.split('\n');
    let currentSection = null;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check for section headers
      if (trimmedLine.includes('## Pending Requests')) {
        currentSection = 'pending';
        continue;
      } else if (trimmedLine.includes('## In Progress')) {
        currentSection = 'in_progress';
        continue;
      } else if (trimmedLine.includes('## Completed')) {
        currentSection = 'completed';
        continue;
      }

      // Parse request items
      if (currentSection && trimmedLine.startsWith('- ')) {
        const requestText = trimmedLine.substring(2);
        const id = `${currentSection}_${sections[currentSection].length + 1}`;
        
        sections[currentSection].push({
          id,
          text: requestText,
          status: currentSection,
          timestamp: new Date().toISOString()
        });
      }
    }

    return sections;
  }

  async getRoadmap() {
    return this.get('/roadmap');
  }

  async updateRoadmap(content) {
    return this.put('/roadmap', { content });
  }

  async getUserStories() {
    return this.get('/user-stories');
  }

  async initializeDashboard() {
    return this.post('/initialize');
  }

  // Utility methods
  async checkConnection() {
    try {
      await this.healthCheck();
      return true;
    } catch (error) {
      return false;
    }
  }

  // Task status helpers
  getTasksByStatus(tasks, status) {
    return tasks.filter(task => task.status === status);
  }

  getTasksByAgent(tasks, agent) {
    return tasks.filter(task => task.agent === agent);
  }

  getTasksByPriority(tasks, priority) {
    return tasks.filter(task => task.priority === priority);
  }

  // Task statistics
  getTaskStats(tasks) {
    const stats = {
      total: tasks.length,
      pending: 0,
      in_progress: 0,
      done: 0,
      blocked: 0,
      by_agent: {},
      by_priority: {
        urgent: 0,
        high: 0,
        medium: 0,
        low: 0
      }
    };

    tasks.forEach(task => {
      // Count by status
      if (stats.hasOwnProperty(task.status)) {
        stats[task.status]++;
      }

      // Count by agent
      if (!stats.by_agent[task.agent]) {
        stats.by_agent[task.agent] = 0;
      }
      stats.by_agent[task.agent]++;

      // Count by priority
      if (stats.by_priority.hasOwnProperty(task.priority)) {
        stats.by_priority[task.priority]++;
      }
    });

    return stats;
  }

  // Self-Improvement API
  async getLearnings() {
    return this.get('/learnings');
  }

  async approveLearning(learningId) {
    return this.post('/learnings/approve', { id: learningId });
  }

  async getAgentChangelog() {
    return this.get('/agents/changelog');
  }

  async getAgentDiff(agentName, commitHash) {
    return this.get(`/agents/${agentName}/diff/${commitHash}`);
  }

  async revertAgent(agentName, commitHash) {
    return this.post(`/agents/${agentName}/revert/${commitHash}`);
  }
}

const api = new ApiService();
export { api };
export default ApiService;
