import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Stepper,
  Step,
  StepLabel,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  PlayArrow as PlayArrowIcon,
  CheckCircle as CheckCircleIcon,
  Code as CodeIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon,
  Rocket as RocketIcon
} from '@mui/icons-material';
import { api } from '../services/api';
import toast from 'react-hot-toast';

const Setup = () => {
  const [repoStatus, setRepoStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    projectDescription: '',
    techStack: '',
    productVision: ''
  });
  const [simulationResult, setSimulationResult] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const steps = [
    'Project Description',
    'Technology Stack',
    'Product Vision',
    'Setup Execution'
  ];

  useEffect(() => {
    fetchRepoStatus();
  }, []);

  const fetchRepoStatus = async () => {
    try {
      // Use service helper if available, otherwise fallback to GET
      let statusResp;
      if (typeof api.getSetupStatus === 'function') {
        statusResp = await api.getSetupStatus();
      } else {
        statusResp = await api.get('/setup/status');
      }
      const data = statusResp?.data ?? statusResp;
      setRepoStatus(data);
    } catch (error) {
      console.error('Failed to fetch repo status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleSetup = async () => {
    setIsSimulating(true);
    try {
      // Prefer server-reported demoMode when available
      const isDemo = Boolean(repoStatus?.demoMode || repoStatus?.canSimulate);
      const endpoint = isDemo ? '/setup/simulate' : '/setup/execute';

      // Ensure we call the correct api method that maps to POST
      let response;
      if (isDemo && typeof api.simulateSetup === 'function') {
        response = await api.simulateSetup(formData);
      } else if (!isDemo && typeof api.executeSetup === 'function') {
        response = await api.executeSetup(formData);
      } else if (typeof api.post === 'function') {
        response = await api.post(endpoint, formData);
      } else if (typeof api.request === 'function') {
        response = await api.request('POST', endpoint, formData);
      } else {
        // Final fallback using fetch to guarantee request goes out
        const res = await fetch(`/api${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (!res.ok) throw new Error(`Setup request failed with status ${res.status}`);
        response = await res.json();
        setSimulationResult(response);
        if (activeStep !== steps.length - 1) setActiveStep(steps.length - 1);
        setIsSimulating(false);
        toast.success(isDemo ? 'Simulation completed' : 'Setup started');
        return;
      }

      // API helper may already return data or response.data depending on implementation
      const data = response?.data ?? response;
      if (!data || (isDemo && !data.steps)) {
        console.warn('Unexpected setup response shape:', data);
      }
      setSimulationResult(data);
      // Advance to report view if not already at the last step
      if (activeStep !== steps.length - 1) {
        setActiveStep(steps.length - 1);
      }
      toast.success(isDemo ? 'Simulation completed' : 'Setup started');
    } catch (error) {
      console.error('Setup failed:', error);
      toast.error(`Setup failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSimulating(false);
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Project Description"
              multiline
              rows={4}
              value={formData.projectDescription}
              onChange={(e) => handleInputChange('projectDescription', e.target.value)}
              placeholder="Describe your project, its purpose, and main goals..."
              helperText="This will be used to initialize Claude Code and guide the agent system"
            />
          </Box>
        );
      case 1:
        return (
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Technology Stack"
              value={formData.techStack}
              onChange={(e) => handleInputChange('techStack', e.target.value)}
              placeholder="e.g., React, Node.js, Python, Docker, AWS..."
              helperText="List the main technologies and frameworks you'll be using"
            />
          </Box>
        );
      case 2:
        return (
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Product Vision"
              multiline
              rows={6}
              value={formData.productVision}
              onChange={(e) => handleInputChange('productVision', e.target.value)}
              placeholder="Describe your product vision, target users, key features, and success metrics..."
              helperText="This will guide the Strategist agent in creating the initial roadmap"
            />
          </Box>
        );
      case 3:
        return (
          <Box sx={{ mt: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              {(repoStatus?.demoMode || repoStatus?.canSimulate)
                ? 'This is a template/demo repository. The setup will be simulated and show you what would happen in a real project.'
                : 'This will execute the actual setup process for your project repository.'}
            </Alert>
            <Typography variant="h6" gutterBottom>
              Setup Summary
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon><CodeIcon /></ListItemIcon>
                <ListItemText 
                  primary="Project" 
                  secondary={formData.projectDescription || 'Not specified'} 
                />
              </ListItem>
              <ListItem>
                <ListItemIcon><SettingsIcon /></ListItemIcon>
                <ListItemText 
                  primary="Tech Stack" 
                  secondary={formData.techStack || 'Not specified'} 
                />
              </ListItem>
              <ListItem>
                <ListItemIcon><RocketIcon /></ListItemIcon>
                <ListItemText 
                  primary="Vision" 
                  secondary={formData.productVision || 'Not specified'} 
                />
              </ListItem>
            </List>
          </Box>
        );
      default:
        return null;
    }
  };

  const renderSimulationResult = () => {
    if (!simulationResult) return null;

    return (
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {repoStatus?.canSimulate ? 'Setup Simulation Report' : 'Setup Execution Report'}
          </Typography>
          
          <Alert severity="success" sx={{ mb: 2 }}>
            {simulationResult.summary || (repoStatus?.demoMode || repoStatus?.canSimulate
              ? 'Setup simulation completed. Below are the steps that would have been executed in a real repository.'
              : 'Setup execution started.')}
          </Alert>

          <Typography variant="subtitle2" gutterBottom>
            Execution Steps:
          </Typography>

          {/* Show raw payload for debugging if steps missing to ensure something is visible */}
          {(!simulationResult.steps || simulationResult.steps.length === 0) && (
            <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.100', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(simulationResult, null, 2)}
            </Paper>
          )}
          
          {(simulationResult.steps || []).map((step, index) => (
            <Accordion key={index}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip label={`Step ${step.step}`} size="small" />
                  <Typography>{step.action}</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {step.description}
                  </Typography>
                  <Paper sx={{ p: 1, bgcolor: 'grey.100', fontFamily: 'monospace' }}>
                    <Typography variant="body2">
                      {step.command}
                    </Typography>
                  </Paper>
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (repoStatus?.isReady) {
    return (
      <Card>
        <CardContent>
          <Alert severity="success">
            <Typography variant="h6">Repository Already Configured</Typography>
            <Typography>
              This repository is already set up with Claude Code Agents. 
              You can use the dashboard to manage your agents and tasks.
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Claude Code Agents Setup
      </Typography>
      
      <Typography variant="body1" color="text.secondary" gutterBottom>
        {repoStatus?.canSimulate 
          ? 'Template Repository - Setup Simulation Mode'
          : 'New Project Repository - Real Setup Mode'}
      </Typography>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {renderStepContent(activeStep)}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
            >
              Back
            </Button>
            
            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleSetup}
                disabled={isSimulating || !formData.projectDescription}
                startIcon={isSimulating ? <CircularProgress size={20} /> : <PlayArrowIcon />}
              >
                {isSimulating ? 'Processing...' : (repoStatus?.canSimulate ? 'Simulate Setup' : 'Execute Setup')}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={activeStep === 0 && !formData.projectDescription}
              >
                Next
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {renderSimulationResult()}
    </Box>
  );
};

export default Setup;
