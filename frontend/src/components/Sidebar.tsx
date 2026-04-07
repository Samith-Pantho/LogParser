import React from 'react';
import { Box, Typography, Divider, List, ListItem, ListItemIcon, ListItemText, ListItemButton, Collapse, IconButton } from '@mui/material';
import {
  FileText,
  Database,
  Container,
  Plus,
  ChevronDown,
  ChevronRight,
  Monitor,
  Trash2,
  ScrollText,
  RefreshCw
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, addTab, removeTab, markTabBroken, setSavedConnections, removeSavedConnection, SavedConnection, Tab } from '../store/store';
import AddFileDialog from './AddFileDialog';
import AddDBDialog from './AddDBDialog';
import AddDockerDialog from './AddDockerDialog';
import SavedQueriesDialog from './SavedQueriesDialog';
import CleanupTabsDialog from './CleanupTabsDialog';
import { wsService } from '../services/websocketService';

const Sidebar: React.FC = () => {
  const [openFiles, setOpenFiles] = React.useState(true);
  const [openDBs, setOpenDBs] = React.useState(true);
  const [openDocker, setOpenDocker] = React.useState(true);
  const [addFileOpen, setAddFileOpen] = React.useState(false);
  const [addDBOpen, setAddDBOpen] = React.useState(false);
  const [addDockerOpen, setAddDockerOpen] = React.useState(false);
  const [selectedConnForQueries, setSelectedConnForQueries] = React.useState<SavedConnection | null>(null);
  
  const [ingestedFSProjects, setIngestedFSProjects] = React.useState<string[]>([]);
  const [ingestedDBProjects, setIngestedDBProjects] = React.useState<string[]>([]);
  const [expandedProjects, setExpandedProjects] = React.useState<Record<string, { open: boolean, modules: string[], storage: 'file' | 'db' }>>({});

  const { tabs, activeTabId, savedConnections } = useSelector((state: RootState) => state.dashboard);
  const dispatch = useDispatch();

  const [cleanupOpen, setCleanupOpen] = React.useState(false);
  const [affectedTabs, setAffectedTabs] = React.useState<Tab[]>([]);
  const [pendingDelete, setPendingDelete] = React.useState<{ type: 'project' | 'connection', id: string | number } | null>(null);

  React.useEffect(() => {
    fetchConnections();
    fetchIngestedFS();
    fetchIngestedDB();
  }, []);

  const fetchConnections = async () => {
    try {
      const resp = await fetch('/api/sources/connections');
      const data = await resp.json();
      dispatch(setSavedConnections(data));
    } catch (e) {
      console.error("Failed to fetch connections", e);
    }
  };

  const fetchIngestedFS = async () => {
    try {
      const resp = await fetch('/api/logs/projects?storage=file');
      const data = await resp.json();
      setIngestedFSProjects(data);
    } catch (e) {
      console.error("Failed to fetch ingested FS projects", e);
    }
  };

  const fetchIngestedDB = async () => {
    try {
      const resp = await fetch('/api/logs/projects?storage=db');
      const data = await resp.json();
      setIngestedDBProjects(data);
    } catch (e) {
      console.error("Failed to fetch ingested DB projects", e);
    }
  };

  const handleDeleteConnection = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    // Check for affected tabs
    const related = tabs.filter(t => t.type === 'db' && t.id.startsWith(`db-${id}`));
    
    if (related.length > 0) {
        setAffectedTabs(related);
        setPendingDelete({ type: 'connection', id });
        setCleanupOpen(true);
    } else {
        if (!window.confirm("Are you sure? This will delete all associated queries.")) return;
        executeDeleteConnection(id);
    }
  };

  const executeDeleteConnection = async (id: number) => {
    try {
      await fetch(`/api/sources/connections/${id}`, { method: 'DELETE' });
      dispatch(removeSavedConnection(id));
    } catch (e: any) {
      console.error("Failed to delete connection", e);
    }
  };

  const toggleProject = async (project: string, storage: 'file' | 'db') => {
    const isExpanded = expandedProjects[project]?.open;
    
    if (!isExpanded && (!expandedProjects[project] || expandedProjects[project].modules.length === 0)) {
        try {
            const resp = await fetch(`/api/logs/modules?project=${encodeURIComponent(project)}&storage=${storage}`);
            const modules = await resp.json();
            setExpandedProjects((prev: Record<string, any>) => ({
                ...prev,
                [project]: { open: true, modules, storage }
            }));
        } catch (e) {
            console.error("Failed to fetch modules", e);
        }
    } else {
        setExpandedProjects((prev: Record<string, any>) => ({
            ...prev,
            [project]: { ...prev[project], open: !isExpanded }
        }));
    }
  };

  const handleSelectIngestedModule = (project: string, module: string, storage: 'file' | 'db') => {
    const tabId = `ingested-${storage}-${project}-${module}`;
    dispatch(addTab({ 
        id: tabId, 
        title: `${project}/${module}`, 
        type: storage === 'file' ? 'file' : 'db', 
        source: `ingested:${project}:${module}`,
        project,
        module,
        storage
    }));
    
    wsService.sendMessage({ 
        action: 'start', 
        sourceType: 'ingested', 
        sourceId: tabId, 
        project, 
        module,
        storage
    });
  };

  const handleDeleteProject = async (project: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Check for affected tabs
    const related = tabs.filter(t => t.project === project);
    
    if (related.length > 0) {
        setAffectedTabs(related);
        setPendingDelete({ type: 'project', id: project });
        setCleanupOpen(true);
    } else {
        if (!window.confirm(`Are you sure you want to delete project "${project}"?`)) return;
        executeDeleteProject(project);
    }
  };

  const executeDeleteProject = async (project: string) => {
    try {
      await fetch(`/api/logs/projects/${encodeURIComponent(project)}`, { method: 'DELETE' });
      fetchIngestedFS();
      fetchIngestedDB();
    } catch (e) {
      console.error("Failed to delete project", e);
    }
  };

  const handleCleanupConfirm = (action: 'close' | 'keep') => {
    if (action === 'close') {
      affectedTabs.forEach(tab => dispatch(removeTab(tab.id)));
    } else {
      affectedTabs.forEach(tab => dispatch(markTabBroken(tab.id)));
    }

    // Finalize deletion
    if (pendingDelete?.type === 'project') {
      executeDeleteProject(pendingDelete.id as string);
    } else if (pendingDelete?.type === 'connection') {
      executeDeleteConnection(pendingDelete.id as number);
    }

    setCleanupOpen(false);
    setAffectedTabs([]);
    setPendingDelete(null);
  };

  const handleAddFile = (name: string, path: string, format: string) => {
    dispatch(addTab({ id: name, title: name, type: 'file', source: path }));
    wsService.sendMessage({ action: 'start', sourceType: 'file', sourceId: path, fileType: format });
  };

  const handleAddDB = async (config: any) => {
    try {
      const resp = await fetch('/api/sources/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const newConn = await resp.json();
      dispatch(setSavedConnections([...savedConnections, newConn]));
      dispatch(addTab({ id: `db-${newConn.id}`, title: newConn.name, type: 'db', source: newConn.db_name }));
    } catch (e) {
      console.error("Failed to add connection", e);
    }
  };

  const handleAddDocker = (container: any) => {
    dispatch(addTab({ id: container.id, title: container.name, type: 'docker', source: container.id }));
    wsService.sendMessage({ action: 'start', sourceType: 'docker', sourceId: container.id });
  };

  return (
    <Box sx={{ width: 260, height: '100vh', bgcolor: 'background.paper', borderRight: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Monitor color="#00e5ff" size={32} />
      </Box>
      <Divider />

      <List sx={{ flexGrow: 1, overflowY: 'auto' }}>
        {/* FILE LOGS SECTION */}
        <ListItem disablePadding sx={{ px: 2, pt: 2, pb: 1 }}>
          <Typography variant="overline" color="text.secondary" sx={{ flexGrow: 1 }}>FILE LOGS</Typography>
          <IconButton size="small" onClick={fetchIngestedFS}>
            <RefreshCw size={14} />
          </IconButton>
          <IconButton size="small" onClick={() => setOpenFiles(!openFiles)}>
            {openFiles ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </IconButton>
        </ListItem>
        <Collapse in={openFiles}>
          {ingestedFSProjects.map((project: string) => (
            <Box key={project} sx={{ '&:hover .proj-actions': { opacity: 1 } }}>
                <ListItem
                    disablePadding
                    secondaryAction={
                        <IconButton 
                            className="proj-actions"
                            size="small" 
                            onClick={(e: React.MouseEvent) => handleDeleteProject(project, e)}
                            sx={{ opacity: 0, transition: 'opacity 0.2s', color: 'error.main' }}
                        >
                            <Trash2 size={14} />
                        </IconButton>
                    }
                >
                    <ListItemButton onClick={() => toggleProject(project, 'file')} sx={{ pl: 4 }}>
                        <ListItemIcon sx={{ minWidth: 28 }}>
                            {expandedProjects[project]?.open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </ListItemIcon>
                        <ListItemText 
                            primary={project} 
                            primaryTypographyProps={{ variant: 'body2', fontWeight: 500, sx: { textTransform: 'capitalize' } }} 
                        />
                    </ListItemButton>
                </ListItem>
                <Collapse in={expandedProjects[project]?.open}>
                    <List disablePadding>
                        {(expandedProjects[project]?.modules || []).map((module: string) => (
                            <ListItemButton 
                                key={module} 
                                sx={{ pl: 8, py: 0.5 }}
                                onClick={() => handleSelectIngestedModule(project, module, 'file')}
                            >
                                <ListItemIcon sx={{ minWidth: 24 }}><FileText size={14} color="#00e5ff" /></ListItemIcon>
                                <ListItemText 
                                    primary={module} 
                                    primaryTypographyProps={{ variant: 'caption', sx: { textTransform: 'capitalize' } }} 
                                />
                                <Box sx={{ px: 0.8, py: 0.1, bgcolor: 'rgba(0, 229, 255, 0.1)', borderRadius: 1, fontSize: 9, color: '#00e5ff', ml: 1 }}>Live</Box>
                            </ListItemButton>
                        ))}
                    </List>
                </Collapse>
            </Box>
          ))}
        </Collapse>

        {/* DATABASE LOGS SECTION */}
        <ListItem disablePadding sx={{ px: 2, pt: 2, pb: 1 }}>
          <Typography variant="overline" color="text.secondary" sx={{ flexGrow: 1 }}>DATABASE LOGS</Typography>
          <IconButton size="small" onClick={() => { fetchConnections(); fetchIngestedDB(); }}>
            <RefreshCw size={14} />
          </IconButton>
          <IconButton size="small" onClick={() => setOpenDBs(!openDBs)}>
            {openDBs ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </IconButton>
        </ListItem>
        <Collapse in={openDBs}>
          <ListItemButton onClick={() => setAddDBOpen(true)} sx={{ bgcolor: 'secondary.main', color: 'white', '&:hover': { bgcolor: 'secondary.dark' }, m: 1, borderRadius: 1 }}>
            <ListItemIcon sx={{ minWidth: 32 }}><Plus size={18} color="white" /></ListItemIcon>
            <ListItemText primary="New Connection" primaryTypographyProps={{ variant: 'body2', fontWeight: 'bold' }} />
          </ListItemButton>

          {/* INGESTED DB PROJECTS SUBSECTION */}
          {ingestedDBProjects.length > 0 && (
            <>
              <Typography variant="caption" color="text.secondary" sx={{ px: 4, py: 1, display: 'block', fontWeight: 'bold' }}>INGESTED</Typography>
              {ingestedDBProjects.map((project: string) => (
                <Box key={project} sx={{ '&:hover .proj-actions': { opacity: 1 } }}>
                    <ListItem
                        disablePadding
                        secondaryAction={
                            <IconButton 
                                className="proj-actions"
                                size="small" 
                                onClick={(e: React.MouseEvent) => handleDeleteProject(project, e)}
                                sx={{ opacity: 0, transition: 'opacity 0.2s', color: 'error.main' }}
                            >
                                <Trash2 size={14} />
                            </IconButton>
                        }
                    >
                        <ListItemButton onClick={() => toggleProject(project, 'db')} sx={{ pl: 4 }}>
                            <ListItemIcon sx={{ minWidth: 28 }}>
                                {expandedProjects[project]?.open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </ListItemIcon>
                            <ListItemText 
                                primary={project} 
                                primaryTypographyProps={{ variant: 'body2', fontWeight: 500, sx: { textTransform: 'capitalize' } }} 
                            />
                        </ListItemButton>
                    </ListItem>
                    <Collapse in={expandedProjects[project]?.open}>
                        <List disablePadding>
                            {(expandedProjects[project]?.modules || []).map((module: string) => (
                                <ListItemButton 
                                    key={module} 
                                    sx={{ pl: 8, py: 0.5 }}
                                    onClick={() => handleSelectIngestedModule(project, module, 'db')}
                                >
                                    <ListItemIcon sx={{ minWidth: 24 }}><FileText size={14} color="#ff4081" /></ListItemIcon>
                                    <ListItemText 
                                        primary={module} 
                                        primaryTypographyProps={{ variant: 'caption', sx: { textTransform: 'capitalize' } }} 
                                    />
                                    <Box sx={{ px: 0.8, py: 0.1, bgcolor: 'rgba(255, 64, 129, 0.1)', borderRadius: 1, fontSize: 9, color: '#ff4081', ml: 1 }}>Live</Box>
                                </ListItemButton>
                            ))}
                        </List>
                    </Collapse>
                </Box>
              ))}
              <Divider sx={{ mx: 2, my: 1, bgcolor: '#2d3748' }} />
              <Typography variant="caption" color="text.secondary" sx={{ px: 4, py: 1, display: 'block', fontWeight: 'bold' }}>CONNECTIONS</Typography>
            </>
          )}

          {savedConnections.map((conn: SavedConnection) => (
            <ListItem
              key={conn.id}
              disablePadding
              sx={{
                '&:hover .conn-actions': { opacity: 1 },
                px: 2
              }}
              secondaryAction={
                <Box className="conn-actions" sx={{ opacity: 0, display: 'flex', gap: 0.5, transition: 'opacity 0.2s' }}>
                  <IconButton size="small" onClick={() => setSelectedConnForQueries(conn)}>
                    <ScrollText size={14} />
                  </IconButton>
                  <IconButton size="small" onClick={(e: React.MouseEvent) => handleDeleteConnection(conn.id, e)} sx={{ color: 'error.main' }}>
                    <Trash2 size={14} />
                  </IconButton>
                </Box>
              }
            >
              <ListItemButton
                onClick={() => dispatch(addTab({ id: `db-${conn.id}`, title: conn.name, type: 'db', source: conn.db_name }))}
                sx={{ pl: 2, borderRadius: 1 }}
              >
                <ListItemIcon sx={{ minWidth: 28 }}><Database size={16} style={{ color: '#ff4081' }} /></ListItemIcon>
                <ListItemText primary={conn.name} primaryTypographyProps={{ variant: 'body2' }} />
              </ListItemButton>
            </ListItem>
          ))}
        </Collapse>

        {/* DOCKER LOGS SECTION */}
        <ListItem disablePadding sx={{ px: 2, pt: 2, pb: 1 }}>
          <Typography variant="overline" color="text.secondary" sx={{ flexGrow: 1 }}>DOCKER CONTAINERS</Typography>
          <IconButton size="small" onClick={() => setOpenDocker(!openDocker)}>
            {openDocker ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </IconButton>
        </ListItem>
        <Collapse in={openDocker}>
          <ListItemButton onClick={() => setAddDockerOpen(true)} sx={{ pl: 4 }}>
            <ListItemIcon sx={{ minWidth: 32 }}><Plus size={18} /></ListItemIcon>
            <ListItemText primary="Add Container" primaryTypographyProps={{ variant: 'body2' }} />
          </ListItemButton>
          {tabs.filter((t: any) => t.type === 'docker').map((tab: any) => (
            <ListItem
              key={tab.id}
              disablePadding
              sx={{ '&:hover .item-actions': { opacity: 1 } }}
              secondaryAction={
                <IconButton
                  className="item-actions"
                  size="small"
                  onClick={() => dispatch(removeTab(tab.id))}
                  sx={{ opacity: 0, transition: 'opacity 0.2s', color: 'error.main' }}
                >
                  <Trash2 size={14} />
                </IconButton>
              }
            >
              <ListItemButton key={tab.id} onClick={() => dispatch(addTab(tab))} sx={{ pl: 4 }}>
                <ListItemIcon sx={{ minWidth: 32 }}><Container size={18} style={{ color: '#4caf50' }} /></ListItemIcon>
                <ListItemText primary={tab.title} primaryTypographyProps={{ variant: 'body2' }} />
                <Box sx={{ px: 1, py: 0.2, bgcolor: 'success.dark', borderRadius: 4, fontSize: 10, color: 'white', mr: 1 }}>Live</Box>
              </ListItemButton>
            </ListItem>
          ))}
        </Collapse>
      </List>

      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary">V2.4.0 (STABLE)</Typography>
      </Box>

      <AddFileDialog
        open={addFileOpen}
        onClose={() => setAddFileOpen(false)}
        onAdd={handleAddFile}
      />

      <AddDBDialog
        open={addDBOpen}
        onClose={() => setAddDBOpen(false)}
        onAdd={handleAddDB}
      />

      <AddDockerDialog
        open={addDockerOpen}
        onClose={() => setAddDockerOpen(false)}
        onAdd={handleAddDocker}
      />

      <CleanupTabsDialog
        open={cleanupOpen}
        affectedTabs={affectedTabs}
        onClose={() => { setCleanupOpen(false); setPendingDelete(null); }}
        onConfirm={handleCleanupConfirm}
      />

      <SavedQueriesDialog
        connection={selectedConnForQueries}
        onClose={() => setSelectedConnForQueries(null)}
      />
    </Box>
  );
};

export default Sidebar;
