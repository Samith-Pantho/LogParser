# LogDash - Modern Log Monitoring Dashboard

LogDash is a powerful, real-time log monitoring application built with FastAPI and React. It provides a centralized dashboard to view, search, and analyze logs from various sources, including local files, external databases, and Docker containers.

![LogDash Mockup](https://raw.githubusercontent.com/username/project/main/mockup.png) <!-- Replace with a generated image or local path if available -->

## 🚀 Features

- **Real-time Streaming:** Instant log updates via WebSockets for all sources.
- **Multi-Source Support:**
  - **Automated File Logs:** Scans the `Logs/` directory and displays projects/modules in a hierarchical tree.
  - **Database Logs:** Run and save SQL queries to fetch logs from external databases.
  - **Docker Containers:** View live log streams from any running Docker container.
- **Log Ingestion API:** A powerful endpoint to push logs directly to the system with automated folder organization and DB storage.
- **Cascading Deletion:** One-click deletion that cleans up database records and physical log folders simultaneously.
- **Advanced UI:**
  - Dark-mode, premium interface built with Material UI.
  - Multi-tab support for viewing multiple log sources concurrently.
  - Interactive AG Grid table with color-coded log levels (INFO, WARNING, ERROR, DEBUG).
  - Truncated text for large logs with a detailed "Expand View" popup.
- **AI-Powered Analysis:** Integrated AI assistant that analyzes error logs and provides actionable suggestions.
- **Data Export:** Export your current log view to CSV with a single click.
- **Persistent Settings:** Manage app config (AI keys, database connections) through the UI, stored in a persistent PostgreSQL database.
- **Alerting:** Configure threshold-based alerts (e.g. notify if >20 errors/min).

## 🛠 Tech Stack

- **Backend:** [FastAPI](https://fastapi.tiangolo.com/), [SQLAlchemy](https://www.sqlalchemy.org/), [watchdog](https://pypi.org/project/watchdog/), [docker-py](https://docker-py.readthedocs.io/)
- **Frontend:** [React](https://reactjs.org/), [Vite](https://vitejs.dev/), [Redux Toolkit](https://redux-toolkit.js.org/), [AG Grid](https://www.ag-grid.com/), [Material UI](https://mui.com/)
- **Database:** [PostgreSQL](https://www.postgresql.org/) (Project Metadata & Settings)
- **AI:** OpenAI-compatible API Integration

## 📦 Installation & Setup

### Using Docker (Recommended)

1. Clone the repository.
2. Configure your `.env` in the `backend/` directory (see Configuration section).
3. Run the application:
   ```bash
   docker-compose up --build
   ```
4. Access the dashboard at `http://localhost:3000`.

### Local Setup

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate # or venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## ⚙️ Configuration

The application uses environment variables for initial setup. Most runtime settings can be managed via the **Settings (⚙️)** icon in the dashboard.

**Backend `.env`:**
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`: PostgreSQL connection details.
- `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL_NAME`: Default AI provider configuration.

- **POST `/api/logs/ingest`**: High-fidelity log ingestion (used by the **iLogger** SDK).
  - **Parameters:**
    - `projectname`: Name of the project (required, normalized to lowercase).
    - `module_nm`: Component or module name (optional).
    - `log_text`: The log message content.
    - `timestamp`: (Optional, auto-generated if missing).
    - `log_type`: INFO, WARNING, ERROR, etc.
    - `create_by`: (Optional, defaults to "Anonymus").
    - `function_nm`: (Optional, defaults to "func()").
    - `savetype`: `file` (stores in `Logs/project/module/date.log`) or `db` (stores in persistent database).
- **GET `/api/logs/projects`**: List all unique projects.
- **GET `/api/logs/modules`**: List modules for a specific project.
- **DELETE `/api/logs/projects/{name}`**: Permanently remove a project and all its data.
- **WS `/ws`**: Main WebSocket endpoint for live streaming (Port 45678).

## 📖 Usage

1. **Auto-Discovery:** All projects and modules inside the `Logs/` directory are automatically discovered and displayed in the **File Logs** section.
2. **Push Logs:** Use the `/api/logs/ingest` endpoint to send logs from your external applications.
3. **View Logs:** Select a project/module from the sidebar to open a real-time monitoring tab.
4. **Search & Filter:** Use the toolbar to filter logs by keywords, level, or date.
5. **Manage Data:** Hover over a project in the sidebar and click the trash icon to delete it and all its associated data.
6. **Analyze:** For ERROR logs, use the AI icon to get instant troubleshooting suggestions.

---