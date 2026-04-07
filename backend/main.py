from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from database import engine, Base
import models
from ws_manager import manager
from routers.ai_router import router as ai_router
from routers.sources_router import router as sources_router
from routers.settings_router import router as settings_router
from routers.docker_router import router as docker_router
from routers.logs_router import router as logs_router, sanitize_name
from database import engine, Base, SessionLocal
import os
from datetime import datetime


# Create database tables
models.Base.metadata.create_all(bind=engine)

# Seed default settings from .env if not exists
def seed_settings():
    db = SessionLocal()
    try:
        keys = ["AI_PROVIDER", "AI_API_KEY", "AI_BASE_URL", "AI_MODEL_NAME"]
        for key in keys:
            val = os.getenv(key)
            if val:
                existing = db.query(models.SystemSetting).filter(models.SystemSetting.key == key).first()
                if not existing:
                    db_setting = models.SystemSetting(key=key, value=val, description=f"App-wide setting for {key}")
                    db.add(db_setting)
        db.commit()
    finally:
        db.close()

seed_settings()

app = FastAPI(title="Log Monitoring API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai_router)
app.include_router(sources_router)
app.include_router(settings_router)
app.include_router(docker_router)
app.include_router(logs_router)

@app.get("/api/ping")
async def ping():
    return {"status": "ok"}

import json
import asyncio
from services.docker_reader import stream_docker_logs
from services.file_reader import tail_file
from services.db_reader import query_db_logs
from services.ingested_reader import stream_ingested_db_logs

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    # Store active tasks to optionally cancel them later
    tasks = {}
    try:
        while True:
            # We don't expect much incoming data from clients, mostly just ping/pong or subscribe events
            text_data = await websocket.receive_text()
            try:
                msg = json.loads(text_data)
                if msg.get("action") == "start":
                    source_type = msg.get("sourceType")
                    source_id = msg.get("sourceId")
                    
                    if source_type == "docker" and source_id not in tasks:
                        task = asyncio.create_task(stream_docker_logs(container_id=source_id, source_id=source_id))
                        tasks[source_id] = task
                    elif source_type == "file" and source_id not in tasks:
                        file_format = msg.get("fileType", "txt")
                        task = asyncio.create_task(tail_file(file_path=source_id, source_id=source_id, file_format=file_format))
                        tasks[source_id] = task
                    elif source_type == "db" and source_id not in tasks:
                        # For DB, we just run a query task that sleeps
                        task = asyncio.create_task(query_db_logs(source_id=source_id))
                        tasks[source_id] = task
                    elif msg.get("action") == "start" and msg.get("sourceType") == "ingested":
                        project = sanitize_name(msg.get("project"))
                        module = sanitize_name(msg.get("module")) if msg.get("module") else None
                        storage = msg.get("storage", "file")
                        source_id = msg.get("sourceId")
                        
                        if not project:
                            continue

                        if storage == "db":
                            task = asyncio.create_task(stream_ingested_db_logs(project=project, module=module, source_id=source_id))
                            tasks[source_id] = task
                        else:
                            # For file, we need to find the latest log file in Logs/project/module/
                            log_dir = f"/app/Logs/{project}/{module}" if module else f"/app/Logs/{project}"
                            filename = f"{datetime.now().strftime('%Y-%m-%d')}.log"
                            filepath = os.path.join(log_dir, filename)
                            task = asyncio.create_task(tail_file(file_path=filepath, source_id=source_id, file_format="txt"))
                            tasks[source_id] = task
                        
            except json.JSONDecodeError:
                pass
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        for task in tasks.values():
            task.cancel()

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=45678, reload=True)
