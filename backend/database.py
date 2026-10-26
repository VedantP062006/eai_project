"""
SQLite Database module for logging commands, gestures, system events, and storing configuration.
"""

import json
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    Float,
    DateTime,
    Text,
    desc
)
from sqlalchemy.orm import declarative_base, sessionmaker, scoped_session
from backend.config import DB_PATH, DEFAULT_GESTURE_MAP, DEFAULT_SETTINGS

Base = declarative_base()


class CommandLog(Base):
    """Stores every detected gesture and executed or rejected vehicle command."""
    __tablename__ = "command_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    gesture = Column(String(64), nullable=False)
    command = Column(String(64), nullable=False)
    confidence = Column(Float, default=1.0)
    execution_result = Column(String(32), default="SUCCESS")  # SUCCESS, REJECTED, SAFETY_BLOCKED
    source = Column(String(32), default="GESTURE")            # GESTURE, MANUAL, DEMO, SYSTEM
    notes = Column(Text, nullable=True)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "gesture": self.gesture,
            "command": self.command,
            "confidence": round(self.confidence, 3),
            "execution_result": self.execution_result,
            "source": self.source,
            "notes": self.notes or "",
        }


class SystemEvent(Base):
    """Stores critical events like Emergency Stop, Camera Lost, Hand Absent, Hardware Heartbeat."""
    __tablename__ = "system_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    event_type = Column(String(64), nullable=False)           # ESTOP, HAND_LOST, CAM_FAIL, START
    severity = Column(String(16), default="INFO")             # INFO, WARNING, CRITICAL, EMERGENCY
    description = Column(Text, nullable=False)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "event_type": self.event_type,
            "severity": self.severity,
            "description": self.description,
        }


class SystemSetting(Base):
    """Stores key-value system settings and JSON configurations."""
    __tablename__ = "system_settings"

    key = Column(String(64), primary_key=True)
    value_json = Column(Text, nullable=False)


# Engine and session initialization
engine = create_engine(
    f"sqlite:///{DB_PATH}",
    connect_args={"check_same_thread": False},
    echo=False
)
SessionFactory = sessionmaker(bind=engine, autoflush=False)
ScopedSession = scoped_session(SessionFactory)


def init_db():
    """Create database tables and populate defaults if missing."""
    Base.metadata.create_all(bind=engine)
    session = ScopedSession()
    try:
        # Check if gesture_map setting exists
        gesture_setting = session.query(SystemSetting).filter_by(key="gesture_map").first()
        if not gesture_setting:
            session.add(SystemSetting(key="gesture_map", value_json=json.dumps(DEFAULT_GESTURE_MAP)))

        # Check if settings exist
        sys_setting = session.query(SystemSetting).filter_by(key="system_settings").first()
        if not sys_setting:
            session.add(SystemSetting(key="system_settings", value_json=json.dumps(DEFAULT_SETTINGS)))

        # Add initial system boot event
        boot_event = SystemEvent(
            event_type="SYSTEM_BOOT",
            severity="INFO",
            description="Vehicle AI and Simulation system initialized successfully."
        )
        session.add(boot_event)
        session.commit()
    except Exception as e:
        session.rollback()
        print(f"Error initializing database: {e}")
    finally:
        session.close()


def log_command(
    gesture: str,
    command: str,
    confidence: float = 1.0,
    execution_result: str = "SUCCESS",
    source: str = "GESTURE",
    notes: Optional[str] = None
) -> CommandLog:
    """Insert a new command log entry."""
    session = ScopedSession()
    try:
        entry = CommandLog(
            timestamp=datetime.now(timezone.utc),
            gesture=gesture,
            command=command,
            confidence=confidence,
            execution_result=execution_result,
            source=source,
            notes=notes
        )
        session.add(entry)
        session.commit()
        session.refresh(entry)
        return entry
    except Exception as e:
        session.rollback()
        print(f"Database error in log_command: {e}")
        return None
    finally:
        session.close()


def log_event(event_type: str, severity: str, description: str) -> SystemEvent:
    """Insert a new system event."""
    session = ScopedSession()
    try:
        event = SystemEvent(
            timestamp=datetime.now(timezone.utc),
            event_type=event_type,
            severity=severity,
            description=description
        )
        session.add(event)
        session.commit()
        session.refresh(event)
        return event
    except Exception as e:
        session.rollback()
        print(f"Database error in log_event: {e}")
        return None
    finally:
        session.close()


def get_command_logs(limit: int = 100, filter_cmd: Optional[str] = None, filter_source: Optional[str] = None) -> List[Dict[str, Any]]:
    """Retrieve recent command logs."""
    session = ScopedSession()
    try:
        query = session.query(CommandLog).order_by(desc(CommandLog.timestamp))
        if filter_cmd:
            query = query.filter(CommandLog.command.ilike(f"%{filter_cmd}%"))
        if filter_source:
            query = query.filter(CommandLog.source == filter_source)
        logs = query.limit(limit).all()
        return [l.to_dict() for l in logs]
    finally:
        session.close()


def clear_command_logs() -> bool:
    """Clear all command logs."""
    session = ScopedSession()
    try:
        session.query(CommandLog).delete()
        session.commit()
        return True
    except Exception as e:
        session.rollback()
        print(f"Failed to clear command logs: {e}")
        return False
    finally:
        session.close()


def get_system_events(limit: int = 50) -> List[Dict[str, Any]]:
    """Retrieve recent system events."""
    session = ScopedSession()
    try:
        events = session.query(SystemEvent).order_by(desc(SystemEvent.timestamp)).limit(limit).all()
        return [e.to_dict() for e in events]
    finally:
        session.close()


def get_gesture_map() -> Dict[str, str]:
    """Retrieve active gesture-to-command mapping."""
    session = ScopedSession()
    try:
        record = session.query(SystemSetting).filter_by(key="gesture_map").first()
        if record:
            return json.loads(record.value_json)
        return DEFAULT_GESTURE_MAP.copy()
    finally:
        session.close()


def update_gesture_map(new_map: Dict[str, str]) -> Dict[str, str]:
    """Update gesture-to-command mapping in DB."""
    session = ScopedSession()
    try:
        record = session.query(SystemSetting).filter_by(key="gesture_map").first()
        if not record:
            record = SystemSetting(key="gesture_map", value_json=json.dumps(new_map))
            session.add(record)
        else:
            record.value_json = json.dumps(new_map)
        session.commit()
        return new_map
    except Exception as e:
        session.rollback()
        print(f"Failed to update gesture map: {e}")
        return get_gesture_map()
    finally:
        session.close()


def get_system_settings() -> Dict[str, Any]:
    """Retrieve system settings."""
    session = ScopedSession()
    try:
        record = session.query(SystemSetting).filter_by(key="system_settings").first()
        if record:
            loaded = json.loads(record.value_json)
            merged = DEFAULT_SETTINGS.copy()
            merged.update(loaded)
            return merged
        return DEFAULT_SETTINGS.copy()
    finally:
        session.close()


def update_system_settings(new_settings: Dict[str, Any]) -> Dict[str, Any]:
    """Update system settings in DB."""
    session = ScopedSession()
    try:
        record = session.query(SystemSetting).filter_by(key="system_settings").first()
        current = get_system_settings()
        current.update(new_settings)
        if not record:
            record = SystemSetting(key="system_settings", value_json=json.dumps(current))
            session.add(record)
        else:
            record.value_json = json.dumps(current)
        session.commit()
        return current
    except Exception as e:
        session.rollback()
        print(f"Failed to update system settings: {e}")
        return get_system_settings()
    finally:
        session.close()
