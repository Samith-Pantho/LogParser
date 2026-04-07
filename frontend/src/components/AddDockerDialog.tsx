import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Box, 
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Chip
} from '@mui/material';
import { X, Container, RefreshCw, Plus } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';

interface ContainerInfo {
  id: string;
  name: string;
  status: string;
}

interface AddDockerDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (container: ContainerInfo) => void;
}

const AddDockerDialog: React.FC<AddDockerDialogProps> = ({ open, onClose, onAdd }) => {
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const { tabs } = useSelector((state: RootState) => state.dashboard);

  const fetchContainers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/docker/containers');
      if (!response.ok) {
        throw new Error(`Failed to fetch containers: ${response.statusText}`);
      }
      const data = await response.json();
      setContainers(data);
    } catch (e) {
      console.error("Error fetching containers:", e);
      setContainers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchContainers();
  }, [open]);

  const availableContainers = containers.filter(c => !tabs.some(t => t.id === c.id));

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" component="span">Select Docker Container</Typography>
        <Box>
            <IconButton onClick={fetchContainers} size="small" sx={{ mr: 1 }}><RefreshCw size={18} /></IconButton>
            <IconButton onClick={onClose} size="small"><X size={18}/></IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
        ) : availableContainers.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <Typography color="text.secondary">No new containers available.</Typography>
          </Box>
        ) : (
          <List>
            {availableContainers.map((c: ContainerInfo) => (
              <ListItem 
                key={c.id} 
                disablePadding
              >
                <Box sx={{ display: 'flex', alignItems: 'center', p: 1, width: '100%', gap: 2 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}><Container size={20} /></ListItemIcon>
                  <ListItemText 
                    primary={c.name} 
                    secondary={c.id.substring(0, 12)} 
                  />
                  <Chip 
                    label={c.status} 
                    size="small" 
                    color={c.status === 'running' ? 'success' : 'default'} 
                    sx={{ fontSize: 10 }}
                  />
                  <IconButton 
                    size="small" 
                    color="primary" 
                    onClick={() => onAdd(c)}
                    sx={{ ml: 'auto', bgcolor: 'rgba(0, 229, 255, 0.1)', '&:hover': { bgcolor: 'rgba(0, 229, 255, 0.2)' } }}
                  >
                    <Plus size={18} />
                  </IconButton>
                </Box>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddDockerDialog;
