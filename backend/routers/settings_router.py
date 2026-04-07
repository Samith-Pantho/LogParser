from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict
from database import get_db
import models, schemas

router = APIRouter(prefix="/api/settings", tags=["settings"])

@router.get("/", response_model=List[schemas.SystemSetting])
def get_settings(db: Session = Depends(get_db)):
    return db.query(models.SystemSetting).all()

@router.get("/{key}", response_model=schemas.SystemSetting)
def get_setting(key: str, db: Session = Depends(get_db)):
    setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == key).first()
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    return setting

@router.post("/", response_model=schemas.SystemSetting)
def update_setting(setting: schemas.SystemSettingCreate, db: Session = Depends(get_db)):
    db_setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == setting.key).first()
    if db_setting:
        db_setting.value = setting.value
        db_setting.description = setting.description
    else:
        db_setting = models.SystemSetting(**setting.dict())
        db.add(db_setting)
    db.commit()
    db.refresh(db_setting)
    return db_setting

@router.post("/bulk")
def update_settings_bulk(settings: List[schemas.SystemSettingCreate], db: Session = Depends(get_db)):
    for s in settings:
        db_setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == s.key).first()
        if db_setting:
            db_setting.value = s.value
            if s.description:
                db_setting.description = s.description
        else:
            db_setting = models.SystemSetting(**s.dict())
            db.add(db_setting)
    db.commit()
    return {"status": "ok"}
