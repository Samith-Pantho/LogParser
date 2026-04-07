import { store, addLog, setConnected } from '../store/store';

class WebSocketService {
  private socket: WebSocket | null = null;
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  connect() {
    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      console.log('WebSocket Connected');
      store.dispatch(setConnected(true));
      
      const state = store.getState().dashboard;
      state.tabs.forEach((tab) => {
        this.sendMessage({
          action: 'start',
          sourceType: tab.type,
          sourceId: tab.source,
          fileType: tab.format
        });
      });
    };

    this.socket.onmessage = (event: MessageEvent) => {
      const message = JSON.parse(event.data);
      if (message.type === 'log') {
        store.dispatch(addLog({
          sourceId: message.source_id,
          log: {
            ...message.data,
            id: crypto.randomUUID(), // Local ID for unique keys
          }
        }));
      }
    };

    this.socket.onclose = () => {
      console.log('WebSocket Disconnected');
      store.dispatch(setConnected(false));
      // Reconnect after 3 seconds
      setTimeout(() => this.connect(), 3000);
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket Error:', error);
      this.socket?.close();
    };
  }

  sendMessage(message: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }
}

// In production, this would be retrieved from config/env
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const host = window.location.host;
export const wsService = new WebSocketService(`${protocol}//${host}/ws`);

