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
  MenuItem,
  Select,
  InputLabel,
  FormControl
} from '@mui/material';
import { X, FileText, Folder as FolderIcon, AlertCircle } from 'lucide-react';
import { useRef } from 'react';

interface AddFileDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (name: string, path: string, type: string) => void;
}

const AddFileDialog: React.FC<AddFileDialogProps> = ({ open, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const [type, setType] = useState('txt');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    if (name && path) {
      onAdd(name, path, type);
      setName('');
      setPath('');
      onClose();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
          const file = files[0];
          // We only get the name, but if we're on the same machine, 
          // we'll try to use the path if provided (though browser limits this)
          setPath(file.name);
          if (!name) setName(file.name.replace(/\.[^/.]+$/, ""));
      }
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
          // webkitRelativePath starts with the folder name
          const relativePath = files[0].webkitRelativePath;
          const folderName = relativePath.split('/')[0];
          setPath(folderName);
          if (!name) setName(folderName);
      }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" component="span">Add File / Folder Source</Typography>
        <IconButton onClick={onClose}><X size={20}/></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField 
            label="Source Name" 
            placeholder="e.g. system_backup" 
            fullWidth 
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <TextField 
                label="Selected Name/Path" 
                placeholder="Pick a file or folder..." 
                fullWidth 
                value={path}
                onChange={(e) => setPath(e.target.value)}
                helperText="Note: Browser picker only provides names. You may need to prepend the full server path."
                error={!path && name !== ''}
                />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                    <Button 
                        variant="outlined" 
                        size="small"
                        onClick={() => fileInputRef.current?.click()}
                        startIcon={<FileText size={16}/>}
                        sx={{ whiteSpace: 'nowrap' }}
                    >
                        Select File
                    </Button>
                    <Button 
                        variant="outlined" 
                        size="small"
                        onClick={() => folderInputRef.current?.click()}
                        startIcon={<FolderIcon size={16}/>}
                        sx={{ whiteSpace: 'nowrap' }}
                    >
                        Select Folder
                    </Button>
                </Box>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, bgcolor: 'rgba(255, 179, 0, 0.05)', borderRadius: 1, border: '1px solid rgba(255, 179, 0, 0.2)' }}>
                <AlertCircle size={18} color="#ffb300" />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Ensure the path is visible to the **Docker container**. You may need to mount it in `docker-compose.yml`.
                </Typography>
            </Box>
          </Box>

          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={handleFileChange} 
          />
          <input 
            type="file" 
            ref={folderInputRef} 
            style={{ display: 'none' }} 
            {...({ webkitdirectory: "true" } as any)} 
            onChange={handleFolderChange} 
          />
          <FormControl fullWidth>
            <InputLabel id="file-type-label">File Format</InputLabel>
            <Select
              labelId="file-type-label"
              value={type}
              label="File Format"
              onChange={(e) => setType(e.target.value)}
            >
              <MenuItem value="txt">Plain Text (.txt)</MenuItem>
              <MenuItem value="log">Log File (.log)</MenuItem>
              <MenuItem value="json">JSON (One object per line)</MenuItem>
              <MenuItem value="xml">XML (Record based)</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button onClick={handleAdd} variant="contained" color="primary" disabled={!name || !path}>Add Source</Button>
      </DialogActions>


    </Dialog>
  );
};

export default AddFileDialog;
