import React from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Typography, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
  Alert
} from '@mui/material';
import { FileText, Database, Container, AlertTriangle } from 'lucide-react';
import { Tab } from '../store/store';

interface CleanupTabsDialogProps {
  open: boolean;
  affectedTabs: Tab[];
  onClose: () => void;
  onConfirm: (action: 'close' | 'keep') => void;
}

const CleanupTabsDialog: React.FC<CleanupTabsDialogProps> = ({ open, affectedTabs, onClose, onConfirm }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'warning.main' }}>
        <AlertTriangle size={24} />
        Cleanup Active Tabs
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" gutterBottom>
          The following open tabs are associated with the source you just deleted. 
          Would you like to close them or keep them open (marking them as disconnected)?
        </Typography>

        <Alert severity="warning" sx={{ my: 2 }}>
          Keeping tabs open will turn them <strong>Red</strong> to indicate the source is missing.
        </Alert>

        <List dense sx={{ bgcolor: 'rgba(0,0,0,0.1)', borderRadius: 1 }}>
          {affectedTabs.map((tab) => (
            <ListItem key={tab.id}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                {tab.type === 'file' && <FileText size={18} />}
                {tab.type === 'db' && <Database size={18} />}
                {tab.type === 'docker' && <Container size={18} />}
              </ListItemIcon>
              <ListItemText 
                primary={tab.title} 
                secondary={tab.source}
                primaryTypographyProps={{ variant: 'body2', fontWeight: 'bold' }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={() => onConfirm('keep')} color="inherit" sx={{ color: 'text.secondary' }}>
          Keep Open (Mark Red)
        </Button>
        <Button onClick={() => onConfirm('close')} variant="contained" color="error">
          Close All {affectedTabs.length} Tabs
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CleanupTabsDialog;
