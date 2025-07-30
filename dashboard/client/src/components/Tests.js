import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  TextField,
  InputAdornment,
  Tab,
  Tabs,
  IconButton,
  Tooltip,
  Alert,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  BugReport as BugIcon,
  CheckCircle as PassIcon,
  Error as FailIcon,
  Warning as WarningIcon,
  Speed as PerformanceIcon,
  Security as SecurityIcon,
  PhoneAndroid as MobileIcon,
  Storage as DatabaseIcon,
  Code as UnitIcon,
  Visibility as VisibilityIcon,
  GetApp as DownloadIcon
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';

// Mock test data
const mockTests = [
  {
    id: 'TEST-001',
    name: 'User Authentication Flow',
    type: 'integration',
    status: 'passed',
    duration: '2.3s',
    lastRun: '2024-01-15T16:45:00Z',
    coverage: 95,
    relatedTasks: ['TASK-001'],
    description: 'Tests complete user authentication including login, logout, and token validation',
    environment: 'staging',
    suite: 'Authentication Suite'
  },
  {
    id: 'TEST-002',
    name: 'JWT Token Validation',
    type: 'unit',
    status: 'passed',
    duration: '0.8s',
    lastRun: '2024-01-15T16:45:00Z',
    coverage: 100,
    relatedTasks: ['TASK-001'],
    description: 'Unit tests for JWT token creation, validation, and expiry',
    environment: 'development',
    suite: 'Authentication Suite'
  },
  {
    id: 'TEST-003',
    name: 'Landing Page Responsiveness',
    type: 'ui',
    status: 'passed',
    duration: '5.1s',
    lastRun: '2024-01-15T14:30:00Z',
    coverage: 88,
    relatedTasks: ['TASK-002'],
    description: 'Tests landing page layout and responsiveness across different screen sizes',
    environment: 'staging',
    suite: 'UI Test Suite'
  },
  {
    id: 'TEST-004',
    name: 'Landing Page Performance',
    type: 'performance',
    status: 'warning',
    duration: '3.2s',
    lastRun: '2024-01-15T14:30:00Z',
    coverage: 75,
    relatedTasks: ['TASK-002'],
    description: 'Performance tests for landing page load times and resource optimization',
    environment: 'production',
    suite: 'Performance Suite'
  },
  {
    id: 'TEST-005',
    name: 'Mobile Navigation Menu',
    type: 'ui',
    status: 'failed',
    duration: '1.5s',
    lastRun: '2024-01-15T11:30:00Z',
    coverage: 60,
    relatedTasks: ['TASK-003'],
    description: 'Tests mobile navigation menu functionality and hamburger menu behavior',
    environment: 'mobile',
    suite: 'Mobile Test Suite'
  },
  {
    id: 'TEST-006',
    name: 'User Registration Validation',
    type: 'integration',
    status: 'passed',
    duration: '4.7s',
    lastRun: '2024-01-15T12:00:00Z',
    coverage: 92,
    relatedTasks: ['TASK-004'],
    description: 'End-to-end testing of user registration flow with validation',
    environment: 'staging',
    suite: 'Registration Suite'
  },
  {
    id: 'TEST-007',
    name: 'Registration Form Edge Cases',
    type: 'unit',
    status: 'passed',
    duration: '1.2s',
    lastRun: '2024-01-15T12:00:00Z',
    coverage: 98,
    relatedTasks: ['TASK-004'],
    description: 'Unit tests for registration form validation edge cases',
    environment: 'development',
    suite: 'Registration Suite'
  },
  {
    id: 'TEST-008',
    name: 'Registration Security Tests',
    type: 'security',
    status: 'passed',
    duration: '6.3s',
    lastRun: '2024-01-15T12:00:00Z',
    coverage: 85,
    relatedTasks: ['TASK-004'],
    description: 'Security tests for registration including SQL injection and XSS prevention',
    environment: 'staging',
    suite: 'Security Suite'
  },
  {
    id: 'TEST-009',
    name: 'Dashboard Navigation',
    type: 'ui',
    status: 'failed',
    duration: '5.1s',
    lastRun: '2024-01-15T14:25:00Z',
    coverage: 78,
    relatedTasks: ['TASK-003'],
    description: 'Validates navigation between dashboard sections and menu interactions',
    environment: 'staging',
    suite: 'UI Test Suite'
  },
  {
    id: 'TEST-010',
    name: 'API Response Validation',
    type: 'integration',
    status: 'passed',
    duration: '1.8s',
    lastRun: '2024-01-15T14:20:00Z',
    coverage: 88,
    relatedTasks: ['TASK-001', 'TASK-004'],
    description: 'Ensures API endpoints return correct data formats and status codes',
    environment: 'staging',
    suite: 'Integration Suite'
  },
  {
    id: 'TEST-011',
    name: 'Form Validation',
    type: 'unit',
    status: 'warning',
    duration: '3.2s',
    lastRun: '2024-01-15T14:15:00Z',
    coverage: 92,
    relatedTasks: ['TASK-002'],
    description: 'Tests input validation, error handling, and form submission',
    environment: 'development',
    suite: 'Unit Test Suite'
  },
  {
    id: 'TEST-012',
    name: 'Database Connection',
    type: 'integration',
    status: 'passed',
    duration: '4.5s',
    lastRun: '2024-01-15T14:10:00Z',
    coverage: 85,
    relatedTasks: ['TASK-004'],
    description: 'Verifies database connectivity and basic CRUD operations',
    environment: 'staging',
    suite: 'Integration Suite'
  }
];

const testSuites = [
  { name: 'All Tests', count: 8 },
  { name: 'Authentication Suite', count: 2 },
  { name: 'UI Test Suite', count: 1 },
  { name: 'Performance Suite', count: 1 },
  { name: 'Mobile Test Suite', count: 1 },
  { name: 'Registration Suite', count: 2 },
  { name: 'Security Suite', count: 1 }
];

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`test-tabpanel-${index}`}
      aria-labelledby={`test-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function Tests() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  // Get task parameter from URL query string
  const urlParams = new URLSearchParams(location.search);
  const taskFilter = urlParams.get('task');
  
  useEffect(() => {
    if (taskFilter) {
      // If there's a task filter, show only tests related to that task
      setSearchTerm('');
    }
  }, [taskFilter]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed':
        return <PassIcon sx={{ color: 'success.main' }} />;
      case 'failed':
        return <FailIcon sx={{ color: 'error.main' }} />;
      case 'warning':
        return <WarningIcon sx={{ color: 'warning.main' }} />;
      case 'running':
        return <RefreshIcon sx={{ color: 'info.main', animation: 'spin 1s linear infinite' }} />;
      default:
        return <WarningIcon sx={{ color: 'grey.500' }} />;
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'unit':
        return <UnitIcon />;
      case 'integration':
        return <BugIcon />;
      case 'ui':
        return <VisibilityIcon />;
      case 'performance':
        return <PerformanceIcon />;
      case 'security':
        return <SecurityIcon />;
      case 'mobile':
        return <MobileIcon />;
      case 'database':
        return <DatabaseIcon />;
      default:
        return <BugIcon />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'passed':
        return 'success';
      case 'failed':
        return 'error';
      case 'warning':
        return 'warning';
      case 'running':
        return 'info';
      default:
        return 'default';
    }
  };

  const filteredTests = mockTests.filter(test => {
    const matchesSearch = test.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         test.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         test.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by task if task parameter is present
    const matchesTask = !taskFilter || test.relatedTasks.includes(taskFilter);
    
    if (selectedTab === 0) return matchesSearch && matchesTask;
    
    const suiteName = testSuites[selectedTab]?.name;
    return matchesSearch && matchesTask && test.suite === suiteName;
  });

  const runTest = (testId) => {
    setRunningTests(prev => new Set([...prev, testId]));
    // Simulate test execution
    setTimeout(() => {
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete(testId);
        return newSet;
      });
    }, 3000);
  };

  const stopTest = (testId) => {
    setRunningTests(prev => {
      const newSet = new Set(prev);
      newSet.delete(testId);
      return newSet;
    });
  };

  const openTestDetails = (test) => {
    setSelectedTest(test);
    setDetailsOpen(true);
  };

  const getTestsForTask = (taskId) => {
    return mockTests.filter(test => test.relatedTasks.includes(taskId));
  };

  // Export function for use by other components
  window.getTestsForTask = getTestsForTask;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Test Management
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Monitor and manage test suites, view test results, and track test coverage across your project.
      </Typography>
      
      {taskFilter && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Showing tests related to task: <strong>{taskFilter}</strong>
          <Button 
            size="small" 
            onClick={() => navigate('/tests')}
            sx={{ ml: 2 }}
          >
            Clear Filter
          </Button>
        </Alert>
      )}

      {/* Search Bar */}
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search tests by name, description, or ID..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 3 }}
      />

      {/* Test Suite Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={selectedTab} onChange={(e, newValue) => setSelectedTab(newValue)}>
          {testSuites.map((suite, index) => (
            <Tab
              key={suite.name}
              label={`${suite.name} (${suite.count})`}
              id={`test-tab-${index}`}
              aria-controls={`test-tabpanel-${index}`}
            />
          ))}
        </Tabs>
      </Box>

      {/* Test Summary */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main">
                {mockTests.filter(t => t.status === 'passed').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Passed Tests
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="error.main">
                {mockTests.filter(t => t.status === 'failed').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Failed Tests
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="warning.main">
                {mockTests.filter(t => t.status === 'warning').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Warning Tests
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">
                {Math.round(mockTests.reduce((acc, test) => acc + test.coverage, 0) / mockTests.length)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Avg Coverage
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Test List */}
      <TabPanel value={selectedTab} index={selectedTab}>
        <Grid container spacing={2}>
          {filteredTests.map((test) => {
            const isRunning = runningTests.has(test.id);
            const currentStatus = isRunning ? 'running' : test.status;
            
            return (
              <Grid item xs={12} md={6} lg={4} key={test.id}>
                <Card 
                  sx={{ 
                    height: '100%',
                    cursor: 'pointer',
                    '&:hover': { boxShadow: 3 }
                  }}
                  onClick={() => openTestDetails(test)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      {getTypeIcon(test.type)}
                      <Typography variant="h6" sx={{ ml: 1, flexGrow: 1 }}>
                        {test.name}
                      </Typography>
                      {getStatusIcon(currentStatus)}
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {test.description}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                      <Chip 
                        label={test.id} 
                        size="small" 
                        variant="outlined"
                      />
                      <Chip 
                        label={test.type} 
                        size="small" 
                        color="primary"
                      />
                      <Chip 
                        label={currentStatus} 
                        size="small" 
                        color={getStatusColor(currentStatus)}
                      />
                    </Box>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Coverage: {test.coverage}%
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={test.coverage} 
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        Duration: {test.duration}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {isRunning ? (
                          <Tooltip title="Stop Test">
                            <IconButton 
                              size="small" 
                              onClick={(e) => {
                                e.stopPropagation();
                                stopTest(test.id);
                              }}
                            >
                              <StopIcon />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Run Test">
                            <IconButton 
                              size="small" 
                              onClick={(e) => {
                                e.stopPropagation();
                                runTest(test.id);
                              }}
                            >
                              <PlayIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </Box>
                    
                    {test.relatedTasks.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Related Tasks:
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {test.relatedTasks.map(taskId => (
                            <Chip 
                              key={taskId}
                              label={taskId}
                              size="small"
                              variant="outlined"
                              color="secondary"
                            />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </TabPanel>

      {/* Test Details Dialog */}
      <Dialog 
        open={detailsOpen} 
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedTest && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {getTypeIcon(selectedTest.type)}
                {selectedTest.name}
                {getStatusIcon(selectedTest.status)}
              </Box>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {selectedTest.description}
              </Typography>
              
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Test ID: {selectedTest.id}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Type: {selectedTest.type}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Status: {selectedTest.status}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Duration: {selectedTest.duration}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Coverage: {selectedTest.coverage}%
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Environment: {selectedTest.environment}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Last Run: {new Date(selectedTest.lastRun).toLocaleString()}
                  </Typography>
                </Grid>
              </Grid>
              
              {selectedTest.relatedTasks.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    Related Tasks
                  </Typography>
                  <List dense>
                    {selectedTest.relatedTasks.map(taskId => (
                      <ListItem key={taskId}>
                        <ListItemIcon>
                          <BugIcon />
                        </ListItemIcon>
                        <ListItemText primary={taskId} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailsOpen(false)}>
                Close
              </Button>
              <Button 
                variant="contained" 
                startIcon={<PlayIcon />}
                onClick={() => {
                  runTest(selectedTest.id);
                  setDetailsOpen(false);
                }}
              >
                Run Test
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}

export default Tests;