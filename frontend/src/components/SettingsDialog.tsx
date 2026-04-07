import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Box, 
  TextField, 
  Typography, 
  Grid, 
  IconButton,
  Alert,
  CircularProgress
} from '@mui/material';
import { X, Save, RefreshCw } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, setSettings, SystemSetting } from '../store/store';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onClose }) => {
  const dispatch = useDispatch();
  const settings = useSelector((state: RootState) => state.dashboard.settings);
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchSettings();
    }
  }, [open]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings/');
      const data = await response.json();
      dispatch(setSettings(data));
      const sm: Record<string, string> = {};
      data.forEach((s: SystemSetting) => {
        sm[s.key] = s.value;
      });
      setLocalSettings(sm);
    } catch (e) {
      setError("Failed to fetch settings.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = (key: string, value: string) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = Object.entries(localSettings).map(([key, value]) => ({
        key,
        value
      }));
      const response = await fetch('/api/settings/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error("Save failed");
      
      // Update redux
      const updatedSettings = settings.map(s => ({
        ...s,
        value: localSettings[s.key] || s.value
      }));
      dispatch(setSettings(updatedSettings));
      onClose();
    } catch (e) {
      setError("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">System Settings</Typography>
        <IconButton onClick={onClose}><X size={20} /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ py: 1 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            
            <Typography variant="subtitle2" color="primary" sx={{ mb: 2, fontWeight: 'bold' }}>AI CONFIGURATION</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField 
                  label="AI Provider"
                  fullWidth
                  size="small"
                  value={localSettings['AI_PROVIDER'] || ''}
                  onChange={(e) => handleUpdate('AI_PROVIDER', e.target.value)}
                  placeholder="e.g. openai"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField 
                  label="API Key"
                  fullWidth
                  size="small"
                  type="password"
                  value={localSettings['AI_API_KEY'] || ''}
                  onChange={(e) => handleUpdate('AI_API_KEY', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField 
                  label="Base URL"
                  fullWidth
                  size="small"
                  value={localSettings['AI_BASE_URL'] || ''}
                  onChange={(e) => handleUpdate('AI_BASE_URL', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField 
                  label="Model Name"
                  fullWidth
                  size="small"
                  value={localSettings['AI_MODEL_NAME'] || ''}
                  onChange={(e) => handleUpdate('AI_MODEL_NAME', e.target.value)}
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 4, p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">
                    Note: Database connection settings (host, port, user) must be updated in the backend .env or container environment for security reasons.
                </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button startIcon={<RefreshCw size={16} />} onClick={fetchSettings} disabled={loading || saving}>Reload</Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button 
          variant="contained" 
          startIcon={saving ? <CircularProgress size={16} /> : <Save size={16} />} 
          onClick={handleSave}
          disabled={loading || saving}
        >
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SettingsDialog;
