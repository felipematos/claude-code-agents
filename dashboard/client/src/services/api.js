import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002';

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: `${API_BASE_URL}/api`,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        console.log(`API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('API Response Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  // Health check
  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      throw new Error('Health check failed');
    }
  }

  // Tasks API
  async getTasks() {
    try {
      const response = await this.client.get('/tasks');
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch tasks');
    }
  }

  async updateTask(taskId, taskData) {
    try {
      const response = await this.client.put(`/tasks/${taskId}`, taskData);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to update task ${taskId}`);
    }
  }

  async createTask(taskData) {
    try {
      const response = await this.client.post('/tasks', taskData);
      return response.data;
    } catch (error) {
      throw new Error('Failed to create task');
    }
  }

  // Human Requests API
  async getHumanRequests() {
    try {
      const response = await this.client.get('/human-requests');
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch human requests');
    }
  }

  async updateHumanRequests(content) {
    try {
      const response = await this.client.put('/human-requests', { content });
      return response.data;
    } catch (error) {
      throw new Error('Failed to update human requests');
    }
  }

  // Roadmap API
  async getRoadmap() {
    try {
      const response = await this.client.get('/roadmap');
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch roadmap');
    }
  }

  async updateRoadmap(content) {
    try {
      const response = await this.client.put('/roadmap', { content });
      return response.data;
    } catch (error) {
      throw new Error('Failed to update roadmap');
    }
  }

  // User Stories API
  async getUserStories() {
    try {
      const response = await this.client.get('/user-stories');
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch user stories');
    }
  }

  // Dashboard initialization
  async initializeDashboard() {
    try {
      const response = await this.client.post('/initialize');
      return response.data;
    } catch (error) {
      throw new Error('Failed to initialize dashboard');
    }
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

  // Human requests parsing helpers
  parseHumanRequests(content) {
    const sections = {
      pending: [],
      in_progress: [],
      resolved: []
    };

    // Handle non-string content
    if (!content || typeof content !== 'string') {
      console.warn('parseHumanRequests received non-string content:', content);
      return sections;
    }

    // Simple parsing - in a real implementation, you'd use a proper markdown parser
    const lines = content.split('\n');
    let currentSection = null;
    let currentRequest = null;

    lines.forEach(line => {
      if (line.includes('🔄 Pending Requests')) {
        currentSection = 'pending';
      } else if (line.includes('🚀 In Progress')) {
        currentSection = 'in_progress';
      } else if (line.includes('✅ Resolved')) {
        currentSection = 'resolved';
      } else if (line.startsWith('### ') && currentSection) {
        if (currentRequest) {
          sections[currentSection].push(currentRequest);
        }
        currentRequest = {
          id: line.replace('### ', '').split(':')[0],
          title: line.replace('### ', ''),
          details: []
        };
      } else if (currentRequest && line.trim()) {
        currentRequest.details.push(line);
      }
    });

    // Add the last request
    if (currentRequest && currentSection) {
      sections[currentSection].push(currentRequest);
    }

    return sections;
  }
}

// Create and export a singleton instance
const apiService = new ApiService();
export { apiService as ApiService };
export default apiService;