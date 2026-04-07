import React, { useState } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField, 
  Box, 
  Typography,
  IconButton,
  Grid,
  MenuItem,
  FormControlLabel,
  Switch
} from '@mui/material';
import { X, Shield } from 'lucide-react';

interface AddDBDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (config: any) => void;
}

const AddDBDialog: React.FC<AddDBDialogProps> = ({ open, onClose, onAdd }) => {
  const [config, setConfig] = useState({
    name: '',
    dbType: 'PostgreSQL',
    host: '',
    port: '5432',
    username: '',
    password: '',
    dbName: '',
    ssl: false
  });

  const handleChange = (field: string, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleAdd = () => {
    onAdd(config);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Add Database Connection</Typography>
        <IconButton onClick={onClose}><X size={20}/></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ pt: 1 }}>
          <Grid item xs={6}>
            <TextField label="Connection Name" fullWidth value={config.name} onChange={(e) => handleChange('name', e.target.value)} />
          </Grid>
          <Grid item xs={6}>
            <TextField select label="DB Type" fullWidth value={config.dbType} onChange={(e) => handleChange('dbType', e.target.value)}>
              {['PostgreSQL', 'MySQL', 'Oracle', 'SQL Server'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={8}>
            <TextField label="Host" fullWidth value={config.host} onChange={(e) => handleChange('host', e.target.value)} />
          </Grid>
          <Grid item xs={4}>
            <TextField label="Port" fullWidth value={config.port} onChange={(e) => handleChange('port', e.target.value)} />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Username" fullWidth value={config.username} onChange={(e) => handleChange('username', e.target.value)} />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Password" type="password" fullWidth value={config.password} onChange={(e) => handleChange('password', e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Database Name" fullWidth value={config.dbName} onChange={(e) => handleChange('dbName', e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel 
                control={<Switch checked={config.ssl} onChange={(e) => handleChange('ssl', e.target.checked)} />} 
                label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Shield size={16} /> SSL Connection</Box>} 
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button onClick={handleAdd} variant="contained" color="primary">Save Connection</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddDBDialog;
