import asyncio
from sqlalchemy.orm import Session
from database import SessionLocal
import models
from ws_manager import manager
from datetime import datetime

async def stream_ingested_db_logs(project: str, module: str, source_id: str):
    """
    Streams logs from the internal ingested_logs table for a specific project/module.
    """
    db = SessionLocal()
    last_id = 0
    # On first run, maybe get last few?
    try:
        while True:
            # Poll for new logs
            query = db.query(models.IngestedLog).join(models.Project).join(models.Module).filter(
                models.Project.name == project.lower(),
                models.Module.name == module.lower(),
                models.IngestedLog.id > last_id
            ).order_by(models.IngestedLog.id.asc())
            
            new_logs = query.all()
            for log in new_logs:
                log_data = {
                    "timestamp": log.timestamp.strftime("%Y-%m-%d %H:%M:%S") if log.timestamp else datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "level": (log.log_type or "INFO").upper(),
                    "message": f"[{log.create_by or 'Anonymus'}] ({log.function_nm or 'func()'}) {log.log_text}"
                }
                await manager.broadcast_log(source_id=source_id, log_data=log_data)
                last_id = log.id
            
            await asyncio.sleep(2) # Poll every 2 seconds
    except asyncio.CancelledError:
        pass
    finally:
        db.close()
