from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class SavedConnection(Base):
    __tablename__ = "saved_connections"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    db_type = Column(String) # postgres, mysql, etc
    host = Column(String)
    port = Column(Integer)
    username = Column(String)
    password = Column(String)
    db_name = Column(String)
    ssl = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    queries = relationship("SavedQuery", back_populates="connection", cascade="all, delete-orphan")

class SavedQuery(Base):
    __tablename__ = "saved_queries"

    id = Column(Integer, primary_key=True, index=True)
    connection_id = Column(Integer, ForeignKey("saved_connections.id"))
    name = Column(String)
    query_text = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    connection = relationship("SavedConnection", back_populates="queries")

class AlertRule(Base):
    __tablename__ = "alert_rules"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    condition_type = Column(String) # e.g. "ERROR_COUNT"
    threshold = Column(Integer)
    time_window_mins = Column(Integer)
    is_active = Column(Boolean, default=True)

class SystemSetting(Base):
    __tablename__ = "system_settings"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True)
    value = Column(String)
    description = Column(String, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True) # Stored in lowercase
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    modules = relationship("Module", back_populates="project", cascade="all, delete-orphan")
    logs = relationship("IngestedLog", back_populates="project", cascade="all, delete-orphan")

class Module(Base):
    __tablename__ = "modules"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    name = Column(String, index=True) # Stored in lowercase
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="modules")
    logs = relationship("IngestedLog", back_populates="module", cascade="all, delete-orphan")

class IngestedLog(Base):
    __tablename__ = "ingested_logs"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    module_id = Column(Integer, ForeignKey("modules.id", ondelete="CASCADE"), index=True, nullable=True)
    function_nm = Column(String, nullable=True)
    timestamp = Column(DateTime)
    log_type = Column(String) # Stored in lowercase for consistency
    log_text = Column(Text)
    create_by = Column(String, default="Anonymus")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="logs")
    module = relationship("Module", back_populates="logs")
