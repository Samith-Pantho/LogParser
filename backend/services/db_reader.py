import asyncio
from typing import Optional
from sqlalchemy import create_engine, text
from ws_manager import manager
from datetime import datetime
from database import SessionLocal
import models

async def stream_db_query(connection_url: str, query: str, source_id: str, interval_seconds: int = 5):
    """
    Executes a query periodically and streams the results.
    """
    try:
        engine = create_engine(connection_url)
    except Exception as e:
        print(f"Failed to connect to DB: {e}")
        return

    while True:
        try:
            with engine.connect() as conn:
                result = conn.execute(text(query))
                rows = result.fetchall()
                keys = result.keys()
                
                for row in rows:
                    log_data = dict(zip(keys, row))
                    
                    # Try to map to expected format if possible
                    level = log_data.get('level', 'INFO')
                    msg = log_data.get('message', str(log_data))
                    timestamp = log_data.get('timestamp', datetime.now())
                    
                    if isinstance(timestamp, str):
                        try:
                            timestamp = datetime.fromisoformat(timestamp.replace(' ', 'T'))
                        except:
                            timestamp = datetime.now()
                    
                    formatted_log = {
                        "timestamp": timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                        "level": level,
                        "message": msg
                    }
                    
                    await manager.broadcast_log(source_id=source_id, log_data=formatted_log)
        except Exception as e:
            await manager.broadcast_log(
                source_id=source_id, 
                log_data={"timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"), "level": "ERROR", "message": f"DB Query Error: {str(e)}"}
            )
            
        await asyncio.sleep(interval_seconds)

async def query_db_logs(source_id: str):
    """
    Wrapper for stream_db_query that fetches connection details from the database.
    """
    db = SessionLocal()
    try:
        # source_id for DB is usually the connection name or a specific ID
        # Let's try to find a connection by name or ID
        conn = None
        if source_id.isdigit():
            conn = db.query(models.SavedConnection).filter(models.SavedConnection.id == int(source_id)).first()
        
        if not conn:
            conn = db.query(models.SavedConnection).filter(models.SavedConnection.name == source_id).first()
            
        if not conn:
            print(f"DB Connection not found for source_id: {source_id}")
            return

        # Build connection URL
        url = f"postgresql://{conn.username}:{conn.password}@{conn.host}:{conn.port}/{conn.db_name}"
        
        # For logs, we might need a default query if none exists
        # In this app, users save queries. Let's pick the first one or a default
        queries = db.query(models.SavedQuery).filter(models.SavedQuery.connection_id == conn.id).all()
        if not queries:
            print(f"No queries found for connection: {conn.name}")
            return
            
        # Stream the first query results for now
        await stream_db_query(connection_url=url, query=queries[0].query_text, source_id=source_id)
        
    finally:
        db.close()

