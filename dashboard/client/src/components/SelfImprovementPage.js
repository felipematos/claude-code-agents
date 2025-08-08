// v1.0.0 - Self-Improvement page component for routing
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
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
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
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

const SelfImprovementPage = () => {
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
  const [expandedLearnings, setExpandedLearnings] = useState(new Set());
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (tabValue === 0) {
      fetchLearnings();
    } else if (tabValue === 1) {
      fetchChangelog();
    }
  }, [tabValue]);

  const fetchLearnings = async () => {
    try {
      setLoading(true);
      const data = await api.getLearnings();
      setLearnings(data?.learnings || []);
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
      setDiff(diffData);
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
      setSnackbar({ open: true, message: 'Agent Improver triggered successfully', severity: 'success' });
      fetchLearnings();
    } catch (err) {
      setSnackbar({ open: true, message: `Failed to trigger Agent Improver: ${err.message}`, severity: 'error' });
    }
  };

  const truncateContent = (content, maxLength = 200) => {
    if (!content || typeof content !== 'string') return content || '';
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const toggleLearningExpansion = (learningId) => {
    const newExpanded = new Set(expandedLearnings);
    if (newExpanded.has(learningId)) {
      newExpanded.delete(learningId);
    } else {
      newExpanded.add(learningId);
    }
    setExpandedLearnings(newExpanded);
  };

  const getStatusBackgroundColor = (status) => {
    switch (status) {
      case 'pending_validation':
        return 'rgba(255, 193, 7, 0.08)'; // Light yellow/amber background
      case 'approved':
        return 'rgba(76, 175, 80, 0.08)'; // Light green background
      case 'rejected':
        return 'rgba(244, 67, 54, 0.08)'; // Light red background
      case 'applied':
        return 'rgba(33, 150, 243, 0.08)'; // Light blue background
      case 'processed':
        return 'rgba(156, 39, 176, 0.08)'; // Light purple background
      default:
        return 'transparent';
    }
  };

  const getFilteredLearnings = () => {
    if (statusFilter === 'all') {
      return learnings;
    }
    return learnings.filter(learning => {
      switch (statusFilter) {
        case 'pending':
          return learning.status === 'pending_validation';
        case 'approved':
          return learning.status === 'approved';
        case 'rejected':
          return learning.status === 'rejected';
        case 'processed':
          return learning.status === 'processed';
        default:
          return true;
      }
    });
  };

  // Calculate stats
  const stats = {
    pending: learnings.filter(l => l.status === 'pending_validation').length,
    approved: learnings.filter(l => l.status === 'approved').length,
    rejected: learnings.filter(l => l.status === 'rejected').length,
    processed: learnings.filter(l => l.status === 'processed').length,
    changes: learnings.filter(l => l.status === 'applied' || l.status === 'processed').length,
    appliedChanges: learnings.filter(l => l.status === 'applied' || l.status === 'processed').length
  };

  if (loading && tabValue === 0 && learnings.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Self-Improvement
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="text.secondary">Pending Learnings</Typography>
              <Typography variant="h4" color="warning.main">{stats.pending}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="text.secondary">Approved</Typography>
              <Typography variant="h4" color="success.main">{stats.approved}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="text.secondary">Rejected</Typography>
              <Typography variant="h4" color="error.main">{stats.rejected}</Typography>
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
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Learnings</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant={statusFilter === 'all' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setStatusFilter('all')}
              >
                All ({learnings.length})
              </Button>
              <Button
                variant={statusFilter === 'pending' ? 'contained' : 'outlined'}
                size="small"
                color="warning"
                onClick={() => setStatusFilter('pending')}
              >
                Pending ({stats.pending})
              </Button>
              <Button
                variant={statusFilter === 'approved' ? 'contained' : 'outlined'}
                size="small"
                color="success"
                onClick={() => setStatusFilter('approved')}
              >
                Approved ({stats.approved})
              </Button>
              <Button
                variant={statusFilter === 'rejected' ? 'contained' : 'outlined'}
                size="small"
                color="error"
                onClick={() => setStatusFilter('rejected')}
              >
                Rejected ({stats.rejected})
              </Button>
              <Button
                variant={statusFilter === 'processed' ? 'contained' : 'outlined'}
                size="small"
                color="secondary"
                onClick={() => setStatusFilter('processed')}
              >
                Processed ({stats.processed})
              </Button>
            </Box>
          </Box>
          {loading ? (
            <Box display="flex" justifyContent="center" p={2}>
              <CircularProgress />
            </Box>
          ) : getFilteredLearnings().length === 0 ? (
            <Typography>
              {statusFilter === 'all' ? 'No learnings available.' : `No ${statusFilter} learnings found.`}
            </Typography>
          ) : (
            <List>
              {getFilteredLearnings().map((learning) => {
                const isExpanded = expandedLearnings.has(learning.id);
                const content = learning.content || '';
                const shouldTruncate = content.length > 200;
                const displayContent = isExpanded || !shouldTruncate 
                  ? content 
                  : truncateContent(content);
                
                return (
                  <ListItem 
                    key={learning.id} 
                    divider
                    sx={{
                      backgroundColor: getStatusBackgroundColor(learning.status),
                      borderRadius: 1,
                      mb: 1,
                      '&:hover': {
                        backgroundColor: getStatusBackgroundColor(learning.status) !== 'transparent' 
                          ? getStatusBackgroundColor(learning.status).replace('0.08', '0.12')
                          : 'rgba(0, 0, 0, 0.04)'
                      }
                    }}
                  >
                    <ListItemIcon>
                      {getCategoryIcon(learning.category)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box>
                          <Typography 
                            variant="body1" 
                            sx={{ 
                              cursor: shouldTruncate ? 'pointer' : 'default',
                              '&:hover': shouldTruncate ? { color: 'primary.main' } : {}
                            }}
                            onClick={() => shouldTruncate && toggleLearningExpansion(learning.id)}
                          >
                            {displayContent}
                          </Typography>
                          {shouldTruncate && (
                            <Button 
                              size="small" 
                              variant="text" 
                              onClick={() => toggleLearningExpansion(learning.id)}
                              sx={{ mt: 0.5, p: 0, minWidth: 'auto' }}
                            >
                              {isExpanded ? 'Show less' : 'Show more'}
                            </Button>
                          )}
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Chip 
                            label={learning.category} 
                            color={getCategoryColor(learning.category)}
                            size="small"
                            sx={{ mr: 1 }}
                          />
                          <Chip 
                            label={`Priority: ${learning.priority}`}
                            color={getPriorityColor(learning.priority)}
                            size="small"
                            sx={{ mr: 1 }}
                          />
                          <Chip 
                            label={learning.status}
                            color={learning.status === 'pending_validation' ? 'warning' : 
                                   learning.status === 'approved' ? 'success' : 'default'}
                            size="small"
                          />
                          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                            From: {learning.author_agent} → To: {learning.destination_agent}
                          </Typography>
                          <Typography variant="caption" display="block">
                            Confidence: {learning.confidence_score}%
                          </Typography>
                        </Box>
                      }
                    />
                  <ListItemSecondaryAction>
                    {learning.status === 'pending_validation' && (
                      <Box>
                        <Tooltip title="Approve Learning">
                          <IconButton 
                            color="success" 
                            onClick={() => handleApproveLearning(learning.id)}
                            sx={{ mr: 1 }}
                          >
                            <CheckIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Reject Learning">
                          <IconButton 
                            color="error" 
                            onClick={() => handleRejectLearning(learning)}
                          >
                            <CloseIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                    {learning.status === 'approved' && (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleTriggerAgentImprover(learning)}
                      >
                        Apply
                      </Button>
                    )}
                  </ListItemSecondaryAction>
                </ListItem>
                );
              })}
            </List>
          )}
        </Paper>
      )}

      {tabValue === 1 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Agent Changelog</Typography>
          {loading ? (
            <Box display="flex" justifyContent="center" p={2}>
              <CircularProgress />
            </Box>
          ) : Object.keys(changelog).length === 0 ? (
            <Typography>No changelog available.</Typography>
          ) : (
            Object.entries(changelog).map(([agentName, commits]) => (
              <Accordion key={agentName}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">{agentName}</Typography>
                  <Badge badgeContent={commits.length} color="primary" sx={{ ml: 2 }} />
                </AccordionSummary>
                <AccordionDetails>
                  <List>
                    {commits.map((commit) => (
                      <ListItem key={commit.hash} divider>
                        <ListItemIcon>
                          <TimelineIcon />
                        </ListItemIcon>
                        <ListItemText
                          primary={commit.message}
                          secondary={`${commit.author} - ${new Date(commit.date).toLocaleString()}`}
                        />
                        <ListItemSecondaryAction>
                          <Button 
                            size="small" 
                            sx={{ mr: 1 }} 
                            onClick={() => handleViewDiff(agentName, commit.hash)}
                          >
                            View Diff
                          </Button>
                          <Button 
                            size="small"
                            color="secondary" 
                            onClick={() => handleRevertAgent(agentName, commit.hash)}
                          >
                            Revert
                          </Button>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            ))
          )}
        </Paper>
      )}

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
    </Box>
  );
};

export default SelfImprovementPage;
