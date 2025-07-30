import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  LinearProgress,
  Alert,
  IconButton,
  Tooltip,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Button,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Fab,
  Drawer,
  Snackbar,
  CircularProgress
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Task as TaskIcon,
  Person as PersonIcon,
  Map as RoadmapIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Error as ErrorIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  Add as AddIcon,
  Notifications as NotificationsIcon,
  SmartToy as RobotIcon,
  Settings as SettingsIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { ApiService } from '../services/api';
import WebSocketService from '../services/websocket';
import NotificationPanel from './NotificationPanel';

const Dashboard = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [humanRequests, setHumanRequests] = useState({ pending: [], in_progress: [], resolved: [] });
  const [roadmap, setRoadmap] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wsStatus, setWsStatus] = useState('disconnected');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [orchestrationRunning, setOrchestrationRunning] = useState(false);

  const [showNewRequestDialog, setShowNewRequestDialog] = useState(false);
  const [newRequestData, setNewRequestData] = useState({ description: '', type: 'bug_report', priority: 'medium' });

  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showInstancePanel, setShowInstancePanel] = useState(false);
  const [instances, setInstances] = useState([]);
  const [selectedInstance, setSelectedInstance] = useState(null);
  const [instanceLogs, setInstanceLogs] = useState([]);

  useEffect(() => {
    loadDashboardData();
    setupWebSocket();

    return () => {
      WebSocketService.disconnect();
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [tasksData, humanRequestsData, roadmapData] = await Promise.all([
        ApiService.getTasks(),
        ApiService.getHumanRequests(),
        ApiService.getRoadmap()
      ]);

      setTasks(tasksData);
      setHumanRequests(ApiService.parseHumanRequests(humanRequestsData));
      setRoadmap(roadmapData);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err.message);
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const addNotification = (type, message, showBrowser = true) => {
    const notification = {
      id: Date.now() + Math.random(),
      type,
      message,
      timestamp: new Date().toISOString()
    };
    
    setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep last 50 notifications
    setNotificationCount(prev => prev + 1);
    
    // Show browser notification if enabled and supported
    const settings = JSON.parse(localStorage.getItem('dashboard-settings') || '{}');
    const notificationsEnabled = settings.notifications !== false;
    
    if (notificationsEnabled && showBrowser && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('Dashboard Notification', {
        body: message,
        icon: '/favicon.ico',
        tag: notification.id
      });
    }
  };

  const setupWebSocket = () => {
    // Listen for connection status changes
    WebSocketService.onStatusChange((status) => {
      setWsStatus(status);
    });

    // Listen for task updates
    WebSocketService.onTaskUpdate((updatedTasks) => {
      setTasks(updatedTasks);
      setLastUpdate(new Date());
      
      const settings = JSON.parse(localStorage.getItem('dashboard-settings') || '{}');
      const notificationsEnabled = settings.notifications !== false;
      
      if (notificationsEnabled) {
        // Check for completed or blocked tasks
        updatedTasks.forEach(task => {
          if (task.status === 'done') {
            const message = `Task "${task.payload?.title || task.id}" completed!`;
            toast.success(message);
            addNotification('task', message);
          } else if (task.status === 'blocked') {
            const message = `Task "${task.payload?.title || task.id}" is blocked`;
            toast.error(message);
            addNotification('task', message);
          }
        });
      }
    });

    // Listen for human requests updates
    WebSocketService.onHumanRequestsUpdate((updatedContent) => {
      setHumanRequests(ApiService.parseHumanRequests(updatedContent));
      setLastUpdate(new Date());
      
      const settings = JSON.parse(localStorage.getItem('dashboard-settings') || '{}');
      const notificationsEnabled = settings.notifications !== false;
      
      if (notificationsEnabled) {
        const message = 'Human requests updated';
        toast.info(message);
        addNotification('human_request', message);
      }
    });

    // Instance management WebSocket events
    WebSocketService.onInstanceUpdate((instance) => {
      setInstances(prev => {
        const index = prev.findIndex(i => i.id === instance.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = instance;
          return updated;
        } else {
          return [...prev, instance];
        }
      });
      addNotification('info', `Instance ${instance.id} status: ${instance.status}`);
    });

    WebSocketService.onInstanceLog((data) => {
      if (selectedInstance?.id === data.instanceId) {
        setInstanceLogs(prev => [...prev, data.log]);
      }
    });

    WebSocketService.onInstanceRemoved((data) => {
      setInstances(prev => prev.filter(i => i.id !== data.instanceId));
      if (selectedInstance?.id === data.instanceId) {
        setSelectedInstance(null);
        setInstanceLogs([]);
      }
      addNotification('warning', `Instance ${data.instanceId} removed`);
    });

    // Listen for roadmap updates
    WebSocketService.onRoadmapUpdate((updatedContent) => {
      setRoadmap(updatedContent);
      setLastUpdate(new Date());
    });

    // Connect to WebSocket
    WebSocketService.connect();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'done': return 'success';
      case 'in_progress': return 'primary';
      case 'blocked': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getWebSocketStatusIcon = () => {
    switch (wsStatus) {
      case 'connected': return <CheckCircleIcon color="success" />;
      case 'reconnecting': return <ScheduleIcon color="warning" />;
      case 'error': case 'failed': return <ErrorIcon color="error" />;
      default: return <PauseIcon color="disabled" />;
    }
  };

  const handleStartOrchestration = async () => {
    try {
      setOrchestrationRunning(true);
      addNotification('Starting orchestration cycle...', 'info');
       
       // Get orchestration args from settings
       const settings = JSON.parse(localStorage.getItem('dashboardSettings') || '{}');
       const orchestrationArgs = settings.orchestrationArgs || 'Start Orchestration Cycle. Keep looping it until current Sprint has no pending Tasks.';
       
       const response = await fetch('http://localhost:3002/api/orchestration/start', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
         },
         body: JSON.stringify({ args: orchestrationArgs }),
       });
       
       if (response.ok) {
         addNotification('Orchestration cycle started successfully', 'success');
         // Refresh instances list
         fetchInstances();
       } else {
         throw new Error('Failed to start orchestration');
       }
     } catch (error) {
       console.error('Error starting orchestration:', error);
       addNotification('Failed to start orchestration cycle', 'error');
      setOrchestrationRunning(false);
    }
  };

  // Instance Management Functions
  const fetchInstances = async () => {
    try {
      const response = await fetch('http://localhost:3002/api/orchestration/instances');
      if (response.ok) {
        const instancesData = await response.json();
        setInstances(instancesData);
      }
    } catch (error) {
      console.error('Error fetching instances:', error);
    }
  };

  const createInstance = async (config = {}) => {
    try {
      const response = await fetch('http://localhost:3002/api/orchestration/instances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config)
      });
      
      if (response.ok) {
        fetchInstances();
      }
    } catch (error) {
      console.error('Error creating instance:', error);
    }
  };

  const stopInstance = async (instanceId) => {
    try {
      const response = await fetch(`http://localhost:3002/api/orchestration/instances/${instanceId}/stop`, {
        method: 'POST'
      });
      
      if (response.ok) {
        fetchInstances();
      }
    } catch (error) {
      console.error('Error stopping instance:', error);
    }
  };

  const startInstance = async (instanceId) => {
    try {
      const response = await fetch(`http://localhost:3002/api/orchestration/instances/${instanceId}/start`, {
        method: 'POST'
      });
      
      if (response.ok) {
        fetchInstances();
      }
    } catch (error) {
      console.error('Error starting instance:', error);
    }
  };

  const removeInstance = async (instanceId) => {
    try {
      const response = await fetch(`http://localhost:3002/api/orchestration/instances/${instanceId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        fetchInstances();
        if (selectedInstance?.id === instanceId) {
          setSelectedInstance(null);
          setInstanceLogs([]);
        }
      }
    } catch (error) {
      console.error('Error removing instance:', error);
    }
  };

  const fetchInstanceLogs = async (instanceId) => {
    try {
      const response = await fetch(`http://localhost:3002/api/orchestration/instances/${instanceId}/logs`);
      if (response.ok) {
        const data = await response.json();
        setInstanceLogs(data.logs);
      }
    } catch (error) {
      console.error('Error fetching instance logs:', error);
    }
  };

  const selectInstance = (instance) => {
    setSelectedInstance(instance);
    fetchInstanceLogs(instance.id);
  };

  const handleCreateNewRequest = async () => {
    try {
      const requestData = {
        id: `REQ-${Date.now()}`,
        title: newRequestData.description.substring(0, 50) + (newRequestData.description.length > 50 ? '...' : ''),
        description: newRequestData.description,
        type: newRequestData.type,
        priority: newRequestData.priority,
        status: 'pending',
        requester: 'Human',
        created_at: new Date().toISOString()
      };
      
      await ApiService.createHumanRequest(requestData);
      setNewRequestData({ description: '', type: 'bug_report', priority: 'medium' });
      setShowNewRequestDialog(false);
      loadDashboardData(); // Refresh data
      
      const settings = JSON.parse(localStorage.getItem('dashboard-settings') || '{}');
      const notificationsEnabled = settings.notifications !== false;
      
      if (notificationsEnabled) {
        toast.success('Human request created successfully!');
      }
    } catch (err) {
      setError(`Failed to create request: ${err.message}`);
      toast.error('Failed to create human request');
    }
  };

  const handleNewRequestKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleCreateNewRequest();
    } else if (event.key === 'Escape') {
      setShowNewRequestDialog(false);
    }
  };

  const handleTrackOrchestration = () => {
    setShowInstancePanel(true);
    fetchInstances();
  };

  const taskStats = ApiService.getTaskStats(tasks);

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
        <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
          Loading dashboard data...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Claude Code Agents Dashboard
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowNewRequestDialog(true)}
            color="primary"
          >
            New Request
          </Button>
          
          <Box sx={{ 
            position: 'relative',
            display: 'flex',
            border: '2px solid orange',
            borderRadius: 1,
            p: 0.5,
            gap: 1
          }}>
            <Tooltip title="Start Orchestration Cycle">
              <IconButton 
                onClick={handleStartOrchestration} 
                disabled={orchestrationRunning}
                color="primary"
                size="large"
              >
                <PlayArrowIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Track Running Instances">
              <IconButton onClick={handleTrackOrchestration} color="info">
                <RobotIcon />
              </IconButton>
            </Tooltip>
            
            <Chip 
              label="alpha" 
              size="small" 
              color="warning" 
              sx={{ 
                position: 'absolute', 
                bottom: -12, 
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '0.6rem', 
                height: 16 
              }} 
            />
          </Box>
          
          <Tooltip title="Notifications">
            <IconButton onClick={() => setShowNotificationPanel(true)}>
              <Badge badgeContent={notificationCount} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Refresh Data">
            <IconButton onClick={loadDashboardData} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Last Update */}
      {lastUpdate && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Last updated: {lastUpdate.toLocaleString()}
        </Typography>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 } }}
            onClick={() => navigate('/tasks')}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TaskIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Total Tasks</Typography>
              </Box>
              <Typography variant="h4">{taskStats.total}</Typography>
              <Box sx={{ mt: 1 }}>
                <Chip label={`Done: ${taskStats.done}`} color="success" size="small" sx={{ mr: 0.5 }} />
                <Chip label={`In Progress: ${taskStats.in_progress}`} color="primary" size="small" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 } }}
            onClick={() => navigate('/human-requests')}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PersonIcon color="secondary" sx={{ mr: 1 }} />
                <Typography variant="h6">Human Requests</Typography>
              </Box>
              <Typography variant="h4">
                {humanRequests.pending.length + humanRequests.in_progress.length}
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Chip label={`Pending: ${humanRequests.pending.length}`} color="warning" size="small" sx={{ mr: 0.5 }} />
                <Chip label={`In Progress: ${humanRequests.in_progress.length}`} color="info" size="small" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ErrorIcon color="error" sx={{ mr: 1 }} />
                <Typography variant="h6">Blocked Tasks</Typography>
              </Box>
              <Typography variant="h4">{taskStats.blocked}</Typography>
              <Typography variant="body2" color="text.secondary">
                Require attention
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 } }}
            onClick={() => navigate('/roadmap')}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <RoadmapIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">Progress</Typography>
              </Box>
              <Typography variant="h4">
                {taskStats.total > 0 ? Math.round((taskStats.done / taskStats.total) * 100) : 0}%
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={taskStats.total > 0 ? (taskStats.done / taskStats.total) * 100 : 0}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Activity */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Recent Tasks
            </Typography>
            <List>
              {tasks.slice(0, 5).map((task, index) => (
                <React.Fragment key={task.id || index}>
                  <ListItem>
                    <ListItemIcon>
                      <TaskIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={task.payload?.title || `Task ${task.id}`}
                      secondary={
                        <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Chip 
                            label={task.status} 
                            color={getStatusColor(task.status)} 
                            size="small" 
                          />
                          <Chip 
                            label={task.priority} 
                            color={getPriorityColor(task.priority)} 
                            size="small" 
                          />
                          <Typography variant="caption" color="text.secondary">
                            {task.agent}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < 4 && <Divider />}
                </React.Fragment>
              ))}
              {tasks.length === 0 && (
                <ListItem>
                  <ListItemText 
                    primary="No tasks found" 
                    secondary="Tasks will appear here when available"
                  />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Pending Human Requests
            </Typography>
            <List>
              {humanRequests.pending.slice(0, 5).map((request, index) => (
                <React.Fragment key={request.id || index}>
                  <ListItem>
                    <ListItemIcon>
                      <PersonIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={request.title}
                      secondary={
                        <Typography variant="body2" color="text.secondary">
                          {Array.isArray(request.details) 
                            ? request.details.slice(0, 2).join(' ') 
                            : (request.details || '').toString().substring(0, 100)
                          }
                        </Typography>
                      }
                    />
                  </ListItem>
                  {index < 4 && <Divider />}
                </React.Fragment>
              ))}
              {humanRequests.pending.length === 0 && (
                <ListItem>
                  <ListItemText 
                    primary="No pending requests" 
                    secondary="Human requests will appear here when available"
                  />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>
      
      {/* New Request Dialog */}
      <Dialog 
        open={showNewRequestDialog} 
        onClose={() => setShowNewRequestDialog(false)}
        maxWidth="sm"
        fullWidth
        onKeyDown={handleNewRequestKeyPress}
      >
        <DialogTitle>Create New Request</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Description"
            multiline
            rows={4}
            fullWidth
            variant="outlined"
            value={newRequestData.description}
            onChange={(e) => setNewRequestData({ ...newRequestData, description: e.target.value })}
            onKeyDown={handleNewRequestKeyPress}
            sx={{ mb: 2 }}
          />
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={newRequestData.type}
              label="Type"
              onChange={(e) => setNewRequestData({ ...newRequestData, type: e.target.value })}
            >
              <MenuItem value="bug_report">Bug Report</MenuItem>
              <MenuItem value="feature_request">Feature Request</MenuItem>
              <MenuItem value="agent_clarification">Agent Clarification</MenuItem>
              <MenuItem value="code_review">Code Review</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl fullWidth>
            <InputLabel>Priority</InputLabel>
            <Select
              value={newRequestData.priority}
              label="Priority"
              onChange={(e) => setNewRequestData({ ...newRequestData, priority: e.target.value })}
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="urgent">Urgent</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowNewRequestDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateNewRequest} 
            variant="contained"
            disabled={!newRequestData.description.trim()}
          >
            Create Request
          </Button>
        </DialogActions>
      </Dialog>
      

      
      {/* Notification Panel */}
      <NotificationPanel
        open={showNotificationPanel}
        onClose={() => setShowNotificationPanel(false)}
        notifications={notifications}
        onClearNotification={(id) => setNotifications(prev => prev.filter(n => n.id !== id))}
        onClearAll={() => {
          setNotifications([]);
          setNotificationCount(0);
        }}
      />

      {/* Instance Management Panel */}
      {showInstancePanel && (
        <Dialog
          open={showInstancePanel}
          onClose={() => setShowInstancePanel(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Claude Code Instances</Typography>
              <Button 
                variant="contained" 
                size="small" 
                onClick={() => createInstance()}
              >
                New Instance
              </Button>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', gap: 2, height: 500 }}>
              {/* Instance List */}
              <Box sx={{ flex: 1, borderRight: 1, borderColor: 'divider', pr: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>Active Instances ({instances.length})</Typography>
                <Box sx={{ maxHeight: '100%', overflow: 'auto' }}>
                  {instances.map((instance) => (
                    <Card 
                      key={instance.id} 
                      sx={{ 
                        mb: 1, 
                        cursor: 'pointer',
                        border: selectedInstance?.id === instance.id ? 2 : 1,
                        borderColor: selectedInstance?.id === instance.id ? 'primary.main' : 'divider'
                      }}
                      onClick={() => selectInstance(instance)}
                    >
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="subtitle2">{instance.id}</Typography>
                          <Chip 
                            label={instance.status} 
                            size="small"
                            color={instance.status === 'running' ? 'success' : instance.status === 'error' ? 'error' : 'default'}
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          Model: {instance.config?.model || 'N/A'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Uptime: {Math.floor((instance.metrics?.uptime || 0) / 1000)}s
                        </Typography>
                        <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                          {instance.status === 'running' ? (
                            <Button size="small" onClick={(e) => { e.stopPropagation(); stopInstance(instance.id); }}>Stop</Button>
                          ) : (
                            <Button size="small" onClick={(e) => { e.stopPropagation(); startInstance(instance.id); }}>Start</Button>
                          )}
                          <Button size="small" color="error" onClick={(e) => { e.stopPropagation(); removeInstance(instance.id); }}>Remove</Button>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                  {instances.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
                      No instances running
                    </Typography>
                  )}
                </Box>
              </Box>
              
              {/* Instance Details */}
              <Box sx={{ flex: 1, pl: 2 }}>
                {selectedInstance ? (
                  <>
                    <Typography variant="subtitle2" sx={{ mb: 2 }}>Instance Details</Typography>
                    <Card sx={{ mb: 2 }}>
                      <CardContent>
                        <Typography variant="h6">{selectedInstance.id}</Typography>
                        <Typography variant="body2" color="text.secondary">Status: {selectedInstance.status}</Typography>
                        <Typography variant="body2" color="text.secondary">Started: {new Date(selectedInstance.startTime).toLocaleString()}</Typography>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>Metrics</Typography>
                        <Typography variant="body2">Tokens Used: {selectedInstance.metrics?.tokensUsed || 0}</Typography>
                        <Typography variant="body2">Requests: {selectedInstance.metrics?.requestCount || 0}</Typography>
                        <Typography variant="body2">Errors: {selectedInstance.metrics?.errorCount || 0}</Typography>
                      </CardContent>
                    </Card>
                    
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Logs</Typography>
                    <Paper sx={{ p: 2, height: 200, overflow: 'auto', backgroundColor: '#1e1e1e', color: '#fff' }}>
                      {instanceLogs.map((log, index) => (
                        <Typography 
                          key={index} 
                          variant="body2" 
                          sx={{ 
                            fontFamily: 'monospace',
                            color: log.level === 'error' ? '#ff6b6b' : log.level === 'warning' ? '#ffd93d' : '#6bcf7f',
                            mb: 0.5
                          }}
                        >
                          [{new Date(log.timestamp).toLocaleTimeString()}] {log.level.toUpperCase()}: {log.message}
                        </Typography>
                      ))}
                      {instanceLogs.length === 0 && (
                        <Typography variant="body2" color="text.secondary">No logs available</Typography>
                      )}
                    </Paper>
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
                    Select an instance to view details
                  </Typography>
                )}
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowInstancePanel(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default Dashboard;