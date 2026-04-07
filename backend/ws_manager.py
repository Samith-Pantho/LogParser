from fastapi import WebSocket
from typing import List, Dict

class ConnectionManager:
    def __init__(self):
        # We store active websocket connections
        # In a more advanced setup we could map them to specific tabs/sources
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast_log(self, source_id: str, log_data: dict):
        """
        Broadcasts a log to all connected clients.
        log_data format expected:
        {
            "timestamp": "2024-04-24 14:32:10",
            "level": "INFO", # INFO, WARNING, ERROR, DEBUG
            "message": "...",
            "source": source_id,
        }
        """
        payload = {
            "type": "log",
            "source_id": source_id,
            "data": log_data
        }
        for connection in self.active_connections:
            try:
                await connection.send_json(payload)
            except Exception as e:
                # Handle disconnection safely
                pass

manager = ConnectionManager()
