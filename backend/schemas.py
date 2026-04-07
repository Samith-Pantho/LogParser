from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class SavedConnectionBase(BaseModel):
    name: str
    db_type: str
    host: str
    port: int
    username: str
    password: str
    db_name: str
    ssl: bool = False

class SavedConnectionCreate(SavedConnectionBase):
    pass

class SavedConnection(SavedConnectionBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class AlertRuleBase(BaseModel):
    name: str
    condition_type: str
    threshold: int
    time_window_mins: int
    is_active: bool = True

class AlertRuleCreate(AlertRuleBase):
    pass

class AlertRule(AlertRuleBase):
    id: int

    class Config:
        from_attributes = True

class SavedQueryBase(BaseModel):
    name: str
    query_text: str

class SavedQueryCreate(SavedQueryBase):
    pass

class SavedQuery(SavedQueryBase):
    id: int
    connection_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class SystemSettingBase(BaseModel):
    key: str
    value: str
    description: Optional[str] = None

class SystemSettingCreate(SystemSettingBase):
    pass

class SystemSetting(SystemSettingBase):
    updated_at: datetime

    class Config:
        from_attributes = True
