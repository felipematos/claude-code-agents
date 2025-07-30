class WebSocketService {
  constructor() {
    this.ws = null;
    this.url = process.env.REACT_APP_WS_URL || 'ws://localhost:3003';
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 3000;
    this.messageHandlers = new Set();
    this.statusHandlers = new Set();
    this.status = 'disconnected';
    this.isConnecting = false;
    this.reconnectTimeout = null;
  }

  connect() {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.CONNECTING)) {
      console.log('WebSocket connection already in progress');
      return;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    try {
      this.isConnecting = true;
      console.log(`Connecting to WebSocket: ${this.url}`);
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }
        this.setStatus('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);
          this.notifyMessageHandlers(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        this.isConnecting = false;
        this.setStatus('disconnected');
        
        // Only reconnect if it wasn't a manual disconnect
        if (event.code !== 1000) {
          this.handleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
        this.setStatus('error');
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.isConnecting = false;
      this.setStatus('error');
      this.handleReconnect();
    }
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
    
    this.isConnecting = false;
    this.setStatus('disconnected');
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(data));
        return true;
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        return false;
      }
    } else {
      console.warn('WebSocket is not connected. Cannot send message.');
      return false;
    }
  }

  handleReconnect() {
    if (this.reconnectTimeout) {
      return; // Already scheduled
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      this.setStatus('reconnecting');
      
      this.reconnectTimeout = setTimeout(() => {
        this.reconnectTimeout = null;
        this.connect();
      }, this.reconnectInterval * this.reconnectAttempts); // Exponential backoff
    } else {
      console.error('Max reconnection attempts reached');
      this.setStatus('failed');
    }
  }

  setStatus(status) {
    if (this.status !== status) {
      this.status = status;
      this.notifyStatusHandlers(status);
    }
  }

  getStatus() {
    return this.status;
  }

  onMessage(handler) {
    this.messageHandlers.add(handler);
    
    // Return unsubscribe function
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  onStatusChange(handler) {
    this.statusHandlers.add(handler);
    
    // Return unsubscribe function
    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  notifyMessageHandlers(data) {
    this.messageHandlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error('Error in message handler:', error);
      }
    });
  }

  notifyStatusHandlers(status) {
    this.statusHandlers.forEach(handler => {
      try {
        handler(status);
      } catch (error) {
        console.error('Error in status handler:', error);
      }
    });
  }

  // Utility methods for specific message types
  onTaskUpdate(handler) {
    return this.onMessage((data) => {
      if (data.type === 'task_updated' || data.type === 'tasks_updated') {
        handler(data.data);
      }
    });
  }

  onHumanRequestsUpdate(handler) {
    return this.onMessage((data) => {
      if (data.type === 'human_requests_updated') {
        handler(data.data);
      }
    });
  }

  onRoadmapUpdate(handler) {
    return this.onMessage((data) => {
      if (data.type === 'roadmap_updated') {
        handler(data.data);
      }
    });
  }

  // Instance management methods
  onInstanceUpdate(handler) {
    return this.onMessage((data) => {
      if (data.type === 'instance_updated') {
        handler(data.data);
      }
    });
  }

  onInstanceLog(handler) {
    return this.onMessage((data) => {
      if (data.type === 'instance_log') {
        handler(data.data);
      }
    });
  }

  onInstanceRemoved(handler) {
    return this.onMessage((data) => {
      if (data.type === 'instance_removed') {
        handler(data.data);
      }
    });
  }

  onInstanceMetrics(handler) {
    return this.onMessage((data) => {
      if (data.type === 'instance_metrics') {
        handler(data.data);
      }
    });
  }

  // Health check
  ping() {
    return this.send({ type: 'ping', timestamp: Date.now() });
  }

  // Connection state helpers
  isConnected() {
    return this.status === 'connected';
  }

  isConnecting() {
    return this.status === 'reconnecting';
  }

  isDisconnected() {
    return this.status === 'disconnected' || this.status === 'failed';
  }

  hasError() {
    return this.status === 'error' || this.status === 'failed';
  }
}

// Create and export a singleton instance
const webSocketService = new WebSocketService();
export { webSocketService as WebSocketService };
export default webSocketService;