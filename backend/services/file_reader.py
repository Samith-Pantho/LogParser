import asyncio
import os
from ws_manager import manager
from datetime import datetime
import re
import json

def parse_log_line(line: str, file_format: str) -> dict:
    """
    Helper to parse a single log line based on format.
    """
    if not line or not line.strip():
        return None

    log_data = None
    
    if file_format == 'json':
        try:
            data = json.loads(line)
            log_data = {
                "timestamp": data.get("timestamp") or data.get("time") or data.get("@timestamp") or datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "level": str(data.get("level") or data.get("status") or data.get("severity") or "INFO").upper(),
                "message": data.get("message") or data.get("msg") or data.get("log") or line.strip()
            }
        except:
            pass
    
    elif file_format == 'xml':
        try:
            ts_match = re.search(r'<(?:time|timestamp)>(.*?)</(?:time|timestamp)>', line, re.I)
            lv_match = re.search(r'<(?:level|severity)>(.*?)</(?:level|severity)>', line, re.I)
            msg_match = re.search(r'<(?:message|msg|text)>(.*?)</(?:message|msg|text)>', line, re.I)
            
            if ts_match or lv_match or msg_match:
                log_data = {
                    "timestamp": ts_match.group(1) if ts_match else datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "level": (lv_match.group(1).upper() if lv_match else "INFO"),
                    "message": msg_match.group(1) if msg_match else line.strip()
                }
        except:
            pass

    if not log_data and "----->" in line:
        # Custom format: timestamp----->logtype----->createby----->function_nm----->log_text
        parts = line.strip().split("----->")
        if len(parts) >= 5:
            log_data = {
                "timestamp": parts[0],
                "level": parts[1].upper(),
                "message": f"[{parts[2]}] ({parts[3]}) {parts[4]}"
            }

    if not log_data:
        # Default TXT parsing
        date_patterns = [
            r'^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?)',
            r'^([A-Z][a-z]{2}\s+\d+\s\d{2}:\d{2}:\d{2})'
        ]
        
        extracted_ts = None
        for pattern in date_patterns:
            match = re.search(pattern, line)
            if match:
                raw_ts = match.group(1)
                try:
                    if '-' in raw_ts: # ISO or YYYY-MM-DD
                        dt = datetime.fromisoformat(raw_ts.replace(' ', 'T'))
                        extracted_ts = dt.strftime("%Y-%m-%d %H:%M:%S")
                    else: # Syslog like Apr 26 ...
                        dt = datetime.strptime(f"{datetime.now().year} {raw_ts}", "%Y %b %d %H:%M:%S")
                        extracted_ts = dt.strftime("%Y-%m-%d %H:%M:%S")
                    break
                except:
                    continue

        level = "INFO"
        up_line = line.upper()
        if "ERROR" in up_line:
            level = "ERROR"
        elif "WARN" in up_line:
            level = "WARNING"
        elif "DEBUG" in up_line:
            level = "DEBUG"

        log_data = {
            "timestamp": extracted_ts or datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "level": level,
            "message": line.strip()
        }
    
    return log_data

async def tail_file(file_path: str, source_id: str, file_format: str = 'txt'):
    """
    Tails a file asynchronously and broadcasts new lines to the websocket manager.
    Supports txt, json, and xml formats.
    """
    # Wait up to 2 seconds for file to appear (in case of slight race condition)
    for _ in range(4):
        if os.path.exists(file_path):
            break
        await asyncio.sleep(0.5)

    if not os.path.exists(file_path):
        await manager.broadcast_log(source_id=source_id, log_data={
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "level": "ERROR",
            "message": f"File not found: {file_path}. Waiting for logs..."
        })
        # Keep waiting for the file to appear instead of exiting
        while not os.path.exists(file_path):
            await asyncio.sleep(2.0)
            if os.path.exists(file_path):
                break

    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        # Read the last 50 lines for history
        f.seek(0, os.SEEK_END)
        file_size = f.tell()
        
        # Seek back a bit (e.g., 10KB) to find last lines
        seek_back = min(file_size, 10240) 
        f.seek(file_size - seek_back)
        initial_lines = f.readlines()
        
        # Broadcast last 50 lines as history
        history_lines = initial_lines[-50:] if initial_lines else []
        for line in history_lines:
            log_data = parse_log_line(line, file_format)
            if log_data:
                await manager.broadcast_log(source_id=source_id, log_data=log_data)

        # Ensure we are at the end for tailing
        f.seek(0, os.SEEK_END)
        
        while True:
            line = f.readline()

            if not line:
                await asyncio.sleep(0.1) # Wait briefly before trying again
                continue
            
            log_data = parse_log_line(line, file_format)
            if log_data:
                await manager.broadcast_log(source_id=source_id, log_data=log_data)
