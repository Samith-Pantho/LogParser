from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, schemas
import os
from pathlib import Path
import platform

router = APIRouter(prefix="/api/sources", tags=["sources"])

# --- Connection Endpoints ---

@router.get("/connections", response_model=List[schemas.SavedConnection])
def get_connections(db: Session = Depends(get_db)):
    return db.query(models.SavedConnection).all()

@router.post("/connections", response_model=schemas.SavedConnection)
def create_connection(connection: schemas.SavedConnectionCreate, db: Session = Depends(get_db)):
    db_conn = models.SavedConnection(**connection.dict())
    db.add(db_conn)
    db.commit()
    db.refresh(db_conn)
    return db_conn

@router.delete("/connections/{connection_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_connection(connection_id: int, db: Session = Depends(get_db)):
    db_conn = db.query(models.SavedConnection).filter(models.SavedConnection.id == connection_id).first()
    if not db_conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    # Cascading delete is handled by SQLAlchemy relationship cascade="all, delete-orphan"
    db.delete(db_conn)
    db.commit()
    return None

# --- Query Endpoints ---

@router.get("/{connection_id}/queries", response_model=List[schemas.SavedQuery])
def get_queries(connection_id: int, db: Session = Depends(get_db)):
    return db.query(models.SavedQuery).filter(models.SavedQuery.connection_id == connection_id).all()

@router.post("/{connection_id}/queries", response_model=schemas.SavedQuery)
def create_query(connection_id: int, query: schemas.SavedQueryCreate, db: Session = Depends(get_db)):
    db_query = models.SavedQuery(**query.dict(), connection_id=connection_id)
    db.add(db_query)
    db.commit()
    db.refresh(db_query)
    return db_query

@router.delete("/queries/{query_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_query(query_id: int, db: Session = Depends(get_db)):
    db_query = db.query(models.SavedQuery).filter(models.SavedQuery.id == query_id).first()
    if not db_query:
        raise HTTPException(status_code=404, detail="Query not found")
    db.delete(db_query)
    db.commit()
    return None

@router.delete("/queries", status_code=status.HTTP_204_NO_CONTENT)
def delete_multiple_queries(query_ids: List[int], db: Session = Depends(get_db)):
    db.query(models.SavedQuery).filter(models.SavedQuery.id.in_(query_ids)).delete(synchronize_session=False)
    db.commit()
    return None

@router.get("/ls")
def list_files(path: str = "/"):
    """
    Lists directories and log-related files at the given path.
    """
    try:
        target_path = Path(path)
        if not target_path.exists():
            return {"folders": [], "files": [], "error": f"Path '{path}' does not exist"}
        
        folders = []
        files = []
        is_root = path == "/" or (platform.system() == "Windows" and len(path) <= 3)

        for entry in os.scandir(path):
            try:
                if entry.name.startswith('.'):
                    continue
                
                if entry.is_dir():
                    folders.append(entry.name)
                elif entry.is_file():
                    ext = Path(entry.name).suffix.lower()
                    if ext in ['.log', '.txt', '.json', '.xml', '']:
                        files.append(entry.name)
            except (PermissionError, OSError):
                continue
        
        return {
            "current_path": str(target_path.absolute()),
            "folders": sorted(folders),
            "files": sorted(files),
            "is_root": is_root
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

