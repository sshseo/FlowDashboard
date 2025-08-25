import asyncpg
from app.config import settings

db_pool = None

async def init_db_pool():
    global db_pool
    db_pool = await asyncpg.create_pool(settings.DATABASE_URL)

async def close_db_pool():
    if db_pool:
        await db_pool.close()

def get_db_pool():
    return db_pool