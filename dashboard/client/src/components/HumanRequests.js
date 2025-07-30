import React, { useState, useEffect, useRef } from 'react';
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
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
  Divider,
  Badge,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
  Slider
} from '@mui/material';
import {
  Person as PersonIcon,
  QuestionAnswer as QuestionIcon,
  BugReport as BugIcon,
  NewReleases as FeatureIcon,
  Psychology as StrategyIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Pending as PendingIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { ApiService } from '../services/api';
import WebSocketService from '../services/websocket';

const REQUEST_TYPES = {
  'agent_clarification': { icon: QuestionIcon, label: 'Agent Clarification', color: 'info' },
  'feature_request': { icon: FeatureIcon, label: 'Feature Request', color: 'success' },
  'bug_report': { icon: BugIcon, label: 'Bug Report', color: 'error' },
  'strategic_request': { icon: StrategyIcon, label: 'Strategic Request', color: 'warning' }
};

const PRIORITY_LEVELS = ['low', 'medium', 'high', 'urgent'];
const STATUS_OPTIONS = ['pending', 'in_progress', 'resolved'];

const HumanRequests = () => {
  const [humanRequests, setHumanRequests] = useState({ pending: [], in_progress: [], resolved: [] });
  const [rawContent, setRawContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    type: 'bug_report',
    priority: 'medium',
    description: '',
    context: '',
    requester: 'Human',
    status: 'pending'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const descriptionRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    loadHumanRequests();
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

  const loadHumanRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const content = await ApiService.getHumanRequests();
      setRawContent(content);
      setHumanRequests(ApiService.parseHumanRequests(content));
    } catch (err) {
      setError(err.message);
      console.error('Failed to load human requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const setupWebSocket = () => {
    WebSocketService.onHumanRequestsUpdate((updatedContent) => {
      setRawContent(updatedContent);
      setHumanRequests(ApiService.parseHumanRequests(updatedContent));
    });
  };

  const handleCreateRequest = async () => {
    try {
      const requestId = formData.id || `REQ-${Date.now()}`;
      // Auto-generate title from description if not provided
      const title = formData.title.trim() || formData.description.substring(0, 50) + (formData.description.length > 50 ? '...' : '');
      const newRequestMarkdown = generateRequestMarkdown({ ...formData, id: requestId, title });
      
      // Add to pending section
      const updatedContent = addRequestToMarkdown(rawContent, newRequestMarkdown, 'pending');
      
      await ApiService.updateHumanRequests(updatedContent);
      setRawContent(updatedContent);
      setHumanRequests(ApiService.parseHumanRequests(updatedContent));
      
      if (!editingRequest) {
        // Reset form and keep dialog open for new requests
        resetFormAndFocus();
      } else {
        handleCloseDialog();
      }
    } catch (err) {
      setError(`Failed to create request: ${err.message}`);
    }
  };

  const handleUpdateRequest = async () => {
    try {
      const updatedRequestMarkdown = generateRequestMarkdown(formData);
      const updatedContent = updateRequestInMarkdown(rawContent, editingRequest, updatedRequestMarkdown, formData.status);
      
      await ApiService.updateHumanRequests(updatedContent);
      setRawContent(updatedContent);
      setHumanRequests(ApiService.parseHumanRequests(updatedContent));
      handleCloseDialog();
    } catch (err) {
      setError(`Failed to update request: ${err.message}`);
    }
  };

  const generateRequestMarkdown = (request) => {
    const timestamp = new Date().toISOString().split('T')[0];
    return `### ${request.id}: ${request.title}

**Type:** ${REQUEST_TYPES[request.type]?.label || request.type}
**Priority:** ${request.priority.toUpperCase()}
**Requester:** ${request.requester || 'System'}
**Date:** ${timestamp}

**Description:**
${request.description}

**Context:**
${request.context}

**Status:** ${request.status}

---
`;
  };

  const addRequestToMarkdown = (content, newRequest, section) => {
    // Ensure content is a string to prevent indexOf errors
    const contentStr = typeof content === 'string' ? content : String(content || '');
    
    const sectionHeaders = {
      pending: '🔄 Pending Requests',
      in_progress: '🚀 In Progress',
      resolved: '✅ Resolved'
    };
    
    const sectionHeader = sectionHeaders[section];
    const sectionIndex = contentStr.indexOf(sectionHeader);
    
    if (sectionIndex === -1) {
      // If section doesn't exist, add it
      return contentStr + `\n\n## ${sectionHeader}\n\n${newRequest}`;
    }
    
    // Find the next section or end of content
    const nextSectionIndex = contentStr.indexOf('##', sectionIndex + sectionHeader.length);
    const insertIndex = nextSectionIndex === -1 ? contentStr.length : nextSectionIndex;
    
    return contentStr.slice(0, insertIndex) + `\n${newRequest}\n` + contentStr.slice(insertIndex);
  };

  const updateRequestInMarkdown = (content, oldRequest, newRequest, newStatus) => {
    // Ensure content is a string to prevent indexOf errors
    const contentStr = typeof content === 'string' ? content : String(content || '');
    
    // Remove old request
    const oldRequestStart = contentStr.indexOf(`### ${oldRequest.id}:`);
    if (oldRequestStart === -1) return contentStr;
    
    const oldRequestEnd = contentStr.indexOf('---', oldRequestStart) + 3;
    const contentWithoutOld = contentStr.slice(0, oldRequestStart) + contentStr.slice(oldRequestEnd);
    
    // Add updated request to appropriate section
    return addRequestToMarkdown(contentWithoutOld, newRequest, newStatus);
  };

  const handleOpenDialog = (request = null, status = 'pending') => {
    if (request) {
      setEditingRequest(request);
      // Parse request details from the request object
      const details = request.details.join('\n');
      const typeMatch = details.match(/\*\*Type:\*\* (.+)/)?.[1] || 'agent_clarification';
      const priorityMatch = details.match(/\*\*Priority:\*\* (.+)/)?.[1]?.toLowerCase() || 'medium';
      const requesterMatch = details.match(/\*\*Requester:\*\* (.+)/)?.[1] || '';
      const descriptionMatch = details.match(/\*\*Description:\*\*\n([\s\S]*?)\n\*\*Context:/)?.[1]?.trim() || '';
      const contextMatch = details.match(/\*\*Context:\*\*\n([\s\S]*?)\n\*\*Status:/)?.[1]?.trim() || '';
      
      setFormData({
        id: request.id,
        title: request.title.replace(`${request.id}: `, ''),
        type: Object.keys(REQUEST_TYPES).find(key => REQUEST_TYPES[key].label === typeMatch) || 'agent_clarification',
        priority: priorityMatch,
        description: descriptionMatch,
        context: contextMatch,
        requester: requesterMatch,
        status: status
      });
    } else {
      setEditingRequest(null);
      const autoId = `REQ-${Date.now()}`;
      setFormData({
        id: autoId,
        title: '',
        type: 'bug_report',
        priority: 'medium',
        description: '',
        context: '',
        requester: 'Human',
        status: 'pending'
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
    setEditingRequest(null);
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      if (formData.description.trim()) {
        if (!editingRequest) {
          handleCreateRequest();
        } else {
          handleUpdateRequest();
        }
      }
    } else if (event.key === 'Escape') {
      handleCloseDialog();
    }
  };

  const resetFormAndFocus = () => {
    const autoId = `REQ-${Date.now()}`;
    setFormData({
      id: autoId,
      title: '',
      type: 'bug_report',
      priority: 'medium',
      description: '',
      context: '',
      requester: 'Human',
      status: 'pending'
    });
    setTimeout(() => {
      if (descriptionRef.current) {
        descriptionRef.current.focus();
      }
    }, 100);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'resolved': return <CheckCircleIcon color="success" />;
      case 'in_progress': return <ScheduleIcon color="primary" />;
      case 'pending': return <PendingIcon color="warning" />;
      default: return <PendingIcon />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'resolved': return 'success';
      case 'in_progress': return 'primary';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const filterRequests = (requests) => {
    if (!searchQuery.trim()) return requests;
    
    return requests.filter(request => {
      const details = request.details.join('\n').toLowerCase();
      const query = searchQuery.toLowerCase();
      
      return (
        request.id.toLowerCase().includes(query) ||
        request.title.toLowerCase().includes(query) ||
        details.includes(query)
      );
    });
  };

  const RequestCard = ({ request, status }) => {
    const details = request.details.join('\n');
    const typeMatch = details.match(/\*\*Type:\*\* (.+)/)?.[1] || 'Unknown';
    const priorityMatch = details.match(/\*\*Priority:\*\* (.+)/)?.[1] || 'Medium';
    const requesterMatch = details.match(/\*\*Requester:\*\* (.+)/)?.[1] || 'Unknown';
    const dateMatch = details.match(/\*\*Date:\*\* (.+)/)?.[1] || 'Unknown';
    
    const requestType = Object.keys(REQUEST_TYPES).find(key => 
      REQUEST_TYPES[key].label === typeMatch
    ) || 'agent_clarification';
    
    const TypeIcon = REQUEST_TYPES[requestType]?.icon || QuestionIcon;
    
    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
            <TypeIcon 
              color={REQUEST_TYPES[requestType]?.color || 'default'} 
              sx={{ mr: 1, mt: 0.5 }} 
            />
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                {request.title}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                <Chip 
                  label={typeMatch} 
                  color={REQUEST_TYPES[requestType]?.color || 'default'} 
                  size="small" 
                />
                <Chip 
                  label={priorityMatch} 
                  color={getPriorityColor(priorityMatch)} 
                  size="small" 
                />
                <Chip 
                  label={status.replace('_', ' ').toUpperCase()} 
                  color={getStatusColor(status)} 
                  size="small" 
                />
              </Box>
              
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="body2">View Details</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Requester:</strong> {requesterMatch}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Date:</strong> {dateMatch}
                    </Typography>
                  </Box>
                  
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {request.details.slice(4).join('\n')}
                  </Typography>
                  
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      startIcon={<EditIcon />}
                      onClick={() => handleOpenDialog(request, status)}
                      size="small"
                    >
                      Edit
                    </Button>
                  </Box>
                </AccordionDetails>
              </Accordion>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  };

  const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Typography>Loading human requests...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Human Requests</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            onClick={() => handleOpenDialog()}
          >
            New Request
          </Button>
          <Tooltip title="Refresh Requests">
            <IconButton onClick={loadHumanRequests}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Search Bar */}
      <Box sx={{ mb: 3 }}>
        <TextField
          inputRef={searchRef}
          fullWidth
          placeholder="Search requests by title, description, or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                <SearchIcon color="action" />
              </Box>
            ),
          }}
        />
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
          <Tab 
            label={
              <Badge badgeContent={humanRequests.pending.length} color="warning">
                Pending
              </Badge>
            } 
          />
          <Tab 
            label={
              <Badge badgeContent={humanRequests.in_progress.length} color="primary">
                In Progress
              </Badge>
            } 
          />
          <Tab 
            label={
              <Badge badgeContent={humanRequests.resolved.length} color="success">
                Resolved
              </Badge>
            } 
          />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={activeTab} index={0}>
        {humanRequests.pending.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <PendingIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No pending requests
            </Typography>
            <Typography variant="body2" color="text.secondary">
              All requests have been addressed or moved to other statuses.
            </Typography>
          </Paper>
        ) : (
          filterRequests(humanRequests.pending).map((request, index) => (
            <RequestCard key={`pending-${index}`} request={request} status="pending" />
          ))
        )}
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        {humanRequests.in_progress.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <ScheduleIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No requests in progress
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Requests being worked on will appear here.
            </Typography>
          </Paper>
        ) : (
          filterRequests(humanRequests.in_progress).map((request, index) => (
            <RequestCard key={`in_progress-${index}`} request={request} status="in_progress" />
          ))
        )}
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        {humanRequests.resolved.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <CheckCircleIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No resolved requests
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Completed requests will appear here.
            </Typography>
          </Paper>
        ) : (
          filterRequests(humanRequests.resolved).map((request, index) => (
            <RequestCard key={`resolved-${index}`} request={request} status="resolved" />
          ))
        )}
      </TabPanel>

      {/* Request Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth onKeyDown={handleKeyPress}>
        <DialogTitle>
          {editingRequest ? 'Edit Request' : 'Create New Request'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Request ID"
              value={formData.id}
              fullWidth
              disabled
              helperText="Auto-generated unique identifier"
            />
            
            <FormControl component="fieldset">
              <FormLabel component="legend">Request Type</FormLabel>
              <RadioGroup
                row
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                {Object.entries(REQUEST_TYPES).map(([key, value]) => (
                  <FormControlLabel
                    key={key}
                    value={key}
                    control={<Radio />}
                    label={value.label}
                  />
                ))}
              </RadioGroup>
            </FormControl>
            
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <Box sx={{ flex: 1 }}>
                <Typography gutterBottom>Priority: {formData.priority.toUpperCase()}</Typography>
                <Slider
                  value={PRIORITY_LEVELS.indexOf(formData.priority)}
                  onChange={(e, value) => setFormData({ ...formData, priority: PRIORITY_LEVELS[value] })}
                  step={1}
                  marks
                  min={0}
                  max={PRIORITY_LEVELS.length - 1}
                  valueLabelDisplay="off"
                  sx={{ mt: 1 }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  {PRIORITY_LEVELS.map((level, index) => (
                    <Typography key={level} variant="caption" color="text.secondary">
                      {level.toUpperCase()}
                    </Typography>
                  ))}
                </Box>
              </Box>
              
              {editingRequest && (
                <FormControl sx={{ flex: 1 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    label="Status"
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    {STATUS_OPTIONS.map(status => (
                      <MenuItem key={status} value={status}>
                        {status.replace('_', ' ').toUpperCase()}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Box>
            
            <TextField
              inputRef={descriptionRef}
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={6}
              required
              placeholder="Describe the request in detail... (Press Enter to submit, Esc to close)"
              helperText="Focus will return here after creating a request for quick entry"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel (Esc)</Button>
          <Button 
            onClick={editingRequest ? handleUpdateRequest : handleCreateRequest}
            variant="contained"
            disabled={!formData.description.trim()}
          >
            {editingRequest ? 'Update' : 'Create (Enter)'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HumanRequests;