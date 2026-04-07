# iLogger SDK

A lightweight Python logging SDK that prints local logs and asynchronously forwards them to a logging backend API.

## Features

- Provides `Logger` with standard logging levels: `debug`, `info`, `warning`, `error`, `critical`
- Automatically detects calling module and function context
- Sends logs asynchronously to a backend API via `requests`
- Supports configurable `savetype` and `create_by`

## Installation

From the `iLogger-SDK/iLogger` folder:

```bash
pip install .
```

Or install in editable mode:

```bash
pip install -e .
```

## Configuration

The SDK uses `ILOGGER_API_URL` to identify the backend endpoint. By default it points to:

```bash
http://localhost:45678/api/logs/ingest
```

Set a custom API URL if your backend is running elsewhere:

```bash
export ILOGGER_API_URL="http://your-host:port/api/logs/ingest"
```

## Usage

```python
from iLogger import Logger

logger = Logger(project_name="MyProject", savetype="db", create_by="service-name")
logger.info("Application started")
logger.error("Something went wrong", module="my_module", function="my_func")
```

## SDK Behavior

- Logs are printed locally with timestamp, level, project, module, and function.
- A background thread sends log payloads to the configured backend.
- The payload keys are mapped to the backend API fields expected by the server.

## Package Layout

- `iLogger-SDK/iLogger/setup.py` — package metadata and install config
- `iLogger-SDK/iLogger/iLogger/__init__.py` — SDK export wrapper
- `iLogger-SDK/iLogger/iLogger/logger.py` — main `Logger` class implementation
- `iLogger-SDK/iLogger/iLogger/sender.py` — asynchronous HTTP send logic
- `iLogger-SDK/iLogger/iLogger/config.py` — API URL and default settings
- `iLogger-SDK/iLogger/iLogger/utils.py` — automatic context detection

## Requirements

- Python 3.x
- `requests`

## Notes

If your backend is not available or the HTTP request fails, the SDK prints an error but does not crash the application.
