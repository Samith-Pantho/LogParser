from datetime import datetime
from .sender import send_log_async
from .utils import get_context
from .config import DEFAULT_SAVETYPE, DEFAULT_CREATE_BY

class Logger:
    def __init__(self, project_name, savetype=DEFAULT_SAVETYPE, create_by=DEFAULT_CREATE_BY):
        """
        Initializes the iLogger logger.
        :param project_name: The name of the project.
        :param savetype: 'file' or 'db'.
        :param create_by: User or system identifier.
        """
        self.project_name = project_name
        self.savetype = savetype
        self.create_by = create_by

    def _log(self, level, message, module=None, function=None, logtype="GENERAL"):
        # Auto-detect context if not provided
        auto_module, auto_func = get_context()
        
        log_data = {
            "project": self.project_name,
            "level": level,
            "type": logtype,
            "module": module or auto_module,
            "function": function or auto_func,
            "message": str(message),
            "timestamp": datetime.utcnow().isoformat(),
            "create_by": self.create_by,
            "savetype": self.savetype
        }

        # Local printing
        print(f"[{log_data['timestamp']}] -> {level} | {self.project_name} | {log_data['module']}.{log_data['function']} -> {message}")

        # Async send to Dashboard API
        send_log_async(log_data)

    def debug(self, message, **kwargs):
        self._log("DEBUG", message, **kwargs)

    def info(self, message, **kwargs):
        self._log("INFO", message, **kwargs)

    def warning(self, message, **kwargs):
        self._log("WARNING", message, **kwargs)

    def error(self, message, **kwargs):
        self._log("ERROR", message, **kwargs)

    def critical(self, message, **kwargs):
        self._log("CRITICAL", message, **kwargs)
