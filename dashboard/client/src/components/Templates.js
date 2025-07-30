import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Description as DescriptionIcon,
  Assignment as TaskIcon,
  Timeline as RoadmapIcon,
  BugReport as BugIcon,
  Code as CodeIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Download as DownloadIcon,
  Add as AddIcon
} from '@mui/icons-material';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`template-tabpanel-${index}`}
      aria-labelledby={`template-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const mockTemplates = {
  planning: [
    {
      id: 'roadmap',
      name: 'Product Roadmap',
      description: 'Strategic roadmap with stages, milestones, and epics',
      icon: <RoadmapIcon />,
      category: 'Planning',
      lastModified: '2024-01-15',
      size: '2.3 KB',
      content: `# Product Roadmap\n\n## Current Stage: STAGE-I - Foundation\n\n### Stages Overview\n- STAGE-I: Foundation — Status: Current\n- STAGE-II: Core Features — Status: Next\n- STAGE-III: Advanced Features — Status: Future\n- STAGE-IV: Optimization — Status: Future\n\n### Milestones\n1. **M1.1** - Basic Infrastructure (Week 1-2)\n2. **M1.2** - Core Components (Week 3-4)\n3. **M1.3** - Integration Testing (Week 5-6)`
    },
    {
      id: 'epic',
      name: 'Epic Template',
      description: 'Epic definitions with technical architecture and sprint breakdown',
      icon: <TaskIcon />,
      category: 'Planning',
      lastModified: '2024-01-14',
      size: '1.8 KB',
      content: `# Epic: [Epic Name]\n\n## Overview\n[Brief description of the epic]\n\n## Technical Architecture\n- Frontend: React components\n- Backend: Node.js APIs\n- Database: MongoDB collections\n\n## Sprint Breakdown\n### Sprint 1\n- Task 1: Setup infrastructure\n- Task 2: Create base components\n\n### Sprint 2\n- Task 3: Implement core features\n- Task 4: Add validation`
    },
    {
      id: 'user-stories',
      name: 'User Stories',
      description: 'Detailed requirements and user stories template',
      icon: <DescriptionIcon />,
      category: 'Planning',
      lastModified: '2024-01-13',
      size: '1.5 KB',
      content: `# User Stories\n\n## Epic: [Epic Name]\n\n### Story 1: [Story Title]\n**As a** [user type]\n**I want** [functionality]\n**So that** [benefit]\n\n**Acceptance Criteria:**\n- [ ] Criterion 1\n- [ ] Criterion 2\n- [ ] Criterion 3\n\n**Definition of Done:**\n- [ ] Code reviewed\n- [ ] Tests written\n- [ ] Documentation updated`
    }
  ],
  tasks: [
    {
      id: 'task-schema',
      name: 'Task Schema',
      description: 'Complete task schema including structure and types',
      icon: <CodeIcon />,
      category: 'Development',
      lastModified: '2024-01-15',
      size: '3.2 KB',
      content: `{\n  "task_id": "T-001",\n  "title": "Task Title",\n  "description": "Detailed task description",\n  "type": "feature|bug|test|docs",\n  "status": "pending|in_progress|review|done",\n  "priority": "low|medium|high|critical",\n  "agent": "Task-Coder|UI-Tester|Code-Reviewer",\n  "source_story_id": "US-001",\n  "created_at": "2024-01-15T10:00:00Z",\n  "updated_at": "2024-01-15T10:00:00Z",\n  "estimated_hours": 4,\n  "actual_hours": 0\n}`
    },
    {
      id: 'tasks-json',
      name: 'Tasks JSON',
      description: 'Central task list template for agent coordination',
      icon: <TaskIcon />,
      category: 'Development',
      lastModified: '2024-01-14',
      size: '2.1 KB',
      content: `{\n  "tasks": [\n    {\n      "task_id": "T-001",\n      "title": "Setup project structure",\n      "description": "Initialize the project with proper folder structure and dependencies",\n      "type": "feature",\n      "status": "pending",\n      "priority": "high",\n      "agent": "Task-Coder",\n      "source_story_id": "US-001",\n      "created_at": "2024-01-15T10:00:00Z"\n    }\n  ]\n}`
    }
  ],
  testing: [
    {
      id: 'test-plan',
      name: 'Test Plan',
      description: 'Test suite organization and planning template',
      icon: <BugIcon />,
      category: 'Testing',
      lastModified: '2024-01-12',
      size: '2.8 KB',
      content: `# Test Plan\n\n## Test Objectives\n- Verify core functionality\n- Ensure UI responsiveness\n- Validate data integrity\n\n## Test Scope\n### In Scope\n- User authentication\n- Data CRUD operations\n- UI components\n\n### Out of Scope\n- Performance testing\n- Load testing\n\n## Test Cases\n### TC-001: User Login\n**Objective:** Verify user can login successfully\n**Steps:**\n1. Navigate to login page\n2. Enter valid credentials\n3. Click login button\n**Expected:** User redirected to dashboard`
    },
    {
      id: 'ui-test-log',
      name: 'UI Test Log',
      description: 'UI test execution logs with browser automation results',
      icon: <ViewIcon />,
      category: 'Testing',
      lastModified: '2024-01-11',
      size: '1.9 KB',
      content: `# UI Test Execution Log\n\n## Test Session: 2024-01-15\n**Browser:** Chrome 120.0\n**Resolution:** 1920x1080\n**Environment:** Development\n\n### Test Results\n\n#### TC-001: Login Flow\n- **Status:** ✅ PASSED\n- **Duration:** 2.3s\n- **Screenshots:** login_success.png\n\n#### TC-002: Dashboard Load\n- **Status:** ✅ PASSED\n- **Duration:** 1.8s\n- **Screenshots:** dashboard_loaded.png\n\n### Summary\n- Total Tests: 2\n- Passed: 2\n- Failed: 0\n- Success Rate: 100%`
    }
  ]
};

function Templates() {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [viewDialog, setViewDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleViewTemplate = (template) => {
    setSelectedTemplate(template);
    setViewDialog(true);
  };

  const handleCloseDialog = () => {
    setViewDialog(false);
    setSelectedTemplate(null);
  };

  const handleDownloadTemplate = (template) => {
    const blob = new Blob([template.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.id}.template`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filterTemplates = (templates) => {
    if (!searchQuery) return templates;
    return templates.filter(template => 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const renderTemplateCard = (template) => (
    <Grid item xs={12} sm={6} md={4} key={template.id}>
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            {template.icon}
            <Typography variant="h6" sx={{ ml: 1 }}>
              {template.name}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {template.description}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Chip label={template.category} size="small" color="primary" />
            <Chip label={template.size} size="small" variant="outlined" />
          </Box>
          <Typography variant="caption" color="text.secondary">
            Last modified: {template.lastModified}
          </Typography>
        </CardContent>
        <CardActions>
          <Button
            size="small"
            startIcon={<ViewIcon />}
            onClick={() => handleViewTemplate(template)}
          >
            View
          </Button>
          <Button
            size="small"
            startIcon={<DownloadIcon />}
            onClick={() => handleDownloadTemplate(template)}
          >
            Download
          </Button>
        </CardActions>
      </Card>
    </Grid>
  );

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Templates
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Pre-built templates for planning, development, and testing workflows
        </Typography>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label="Planning" />
            <Tab label="Development" />
            <Tab label="Testing" />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={3}>
            {filterTemplates(mockTemplates.planning).map(renderTemplateCard)}
          </Grid>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <Grid container spacing={3}>
            {filterTemplates(mockTemplates.tasks).map(renderTemplateCard)}
          </Grid>
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <Grid container spacing={3}>
            {filterTemplates(mockTemplates.testing).map(renderTemplateCard)}
          </Grid>
        </TabPanel>
      </Paper>

      {/* Template View Dialog */}
      <Dialog
        open={viewDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {selectedTemplate?.icon}
            {selectedTemplate?.name}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {selectedTemplate?.description}
          </Typography>
          <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
            <Typography
              component="pre"
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}
            >
              {selectedTemplate?.content}
            </Typography>
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={() => handleDownloadTemplate(selectedTemplate)}
          >
            Download
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default Templates;