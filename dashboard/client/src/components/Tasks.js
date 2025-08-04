import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  IconButton,
  Tooltip,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Fab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Collapse,
  Badge
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  DragIndicator as DragIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  BugReport as TestIcon,
  Link as LinkIcon
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import WebSocketService from '../services/websocket';

const TASK_STATUSES = ['pending', 'in_progress', 'done', 'blocked'];
const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const TASK_AGENTS = [
  'Task-Coder', 
  'Tester', 
  'UI-Test-Designer', 
  'Human-Concierge',
  'Strategist',
  'Product-Owner',
  'Product-Manager',
  'DevOps-Engineer',
  'Code-Reviewer',
  'UI-Tester',
  'Cleaner'
];
const TASK_TYPES = ['feature_development', 'bug_fix', 'ui_test', 'documentation', 'refactoring'];

const Tasks = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'feature_development',
    status: 'pending',
    agent: 'Task-Coder',
    priority: 'medium',
    source_story_id: ''
  });
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedAgents, setSelectedAgents] = useState(TASK_AGENTS); // Start with all agents selected
  const [selectedUserStories, setSelectedUserStories] = useState([]);
  const [userStories, setUserStories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAgentFilter, setShowAgentFilter] = useState(false);
  const [showUserStoryFilter, setShowUserStoryFilter] = useState(false);
  const descriptionRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    loadTasks();
    loadUserStories();
    setupWebSocket();
    
    // Handle keyboard shortcuts
    const handleKeyboardShortcuts = (e) => {
      // Only handle shortcuts if not typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        handleOpenDialog();
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        if (searchRef.current) {
          searchRef.current.focus();
        }
      }
    };
    
    // Handle custom events from App.js
    const handleNewItem = () => handleOpenDialog();
    const handleFocusSearch = () => {
      if (searchRef.current) {
        searchRef.current.focus();
      }
    };
    const handleClosePanel = () => {
      if (openDialog) {
        handleCloseDialog();
      }
    };
    
    document.addEventListener('keydown', handleKeyboardShortcuts);
    document.addEventListener('newItem', handleNewItem);
    document.addEventListener('focusSearch', handleFocusSearch);
    document.addEventListener('closePanel', handleClosePanel);

    return () => {
      // WebSocket cleanup is handled in parent component
      document.removeEventListener('keydown', handleKeyboardShortcuts);
      document.removeEventListener('newItem', handleNewItem);
      document.removeEventListener('focusSearch', handleFocusSearch);
      document.removeEventListener('closePanel', handleClosePanel);
    };
  }, [openDialog]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const tasksData = await api.getTasks();
      // Ensure tasksData is an array
      if (Array.isArray(tasksData)) {
        setTasks(tasksData);
      } else {
        console.warn('API returned non-array tasks data:', tasksData);
        setTasks([]);
      }
    } catch (err) {
      setError(err.message);
      console.error('Failed to load tasks:', err);
      setTasks([]); // Ensure tasks is always an array even on error
    } finally {
      setLoading(false);
    }
  };

  const loadUserStories = async () => {
    try {
      const userStoriesData = await api.getUserStories();
      if (userStoriesData && Array.isArray(userStoriesData.stories)) {
        setUserStories(userStoriesData.stories);
        // Initialize selectedUserStories with all story IDs
        setSelectedUserStories(userStoriesData.stories.map(story => story.id));
      } else {
        console.warn('API returned invalid user stories data:', userStoriesData);
        setUserStories([]);
      }
    } catch (err) {
      console.error('Failed to load user stories:', err);
      setUserStories([]);
    }
  };

  const setupWebSocket = () => {
    WebSocketService.onTaskUpdate((updatedTasks) => {
      // Ensure updatedTasks is an array before setting state
      if (Array.isArray(updatedTasks)) {
        setTasks(updatedTasks);
      } else {
        console.warn('Received non-array tasks update:', updatedTasks);
        // If it's a single task update, merge it with existing tasks
        if (updatedTasks && typeof updatedTasks === 'object') {
          setTasks(prevTasks => {
            const taskId = updatedTasks.id || updatedTasks.task_id;
            if (taskId) {
              const existingIndex = prevTasks.findIndex(t => 
                String(t.id || t.task_id) === String(taskId)
              );
              if (existingIndex >= 0) {
                // Update existing task
                const newTasks = [...prevTasks];
                newTasks[existingIndex] = updatedTasks;
                return newTasks;
              } else {
                // Add new task
                return [...prevTasks, updatedTasks];
              }
            }
            return prevTasks;
          });
        }
      }
    });
  };

  // Stable reorder helper to avoid react-beautiful-dnd warnings and to give immediate feedback
  const reorderWithinList = (list, startIndex, endIndex) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
  };

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    // If dropped in the same list and position, nothing to do
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    // Snapshot lists by status for stable UI update
    const pending = tasks.filter(t => t.status === 'pending');
    const inProgress = tasks.filter(t => t.status === 'in_progress');
    const done = tasks.filter(t => t.status === 'done');
    const blocked = tasks.filter(t => t.status === 'blocked');

    const lists = { pending, in_progress: inProgress, done, blocked };

    // Find dragged task
    const task = tasks.find(t => String(t.id || t.task_id) === String(draggableId));
    if (!task) return;

    const sourceList = lists[source.droppableId] || [];
    const destList = lists[destination.droppableId] || [];

    // If moving within the same column, reorder locally for immediate feedback
    if (source.droppableId === destination.droppableId) {
      const newOrder = reorderWithinList(sourceList, source.index, destination.index);
      lists[source.droppableId] = newOrder;
      // Recompose tasks in order of columns to maintain stable UI (order within status not persisted server-side)
      const next = [
        ...lists.pending,
        ...lists.in_progress,
        ...lists.done,
        ...lists.blocked
      ];
      setTasks(next);
      return; // No server update needed when just reordering within same status
    }

    // Moving across columns: optimistic update UI, then persist
    const movedTask = { ...task, status: destination.droppableId };
    // Remove from source list and insert into destination list
    const newSource = Array.from(sourceList);
    const [removed] = newSource.splice(source.index, 1);
    const newDest = Array.from(destList);
    newDest.splice(destination.index, 0, movedTask);

    lists[source.droppableId] = newSource;
    lists[destination.droppableId] = newDest;

    const optimistic = [
      ...lists.pending,
      ...lists.in_progress,
      ...lists.done,
      ...lists.blocked
    ];
    setTasks(optimistic);

    try {
      await api.updateTask(task.id || task.task_id, movedTask);

      // If moved to blocked, create a linked human request for clarification
      if (destination.droppableId === 'blocked') {
        try {
          // Build a minimal clarification entry appended to human-requests.md
          const clarifyTitle = `Clarification needed for ${movedTask.payload?.title || movedTask.id || movedTask.task_id}`;
          const clarifyBlock = [
            '',
            '### HR-' + (Date.now()) + ': ' + clarifyTitle,
            '**Type:** Agent Clarification',
            '**Priority:** MEDIUM',
            '**Requester:** System',
            '**Date:** ' + new Date().toISOString().slice(0,10),
            '',
            '**Description:**',
            `Task ${movedTask.id || movedTask.task_id} was marked as BLOCKED. Please provide missing info or guidance to unblock.`,
            '',
            '**Linked Task:**',
            (movedTask.id || movedTask.task_id),
            '',
            '**Status:** pending',
            '',
            '---',
            ''
          ].join('\n');

          const current = await api.getHumanRequests();
          const existing = typeof current?.content === 'string' ? current.content : '';
          const updatedContent = existing.includes('## 🔄 Pending Requests')
            ? existing.replace('## 🔄 Pending Requests', '## 🔄 Pending Requests' + '\n' + clarifyBlock)
            : (existing + '\n## 🔄 Pending Requests\n' + clarifyBlock);

          await api.updateHumanRequests(updatedContent);
          toast.info('Created linked clarification in Human Requests');
        } catch (e) {
          console.warn('Failed to create linked clarification:', e);
        }
      }

      const settings = JSON.parse(localStorage.getItem('dashboard-settings') || '{}');
      const notificationsEnabled = settings.notifications !== false;
      if (notificationsEnabled) {
        if (destination.droppableId === 'done') {
          toast.success('Task completed!');
        } else if (destination.droppableId === 'blocked') {
          toast.warning('Task marked as blocked');
        } else {
          toast.info(`Task moved to ${destination.droppableId.replace('_', ' ')}`);
        }
      }
    } catch (err) {
      console.error('Drag and drop update error:', err);
      setError(`Failed to update task status: ${err.message}`);
      toast.error('Failed to update task status');
      // Revert UI by reloading from API
      try {
        const fresh = await api.getTasks();
        if (Array.isArray(fresh)) setTasks(fresh);
      } catch {}
    }
  };

  const generateTaskTitle = (description, type) => {
    const prefixes = {
      'bug_fix': 'FIX:',
      'feature_development': 'FEAT:',
      'ui_test': 'TEST:',
      'documentation': 'DOC:',
      'refactoring': 'REFACTOR:'
    };
    
    const prefix = prefixes[type] || 'TASK:';
    const shortDesc = description.substring(0, 40).trim();
    return `${prefix} ${shortDesc}${description.length > 40 ? '...' : ''}`;
  };

  const handleCreateTask = async () => {
    try {
      const generatedTitle = generateTaskTitle(formData.description, formData.type);
      const taskData = {
        ...formData,
        id: `task_${Date.now()}`,
        created_at: new Date().toISOString(),
        payload: {
          title: generatedTitle,
          description: formData.description
        }
      };

      await api.createTask(taskData);
      setTasks(prevTasks => [...prevTasks, taskData]);
      handleCloseDialog();
      
      const settings = JSON.parse(localStorage.getItem('dashboard-settings') || '{}');
      const notificationsEnabled = settings.notifications !== false;
      
      if (notificationsEnabled) {
        toast.success('Task created successfully!');
      }
    } catch (err) {
      setError(`Failed to create task: ${err.message}`);
      toast.error('Failed to create task');
    }
  };

  const handleUpdateTask = async () => {
    try {
      const updatedTask = {
        ...editingTask,
        ...formData,
        payload: {
          title: formData.title,
          description: formData.description
        }
      };

      await api.updateTask(editingTask.id, updatedTask);
      setTasks(prevTasks => 
        prevTasks.map(t => t.id === editingTask.id ? updatedTask : t)
      );
      handleCloseDialog();
      
      const settings = JSON.parse(localStorage.getItem('dashboard-settings') || '{}');
      const notificationsEnabled = settings.notifications !== false;
      
      if (notificationsEnabled) {
        if (formData.status === 'done') {
          toast.success('Task completed!');
        } else if (formData.status === 'blocked') {
          toast.error('Task marked as blocked');
        } else {
          toast('Task updated');
        }
      }
    } catch (err) {
      setError(`Failed to update task: ${err.message}`);
      toast.error('Failed to update task');
    }
  };

  const handleOpenDialog = (task = null) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        title: task.payload?.title || '',
        description: task.payload?.description || '',
        type: task.type || 'feature_development',
        status: task.status || 'pending',
        agent: task.agent || 'Task-Coder',
        priority: task.priority || 'medium',
        source_story_id: task.source_story_id || ''
      });
    } else {
      setEditingTask(null);
      setFormData({
        title: '',
        description: '',
        type: 'feature_development',
        status: 'pending',
        agent: 'Task-Coder',
        priority: 'medium',
        source_story_id: ''
      });
    }
    setOpenDialog(true);
    
    // Focus on description field after dialog opens
    setTimeout(() => {
      if (descriptionRef.current) {
        descriptionRef.current.focus();
      }
    }, 100);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTask(null);
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      if (formData.description.trim()) {
        if (editingTask) {
          handleUpdateTask();
        } else {
          handleCreateTask();
        }
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      handleCloseDialog();
    }
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

  const getFilteredTasks = () => {
    let filtered = tasks.filter(task => {
      const statusMatch = filterStatus === 'all' || task.status === filterStatus;
      const agentMatch = selectedAgents.includes(task.agent);
      return statusMatch && agentMatch;
    });
    
    return filterTasks(filtered);
  };

  const handleAgentToggle = (agent) => {
    setSelectedAgents(prev => 
      prev.includes(agent) 
        ? prev.filter(a => a !== agent)
        : [...prev, agent]
    );
  };

  const handleSelectAllAgents = () => {
    setSelectedAgents(TASK_AGENTS);
  };

  const handleDeselectAllAgents = () => {
    setSelectedAgents([]);
  };

  const handleUserStoryToggle = (userStory) => {
    setSelectedUserStories(prev => 
      prev.includes(userStory) 
        ? prev.filter(s => s !== userStory)
        : [...prev, userStory]
    );
  };

  const handleSelectAllUserStories = () => {
    const allUserStories = [...new Set(tasks.map(task => task.source_story_id).filter(Boolean))];
    setSelectedUserStories(allUserStories);
  };

  const handleDeselectAllUserStories = () => {
    setSelectedUserStories([]);
  };

  const filterTasks = (tasks) => {
    return tasks.filter(task => {
      const taskId = task.id || task.task_id;
      const matchesSearch = !searchQuery || 
        task.payload?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.payload?.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        taskId?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesUserStory = selectedUserStories.length === 0 || 
        (task.source_story_id && selectedUserStories.includes(task.source_story_id));
      
      return matchesSearch && matchesUserStory;
    });
  };

  const getTasksByStatus = (status) => {
    return getFilteredTasks().filter(task => task.status === status);
  };

  // Helper to render linked items: expect arrays like task.tests, task.human_requests, task.sprints, task.epics
  const LinkedItems = ({ task }) => {
    const items = [];

    if (Array.isArray(task.human_requests) && task.human_requests.length) {
      items.push({
        label: 'Human Requests',
        entries: task.human_requests.map(id => ({
          id,
          href: `/human-requests?ref=${encodeURIComponent(id)}`
        }))
      });
    }
    if (Array.isArray(task.tests) && task.tests.length) {
      items.push({
        label: 'Tests',
        entries: task.tests.map(name => ({
          id: name,
          href: `/tests?task=${encodeURIComponent(task.id || task.task_id)}&name=${encodeURIComponent(name)}`
        }))
      });
    }
    if (Array.isArray(task.sprints) && task.sprints.length) {
      items.push({
        label: 'Sprints',
        entries: task.sprints.map(s => ({
          id: s,
          href: `/roadmap?sprint=${encodeURIComponent(s)}`
        }))
      });
    }
    if (Array.isArray(task.epics) && task.epics.length) {
      items.push({
        label: 'Epics',
        entries: task.epics.map(e => ({
          id: e,
          href: `/roadmap?epic=${encodeURIComponent(e)}`
        }))
      });
    }

    if (!items.length) return null;

    return (
      <Box sx={{ mt: 1.5 }}>
        {items.map(section => (
          <Box key={section.label} sx={{ mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              {section.label}:
            </Typography>{' '}
            {section.entries.map((entry, i) => (
              <React.Fragment key={entry.id || i}>
                <Button
                  href={entry.href}
                  size="small"
                  variant="text"
                  sx={{ minWidth: 'auto', p: 0.2, mr: 0.75, textTransform: 'none' }}
                >
                  {entry.id}
                </Button>
              </React.Fragment>
            ))}
          </Box>
        ))}
      </Box>
    );
  };

  const TaskCard = ({ task, index }) => (
    <Draggable draggableId={String(task.id || task.task_id)} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          sx={{
            mb: 1,
            opacity: snapshot.isDragging ? 0.8 : 1,
            transform: snapshot.isDragging ? 'rotate(5deg)' : 'none',
            cursor: snapshot.isDragging ? 'grabbing' : 'grab',
            '&:hover': {
              boxShadow: 2
            }
          }}
        >
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
              <Box 
                {...provided.dragHandleProps} 
                sx={{ 
                  mr: 1, 
                  mt: 0.5,
                  cursor: 'grab',
                  '&:active': {
                    cursor: 'grabbing'
                  }
                }}
              >
                <DragIcon color="action" fontSize="small" />
              </Box>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                  {task.payload?.title || `Task ${task.id || task.task_id}`}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {task.payload?.description || 'No description'}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                  <Chip 
                    label={task.priority} 
                    color={getPriorityColor(task.priority)} 
                    size="small" 
                  />
                  <Chip 
                    label={task.agent} 
                    variant="outlined" 
                    size="small" 
                  />
                  <Chip 
                    label={task.type} 
                    variant="outlined" 
                    size="small" 
                  />
                  {task.source_story_id && (
                    <Chip 
                      label={task.source_story_id} 
                      variant="outlined" 
                      size="small"
                      color="primary"
                    />
                  )}
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    {task.id || task.task_id}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {task.type === 'ui_test' && (
                      <Tooltip title="View Tests">
                        <IconButton 
                          size="small" 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/tests?task=${task.id || task.task_id}`);
                          }}
                          sx={{ mr: 0.5 }}
                        >
                          <Badge 
                            badgeContent={task.test_count || 0} 
                            color="primary" 
                            max={99}
                          >
                            <TestIcon fontSize="small" />
                          </Badge>
                        </IconButton>
                      </Tooltip>
                    )}
                    <IconButton 
                      size="small" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDialog(task);
                      }}
                      sx={{ ml: 0.5 }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>

                {/* Linked Items area */}
                <LinkedItems task={task} />
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}
    </Draggable>
  );

  const TaskColumn = ({ status, title }) => {
    const columnTasks = getTasksByStatus(status);
    
    return (
      <Paper sx={{ p: 2, height: 'fit-content', minHeight: 400 }}>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
          {title}
          <Chip 
            label={columnTasks.length} 
            color={getStatusColor(status)} 
            size="small" 
            sx={{ ml: 1 }} 
          />
        </Typography>
        
        <Droppable droppableId={status}>
          {(provided, snapshot) => (
            <Box
              ref={provided.innerRef}
              {...provided.droppableProps}
              sx={{
                minHeight: 300,
                backgroundColor: snapshot.isDraggingOver ? 'action.hover' : 'transparent',
                borderRadius: 1,
                p: 1
              }}
            >
              {columnTasks.map((task, index) => (
                <TaskCard key={task.id || task.task_id} task={task} index={index} />
              ))}
              {provided.placeholder}
            </Box>
          )}
        </Droppable>
      </Paper>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Typography>Loading tasks...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Tasks Management</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh Tasks">
            <IconButton onClick={loadTasks}>
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

      {/* Search Bar */}
      <Box sx={{ mb: 3 }}>
        <TextField
          inputRef={searchRef}
          fullWidth
          size="small"
          placeholder="Search tasks by title, description, or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
          }}
        />
      </Box>

      {/* Filters */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filterStatus}
              label="Status"
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <MenuItem value="all">All Statuses</MenuItem>
              {TASK_STATUSES.map(status => (
                <MenuItem key={status} value={status}>
                  {status.replace('_', ' ').toUpperCase()}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Button
            startIcon={<FilterIcon />}
            onClick={() => setShowAgentFilter(!showAgentFilter)}
            variant={showAgentFilter ? 'contained' : 'outlined'}
            size="small"
          >
            Agents ({selectedAgents.length})
          </Button>
          
          <Button
            startIcon={<FilterIcon />}
            onClick={() => setShowUserStoryFilter(!showUserStoryFilter)}
            variant={showUserStoryFilter ? 'contained' : 'outlined'}
            size="small"
          >
            User Stories ({selectedUserStories.length})
          </Button>
        </Box>
        
        <Collapse in={showAgentFilter}>
          <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1, mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Filter by Agents</Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <Button size="small" onClick={handleSelectAllAgents}>
                Select All
              </Button>
              <Button size="small" onClick={handleDeselectAllAgents}>
                Deselect All
              </Button>
            </Box>
            <FormGroup row>
              {TASK_AGENTS.map(agent => (
                <FormControlLabel
                  key={agent}
                  control={
                    <Checkbox
                      checked={selectedAgents.includes(agent)}
                      onChange={() => handleAgentToggle(agent)}
                      size="small"
                    />
                  }
                  label={agent}
                  sx={{ mr: 2 }}
                />
              ))}
            </FormGroup>
          </Box>
        </Collapse>
        
        <Collapse in={showUserStoryFilter}>
          <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Filter by User Stories</Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <Button size="small" onClick={handleSelectAllUserStories}>
                Select All
              </Button>
              <Button size="small" onClick={handleDeselectAllUserStories}>
                Deselect All
              </Button>
            </Box>
            <FormGroup row>
              {userStories.map(story => {
                const taskCount = tasks.filter(task => task.source_story_id === story.id).length;
                return (
                  <FormControlLabel
                    key={story.id}
                    control={
                      <Checkbox
                        checked={selectedUserStories.includes(story.id)}
                        onChange={() => handleUserStoryToggle(story.id)}
                        size="small"
                      />
                    }
                    label={`${story.id} - ${story.title} (${taskCount})`}
                    sx={{ mr: 2 }}
                  />
                );
              })}
            </FormGroup>
          </Box>
        </Collapse>
      </Box>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TaskColumn status="pending" title="Pending" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TaskColumn status="in_progress" title="In Progress" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TaskColumn status="done" title="Done" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TaskColumn status="blocked" title="Blocked" />
          </Grid>
        </Grid>
      </DragDropContext>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add task"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => handleOpenDialog()}
      >
        <AddIcon />
      </Fab>

      {/* Task Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth onKeyDown={handleKeyPress}>
        <DialogTitle>
          {editingTask ? 'Edit Task' : 'Create New Task'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={4}
              required
              inputRef={descriptionRef}
              placeholder="Describe the task... (Ctrl+Enter to submit, Esc to cancel)"
            />
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={formData.type}
                  label="Type"
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  {TASK_TYPES.map(type => (
                    <MenuItem key={type} value={type}>
                      {type.replace('_', ' ').toUpperCase()}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  label="Status"
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  {TASK_STATUSES.map(status => (
                    <MenuItem key={status} value={status}>
                      {status.replace('_', ' ').toUpperCase()}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Agent</InputLabel>
                <Select
                  value={formData.agent}
                  label="Agent"
                  onChange={(e) => setFormData({ ...formData, agent: e.target.value })}
                >
                  {TASK_AGENTS.map(agent => (
                    <MenuItem key={agent} value={agent}>
                      {agent}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={formData.priority}
                  label="Priority"
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  {TASK_PRIORITIES.map(priority => (
                    <MenuItem key={priority} value={priority}>
                      {priority.toUpperCase()}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            
            <TextField
              label="Source Story ID"
              value={formData.source_story_id}
              onChange={(e) => setFormData({ ...formData, source_story_id: e.target.value })}
              fullWidth
              placeholder="e.g., EPIC-001, STORY-123"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel (Esc)</Button>
          <Button 
            onClick={editingTask ? handleUpdateTask : handleCreateTask}
            variant="contained"
            disabled={!formData.description.trim()}
          >
            {editingTask ? 'Update' : 'Create'} (Ctrl+Enter)
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Tasks;
