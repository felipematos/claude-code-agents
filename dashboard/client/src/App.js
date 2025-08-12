import React, { useState, useEffect, useCallback } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Link,
  useLocation
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
  Chip,
  CircularProgress,
  Button
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
  Notifications as NotificationsIcon,
  AutoAwesome as SelfImprovementIcon
} from '@mui/icons-material';
import { Toaster } from 'react-hot-toast';

// Import components
import Dashboard from './components/Dashboard';
import SelfImprovementPanel from './components/SelfImprovementPanel';
import SelfImprovementPage from './components/SelfImprovementPage';
import TaskBoard from './components/TaskBoard';
import HumanRequests from './components/HumanRequests';
import Roadmap from './components/Roadmap';
import Templates from './components/Templates';
import Tests from './components/Tests';
import Settings from './components/Settings';
import NotificationPanel from './components/NotificationPanel';
import Setup from './components/Setup';

// Import services
import { WebSocketService } from './services/websocket';
import { api } from './services/api';

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

// Navigation component that uses useLocation hook
const NavigationDrawer = ({ menuItems, mobileOpen, setMobileOpen }) => {
  const location = useLocation();
  
  return (
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
              selected={location.pathname === item.path}
              component={Link}
              to={item.path}
              onClick={() => {
                if (item.action) {
                  item.action();
                }
                setMobileOpen(false);
              }}
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
};

function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [activeTasks, setActiveTasks] = useState([]);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [pendingLearnings, setPendingLearnings] = useState(0);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [showSelfImprovementPanel, setShowSelfImprovementPanel] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [repositoryType, setRepositoryType] = useState(null);

  const addNotification = useCallback((message, type = 'info') => {
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
  }, []);

  const loadDashboardData = useCallback(async () => {
    try {
      const tasks = await api.getTasks();
      const activeTasks = tasks.filter(task => 
        task.status === 'in_progress' || task.status === 'pending'
      ).length;
      setActiveTasks(activeTasks);

      const requestsData = await api.getHumanRequests();
      const requestsContent = requestsData.content || requestsData;
      const parsedRequests = api.parseHumanRequests(requestsContent);
      const pendingCount = parsedRequests.pending ? parsedRequests.pending.length : 0;
      setPendingRequests(pendingCount);

      const learningsResponse = await api.getLearnings();
      const learnings = learningsResponse.data || learningsResponse;
      if (learnings && learnings.learnings) {
        const pendingLearningsCount = learnings.learnings.filter(l => l.status === 'pending_validation').length;
        setPendingLearnings(pendingLearningsCount);
      } else if (Array.isArray(learnings)) {
        const pendingLearningsCount = learnings.filter(l => l.status === 'pending_validation').length;
        setPendingLearnings(pendingLearningsCount);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      addNotification('Failed to load dashboard data', 'error');
    }
  }, [addNotification]);

  useEffect(() => {
    // Check repository type first
    const checkRepositoryType = async () => {
      try {
        const repoType = await api.getRepositoryType();
        console.log('Repository type detected:', repoType);
        setRepositoryType(repoType);
        
        if (repoType === 'existing_project') {
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
        }
      } catch (error) {
        console.error('Failed to check repository type:', error);
        setRepositoryType('unknown');
      } finally {
        setIsLoading(false);
      }
    };

    checkRepositoryType();

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
        default:
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
  }, [loadDashboardData, addNotification]);

  const clearNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
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
    },
    {
      text: 'Self-Improvement',
      icon: <SelfImprovementIcon />,
      path: '/self-improvement',
      badge: pendingLearnings > 0 ? pendingLearnings : null
    }
  ];

  const drawer = (
    <NavigationDrawer 
      menuItems={menuItems} 
      mobileOpen={mobileOpen} 
      setMobileOpen={setMobileOpen} 
    />
  );

  if (isLoading) {
    return (
      <ThemeProvider theme={createAppTheme(darkMode)}>
        <CssBaseline />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <CircularProgress />
        </Box>
      </ThemeProvider>
    );
  }

  switch (repositoryType) {
    case 'template':
      // DEMO MODE: Show the normal dashboard home (limited data from templates)
      // with a button to launch the Setup Wizard manually. Do not auto-run Setup.
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
                    Agent Squad (Demo Mode)
                  </Typography>
                  <Chip
                    label="demo mode"
                    color="warning"
                    size="small"
                    sx={{ mr: 2, textTransform: 'uppercase' }}
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
                  ModalProps={{ keepMounted: true }}
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
                {/* Home dashboard content with a button to start setup wizard in demo mode */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h4" gutterBottom>
                    Claude Code Agents Dashboard
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 800 }}>
                    Running in demo mode. Data is read from templates and writes are simulated.
                    Click the button below to launch the Setup Wizard. It will simulate all actions and show a full step-by-step report of what would run in a real repository.
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      size="large"
                      onClick={() => {
                        // Navigate to a temporary route that renders the Setup wizard
                        // strictly on demand in demo mode.
                        // We keep routing consistent rather than imperatively re-rendering root.
                        window.history.pushState({}, '', '/setup');
                        window.dispatchEvent(new PopStateEvent('popstate'));
                      }}
                    >
                      Run Setup Wizard (Demo)
                    </Button>
                  </Box>
                </Box>

                <Routes>
                  <Route path="/self-improvement" element={<SelfImprovementPage />} />
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/tasks" element={<TaskBoard />} />
                  <Route path="/requests" element={<HumanRequests />} />
                  <Route path="/roadmap" element={<Roadmap />} />
                  <Route path="/templates" element={<Templates />} />
                  <Route path="/tests" element={<Tests />} />
                  <Route path="/settings" element={<Settings />} />
                  {/* Render Setup only when user navigates explicitly */}
                  <Route path="/setup" element={<Setup onSetupComplete={() => window.location.reload()} />} />
                </Routes>
              </Box>
            </Box>
            <SelfImprovementPanel
              open={showSelfImprovementPanel}
              onClose={() => setShowSelfImprovementPanel(false)}
            />
            <Toaster
              position="bottom-right"
              toastOptions={{
                duration: 4000,
                style: { background: '#363636', color: '#fff' },
              }}
            />
            <NotificationPanel
              open={showNotificationPanel}
              onClose={() => setShowNotificationPanel(false)}
              notifications={notifications}
              onClearNotification={(id) => setNotifications(prev => prev.filter(n => n.id !== id))}
              onClearAll={() => {
                setNotifications([]);
              }}
            />
          </Router>
        </ThemeProvider>
      );
    case 'new_project':
      // NOT DEMO MODE: For new projects, keep auto-running Setup Wizard as before.
      return (
        <ThemeProvider theme={createAppTheme(darkMode)}>
          <CssBaseline />
          <Router>
            <Setup onSetupComplete={() => window.location.reload()} />
          </Router>
        </ThemeProvider>
      );
    case 'existing_project':
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
                  <Route path="/self-improvement" element={<SelfImprovementPage />} />
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
            <SelfImprovementPanel
              open={showSelfImprovementPanel}
              onClose={() => setShowSelfImprovementPanel(false)}
            />
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
    case 'unknown':
      return (
        <ThemeProvider theme={createAppTheme(darkMode)}>
          <CssBaseline />
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <Typography>Error loading repository information</Typography>
          </Box>
        </ThemeProvider>
      );
    default:
      return (
        <ThemeProvider theme={createAppTheme(darkMode)}>
          <CssBaseline />
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <Typography>Loading repository information...</Typography>
          </Box>
        </ThemeProvider>
      );
  }
}

export default App;
