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
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
  IconButton,
  Autocomplete
} from '@mui/material';
import {
  PlayArrow as PlayArrowIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Terminal as TerminalIcon,
  Description as DescriptionIcon,
  Rocket as RocketIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const Setup = ({ onSetupComplete }) => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('checking'); // checking, blocked, wizard, executing, monitoring, complete
  const [wizardStep, setWizardStep] = useState(0);
  const [agentsInstalled, setAgentsInstalled] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [setupBlocked, setSetupBlocked] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false); // Prevent re-checks during execution
  
  const [formData, setFormData] = useState({
    // Step 1: Project Information
    projectName: '',
    projectDescription: '',
    projectType: '',
    
    // Step 2: Technical Details
    primaryLanguage: '',
    techStack: [],
    deploymentTarget: '',
    
    // Step 3: Business Context
    targetUsers: '',
    mainFeatures: [],
    successMetrics: '',
    timeline: ''
  });
  
  const [executionStatus, setExecutionStatus] = useState({
    currentStep: '',
    completedSteps: [],
    logs: [],
    error: null,
    terminalOutput: []
  });
  
  const [strategistSession, setStrategistSession] = useState({
    id: null,
    running: false,
    output: [],
    status: null
  });

  const wizardSteps = [
    'Project Information',
    'Technical Architecture',
    'Product Vision & Goals',
    'Review & Launch'
  ];

  const techStackSuggestions = [
    'React', 'Vue.js', 'Angular', 'Next.js',
    'Node.js', 'Express', 'FastAPI', 'Django',
    'PostgreSQL', 'MongoDB', 'MySQL', 'Redis',
    'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure',
    'GraphQL', 'REST API', 'WebSocket',
    'TypeScript', 'Python', 'Java', 'Go', 'Rust'
  ];

  useEffect(() => {
    // Only check prerequisites on initial mount, not during execution
    if (!isExecuting) {
      checkPrerequisites();
    }
  }, []);

  useEffect(() => {
    if (strategistSession.id) {
      // Set up WebSocket connection for monitoring
      const ws = new WebSocket(`ws://localhost:3003`);
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'strategist_output' && data.sessionId === strategistSession.id) {
          setStrategistSession(prev => ({
            ...prev,
            output: [...prev.output, data.data]
          }));
        } else if (data.type === 'strategist_complete' && data.sessionId === strategistSession.id) {
          setStrategistSession(prev => ({
            ...prev,
            running: false,
            status: data.exitCode === 0 ? 'completed' : 'failed'
          }));
          
          if (data.exitCode === 0) {
            setTimeout(() => {
              toast.success('Setup completed successfully!');
              setPhase('complete');
              // Only navigate/reload after user acknowledges completion
              // if (onSetupComplete) {
              //   onSetupComplete();
              // } else {
              //   navigate('/');
              // }
            }, 2000);
          }
        }
      };
      
      return () => ws.close();
    }
  }, [strategistSession.id, navigate]);

  const checkPrerequisites = async () => {
    // Skip if we're already executing
    if (isExecuting) {
      console.log('Skipping prerequisites check - already executing');
      return;
    }
    
    try {
      // Check if already initialized
      const initResponse = await api.get('/setup/check-initialized');
      const initData = initResponse.data || initResponse;
      
      if (initData.initialized) {
        toast.success('Project already initialized, redirecting to dashboard...');
        if (onSetupComplete) {
          setTimeout(() => onSetupComplete(), 1000);
        } else {
          setTimeout(() => navigate('/'), 1000);
        }
        return;
      }
      
      // Check for agents
      const agentResponse = await api.get('/setup/check-agents');
      const agentData = agentResponse.data || agentResponse;
      setAgentsInstalled(agentData.installed);
      
      if (!agentData.installed) {
        setSetupBlocked(true);
        setPhase('blocked');
      } else {
        setPhase('wizard');
      }
    } catch (error) {
      console.error('Failed to check prerequisites:', error);
      setPhase('wizard'); // Proceed anyway
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddFeature = () => {
    if (formData.mainFeatures.length < 5) {
      setFormData(prev => ({
        ...prev,
        mainFeatures: [...prev.mainFeatures, '']
      }));
    }
  };

  const handleUpdateFeature = (index, value) => {
    const newFeatures = [...formData.mainFeatures];
    newFeatures[index] = value;
    setFormData(prev => ({
      ...prev,
      mainFeatures: newFeatures
    }));
  };

  const handleRemoveFeature = (index) => {
    setFormData(prev => ({
      ...prev,
      mainFeatures: prev.mainFeatures.filter((_, i) => i !== index)
    }));
  };

  const validateStep = (step) => {
    switch (step) {
      case 0:
        return formData.projectName && formData.projectDescription && formData.projectType;
      case 1:
        return formData.primaryLanguage && formData.techStack.length > 0 && formData.deploymentTarget;
      case 2:
        return formData.targetUsers && formData.mainFeatures.filter(f => f).length >= 3 && formData.timeline;
      default:
        return true;
    }
  };

  const executeSetup = async () => {
    console.log('executeSetup called');
    
    // Prevent multiple executions
    if (isExecuting) {
      console.log('Already executing, skipping');
      return;
    }
    
    setIsExecuting(true);
    setPhase('executing');
    setExecutionStatus({
      currentStep: 'Initializing Claude Code...',
      completedSteps: [],
      logs: [],
      error: null,
      terminalOutput: []
    });

    try {
      console.log('Starting Claude Code initialization...');
      // Step 1: Initialize Claude Code with streaming
      // We need to use fetch with a POST request that triggers the SSE response
      const response = await fetch('http://localhost:3002/api/setup/init-claude-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      if (!response.ok && response.status !== 200) {
        throw new Error(`Failed to initialize Claude Code: ${response.statusText}`);
      }

      // For SSE, we need to read the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      await new Promise(async (resolve, reject) => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  
                  switch (data.type) {
                    case 'stdout':
                      setExecutionStatus(prev => ({
                        ...prev,
                        terminalOutput: [...prev.terminalOutput, { type: 'stdout', text: data.data }]
                      }));
                      break;
                      
                    case 'stderr':
                      setExecutionStatus(prev => ({
                        ...prev,
                        terminalOutput: [...prev.terminalOutput, { type: 'stderr', text: data.data }]
                      }));
                      break;
                      
                    case 'error':
                      reject(new Error(data.error || 'Claude Code initialization failed'));
                      return;
                      
                    case 'complete':
                      if (data.success) {
                        setExecutionStatus(prev => ({
                          ...prev,
                          completedSteps: [...prev.completedSteps, 'Claude Code initialized'],
                          currentStep: 'Configuring CLAUDE.md...',
                          terminalOutput: []
                        }));
                        resolve();
                      } else {
                        reject(new Error(data.error || 'Claude Code initialization failed'));
                      }
                      return;
                  }
                } catch (e) {
                  console.error('Failed to parse SSE data:', e);
                }
              }
            }
          }
        } catch (error) {
          reject(new Error('Connection lost during initialization'));
        }
      });
      
      // Step 2: Update CLAUDE.md
      const updateResponse = await api.post('/setup/update-claude-md');
      setExecutionStatus(prev => ({
        ...prev,
        completedSteps: [...prev.completedSteps, 'CLAUDE.md configured'],
        currentStep: 'Launching Strategist agent...'
      }));
      
      // Step 3: Launch Strategist
      const strategistResponse = await api.post('/setup/launch-strategist', {
        context: formData
      });
      
      setStrategistSession({
        id: strategistResponse.data.sessionId,
        running: true,
        output: [],
        status: 'running'
      });
      
      setExecutionStatus(prev => ({
        ...prev,
        completedSteps: [...prev.completedSteps, 'Strategist agent launched'],
        currentStep: 'Strategist is creating your product strategy...'
      }));
      
      setPhase('monitoring');
      
    } catch (error) {
      console.error('Setup failed:', error);
      setIsExecuting(false);
      setExecutionStatus(prev => ({
        ...prev,
        error: error.message || 'Setup failed',
        currentStep: ''
      }));
      setPhase('error');
      toast.error(error.message || 'Setup failed');
    }
  };

  const renderWizardStep = () => {
    switch (wizardStep) {
      case 0:
        return (
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Project Name"
              value={formData.projectName}
              onChange={(e) => handleInputChange('projectName', e.target.value)}
              placeholder="My Awesome Project"
              required
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              label="Project Description"
              multiline
              rows={4}
              value={formData.projectDescription}
              onChange={(e) => handleInputChange('projectDescription', e.target.value)}
              placeholder="A comprehensive platform that..."
              required
              sx={{ mb: 2 }}
            />
            
            <FormControl fullWidth required>
              <InputLabel>Project Type</InputLabel>
              <Select
                value={formData.projectType}
                onChange={(e) => handleInputChange('projectType', e.target.value)}
                label="Project Type"
              >
                <MenuItem value="Web Application">Web Application</MenuItem>
                <MenuItem value="Mobile App">Mobile App</MenuItem>
                <MenuItem value="API/Backend">API/Backend</MenuItem>
                <MenuItem value="Desktop Application">Desktop Application</MenuItem>
                <MenuItem value="Library/Framework">Library/Framework</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </Select>
            </FormControl>
          </Box>
        );
        
      case 1:
        return (
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth required sx={{ mb: 2 }}>
              <InputLabel>Primary Programming Language</InputLabel>
              <Select
                value={formData.primaryLanguage}
                onChange={(e) => handleInputChange('primaryLanguage', e.target.value)}
                label="Primary Programming Language"
              >
                <MenuItem value="JavaScript/TypeScript">JavaScript/TypeScript</MenuItem>
                <MenuItem value="Python">Python</MenuItem>
                <MenuItem value="PHP">PHP</MenuItem>
                <MenuItem value="Java">Java</MenuItem>
                <MenuItem value="Go">Go</MenuItem>
                <MenuItem value="Rust">Rust</MenuItem>
                <MenuItem value="C#">C#</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </Select>
            </FormControl>
            
            <Autocomplete
              multiple
              options={techStackSuggestions}
              value={formData.techStack}
              onChange={(e, newValue) => handleInputChange('techStack', newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Technology Stack"
                  placeholder="Type and select technologies"
                  required
                />
              )}
              sx={{ mb: 2 }}
            />
            
            <FormControl fullWidth required>
              <InputLabel>Deployment Target</InputLabel>
              <Select
                value={formData.deploymentTarget}
                onChange={(e) => handleInputChange('deploymentTarget', e.target.value)}
                label="Deployment Target"
              >
                <MenuItem value="Cloud (AWS/GCP/Azure)">Cloud (AWS/GCP/Azure)</MenuItem>
                <MenuItem value="Cloud (FPT)">Cloud (FPT)</MenuItem>
                <MenuItem value="On-Premise">On-Premise</MenuItem>
                <MenuItem value="Hybrid">Hybrid</MenuItem>
                <MenuItem value="Edge/IoT">Edge/IoT</MenuItem>
                <MenuItem value="Not decided">Not decided</MenuItem>
              </Select>
            </FormControl>
          </Box>
        );
        
      case 2:
        return (
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Target Users"
              multiline
              rows={3}
              value={formData.targetUsers}
              onChange={(e) => handleInputChange('targetUsers', e.target.value)}
              placeholder="Describe your primary user personas..."
              required
              sx={{ mb: 2 }}
            />
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Key Features (3-5 required)
              </Typography>
              {formData.mainFeatures.map((feature, index) => (
                <Box key={index} sx={{ display: 'flex', mb: 1 }}>
                  <TextField
                    fullWidth
                    value={feature}
                    onChange={(e) => handleUpdateFeature(index, e.target.value)}
                    placeholder={`Feature ${index + 1}`}
                  />
                  <IconButton onClick={() => handleRemoveFeature(index)}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}
              {formData.mainFeatures.length < 5 && (
                <Button
                  startIcon={<AddIcon />}
                  onClick={handleAddFeature}
                  variant="outlined"
                  size="small"
                >
                  Add Feature
                </Button>
              )}
            </Box>
            
            <TextField
              fullWidth
              label="Success Metrics"
              multiline
              rows={3}
              value={formData.successMetrics}
              onChange={(e) => handleInputChange('successMetrics', e.target.value)}
              placeholder="How will you measure success? (e.g., user adoption, performance metrics...)"
              sx={{ mb: 2 }}
            />
            
            <FormControl fullWidth required>
              <InputLabel>Expected Timeline</InputLabel>
              <Select
                value={formData.timeline}
                onChange={(e) => handleInputChange('timeline', e.target.value)}
                label="Expected Timeline"
              >
                <MenuItem value="ASAP (< 1 month)">ASAP (&lt; 1 month)</MenuItem>
                <MenuItem value="Short-term (1-3 months)">Short-term (1-3 months)</MenuItem>
                <MenuItem value="Medium-term (3-6 months)">Medium-term (3-6 months)</MenuItem>
                <MenuItem value="Long-term (6+ months)">Long-term (6+ months)</MenuItem>
              </Select>
            </FormControl>
          </Box>
        );
        
      case 3:
        return (
          <Box sx={{ mt: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Review your configuration. The system will automatically:
              <ul style={{ marginTop: 8, marginBottom: 0 }}>
                <li>Initialize Claude Code</li>
                <li>Configure CLAUDE.md with agent orchestrator</li>
                <li>Launch Strategist agent with your project context</li>
              </ul>
            </Alert>
            
            <Typography variant="h6" gutterBottom>
              Project Summary
            </Typography>
            
            <List dense>
              <ListItem>
                <ListItemText primary="Project Name" secondary={formData.projectName} />
              </ListItem>
              <ListItem>
                <ListItemText primary="Type" secondary={formData.projectType} />
              </ListItem>
              <ListItem>
                <ListItemText primary="Primary Language" secondary={formData.primaryLanguage} />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Tech Stack" 
                  secondary={formData.techStack.join(', ')} 
                />
              </ListItem>
              <ListItem>
                <ListItemText primary="Deployment" secondary={formData.deploymentTarget} />
              </ListItem>
              <ListItem>
                <ListItemText primary="Timeline" secondary={formData.timeline} />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Key Features" 
                  secondary={formData.mainFeatures.filter(f => f).join(', ')} 
                />
              </ListItem>
            </List>
          </Box>
        );
        
      default:
        return null;
    }
  };

  const renderExecutionPhase = () => (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h5" gutterBottom>
        Setting Up Your Project
      </Typography>
      
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {executionStatus.currentStep}
          </Typography>
          
          <List>
            {executionStatus.completedSteps.map((step, index) => (
              <ListItem key={index}>
                <ListItemIcon>
                  <CheckCircleIcon color="success" />
                </ListItemIcon>
                <ListItemText primary={step} />
              </ListItem>
            ))}
          </List>
          
          {/* Terminal Output */}
          {executionStatus.terminalOutput.length > 0 && (
            <Paper 
              sx={{ 
                p: 2, 
                mt: 2,
                bgcolor: '#1e1e1e', 
                color: '#d4d4d4',
                maxHeight: 300,
                overflow: 'auto',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                '& .stderr': {
                  color: '#f48771'
                },
                '& .stdout': {
                  color: '#d4d4d4'
                }
              }}
            >
              {executionStatus.terminalOutput.map((line, index) => (
                <div key={index} className={line.type}>
                  {line.text.split('\n').map((text, i) => (
                    text && <div key={`${index}-${i}`}>{text}</div>
                  ))}
                </div>
              ))}
            </Paper>
          )}
          
          {executionStatus.error ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              {executionStatus.error}
              <Box sx={{ mt: 1 }}>
                <Button 
                  variant="outlined" 
                  size="small" 
                  onClick={() => {
                    setPhase('wizard');
                    setWizardStep(3);
                    setExecutionStatus({
                      currentStep: '',
                      completedSteps: [],
                      logs: [],
                      error: null,
                      terminalOutput: []
                    });
                  }}
                >
                  Back to Setup
                </Button>
              </Box>
            </Alert>
          ) : (
            <LinearProgress sx={{ mt: 2 }} />
          )}
        </CardContent>
      </Card>
    </Box>
  );

  const renderMonitoringPhase = () => (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h5" gutterBottom>
        Strategist Agent Running
      </Typography>
      
      <Alert severity="info" sx={{ mb: 2 }}>
        The Strategist agent is creating your product strategy. This may take a few minutes.
      </Alert>
      
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <CircularProgress size={20} sx={{ mr: 2 }} />
            <Typography>
              {executionStatus.currentStep}
            </Typography>
          </Box>
          
          <Paper 
            sx={{ 
              p: 2, 
              bgcolor: 'grey.900', 
              color: 'grey.100',
              maxHeight: 400,
              overflow: 'auto',
              fontFamily: 'monospace',
              fontSize: '0.875rem'
            }}
          >
            {strategistSession.output.length === 0 ? (
              <Typography variant="body2">Waiting for output...</Typography>
            ) : (
              strategistSession.output.map((line, index) => (
                <div key={index}>{line}</div>
              ))
            )}
          </Paper>
          
          {strategistSession.status === 'completed' && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Setup completed successfully! Redirecting to dashboard...
            </Alert>
          )}
          
          {strategistSession.status === 'failed' && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Strategist agent encountered an error. Please check the logs above.
            </Alert>
          )}
        </CardContent>
      </Card>
    </Box>
  );

  if (phase === 'checking') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (phase === 'blocked') {
    return (
      <Card sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
        <CardContent>
          <Alert severity="error" icon={<ErrorIcon />}>
            <Typography variant="h6" gutterBottom>
              Agent Files Not Found
            </Typography>
            <Typography variant="body2" paragraph>
              The Claude Code Agents are not installed in your project.
            </Typography>
            <Typography variant="body2" paragraph>
              Please copy the agent files to <code>.claude/agents/</code> folder in your project root:
            </Typography>
            <Paper sx={{ p: 2, bgcolor: 'grey.100', mt: 2 }}>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                1. Download agents from the repository<br/>
                2. Create folder: mkdir -p .claude/agents<br/>
                3. Copy all .md files to .claude/agents/<br/>
                4. Refresh this page to continue
              </Typography>
            </Paper>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (phase === 'executing') {
    return renderExecutionPhase();
  }

  if (phase === 'monitoring') {
    return renderMonitoringPhase();
  }
  
  if (phase === 'complete') {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
        <Card>
          <CardContent>
            <Alert severity="success" icon={<CheckCircleIcon />}>
              <Typography variant="h6" gutterBottom>
                Setup Completed Successfully!
              </Typography>
              <Typography variant="body2" paragraph>
                Your Claude Code Agents system has been initialized and configured.
                The Strategist agent has created your initial product strategy.
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => {
                    if (onSetupComplete) {
                      onSetupComplete();
                    } else {
                      window.location.href = '/';
                    }
                  }}
                >
                  Go to Dashboard
                </Button>
              </Box>
            </Alert>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Wizard phase
  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Claude Code Agents Setup
      </Typography>
      
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Stepper activeStep={wizardStep} sx={{ mb: 3 }}>
            {wizardSteps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {renderWizardStep()}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button
              disabled={wizardStep === 0}
              onClick={() => setWizardStep(prev => prev - 1)}
              startIcon={<ArrowBackIcon />}
            >
              Back
            </Button>
            
            {wizardStep === wizardSteps.length - 1 ? (
              <Button
                type="button"
                variant="contained"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  executeSetup();
                }}
                disabled={!validateStep(wizardStep) || isExecuting}
                startIcon={<RocketIcon />}
              >
                {isExecuting ? 'Launching...' : 'Launch Setup'}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={() => setWizardStep(prev => prev + 1)}
                disabled={!validateStep(wizardStep)}
                endIcon={<ArrowForwardIcon />}
              >
                Next
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Setup;