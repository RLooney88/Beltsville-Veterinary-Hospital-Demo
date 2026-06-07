"""Async SQLAlchemy engine, session, and Base for Veterinary Site Template.
Uses Postgres (hosted on Railway in prod, local in dev)."""
import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

load_dotenv(Path(__file__).parent / ".env")


def _normalize_database_url(url: str) -> str:
    """Railway exposes postgresql:// URLs; SQLAlchemy async needs asyncpg."""
    if url.startswith("postgres://"):
        return "postgresql+asyncpg://" + url[len("postgres://") :]
    if url.startswith("postgresql://"):
        return "postgresql+asyncpg://" + url[len("postgresql://") :]
    return url


DATABASE_URL = _normalize_database_url(os.environ["DATABASE_URL"])

engine = create_async_engine(DATABASE_URL, echo=False, pool_pre_ping=True, future=True)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
