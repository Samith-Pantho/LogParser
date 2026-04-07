import os

# Default configuration
API_URL = os.getenv("ILOGGER_API_URL", "http://localhost:45678/api/logs/ingest")
DEFAULT_SAVETYPE = "db" # or "db"/"file"
DEFAULT_CREATE_BY = "Anonymus"
