import os
from datetime import UTC, datetime

from sqlalchemy import JSON, DateTime, String, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker


class Base(DeclarativeBase):
    pass


class CompositionRow(Base):
    __tablename__ = "composition_revisions"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    payload: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))


class JobRow(Base):
    __tablename__ = "jobs"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    composition_id: Mapped[str] = mapped_column(String(64), index=True)
    status: Mapped[str] = mapped_column(String(20), default="QUEUED")
    error: Mapped[str | None] = mapped_column(String, nullable=True)
    artifacts: Mapped[dict] = mapped_column(JSON, default=dict)


class PerformanceRow(Base):
    __tablename__ = "performances"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    payload: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))


class ArenaRow(Base):
    __tablename__ = "agent_tournaments"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    payload: Mapped[dict] = mapped_column(JSON)


class PreferenceRow(Base):
    __tablename__ = "listening_preferences"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    payload: Mapped[dict] = mapped_column(JSON)


def database(url: str | None = None):
    url = url or os.getenv("DATABASE_URL", "sqlite:///.data/clanker.db")
    if url.startswith("sqlite"):
        os.makedirs(".data", exist_ok=True)
    engine = create_engine(url, connect_args={"check_same_thread": False} if url.startswith("sqlite") else {})
    Base.metadata.create_all(engine)
    return engine, sessionmaker(engine, expire_on_commit=False)
