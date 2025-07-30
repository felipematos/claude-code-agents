import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  IconButton,
  Badge,
  Chip
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Assignment as TaskIcon,
  QuestionAnswer as RequestIcon,
  Timeline as RoadmapIcon,
  Description as TemplatesIcon,
  BugReport as TestIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
  Notifications as NotificationsIcon
} from '@mui/icons-material';
import { Toaster } from 'react-hot-toast';

// Import components
import Dashboard from './components/Dashboard';
import TaskBoard from './components/TaskBoard';
import HumanRequests from './components/HumanRequests';
import Roadmap from './components/Roadmap';
import Templates from './components/Templates';
import Tests from './components/Tests';
import Settings from './components/Settings';
import NotificationPanel from './components/NotificationPanel';

// Import services
import { WebSocketService } from './services/websocket';
import { ApiService } from './services/api';

const drawerWidth = 240;

const createAppTheme = (darkMode) => createTheme({
  palette: {
    mode: darkMode ? 'dark' : 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: darkMode ? '#121212' : '#f5f5f5',
      paper: darkMode ? '#1e1e1e' : '#ffffff',
    },
  },
  typography: {
    h6: {
      fontWeight: 600,
    },
  },
});

function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState('/dashboard');
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [pendingRequests, setPendingRequests] = useState(0);
  const [activeTasks, setActiveTasks] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('dashboard-settings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setDarkMode(settings.darkMode || false);
    }

    // Initialize WebSocket connection
    WebSocketService.connect();
    
    WebSocketService.onMessage((data) => {
      console.log('WebSocket message:', data);
      // Handle real-time updates here
      if (data.type === 'task_update') {
        addNotification(`Task updated: ${data.task?.title || 'Unknown task'}`, 'task');
        loadDashboardData(); // Refresh data
      } else if (data.type === 'human_request_update') {
        addNotification('Human requests updated', 'human_request');
        loadDashboardData(); // Refresh data
      }
    });

    WebSocketService.onStatusChange((status) => {
      setConnectionStatus(status);
      if (status === 'connected') {
        addNotification('Connected to server', 'success');
      } else if (status === 'disconnected') {
        addNotification('Disconnected from server', 'warning');
      } else if (status === 'reconnecting') {
        addNotification('Reconnecting to server...', 'info');
      }
    });

    // Load initial data
    loadDashboardData();
    
    // Add a welcome notification
    setTimeout(() => {
      addNotification('Welcome to Agent Squad Dashboard!', 'info');
    }, 2000);

    // Listen for settings changes
    const handleSettingsChange = () => {
      const savedSettings = localStorage.getItem('dashboard-settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        setDarkMode(settings.darkMode || false);
      }
    };

    window.addEventListener('storage', handleSettingsChange);
    window.addEventListener('settings-changed', handleSettingsChange);

    // Global keyboard shortcuts
    const handleKeyDown = (event) => {
      // Only handle shortcuts when not typing in input fields
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      switch (event.key.toLowerCase()) {
        case 'n':
          event.preventDefault();
          // Trigger new item creation based on current page
          window.dispatchEvent(new CustomEvent('keyboard-shortcut', { detail: { action: 'new' } }));
          break;
        case 's':
          event.preventDefault();
          // Focus search bar
          window.dispatchEvent(new CustomEvent('keyboard-shortcut', { detail: { action: 'search' } }));
          break;
        case 'escape':
          event.preventDefault();
          // Close current panel
          window.dispatchEvent(new CustomEvent('keyboard-shortcut', { detail: { action: 'escape' } }));
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      WebSocketService.disconnect();
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('storage', handleSettingsChange);
      window.removeEventListener('settings-changed', handleSettingsChange);
    };
  }, []);

  const addNotification = (message, type = 'info') => {
    const notification = {
      id: Date.now() + Math.random(),
      message,
      type,
      timestamp: new Date().toISOString()
    };
    
    setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep last 50
    
    // Browser notification if enabled
    const settings = JSON.parse(localStorage.getItem('dashboard-settings') || '{}');
    if (settings.notifications && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('Agent Squad', {
        body: message,
        icon: '/favicon.ico'
      });
    }
  };

  const clearNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const loadDashboardData = async () => {
    try {
      const tasks = await ApiService.getTasks();
      const activeTasks = tasks.filter(task => 
        task.status === 'in_progress' || task.status === 'pending'
      ).length;
      setActiveTasks(activeTasks);

      const requestsContent = await ApiService.getHumanRequests();
      const parsedRequests = ApiService.parseHumanRequests(requestsContent);
      const pendingCount = parsedRequests.pending ? parsedRequests.pending.length : 0;
      setPendingRequests(pendingCount);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      addNotification('Failed to load dashboard data', 'error');
    }
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const menuItems = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/dashboard',
      badge: null
    },
    {
      text: 'Task Board',
      icon: <TaskIcon />,
      path: '/tasks',
      badge: activeTasks > 0 ? activeTasks : null
    },
    {
      text: 'Human Requests',
      icon: <RequestIcon />,
      path: '/requests',
      badge: pendingRequests > 0 ? pendingRequests : null
    },
    {
      text: 'Roadmap',
      icon: <RoadmapIcon />,
      path: '/roadmap',
      badge: null
    },
    {
      text: 'Templates',
      icon: <TemplatesIcon />,
      path: '/templates',
      badge: null
    },
    {
      text: 'Tests',
      icon: <TestIcon />,
      path: '/tests',
      badge: null
    },
    {
      text: 'Settings',
      icon: <SettingsIcon />,
      path: '/settings',
      badge: null
    }
  ];

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Agent Squad
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={currentPath === item.path}
              onClick={() => {
                setCurrentPath(item.path);
                setMobileOpen(false);
              }}
              component="a"
              href={item.path}
            >
              <ListItemIcon>
                {item.badge ? (
                  <Badge badgeContent={item.badge} color="error">
                    {item.icon}
                  </Badge>
                ) : (
                  item.icon
                )}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <ThemeProvider theme={createAppTheme(darkMode)}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex' }}>
          <AppBar
            position="fixed"
            sx={{
              width: { sm: `calc(100% - ${drawerWidth}px)` },
              ml: { sm: `${drawerWidth}px` },
            }}
          >
            <Toolbar>
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 2, display: { sm: 'none' } }}
              >
                <MenuIcon />
              </IconButton>
              <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                Agent Squad
              </Typography>
              <Chip
                label={connectionStatus}
                color={connectionStatus === 'connected' ? 'success' : 'error'}
                size="small"
                sx={{ mr: 2 }}
              />
              <IconButton color="inherit" onClick={() => setShowNotificationPanel(true)}>
                <Badge badgeContent={notifications.length} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Toolbar>
          </AppBar>
          <Box
            component="nav"
            sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
            aria-label="mailbox folders"
          >
            <Drawer
              variant="temporary"
              open={mobileOpen}
              onClose={handleDrawerToggle}
              ModalProps={{
                keepMounted: true,
              }}
              sx={{
                display: { xs: 'block', sm: 'none' },
                '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
              }}
            >
              {drawer}
            </Drawer>
            <Drawer
              variant="permanent"
              sx={{
                display: { xs: 'none', sm: 'block' },
                '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
              }}
              open
            >
              {drawer}
            </Drawer>
          </Box>
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              p: 3,
              width: { sm: `calc(100% - ${drawerWidth}px)` },
            }}
          >
            <Toolbar />
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/tasks" element={<TaskBoard />} />
              <Route path="/requests" element={<HumanRequests />} />
              <Route path="/roadmap" element={<Roadmap />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/tests" element={<Tests />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Box>
        </Box>
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
        <NotificationPanel
          open={showNotificationPanel}
          onClose={() => setShowNotificationPanel(false)}
          notifications={notifications}
          onClearNotification={clearNotification}
          onClearAll={clearAllNotifications}
        />
      </Router>
    </ThemeProvider>
  );
}

export default App;