import React, { useState, useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { 
  Box, 
  Chip, 
  IconButton, 
  Tooltip, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  Typography, 
  Button,
  CircularProgress,
  Paper,
  Divider
} from '@mui/material';
import { Maximize2, Sparkles, Copy, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';

interface LogEntry {
  id: string;
  timestamp: string;
  level: string;
  message: string;
}

const LogTable: React.FC<{ sourceId: string }> = ({ sourceId }: { sourceId: string }) => {
  const logs = useSelector((state: RootState) => state.dashboard.logs[sourceId] || []);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const gridRef = React.useRef<any>();

  const onExport = () => {
    gridRef.current.api.exportDataAsCsv();
  };

  const [paginationInfo, setPaginationInfo] = useState({
    currentPage: 0,
    totalPages: 0,
    pageSize: 100
  });

  const [selectedRows, setSelectedRows] = useState<LogEntry[]>([]);

  const onSelectionChanged = useCallback((params: any) => {
    setSelectedRows(params.api.getSelectedRows());
  }, []);

  const handleCopySelected = () => {
    if (selectedRows.length === 0) return;
    
    const text = selectedRows.map((row: LogEntry) => 
      `[${row.timestamp}] [${row.level}] ${row.message}`
    ).join('\n');
    
    navigator.clipboard.writeText(text);
    alert(`Copied ${selectedRows.length} logs to clipboard!`);
  };

  const onPaginationChanged = useCallback((params: any) => {
    if (params.api) {
      setPaginationInfo({
        currentPage: params.api.paginationGetCurrentPage() + 1,
        totalPages: params.api.paginationGetTotalPages(),
        pageSize: params.api.paginationGetPageSize()
      });
    }
  }, []);

  const onGridReady = useCallback((params: any) => {
    setPaginationInfo({
      currentPage: params.api.paginationGetCurrentPage() + 1,
      totalPages: params.api.paginationGetTotalPages(),
      pageSize: params.api.paginationGetPageSize()
    });
  }, []);

  const onRowClicked = (params: any) => {
    // If multiple rows are selected, we don't open the single detail dialog 
    // unless it was a single click without control/shift
    if (selectedRows.length <= 1) {
      setSelectedLog(params.data);
    }
  };

  const handleAskAi = useCallback(async (log: LogEntry) => {
    setSelectedLog(log);
    setLoadingAi(true);
    setAiSuggestion(null);

    // Get context from grid API instead of state to keep callback stable
    const allRows: LogEntry[] = [];
    gridRef.current.api.forEachNode((node: any) => allRows.push(node.data));
    
    // Sort rows by timestamp to ensure correct context (if not already)
    const sortedRows = allRows.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const logIndex = sortedRows.findIndex((l: LogEntry) => l.id === log.id);
    const contextLogs = sortedRows.slice(Math.max(0, logIndex - 5), logIndex).map((l: LogEntry) => l.message);

    try {
      const response = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error_message: log.message,
          context_logs: contextLogs
        })
      });
      const data = await response.json();
      setAiSuggestion(data.suggestion);
    } catch (e) {
      setAiSuggestion("Failed to connect to AI service.");
    } finally {
      setLoadingAi(false);
    }
  }, []);

  const closeDialog = () => {
    setSelectedLog(null);
    setAiSuggestion(null);
    setLoadingAi(false);
  };

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true
  }), []);

  const columnDefs = useMemo(() => [
    { 
      headerCheckboxSelection: true,
      checkboxSelection: true,
      width: 50,
      suppressMovable: true,
      sortable: false,
      filter: false,
      pinned: 'left'
    },
    { 
      field: 'timestamp', 
      headerName: 'TIMESTAMP', 
      width: 180,
      suppressMovable: true,
      sort: 'desc'
    },
    { 
      field: 'level', 
      headerName: 'LEVEL', 
      width: 120,
      cellRenderer: (params: any) => {
        const level = params.value;
        let color: any = 'default';
        if (level === 'INFO') color = 'info';
        if (level === 'WARNING') color = 'warning';
        if (level === 'ERROR') color = 'error';
        if (level === 'DEBUG') color = 'secondary';
        
        return (
          <Chip 
            label={level} 
            size="small" 
            color={color} 
            variant="outlined" 
            sx={{ fontWeight: 'bold', fontSize: '0.7rem' }} 
          />
        );
      }
    },
    { 
      field: 'message', 
      headerName: 'MESSAGE', 
      flex: 1,
      cellRenderer: (params: any) => {
        const text = params.value;
        const isError = params.data.level === 'ERROR';
        return (
            <Typography 
                variant="body2" 
                sx={{ 
                    color: isError ? '#ff5252' : 'inherit',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontSize: '0.85rem'
                }}
            >
                {text}
            </Typography>
        );
      }
    },
    {
      headerName: 'ACTION',
      width: 120,
      sortable: false,
      filter: false,
      pinned: 'right',
      cellRenderer: (params: any) => (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', height: '100%' }}>
          <Tooltip title="Expand View">
            <IconButton size="small" onClick={(e: React.MouseEvent) => { e.stopPropagation(); setSelectedLog(params.data); }}>
              <Maximize2 size={16} />
            </IconButton>
          </Tooltip>
          {params.data.level === 'ERROR' && (
            <Tooltip title="Ask AI for Fix">
              <IconButton 
                size="small" 
                sx={{ color: '#00e5ff' }}
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleAskAi(params.data); }}
              >
                <Sparkles size={16} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      )
    }
  ], [handleAskAi]);

  const renderPagination = (position: 'top' | 'bottom') => (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      px: 2, 
      py: 0.5, 
      bgcolor: '#1a202c', 
      borderBottom: position === 'top' ? '1px solid #2d3748' : 'none',
      borderTop: position === 'bottom' ? '1px solid #2d3748' : 'none',
      zIndex: 10
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Total Logs: <b style={{ color: '#00e5ff' }}>{logs.length}</b>
        </Typography>
        {selectedRows.length > 0 && (
          <>
            <Divider orientation="vertical" flexItem sx={{ bgcolor: '#4a5568', mx: 1, height: 12, my: 'auto' }} />
            <Typography variant="caption" sx={{ color: '#00e5ff', fontWeight: 'bold' }}>
              Selected: {selectedRows.length}
            </Typography>
          </>
        )}
        <Divider orientation="vertical" flexItem sx={{ bgcolor: '#4a5568', mx: 1, height: 12, my: 'auto' }} />
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Rows/Page: <b>{paginationInfo.pageSize}</b>
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <IconButton 
          size="small" 
          disabled={paginationInfo.currentPage <= 1} 
          onClick={() => gridRef.current?.api.paginationGoToPreviousPage()}
          sx={{ color: 'white', p: 0.5 }}
        >
          <ChevronLeft size={14} />
        </IconButton>
        
        <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 70, textAlign: 'center', fontSize: '0.75rem' }}>
          {paginationInfo.currentPage} / {paginationInfo.totalPages || 1}
        </Typography>

        <IconButton 
          size="small" 
          disabled={paginationInfo.currentPage >= paginationInfo.totalPages} 
          onClick={() => gridRef.current?.api.paginationGoToNextPage()}
          sx={{ color: 'white', p: 0.5 }}
        >
          <ChevronRight size={14} />
        </IconButton>
      </Box>
    </Box>
  );

  const getRowId = useCallback((params: any) => params.data.id, []);

  return (
    <Box sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#0d1117' }}>
      {/* Header with Actions */}
      <Box sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2d3748' }}>
        <Typography variant="subtitle2" sx={{ ml: 1, color: '#00e5ff', fontWeight: 'bold' }}>
          {sourceId.toUpperCase()}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {selectedRows.length > 0 && (
            <Button 
                size="small" 
                variant="contained" 
                color="info"
                startIcon={<Copy size={14} />}
                onClick={handleCopySelected}
                sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}
            >
                Copy Selected ({selectedRows.length})
            </Button>
          )}
          <Button 
            size="small" 
            variant="outlined" 
            startIcon={<Copy size={14} />}
            onClick={onExport}
            sx={{ fontSize: '0.7rem', color: 'text.secondary', borderColor: '#2d3748' }}
          >
            Export CSV
          </Button>
        </Box>
      </Box>

      {/* TOP PAGINATION */}
      {renderPagination('top')}

      <Box className="ag-theme-alpine-dark" sx={{ flexGrow: 1, width: '100%', position: 'relative' }}>
        <AgGridReact
          ref={gridRef}
          rowData={logs}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          onSelectionChanged={onSelectionChanged}
          onRowClicked={onRowClicked}
          onPaginationChanged={onPaginationChanged}
          onGridReady={onGridReady}
          rowSelection="multiple"
          suppressRowClickSelection={true}
          getRowId={getRowId}
          pagination={true}
          paginationPageSize={100}
          suppressPaginationPanel={true}
          animateRows={true}
          overlayNoRowsTemplate="<span style='color: #666;'>No logs received yet...</span>"
        />
      </Box>

      {/* BOTTOM PAGINATION */}
      {renderPagination('bottom')}

      {/* Log Details & AI Dialog */}
      <Dialog open={!!selectedLog} onClose={closeDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" component="span">Log Details</Typography>
          <IconButton onClick={closeDialog}><X size={20} /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary">TIMESTAMP</Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>{selectedLog?.timestamp}</Typography>
            
            <Typography variant="caption" color="text.secondary">LEVEL</Typography>
            <Box sx={{ mb: 1 }}>
                <Chip label={selectedLog?.level} color={selectedLog?.level === 'ERROR' ? 'error' : 'default'} size="small" />
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">MESSAGE</Typography>
                <Tooltip title="Copy Message">
                  <IconButton size="small" onClick={() => { if(selectedLog) navigator.clipboard.writeText(selectedLog.message); }}>
                    <Copy size={16}/>
                  </IconButton>
                </Tooltip>
            </Box>
            <Paper variant="outlined" sx={{ p: 2, bgcolor: '#000', mt: 1, fontFamily: 'monospace', wordBreak: 'break-all', maxHeight: '400px', overflowY: 'auto' }}>
              {selectedLog?.message}
            </Paper>
          </Box>

          {aiSuggestion || loadingAi ? (
            <Box sx={{ mt: 3, p: 2, border: '1px solid', borderColor: 'primary.main', borderRadius: 2, bgcolor: 'rgba(0, 229, 255, 0.05)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Sparkles size={18} color="#00e5ff" />
                    <Typography variant="subtitle2" sx={{ color: '#00e5ff', fontWeight: 'bold' }}>AI SUGGESTION</Typography>
                </Box>
                {loadingAi ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <CircularProgress size={20} thickness={5} />
                        <Typography variant="body2">Analyzing context and generating solution...</Typography>
                    </Box>
                ) : (
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {aiSuggestion}
                    </Typography>
                )}
            </Box>
          ) : selectedLog?.level === 'ERROR' && (
             <Button 
                startIcon={<Sparkles size={16} />} 
                variant="contained" 
                fullWidth 
                onClick={() => handleAskAi(selectedLog)}
                sx={{ mt: 2 }}
             >
                Get AI Suggestion
             </Button>
          )}
        </DialogContent>
      </Dialog>
      {/* Settings management is in Dashboard.tsx header */}
    </Box>
  );
};

export default LogTable;
