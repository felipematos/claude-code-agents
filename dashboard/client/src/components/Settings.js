import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Divider,
  Alert,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Chip
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Wifi as WifiIcon,
  Storage as StorageIcon,
  Notifications as NotificationsIcon,
  Security as SecurityIcon,
  Webhook as WebhookIcon,
  PlayArrow as PlayArrowIcon
} from '@mui/icons-material';
import { WebSocketService } from '../services/websocket';
import { ApiService } from '../services/api';

function Settings() {
  const [settings, setSettings] = useState({
    autoRefresh: true,
    refreshInterval: 2000,
    notifications: true,
    darkMode: false,
    serverUrl: 'http://localhost:3002',
    websocketUrl: 'ws://localhost:3003',
    webhooks: {
      taskFinished: '',
      taskBlocked: '',
      witlRequest: '',
      humanRequestCreated: ''
    }
  });
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [serverHealth, setServerHealth] = useState(null);
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    loadSettings();
    checkServerHealth();
    
    // Monitor WebSocket connection status
    WebSocketService.onStatusChange((status) => {
      setConnectionStatus(status);
    });
  }, []);

  const loadSettings = () => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('dashboard-settings');
    if (savedSettings) {
      setSettings({ ...settings, ...JSON.parse(savedSettings) });
    }
  };

  const saveSettings = () => {
    try {
      localStorage.setItem('dashboard-settings', JSON.stringify(settings));
      setSaveStatus('Settings saved successfully!');
      setTimeout(() => setSaveStatus(''), 3000);
      
      // Trigger settings change event for theme update
      window.dispatchEvent(new Event('settings-changed'));
    } catch (error) {
      setSaveStatus('Failed to save settings');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  const checkServerHealth = async () => {
    try {
      const health = await ApiService.getHealth();
      setServerHealth(health);
    } catch (error) {
      setServerHealth({ status: 'error', message: 'Server unreachable' });
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const testConnection = () => {
    WebSocketService.disconnect();
    setTimeout(() => {
      WebSocketService.connect();
    }, 1000);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected': return 'success';
      case 'connecting': return 'warning';
      case 'disconnected': return 'error';
      default: return 'default';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <SettingsIcon />
        Settings
      </Typography>

      {saveStatus && (
        <Alert severity={saveStatus.includes('success') ? 'success' : 'error'} sx={{ mb: 2 }}>
          {saveStatus}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Connection Status */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              avatar={<WifiIcon />}
              title="Connection Status"
              action={
                <Chip
                  label={connectionStatus}
                  color={getStatusColor(connectionStatus)}
                  variant="outlined"
                />
              }
            />
            <CardContent>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  WebSocket: {connectionStatus}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Server: {serverHealth?.status || 'checking...'}
                </Typography>
              </Box>
              <Button
                variant="outlined"
                onClick={testConnection}
                size="small"
              >
                Test Connection
              </Button>
              <Button
                variant="outlined"
                onClick={checkServerHealth}
                size="small"
                sx={{ ml: 1 }}
              >
                Check Server
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Server Configuration */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              avatar={<StorageIcon />}
              title="Server Configuration"
            />
            <CardContent>
              <TextField
                fullWidth
                label="Server URL"
                value={settings.serverUrl}
                onChange={(e) => handleSettingChange('serverUrl', e.target.value)}
                margin="normal"
                size="small"
              />
              <TextField
                fullWidth
                label="WebSocket URL"
                value={settings.websocketUrl}
                onChange={(e) => handleSettingChange('websocketUrl', e.target.value)}
                margin="normal"
                size="small"
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Application Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              avatar={<NotificationsIcon />}
              title="Application Settings"
            />
            <CardContent>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoRefresh}
                    onChange={(e) => handleSettingChange('autoRefresh', e.target.checked)}
                  />
                }
                label="Auto Refresh"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.notifications}
                    onChange={(e) => handleSettingChange('notifications', e.target.checked)}
                  />
                }
                label="Enable Notifications"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.darkMode}
                    onChange={(e) => handleSettingChange('darkMode', e.target.checked)}
                  />
                }
                label="Dark Mode"
              />
              <TextField
                fullWidth
                label="Refresh Interval (ms)"
                type="number"
                value={settings.refreshInterval}
                onChange={(e) => handleSettingChange('refreshInterval', parseInt(e.target.value))}
                margin="normal"
                size="small"
                inputProps={{ min: 1000, max: 60000 }}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Orchestration Settings */}
        <Grid item xs={12}>
          <Card>
            <CardHeader
              avatar={<PlayArrowIcon />}
              title="Orchestration Configuration"
              subheader="Configure default settings for orchestration cycles"
            />
            <CardContent>
              <TextField
                fullWidth
                label="Default Claude Code Arguments"
                value={settings.orchestrationArgs || 'Start Orchestration Cycle. Keep looping it until current Sprint has no pending Tasks.'}
                onChange={(e) => handleSettingChange('orchestrationArgs', e.target.value)}
                margin="normal"
                size="small"
                multiline
                rows={3}
                helperText="Default arguments to pass to the orchestration system when starting a cycle"
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Webhook Settings */}
        <Grid item xs={12}>
          <Card>
            <CardHeader
              avatar={<WebhookIcon />}
              title="Webhook Configuration"
              subheader="Configure webhook URLs to be called when specific events occur"
            />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Task Finished Webhook"
                    value={settings.webhooks.taskFinished}
                    onChange={(e) => handleSettingChange('webhooks', {
                      ...settings.webhooks,
                      taskFinished: e.target.value
                    })}
                    margin="normal"
                    size="small"
                    placeholder="https://your-webhook-url.com/task-finished"
                    helperText="Called when a task is marked as finished"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Task Blocked Webhook"
                    value={settings.webhooks.taskBlocked}
                    onChange={(e) => handleSettingChange('webhooks', {
                      ...settings.webhooks,
                      taskBlocked: e.target.value
                    })}
                    margin="normal"
                    size="small"
                    placeholder="https://your-webhook-url.com/task-blocked"
                    helperText="Called when a task is blocked"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="WITL Request Webhook"
                    value={settings.webhooks.witlRequest}
                    onChange={(e) => handleSettingChange('webhooks', {
                      ...settings.webhooks,
                      witlRequest: e.target.value
                    })}
                    margin="normal"
                    size="small"
                    placeholder="https://your-webhook-url.com/witl-request"
                    helperText="Called when a WITL (Waiting In The Loop) request is created"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Human Request Created Webhook"
                    value={settings.webhooks.humanRequestCreated}
                    onChange={(e) => handleSettingChange('webhooks', {
                      ...settings.webhooks,
                      humanRequestCreated: e.target.value
                    })}
                    margin="normal"
                    size="small"
                    placeholder="https://your-webhook-url.com/human-request"
                    helperText="Called when a new human request is created"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* System Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              avatar={<SecurityIcon />}
              title="System Information"
            />
            <CardContent>
              <Typography variant="body2" gutterBottom>
                <strong>Dashboard Version:</strong> 1.0.0
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Client Port:</strong> 3001
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Server Port:</strong> 3002
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>WebSocket Port:</strong> 3003
              </Typography>
              {serverHealth && (
                <Typography variant="body2" gutterBottom>
                  <strong>Server Status:</strong> {serverHealth.status}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Save Button */}
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          onClick={saveSettings}
          size="large"
        >
          Save Settings
        </Button>
      </Box>
    </Container>
  );
}

export default Settings;