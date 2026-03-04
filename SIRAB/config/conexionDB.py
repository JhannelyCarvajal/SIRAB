from fastapi import FastAPI
from psycopg_pool import AsyncConnectionPool
from psycopg.rows import dict_row
from contextlib import asynccontextmanager
from config.constantes import config

DB_URL = f"postgresql://{config.DB_USER}:{config.DB_PASSWORD}@{config.DB_HOST}:{config.DB_PORT}/{config.DB_NAME}"

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.async_pool = AsyncConnectionPool(conninfo=DB_URL, open=False)
    try:
        await app.async_pool.open()
        print("✅ Pool de conexiones abierto exitosamente")
        yield
    finally:
        await app.async_pool.close()
        print("🛑 Pool de conexiones cerrado")

async def get_conexion():
    from main import app
    async with app.async_pool.connection() as conn:
        conn.row_factory = dict_row
        yield conn