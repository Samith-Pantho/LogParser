from typing import Dict, List, Callable
from datetime import datetime, timedelta
import asyncio

class AlertingSystem:
    def __init__(self):
        # A dictionary to store error counts per source. 
        # Format: { source_id: [(timestamp1), (timestamp2), ...] }
        self.error_events: Dict[str, List[datetime]] = {}
        # Callback to trigger when an alert fires
        self.alert_callback = None

    def register_callback(self, callback: Callable):
        self.alert_callback = callback

    def record_error(self, source_id: str):
        now = datetime.now()
        if source_id not in self.error_events:
            self.error_events[source_id] = []
        self.error_events[source_id].append(now)

    async def check_alerts(self, source_id: str, threshold: int = 20, time_window_mins: int = 1):
        """
        Check if the number of errors within the time window exceeds the threshold.
        """
        if source_id not in self.error_events:
            return

        now = datetime.now()
        window_start = now - timedelta(minutes=time_window_mins)

        # Filter out old events
        self.error_events[source_id] = [t for t in self.error_events[source_id] if t >= window_start]
        
        current_count = len(self.error_events[source_id])

        if current_count > threshold:
            # Threshold exceeded, fire alert
            if self.alert_callback:
                await self.alert_callback(source_id, current_count, time_window_mins)
            
            # Clear the window to avoid spamming the same alert continually
            self.error_events[source_id].clear()

alerter = AlertingSystem()
