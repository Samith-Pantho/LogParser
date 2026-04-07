from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func as sa_func
from database import SessionLocal
import models
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import os
import re

router = APIRouter(prefix="/api/logs", tags=["logs"])

def sanitize_name(name: str) -> str:
    """
    Sanitize names for filesystem compatibility.
    Replaces common problematic characters for Windows/Linux interop.
    """
    if not name:
        return "default"
    # Lowercase, strip and replace colons, stars, etc. with hyphens
    sanitized = name.lower().strip()
    sanitized = re.sub(r'[:*?"<>|]', '-', sanitized)
    # Remove redundant dots or leading slashes
    sanitized = re.sub(r'[\\/]', '-', sanitized)
    return sanitized or "default"

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class IngestLogRequest(BaseModel):
    projectname: str
    timestamp: str
    log_type: str
    log_text: str
    create_by: Optional[str] = "Anonymus"
    module_nm: Optional[str] = None
    function_nm: Optional[str] = None
    savetype: Optional[str] = "file" # "file" or "db"

LOG_BASE_DIR = "/app/Logs"

@router.post("/ingest")
async def ingest_log(req: IngestLogRequest, db: Session = Depends(get_db)):
    # Normalize and Sanitize names
    project_name = sanitize_name(req.projectname)
    module_name = sanitize_name(req.module_nm) if req.module_nm else None
    print(req.savetype)
    if req.savetype == "file":
        # Ensure project directory
        project_dir = os.path.join(LOG_BASE_DIR, project_name)
        if not os.path.exists(project_dir):
            os.makedirs(project_dir, exist_ok=True)
        
        # Ensure module directory if provided
        target_dir = project_dir
        if module_name:
            target_dir = os.path.join(project_dir, module_name)
            if not os.path.exists(target_dir):
                os.makedirs(target_dir, exist_ok=True)
        
        # Filename based on current date
        filename = f"{datetime.now().strftime('%Y-%m-%d')}.log"
        filepath = os.path.join(target_dir, filename)
        
        # Format: timestamp----->logtype----->createby----->function_nm----->log_text\n\n
        func_nm = req.function_nm if req.function_nm else "func()"
        log_entry = f"{req.timestamp}----->{req.log_type}----->{req.create_by}----->{func_nm}----->{req.log_text}\n\n"
        
        with open(filepath, "a", encoding="utf-8") as f:
            f.write(log_entry)
            
        return {"status": "success", "destination": "file", "path": filepath}
    
    elif req.savetype == "db":
        try:
            # Find or create project
            db_project = db.query(models.Project).filter(models.Project.name == project_name).first()
            if not db_project:
                db_project = models.Project(name=project_name)
                db.add(db_project)
                db.flush()
            
            # Find or create module if provided
            db_module = None
            if module_name:
                db_module = db.query(models.Module).filter(
                    models.Module.project_id == db_project.id,
                    models.Module.name == module_name
                ).first()
                if not db_module:
                    db_module = models.Module(project_id=db_project.id, name=module_name)
                    db.add(db_module)
                    db.flush()
            
            # Parse timestamp
            try:
                ts = datetime.fromisoformat(req.timestamp.replace("Z", "+00:00"))
            except:
                ts = datetime.now()
                
            db_log = models.IngestedLog(
                project_id=db_project.id,
                module_id=db_module.id if db_module else None,
                function_nm=req.function_nm,
                timestamp=ts,
                log_type=req.log_type.lower(),
                log_text=req.log_text,
                create_by=req.create_by
            )
            db.add(db_log)
            db.commit()
            return {"status": "success", "destination": "db", "id": db_log.id}
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=str(e))
    
    else:
        raise HTTPException(status_code=400, detail="Invalid savetype. Must be 'file' or 'db'.")

@router.get("/projects")
async def list_projects(storage: str = Query("all"), db: Session = Depends(get_db)):
    """ List project names with optional filtering by storage type (db, file, all). """
    db_projects = []
    if storage in ["db", "all"]:
        # Get projects from DB table (efficient)
        db_projects = db.query(models.Project.name).all()
        db_projects = [p[0] for p in db_projects]
    
    fs_projects = []
    if storage in ["file", "all"]:
        # Get projects from Filesystem
        if os.path.exists(LOG_BASE_DIR):
            fs_projects = [sanitize_name(d) for d in os.listdir(LOG_BASE_DIR) if os.path.isdir(os.path.join(LOG_BASE_DIR, d))]
        
    return sorted(list(set(db_projects + fs_projects)))

@router.get("/modules")
async def list_modules(project: str = Query(...), storage: str = Query("all"), db: Session = Depends(get_db)):
    """ List module names with optional filtering by storage type (db, file, all). """
    project_lower = project.lower()
    
    db_modules = []
    if storage in ["db", "all"]:
        # Get modules from DB (efficient)
        db_modules = db.query(models.Module.name).join(models.Project).filter(models.Project.name == project_lower).all()
        db_modules = [m[0] for m in db_modules]
    
    fs_modules = []
    if storage in ["file", "all"]:
        # Get modules from Filesystem
        project_dir = os.path.join(LOG_BASE_DIR, project_lower)
        if os.path.exists(project_dir):
            fs_modules = [sanitize_name(d) for d in os.listdir(project_dir) if os.path.isdir(os.path.join(project_dir, d))]
        
    return sorted(list(set(db_modules + fs_modules)))

@router.delete("/projects/{project_name}")
async def delete_project(project_name: str, db: Session = Depends(get_db)):
    project_lower = project_name.lower().strip()
    
    # 1. Delete from DB (Cascading handles modules and logs)
    db_project = db.query(models.Project).filter(models.Project.name == project_lower).first()
    if db_project:
        db.delete(db_project)
        db.commit()
    
    # 2. Delete from Filesystem
    project_dir = os.path.join(LOG_BASE_DIR, project_lower)
    if os.path.exists(project_dir):
        import shutil
        try:
            shutil.rmtree(project_dir)
        except Exception as e:
            print(f"Error deleting folder {project_dir}: {e}")
            
    return {"status": "success", "message": f"Project {project_lower} deleted from DB and Filesystem"}
