from fastapi import APIRouter, Depends, HTTPException
from config.conexionDB import get_conexion

router = APIRouter()


@router.get("/")
async def listar_rescates(conn = Depends(get_conexion)):
    try:
        query = "SELECT * FROM rescates ORDER BY id_rescate;"
        result = await conn.execute(query)
        return await result.fetchall()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/")
async def crear_rescate(rescate: dict, conn = Depends(get_conexion)):
    try:
        query = """
            INSERT INTO rescates
            (fecha_rescate, ubicacion, tipo_incidente, descripcion)
            VALUES (%s,%s,%s,%s)
            RETURNING *;
        """

        result = await conn.execute(
            query,
            (
                rescate["fecha_rescate"],
                rescate["ubicacion"],
                rescate["tipo_incidente"],
                rescate.get("descripcion")
            )
        )

        nuevo = await result.fetchone()
        await conn.commit()
        return nuevo

    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))