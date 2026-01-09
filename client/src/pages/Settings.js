import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Avatar,
  IconButton
} from '@mui/material';
import {
  Person as ProfileIcon,
  Palette as ThemeIcon,
  SmartToy as AIIcon,
  CalendarMonth as CalendarIcon,
  Security as SecurityIcon,
  PhotoCamera as CameraIcon
} from '@mui/icons-material';
import { setTheme } from '../store/slices/uiSlice';
import { updateProfile } from '../store/slices/authSlice';
import api from '../services/api';
import { toast } from 'react-toastify';

const Settings = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { theme } = useSelector((state) => state.ui);
  
  const [activeTab, setActiveTab] = useState(0);
  const [profileData, setProfileData] = useState({ name: '', avatar: '' });
  const [llmProvider, setLlmProvider] = useState('');
  const [llmApiKey, setLlmApiKey] = useState('');
  const [llmConfigured, setLlmConfigured] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (user) {
      setProfileData({ name: user.name, avatar: user.avatar || '' });
    }
    checkLLMConfig();
    checkGoogleConnection();
  }, [user]);

  const checkLLMConfig = async () => {
    try {
      const response = await api.get('/llm/config');
      setLlmConfigured(response.data.configured);
      setLlmProvider(response.data.provider || '');
    } catch (error) {
      console.error('Failed to check LLM config:', error);
    }
  };

  const checkGoogleConnection = async () => {
    try {
      const response = await api.get('/calendar/status');
      setGoogleConnected(response.data.connected);
    } catch (error) {
      console.error('Failed to check Google connection:', error);
    }
  };

  const handleProfileUpdate = async () => {
    const result = await dispatch(updateProfile(profileData));
    if (updateProfile.fulfilled.match(result)) {
      toast.success('Profile updated successfully!');
    }
  };

  const handleThemeChange = (newTheme) => {
    dispatch(setTheme(newTheme));
    toast.success(`Theme changed to ${newTheme}`);
  };

  const handleLLMConfig = async () => {
    if (!llmProvider || !llmApiKey) {
      toast.error('Please select a provider and enter API key');
      return;
    }

    try {
      await api.post('/llm/config', {
        provider: llmProvider,
        apiKey: llmApiKey
      });
      toast.success('LLM configured successfully!');
      setLlmConfigured(true);
      setLlmApiKey('');
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to configure LLM');
    }
  };

  const handleLLMRemove = async () => {
    try {
      await api.delete('/llm/config');
      toast.success('LLM configuration removed');
      setLlmConfigured(false);
      setLlmProvider('');
    } catch (error) {
      toast.error('Failed to remove LLM configuration');
    }
  };

  const handleGoogleConnect = () => {
    window.location.href = `${process.env.REACT_APP_API_URL || ''}/api/auth/google`;
  };

  const handleGoogleDisconnect = async () => {
    try {
      await api.post('/auth/disconnect-google');
      toast.success('Google account disconnected');
      setGoogleConnected(false);
    } catch (error) {
      toast.error('Failed to disconnect Google account');
    }
  };

  const handlePasswordChange = async () => {
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      await api.post('/user/change-password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      });
      toast.success('Password changed successfully!');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to change password');
    }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Manage your account and preferences
      </Typography>

      <Card>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab icon={<ProfileIcon />} label="Profile" />
          <Tab icon={<ThemeIcon />} label="Appearance" />
          <Tab icon={<AIIcon />} label="AI Assistant" />
          <Tab icon={<CalendarIcon />} label="Google Calendar" />
          <Tab icon={<SecurityIcon />} label="Security" />
        </Tabs>

        <CardContent sx={{ p: 3 }}>
          {/* Profile Tab */}
          {activeTab === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Profile Information
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar
                  src={profileData.avatar}
                  alt={profileData.name}
                  sx={{ width: 80, height: 80, mr: 2 }}
                >
                  {profileData.name?.charAt(0).toUpperCase()}
                </Avatar>
                <IconButton color="primary" component="label">
                  <CameraIcon />
                  <input type="file" hidden accept="image/*" />
                </IconButton>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 500 }}>
                <TextField
                  label="Name"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="Email"
                  value={user?.email}
                  disabled
                  fullWidth
                  helperText="Email cannot be changed"
                />
                <Button variant="contained" onClick={handleProfileUpdate}>
                  Save Changes
                </Button>
              </Box>
            </Box>
          )}

          {/* Appearance Tab */}
          {activeTab === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Appearance Settings
              </Typography>
              
              <FormControl fullWidth sx={{ mt: 2, maxWidth: 500 }}>
                <InputLabel>Theme</InputLabel>
                <Select
                  value={theme}
                  onChange={(e) => handleThemeChange(e.target.value)}
                  label="Theme"
                >
                  <MenuItem value="light">Light</MenuItem>
                  <MenuItem value="dark">Dark</MenuItem>
                  <MenuItem value="auto">Auto (System)</MenuItem>
                </Select>
              </FormControl>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Choose your preferred color scheme
              </Typography>
            </Box>
          )}

          {/* AI Assistant Tab */}
          {activeTab === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                AI Assistant Configuration
              </Typography>

              {llmConfigured && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  AI Assistant is configured with {llmProvider}
                </Alert>
              )}

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 500, mt: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>LLM Provider</InputLabel>
                  <Select
                    value={llmProvider}
                    onChange={(e) => setLlmProvider(e.target.value)}
                    label="LLM Provider"
                    disabled={llmConfigured}
                  >
                    <MenuItem value="openai">OpenAI (GPT-4)</MenuItem>
                    <MenuItem value="deepseek">DeepSeek</MenuItem>
                  </Select>
                </FormControl>

                {!llmConfigured && (
                  <>
                    <TextField
                      label="API Key"
                      type="password"
                      value={llmApiKey}
                      onChange={(e) => setLlmApiKey(e.target.value)}
                      fullWidth
                      helperText="Your API key will be encrypted and stored securely"
                    />
                    <Button variant="contained" onClick={handleLLMConfig}>
                      Configure AI Assistant
                    </Button>
                  </>
                )}

                {llmConfigured && (
                  <Button variant="outlined" color="error" onClick={handleLLMRemove}>
                    Remove Configuration
                  </Button>
                )}

                <Divider sx={{ my: 2 }} />

                <Typography variant="body2" color="text.secondary">
                  <strong>How to get API keys:</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • OpenAI: Visit platform.openai.com/api-keys
                  <br />
                  • DeepSeek: Visit platform.deepseek.com
                </Typography>
              </Box>
            </Box>
          )}

          {/* Google Calendar Tab */}
          {activeTab === 3 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Google Calendar Integration
              </Typography>

              {googleConnected ? (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Google Calendar is connected
                </Alert>
              ) : (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Connect your Google account to sync tasks with Google Calendar
                </Alert>
              )}

              <Box sx={{ mt: 2 }}>
                {googleConnected ? (
                  <Button variant="outlined" color="error" onClick={handleGoogleDisconnect}>
                    Disconnect Google Account
                  </Button>
                ) : (
                  <Button variant="contained" onClick={handleGoogleConnect}>
                    Connect Google Account
                  </Button>
                )}
              </Box>

              <Divider sx={{ my: 3 }} />

              <Typography variant="body2" color="text.secondary">
                <strong>Features:</strong>
                <br />
                • Import events from Google Calendar as tasks
                <br />
                • Export tasks to Google Calendar
                <br />
                • Two-way synchronization
              </Typography>
            </Box>
          )}

          {/* Security Tab */}
          {activeTab === 4 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Change Password
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 500, mt: 2 }}>
                <TextField
                  label="Current Password"
                  type="password"
                  value={passwords.currentPassword}
                  onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="New Password"
                  type="password"
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="Confirm New Password"
                  type="password"
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                  fullWidth
                />
                <Button variant="contained" onClick={handlePasswordChange}>
                  Change Password
                </Button>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default Settings;

