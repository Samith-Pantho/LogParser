import React from 'react';
import { 
  Box, 
  Tabs, 
  Tab, 
  IconButton, 
  Paper, 
  TextField, 
  MenuItem, 
  Select, 
  Button, 
  InputAdornment, 
  Typography 
} from '@mui/material';
import { Search, X, Settings } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, removeTab, setActiveTab } from '../store/store';
import LogTable from './LogTable';
import SettingsDialog from './SettingsDialog';

const Dashboard: React.FC = () => {
  const { tabs, activeTabId } = useSelector((state: RootState) => state.dashboard);
  const dispatch = useDispatch();
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  const handleCloseTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(removeTab(id));
  };

  return (
    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: '#0d1117' }}>
      {/* Header bar */}
      <Box sx={{ p: 1, px: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', letterSpacing: 1, color: 'primary.main', fontSize: '1.2rem' }}>
            LOG<Box component="span" sx={{ color: 'white' }}>PARSER</Box>
          </Typography>
         <IconButton 
            onClick={() => setSettingsOpen(true)}
            sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
          >
            <Settings size={20} />
         </IconButton>
      </Box>

      {/* Tabs Header */}
      <Box sx={{ px: 1, pt: 0.5, display: 'flex', alignItems: 'center', bgcolor: '#161b22' }}>
        <Tabs 
          value={activeTabId || false} 
          onChange={(_: React.SyntheticEvent, val: any) => dispatch(setActiveTab(val as string))}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ minHeight: 36 }}
        >
          {tabs.map((tab: Tab) => (
            <Tab 
              key={tab.id}
              value={tab.id}
              icon={<IconButton component="div" size="small" onClick={(e: React.MouseEvent) => handleCloseTab(tab.id, e)} sx={{ ml: 1, color: tab.isBroken ? 'white' : 'inherit' }}><X size={12} /></IconButton>}
              iconPosition="end"
              label={`${tab.title}${tab.isBroken ? ' [DISCONNECTED]' : ''}`}
              sx={{ 
                minHeight: 36, 
                py: 0, 
                fontSize: '0.8rem', 
                textTransform: 'none', 
                borderRadius: '4px 4px 0 0', 
                mr: 0.5, 
                bgcolor: tab.isBroken ? 'error.dark' : (activeTabId === tab.id ? 'background.paper' : 'transparent'),
                color: tab.isBroken ? 'white !important' : 'inherit',
                border: '1px solid transparent', 
                borderBottom: 'none',
                opacity: tab.isBroken ? 0.9 : 1,
                '&:hover': {
                    bgcolor: tab.isBroken ? 'error.main' : undefined
                }
              }}
            />
          ))}
        </Tabs>
      </Box>

      {/* Toolbar */}
      <Paper sx={{ m: 2, p: 1, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 2 }}>
        <TextField 
          placeholder="Search logs by message, IP, or thread ID..."
          size="small"
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={18} />
              </InputAdornment>
            ),
          }}
        />
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">LEVEL:</Typography>
          <Select size="small" value="All" sx={{ minWidth: 100 }}>
             <MenuItem value="All">All</MenuItem>
             <MenuItem value="INFO">INFO</MenuItem>
             <MenuItem value="WARNING">WARNING</MenuItem>
             <MenuItem value="ERROR">ERROR</MenuItem>
             <MenuItem value="DEBUG">DEBUG</MenuItem>
          </Select>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">SORT:</Typography>
          <Select size="small" value="Date" sx={{ minWidth: 100 }}>
             <MenuItem value="Date">Date</MenuItem>
             <MenuItem value="Level">Level</MenuItem>
          </Select>
        </Box>

        <Button variant="contained" color="primary">Search</Button>
      </Paper>

      {/* Main Content (Log Viewer Area) */}
      <Box sx={{ flexGrow: 1, mx: 2, mb: 2, bgcolor: 'background.paper', borderRadius: 2, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activeTabId ? (
          <Box sx={{ flexGrow: 1, height: '100%' }}>
            <LogTable sourceId={activeTabId} />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Typography color="text.secondary">Select a log source from the sidebar to start monitoring.</Typography>
          </Box>
        )}
      </Box>

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </Box>
  );
};

export default Dashboard;
