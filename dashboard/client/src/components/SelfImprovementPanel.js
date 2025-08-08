import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Paper,
  Tabs,
  Tab,
  Badge,
  Tooltip,
  Alert,
  Snackbar,
  CircularProgress
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  History as HistoryIcon,
  RotateLeft as RotateLeftIcon,
  Lightbulb as LightbulbIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  BugReport as BugReportIcon,
  Build as BuildIcon,
  School as SchoolIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';
import { api } from '../services/api';

const SelfImprovementPanel = ({ open, onClose }) => {
  const [learnings, setLearnings] = useState([]);
  const [changelog, setChangelog] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [selectedLearning, setSelectedLearning] = useState(null);
  const [showLearningDetails, setShowLearningDetails] = useState(false);
  const [showRevertDialog, setShowRevertDialog] = useState(false);
  const [selectedChange, setSelectedChange] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [diff, setDiff] = useState(null);
  const [isDiffVisible, setIsDiffVisible] = useState(false);

  useEffect(() => {
    if (open) {
      if (tabValue === 0) {
        fetchLearnings();
      } else if (tabValue === 1) {
        fetchChangelog();
      }
    }
  }, [open, tabValue]);

  const fetchLearnings = async () => {
    try {
      setLoading(true);
      const data = await api.getLearnings();
      setLearnings(data || []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch learnings. Please try again later.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchChangelog = async () => {
    try {
      setLoading(true);
      const data = await api.getAgentChangelog();
      setChangelog(data || {});
      setError(null);
    } catch (err) {
      setError('Failed to fetch changelog. Please try again later.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'security': return <SecurityIcon />;
      case 'performance': return <SpeedIcon />;
      case 'testing': return <BugReportIcon />;
      case 'deployment': return <BuildIcon />;
      case 'best_practice': return <SchoolIcon />;
      default: return <LightbulbIcon />;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'security': return 'error';
      case 'performance': return 'info';
      case 'testing': return 'warning';
      case 'deployment': return 'primary';
      case 'best_practice': return 'success';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const handleApproveLearning = async (learningId) => {
    try {
      await api.approveLearning(learningId);
      setSnackbar({ open: true, message: 'Learning approved successfully', severity: 'success' });
      fetchLearnings(); // Refresh the list
    } catch (err) {
      setSnackbar({ open: true, message: `Failed to approve learning: ${err.message}`, severity: 'error' });
    }
  };

  const handleRejectLearning = async (learning) => {
    try {
      await api.rejectLearning(learning.id);
      setSnackbar({ open: true, message: 'Learning rejected', severity: 'info' });
      fetchLearnings();
    } catch (err) {
      setSnackbar({ open: true, message: `Failed to reject learning: ${err.message}`, severity: 'error' });
    }
  };

  const handleViewDiff = async (agentName, commitHash) => {
    try {
      const diffData = await api.getAgentDiff(agentName, commitHash);
      setDiff(diffData.diff);
      setIsDiffVisible(true);
    } catch (err) {
      setSnackbar({ open: true, message: `Failed to fetch diff: ${err.message}`, severity: 'error' });
    }
  };

  const handleRevertAgent = async (agentName, commitHash) => {
    try {
      await api.revertAgent(agentName, commitHash);
      setSnackbar({ open: true, message: 'Agent reverted successfully', severity: 'success' });
      fetchChangelog();
    } catch (err) {
      setSnackbar({ open: true, message: `Failed to revert agent: ${err.message}`, severity: 'error' });
      
    }
  };

  const handleTriggerAgentImprover = async (learning) => {
    try {
      await api.triggerAgentImprover(learning.id);
      setSnackbar({ open: true, message: 'Agent Improver triggered', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: `Failed to trigger Agent Improver: ${err.message}`, severity: 'error' });
    }
  };

  const pendingLearnings = learnings.filter(l => l.status === 'pending_validation');
  const validatedLearnings = learnings.filter(l => l.status === 'validated');
  const appliedLearnings = learnings.filter(l => l.status === 'applied');

  const stats = {
    total: learnings.length,
    pending: pendingLearnings.length,
    validated: validatedLearnings.length,
    applied: appliedLearnings.length,
    changes: Object.keys(changelog).length,
    appliedChanges: 0 // This needs to be recalculated based on new data structure if needed
  };

  if (loading) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>Self-Improvement Panel</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h5">Self-Improvement Panel</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip 
                label={`${stats.total} Learnings`} 
                variant="outlined" 
                color="primary"
              />
              <Chip 
                label={`${stats.changes} Changes`} 
                variant="outlined" 
                color="secondary"
              />
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Stats Overview */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="text.secondary">Pending Review</Typography>
                  <Typography variant="h4" color="warning.main">{stats.pending}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="text.secondary">Validated</Typography>
                  <Typography variant="h4" color="success.main">{stats.validated}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="text.secondary">Applied</Typography>
                  <Typography variant="h4" color="primary.main">{stats.applied}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="text.secondary">Agent Changes</Typography>
                  <Typography variant="h4" color="secondary.main">{stats.appliedChanges}/{stats.changes}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 2 }}>
            <Tab 
              label={
                <Badge badgeContent={stats.pending} color="warning">
                  Learnings
                </Badge>
              } 
            />
            <Tab label="Changelog" />
          </Tabs>

          {tabValue === 0 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>Learnings</Typography>
              {learnings.length === 0 ? (
                <Typography>No pending learnings.</Typography>
              ) : (
                <List>
                  {learnings.map((learning) => (
                    <ListItem key={learning.id} divider>
                      <ListItemText
                        primary={learning.content}
                      />
                      <ListItemSecondaryAction>
                        <Button
                          variant="contained"
                          onClick={() => handleApproveLearning(learning.id)}
                        >
                          Approve
                        </Button>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          )}

          {tabValue === 1 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>Agent Changelog</Typography>
              {Object.keys(changelog).length === 0 ? (
                <Typography>No changelog available.</Typography>
              ) : (
                Object.entries(changelog).map(([agentName, commits]) => (
                  <Accordion key={agentName}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography>{agentName}</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <List>
                        {commits.map((commit) => (
                          <ListItem key={commit.hash} divider>
                            <ListItemText
                              primary={commit.message}
                              secondary={`${commit.author} - ${new Date(commit.date).toLocaleString()}`}
                            />
                            <Button sx={{ mr: 1 }} onClick={() => handleViewDiff(agentName, commit.hash)}>View Diff</Button>
                            <Button color="secondary" onClick={() => handleRevertAgent(agentName, commit.hash)}>Revert</Button>
                          </ListItem>
                        ))}
                      </List>
                    </AccordionDetails>
                  </Accordion>
                ))
              )}
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
          <Button onClick={tabValue === 0 ? fetchLearnings : fetchChangelog} variant="outlined">
            Refresh
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diff Dialog */}
      <Dialog open={isDiffVisible} onClose={() => setIsDiffVisible(false)} fullWidth maxWidth="md">
        <DialogTitle>Diff</DialogTitle>
        <DialogContent>
          <pre><code>{diff}</code></pre>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDiffVisible(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
        severity={snackbar.severity}
      />
    </>
  );
};

export default SelfImprovementPanel;
