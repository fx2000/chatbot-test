from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


# The async engine is like a connection pool manager.
# It handles creating and recycling database connections automatically.
engine = create_async_engine(settings.database_url, echo=False)

# async_sessionmaker creates a factory for database sessions.
# Each session is like a "transaction scope" -- you open one per request,
# do your queries, commit, and close it.
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    """
    Base class for all SQLAlchemy ORM models.

    This is like a base schema class -- all models inherit from it
    so SQLAlchemy knows about them and can create their tables.
    """

    pass


async def init_db():
    """
    Create all database tables that don't exist yet.

    Uses Base.metadata.create_all which is safe to call multiple times --
    it only creates tables that are missing (like CREATE TABLE IF NOT EXISTS).
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    """
    FastAPI dependency that provides a database session per request.

    Usage in a route:
        async def my_route(db: AsyncSession = Depends(get_db)):
            ...

    The session is automatically closed when the request finishes,
    similar to Express middleware that attaches a DB connection to req.
    """
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
