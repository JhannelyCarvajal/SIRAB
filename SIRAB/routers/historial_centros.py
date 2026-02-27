from fastapi import APIRouter, Depends, HTTPException
from config.conexionDB import get_conexion

router = APIRouter()


# =========================
# GET - Historial de Centros
# =========================
@router.get("/")
async def listar_historial_centros(conn = Depends(get_conexion)):
    try:
        query = """
            SELECT hc.*, a.id_animal, c.nombre AS centro
            FROM historial_centros hc
            JOIN animales a ON hc.id_animal = a.id_animal
            JOIN centros_rescate c ON hc.id_centro = c.id_centro
            ORDER BY hc.id_historial;
        """
        result = await conn.execute(query)
        return await result.fetchall()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =========================
# POST - Crear Historial Centro
# =========================
@router.post("/")
async def crear_historial_centro(historial: dict, conn = Depends(get_conexion)):
    try:
        query = """
            INSERT INTO historial_centros
            (id_animal, id_centro, fecha_inicio, fecha_fin, motivo)
            VALUES (%s,%s,%s,%s,%s)
            RETURNING *;
        """

        result = await conn.execute(
            query,
            (
                historial["id_animal"],
                historial["id_centro"],
                historial["fecha_inicio"],
                historial.get("fecha_fin"),
                historial.get("motivo")
            )
        )

        nuevo = await result.fetchone()
        await conn.commit()
        return nuevo

    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))