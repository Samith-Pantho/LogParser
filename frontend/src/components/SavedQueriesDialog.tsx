import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  Box, 
  Typography, 
  IconButton, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon, 
  Button, 
  TextField,
  Checkbox,
  Tooltip
} from '@mui/material';
import { X, Plus, Trash2, Play, ScrollText } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, setSavedQueries, removeSavedQuery, SavedConnection, SavedQuery } from '../store/store';

interface SavedQueriesDialogProps {
  connection: SavedConnection | null;
  onClose: () => void;
}

const SavedQueriesDialog: React.FC<SavedQueriesDialogProps> = ({ connection, onClose }) => {
  const dispatch = useDispatch();
  const queries = useSelector((state: RootState) => connection ? (state.dashboard.savedQueries[connection.id] || []) : []);
  const [newName, setNewName] = useState('');
  const [newSQL, setNewSQL] = useState('');
  const [selectedQueries, setSelectedQueries] = useState<number[]>([]);

  useEffect(() => {
    if (connection) {
      fetchQueries();
    }
  }, [connection]);

  const fetchQueries = async () => {
    if (!connection) return;
    try {
      const resp = await fetch(`/api/sources/${connection.id}/queries`);
      const data = await resp.json();
      dispatch(setSavedQueries({ connectionId: connection.id, queries: data }));
    } catch (e) {
      console.error("Failed to fetch queries", e);
    }
  };

  const handleAddQuery = async () => {
    if (!connection || !newName || !newSQL) return;
    try {
      const resp = await fetch(`/api/sources/${connection.id}/queries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, query_text: newSQL })
      });
      if (resp.ok) {
        fetchQueries();
        setNewName('');
        setNewSQL('');
      }
    } catch (e) {
      console.error("Failed to add query", e);
    }
  };

  const handleDeleteQueries = async () => {
    if (!connection || selectedQueries.length === 0) return;
    if (!window.confirm(`Delete ${selectedQueries.length} query(s)?`)) return;

    try {
      await fetch('/api/sources/queries', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedQueries)
      });
      selectedQueries.forEach(id => {
        dispatch(removeSavedQuery({ connectionId: connection.id, queryId: id }));
      });
      setSelectedQueries([]);
    } catch (e) {
      console.error("Failed to delete queries", e);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedQueries(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  if (!connection) return null;

  return (
    <Dialog open={!!connection} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ScrollText size={20} color="#ff4081" />
            <Typography variant="h6">Saved Queries for {connection.name}</Typography>
        </Box>
        <IconButton onClick={onClose}><X size={20}/></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ mb: 3 }}>
           <Typography variant="subtitle2" sx={{ mb: 1 }}>ADD NEW QUERY</Typography>
           <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
              <TextField 
                placeholder="Query Name" 
                size="small" 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)}
                sx={{ flex: 1 }}
              />
              <Button variant="contained" startIcon={<Plus size={16}/>} onClick={handleAddQuery}>Add</Button>
           </Box>
           <TextField 
              placeholder="SELECT * FROM logs WHERE..." 
              multiline 
              rows={2} 
              fullWidth 
              size="small"
              value={newSQL}
              onChange={(e) => setNewSQL(e.target.value)}
            />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2">SAVED QUERIES ({queries.length})</Typography>
            {selectedQueries.length > 0 && (
                <Button 
                    variant="outlined" 
                    color="error" 
                    size="small" 
                    startIcon={<Trash2 size={14}/>}
                    onClick={handleDeleteQueries}
                >
                    Delete Selected ({selectedQueries.length})
                </Button>
            )}
        </Box>

        <List dense sx={{ bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 1 }}>
          {queries.map(q => (
            <ListItem key={q.id}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <Checkbox 
                    size="small" 
                    checked={selectedQueries.includes(q.id)} 
                    onChange={() => toggleSelect(q.id)}
                />
              </ListItemIcon>
              <ListItemText 
                primary={q.name} 
                secondary={q.query_text} 
                primaryTypographyProps={{ fontWeight: 'bold' }}
                secondaryTypographyProps={{ sx: { fontFamily: 'monospace', opacity: 0.7 } }}
              />
              <Tooltip title="Run Query">
                <IconButton size="small" color="primary">
                  <Play size={16} />
                </IconButton>
              </Tooltip>
            </ListItem>
          ))}
          {queries.length === 0 && (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">No saved queries found.</Typography>
              </Box>
          )}
        </List>
      </DialogContent>
    </Dialog>
  );
};

export default SavedQueriesDialog;
