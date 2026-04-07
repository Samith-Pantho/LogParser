import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG';
  message: string;
}

export interface Tab {
  id: string;
  title: string;
  type: 'file' | 'db' | 'docker';
  source: string;
  project?: string;
  module?: string;
  storage?: 'file' | 'db';
  isBroken?: boolean;
}

export interface SavedConnection {
  id: number;
  name: string;
  db_type: string;
  host: string;
  port: number;
  username: string;
  db_name: string;
  ssl: boolean;
}

export interface SavedQuery {
  id: number;
  connection_id: number;
  name: string;
  query_text: string;
}

export interface SystemSetting {
  key: string;
  value: string;
  description?: string;
}

interface DashboardState {
  tabs: Tab[];
  activeTabId: string | null;
  savedConnections: SavedConnection[];
  savedQueries: Record<number, SavedQuery[]>; // Map connection_id -> queries
  logs: Record<string, LogEntry[]>; // Logs mapped to source_id
  isConnected: boolean;
  settings: SystemSetting[];
}

const loadState = () => {
  try {
    const serializedState = localStorage.getItem('dashboardState');
    if (serializedState === null) {
      return undefined;
    }
    return JSON.parse(serializedState);
  } catch (err) {
    return undefined;
  }
};

const persistedState = loadState();

const initialState: DashboardState = {
  tabs: persistedState?.tabs || [],
  activeTabId: persistedState?.activeTabId || null,
  savedConnections: persistedState?.savedConnections || [],
  savedQueries: persistedState?.savedQueries || {},
  logs: {},
  isConnected: false,
  settings: persistedState?.settings || [],
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    setSavedConnections: (state: DashboardState, action: PayloadAction<SavedConnection[]>) => {
      state.savedConnections = action.payload;
    },
    removeSavedConnection: (state: DashboardState, action: PayloadAction<number>) => {
      state.savedConnections = state.savedConnections.filter(c => c.id !== action.payload);
      delete state.savedQueries[action.payload];
    },
    setSavedQueries: (state: DashboardState, action: PayloadAction<{ connectionId: number; queries: SavedQuery[] }>) => {
      state.savedQueries[action.payload.connectionId] = action.payload.queries;
    },
    removeSavedQuery: (state: DashboardState, action: PayloadAction<{ connectionId: number; queryId: number }>) => {
      const { connectionId, queryId } = action.payload;
      if (state.savedQueries[connectionId]) {
        state.savedQueries[connectionId] = state.savedQueries[connectionId].filter(q => q.id !== queryId);
      }
    },
    addTab: (state: DashboardState, action: PayloadAction<Tab>) => {
      if (!state.tabs.find(t => t.id === action.payload.id)) {
        state.tabs.push(action.payload);
      }
      state.activeTabId = action.payload.id;
    },
    removeTab: (state: DashboardState, action: PayloadAction<string>) => {
      state.tabs = state.tabs.filter(t => t.id !== action.payload);
      if (state.activeTabId === action.payload) {
        state.activeTabId = state.tabs.length > 0 ? state.tabs[state.tabs.length - 1].id : null;
      }
      delete state.logs[action.payload];
    },
    setActiveTab: (state: DashboardState, action: PayloadAction<string>) => {
      state.activeTabId = action.payload;
    },
    markTabBroken: (state: DashboardState, action: PayloadAction<string>) => {
      const tab = state.tabs.find(t => t.id === action.payload);
      if (tab) {
        tab.isBroken = true;
      }
    },
    addLog: (state: DashboardState, action: PayloadAction<{ sourceId: string; log: LogEntry }>) => {
      const { sourceId, log } = action.payload;
      if (!state.logs[sourceId]) {
        state.logs[sourceId] = [];
      }
      state.logs[sourceId].push(log);
      if (state.logs[sourceId].length > 1000) {
        state.logs[sourceId].shift();
      }
    },
    setConnected: (state: DashboardState, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
    },
    setSettings: (state: DashboardState, action: PayloadAction<SystemSetting[]>) => {
      state.settings = action.payload;
    }
  },
});

export const { 
  addTab, 
  removeTab, 
  setActiveTab, 
  markTabBroken,
  addLog, 
  setConnected,
  setSavedConnections, 
  removeSavedConnection,
  setSavedQueries,
  removeSavedQuery,
  setSettings
} = dashboardSlice.actions;

export const store = configureStore({
  reducer: {
    dashboard: dashboardSlice.reducer,
  },
});

store.subscribe(() => {
  const state = store.getState().dashboard;
  try {
    const serializedState = JSON.stringify({
      tabs: state.tabs,
      activeTabId: state.activeTabId,
      savedConnections: state.savedConnections,
      savedQueries: state.savedQueries,
      settings: state.settings,
    });
    localStorage.setItem('dashboardState', serializedState);
  } catch (err) {
    console.error("Failed to save state to localStorage", err);
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
