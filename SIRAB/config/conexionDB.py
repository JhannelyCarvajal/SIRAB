from psycopg_pool import AsyncConnectionPool
from psycopg.rows import dict_row
from contextlib import asynccontextmanager
from fastapi import FastAPI

DB_URL = "postgresql://postgres:1234@localhost:5432/sirab"

async_pool: AsyncConnectionPool | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global async_pool
    async_pool = AsyncConnectionPool(
        conninfo=DB_URL,
        open=False
    )
    await async_pool.open()
    print("✅ Base de datos conectada")
    yield
    await async_pool.close()
    print("❌ Base de datos desconectada")


app = FastAPI(lifespan=lifespan)


async def get_conexion():
    async with async_pool.connection() as conn:
        conn.row_factory = dict_row
        yield conn