import requests
import threading
from .config import API_URL

def _send_request(data):
    try:
        # Map our SDK fields to the Backend API fields
        payload = {
            "projectname": data.get("project"),
            "module_nm": data.get("module"),
            "function_nm": data.get("function"),
            "log_text": data.get("message"),
            "log_type": data.get("level"),
            "timestamp": data.get("timestamp"),
            "create_by": data.get("create_by"),
            "savetype": data.get("savetype", "file")
        }
        response = requests.post(API_URL, json=payload, timeout=5)
        if response.status_code != 200:
            print(f"[iLogger] API Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"[iLogger] Failed to send log: {e}")

def send_log_async(data):
    """Sends log data to the API in a background thread to avoid blocking."""
    threading.Thread(target=_send_request, args=(data,), daemon=True).start()
