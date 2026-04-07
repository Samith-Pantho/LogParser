import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Box, 
  Typography,
  IconButton,
  Breadcrumbs,
  Link,
  CircularProgress
} from '@mui/material';
import { Folder, FileText, ChevronRight, X, ArrowUp } from 'lucide-react';

interface FilePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  initialPath?: string;
}

const FilePicker: React.FC<FilePickerProps> = ({ open, onClose, onSelect, initialPath = "/" }) => {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [folders, setFolders] = useState<string[]>([]);
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchList = async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`/api/sources/ls?path=${encodeURIComponent(path)}`);
      const data = await resp.json();
      if (data.error) {
        setError(data.error);
      } else {
        setFolders(data.folders);
        setFiles(data.files);
        setCurrentPath(data.current_path);
      }
    } catch (e) {
      setError("Failed to fetch directory listing");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      // If we are on Windows, the default root should be C:\
      const startPath = currentPath === "/" && window.navigator.userAgent.includes("Windows") ? "C:\\" : currentPath;
      fetchList(startPath);
    }
  }, [open]);

  const handleFolderClick = (folder: string) => {
    const separator = currentPath.endsWith('/') || currentPath.endsWith('\\') ? '' : (currentPath.includes('\\') ? '\\' : '/');
    const nextPath = `${currentPath}${separator}${folder}`;
    fetchList(nextPath);
  };

  const handleUp = () => {
      // Simple parent directory logic
      const parts = currentPath.split(/[/\\]/).filter(Boolean);
      if (parts.length > 0) {
          parts.pop();
          const isWindows = currentPath.includes('\\');
          const newPath = currentPath.startsWith('/') ? '/' + parts.join('/') : parts.join('\\');
          const finalPath = newPath || (currentPath.startsWith('/') ? '/' : 'C:\\');
          fetchList(finalPath);
      }
  };

  const handleSelectFile = (file: string) => {
      const separator = currentPath.endsWith('/') || currentPath.endsWith('\\') ? '' : (currentPath.includes('\\') ? '\\' : '/');
      onSelect(`${currentPath}${separator}${file}`);
      onClose();
  };

  const breadcrumbs = currentPath.split(/[/\\]/).filter(Boolean);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" component="span">Select Log File</Typography>
        <IconButton onClick={onClose}><X size={20}/></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0, minHeight: 400, maxHeight: 600 }}>
        <Box sx={{ p: 2, bgcolor: 'background.default', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton size="small" onClick={handleUp} disabled={currentPath === '/' || currentPath === 'C:\\'}><ArrowUp size={18}/></IconButton>
          <Breadcrumbs separator={<ChevronRight size={14} />} sx={{ fontSize: '0.85rem' }}>
            <Link color="inherit" sx={{ cursor: 'pointer' }} onClick={() => fetchList('/')}>Root</Link>
            {breadcrumbs.map((part, i) => (
              <Typography key={i} color="text.primary" sx={{ fontSize: '0.85rem' }}>{part}</Typography>
            ))}
          </Breadcrumbs>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : error ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="error">{error}</Typography>
            <Button onClick={() => fetchList(currentPath)} sx={{ mt: 2 }}>Retry</Button>
          </Box>
        ) : (
          <List dense>
            {folders.map(folder => (
              <ListItem dense key={folder} disablePadding>
                <ListItemButton onClick={() => handleFolderClick(folder)}>
                  <ListItemIcon sx={{ minWidth: 36 }}><Folder size={20} color="#ffb300" /></ListItemIcon>
                  <ListItemText primary={folder} />
                </ListItemButton>
              </ListItem>
            ))}
            {files.map(file => (
              <ListItem dense key={file} disablePadding>
                <ListItemButton onClick={() => handleSelectFile(file)}>
                  <ListItemIcon sx={{ minWidth: 36 }}><FileText size={20} color="#00e5ff" /></ListItemIcon>
                  <ListItemText primary={file} />
                </ListItemButton>
              </ListItem>
            ))}
            {folders.length === 0 && files.length === 0 && (
                <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                    <Typography variant="body2">Empty directory or access denied</Typography>
                </Box>
            )}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};

export default FilePicker;
