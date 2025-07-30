import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Alert,
  IconButton,
  Tooltip,
  Chip,
  Card,
  CardContent,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Tab,
  Tabs
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Timeline as TimelineIcon,
  Flag as FlagIcon,
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { ApiService } from '../services/api';
import WebSocketService from '../services/websocket';

const Roadmap = () => {
  const [roadmapContent, setRoadmapContent] = useState('');
  const [parsedRoadmap, setParsedRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    loadRoadmap();
    setupWebSocket();

    return () => {
      // WebSocket cleanup is handled in parent component
    };
  }, []);

  const loadRoadmap = async () => {
    try {
      setLoading(true);
      setError(null);
      const content = await ApiService.getRoadmap();
      setRoadmapContent(content);
      setParsedRoadmap(parseRoadmapContent(content));
    } catch (err) {
      setError(err.message);
      console.error('Failed to load roadmap:', err);
    } finally {
      setLoading(false);
    }
  };

  const setupWebSocket = () => {
    WebSocketService.onRoadmapUpdate((updatedContent) => {
      setRoadmapContent(updatedContent);
      setParsedRoadmap(parseRoadmapContent(updatedContent));
    });
  };

  const parseRoadmapContent = (content) => {
    const sections = {
      overview: '',
      stages: {
        past: [],
        current: [],
        next: [],
        future: []
      },
      epics: [],
      userStories: [],
      sprints: [],
      dependencies: [],
      risks: [],
      metrics: [],
      changelog: []
    };

    // Handle non-string content
    if (typeof content !== 'string') {
      console.warn('Roadmap content is not a string:', typeof content);
      return sections;
    }

    const lines = content.split('\n');
    let currentSection = null;
    let currentStage = null;
    let currentItem = null;

    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      // Section headers
      if (trimmedLine.startsWith('## Overview')) {
        currentSection = 'overview';
      } else if (trimmedLine.includes('Past Stages')) {
        currentSection = 'stages';
        currentStage = 'past';
      } else if (trimmedLine.includes('Current Stage')) {
        currentSection = 'stages';
        currentStage = 'current';
      } else if (trimmedLine.includes('Next Stage')) {
        currentSection = 'stages';
        currentStage = 'next';
      } else if (trimmedLine.includes('Future Stages')) {
        currentSection = 'stages';
        currentStage = 'future';
      } else if (trimmedLine.includes('Epics')) {
        currentSection = 'epics';
      } else if (trimmedLine.includes('User Stories')) {
        currentSection = 'userStories';
      } else if (trimmedLine.includes('Sprint Planning')) {
        currentSection = 'sprints';
      } else if (trimmedLine.includes('Dependencies & Risks')) {
        currentSection = 'dependencies';
      } else if (trimmedLine.includes('Metrics & KPIs')) {
        currentSection = 'metrics';
      } else if (trimmedLine.includes('Change Log')) {
        currentSection = 'changelog';
      }
      
      // Content parsing
      if (currentSection === 'overview' && trimmedLine && !trimmedLine.startsWith('#')) {
        sections.overview += line + '\n';
      } else if (currentSection === 'stages' && currentStage) {
        if (trimmedLine.startsWith('###')) {
          currentItem = {
            title: trimmedLine.replace('###', '').trim(),
            content: [],
            status: 'unknown'
          };
          sections.stages[currentStage].push(currentItem);
        } else if (currentItem && trimmedLine) {
          currentItem.content.push(line);
          
          // Determine status from content
          if (trimmedLine.includes('✅') || trimmedLine.includes('completed')) {
            currentItem.status = 'completed';
          } else if (trimmedLine.includes('🚀') || trimmedLine.includes('in progress')) {
            currentItem.status = 'in_progress';
          } else if (trimmedLine.includes('⏳') || trimmedLine.includes('planned')) {
            currentItem.status = 'planned';
          }
        }
      } else if (currentSection === 'epics' && trimmedLine.startsWith('-')) {
        sections.epics.push(trimmedLine.replace('-', '').trim());
      } else if (currentSection === 'userStories' && trimmedLine.startsWith('-')) {
        sections.userStories.push(trimmedLine.replace('-', '').trim());
      } else if (currentSection === 'sprints' && trimmedLine.startsWith('-')) {
        sections.sprints.push(trimmedLine.replace('-', '').trim());
      } else if (currentSection === 'dependencies' && trimmedLine.startsWith('-')) {
        sections.dependencies.push(trimmedLine.replace('-', '').trim());
      } else if (currentSection === 'metrics' && trimmedLine.startsWith('-')) {
        sections.metrics.push(trimmedLine.replace('-', '').trim());
      } else if (currentSection === 'changelog' && trimmedLine.startsWith('-')) {
        sections.changelog.push(trimmedLine.replace('-', '').trim());
      }
    });

    return sections;
  };



  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircleIcon color="success" />;
      case 'in_progress': return <ScheduleIcon color="primary" />;
      case 'planned': return <FlagIcon color="warning" />;
      default: return <AssignmentIcon color="action" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'primary';
      case 'planned': return 'warning';
      default: return 'default';
    }
  };

  const StageCard = ({ stage, title }) => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
          <TimelineIcon sx={{ mr: 1 }} />
          {title}
        </Typography>
        
        {stage.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No items in this stage
          </Typography>
        ) : (
          stage.map((item, index) => (
            <Accordion key={index} sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  {getStatusIcon(item.status)}
                  <Typography sx={{ ml: 1, flexGrow: 1 }}>
                    {item.title}
                  </Typography>
                  <Chip 
                    label={item.status.replace('_', ' ').toUpperCase()} 
                    color={getStatusColor(item.status)} 
                    size="small" 
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {item.content.join('\n')}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))
        )}
      </CardContent>
    </Card>
  );

  const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Typography>Loading roadmap...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Project Roadmap</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh Roadmap">
            <IconButton onClick={loadRoadmap}>
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

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Overview" />
          <Tab label="Stages" />
          <Tab label="Planning" />
          <Tab label="Raw Content" />
        </Tabs>
      </Box>

          {/* Tab Panels */}
          <TabPanel value={activeTab} index={0}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h5" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
                <TrendingUpIcon sx={{ mr: 1 }} />
                Project Overview
              </Typography>
              
              {parsedRoadmap?.overview ? (
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                  {parsedRoadmap.overview}
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No overview content available.
                </Typography>
              )}
            </Paper>
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <StageCard stage={parsedRoadmap?.stages.past || []} title="Past Stages" />
                <StageCard stage={parsedRoadmap?.stages.current || []} title="Current Stage" />
              </Grid>
              <Grid item xs={12} md={6}>
                <StageCard stage={parsedRoadmap?.stages.next || []} title="Next Stage" />
                <StageCard stage={parsedRoadmap?.stages.future || []} title="Future Stages" />
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={activeTab} index={2}>
            {/* Epics and User Stories */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                      <FlagIcon sx={{ mr: 1 }} />
                      Epics
                    </Typography>
                    <List>
                      {parsedRoadmap?.epics.length > 0 ? (
                        parsedRoadmap.epics.map((epic, index) => (
                          <ListItem key={index}>
                            <ListItemIcon>
                              <FlagIcon color="primary" />
                            </ListItemIcon>
                            <ListItemText primary={epic} />
                          </ListItem>
                        ))
                      ) : (
                        <ListItem>
                          <ListItemText 
                            primary="No epics defined" 
                            secondary="Epic stories will appear here"
                          />
                        </ListItem>
                      )}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                      <AssignmentIcon sx={{ mr: 1 }} />
                      User Stories
                    </Typography>
                    <List>
                      {parsedRoadmap?.userStories.length > 0 ? (
                        parsedRoadmap.userStories.map((story, index) => (
                          <ListItem key={index}>
                            <ListItemIcon>
                              <AssignmentIcon color="info" />
                            </ListItemIcon>
                            <ListItemText primary={story} />
                          </ListItem>
                        ))
                      ) : (
                        <ListItem>
                          <ListItemText 
                            primary="No user stories defined" 
                            secondary="User stories will appear here"
                          />
                        </ListItem>
                      )}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                      <AssignmentIcon sx={{ mr: 1 }} />
                      Sprint Planning
                    </Typography>
                    <List>
                      {parsedRoadmap?.sprints.length > 0 ? (
                        parsedRoadmap.sprints.map((sprint, index) => (
                          <ListItem key={index}>
                            <ListItemIcon>
                              <FlagIcon color="primary" />
                            </ListItemIcon>
                            <ListItemText primary={sprint} />
                          </ListItem>
                        ))
                      ) : (
                        <ListItem>
                          <ListItemText 
                            primary="No sprint information" 
                            secondary="Sprint details will appear here"
                          />
                        </ListItem>
                      )}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                      <WarningIcon sx={{ mr: 1 }} />
                      Dependencies & Risks
                    </Typography>
                    <List>
                      {parsedRoadmap?.dependencies.length > 0 ? (
                        parsedRoadmap.dependencies.map((dep, index) => (
                          <ListItem key={index}>
                            <ListItemIcon>
                              <WarningIcon color="warning" />
                            </ListItemIcon>
                            <ListItemText primary={dep} />
                          </ListItem>
                        ))
                      ) : (
                        <ListItem>
                          <ListItemText 
                            primary="No dependencies listed" 
                            secondary="Dependencies and risks will appear here"
                          />
                        </ListItem>
                      )}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                      <TrendingUpIcon sx={{ mr: 1 }} />
                      Metrics & KPIs
                    </Typography>
                    <List>
                      {parsedRoadmap?.metrics.length > 0 ? (
                        parsedRoadmap.metrics.map((metric, index) => (
                          <ListItem key={index}>
                            <ListItemIcon>
                              <TrendingUpIcon color="success" />
                            </ListItemIcon>
                            <ListItemText primary={metric} />
                          </ListItem>
                        ))
                      ) : (
                        <ListItem>
                          <ListItemText 
                            primary="No metrics defined" 
                            secondary="KPIs and metrics will appear here"
                          />
                        </ListItem>
                      )}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            
            {/* Change Log */}
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Recent Changes
                </Typography>
                <List>
                  {parsedRoadmap?.changelog.length > 0 ? (
                    parsedRoadmap.changelog.slice(0, 10).map((change, index) => (
                      <React.Fragment key={index}>
                        <ListItem>
                          <ListItemText primary={change} />
                        </ListItem>
                        {index < Math.min(parsedRoadmap.changelog.length - 1, 9) && <Divider />}
                      </React.Fragment>
                    ))
                  ) : (
                    <ListItem>
                      <ListItemText 
                        primary="No recent changes" 
                        secondary="Change history will appear here"
                      />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>
          </TabPanel>

          <TabPanel value={activeTab} index={3}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Raw Roadmap Content
              </Typography>
              <Box sx={{ 
                backgroundColor: 'grey.100', 
                p: 2, 
                borderRadius: 1,
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                whiteSpace: 'pre-wrap',
                overflow: 'auto',
                maxHeight: 600
              }}>
                {roadmapContent || 'No content available'}
              </Box>
            </Paper>
          </TabPanel>
    </Box>
  );
};

export default Roadmap;