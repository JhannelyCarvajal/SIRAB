from fastapi import APIRouter, Depends, HTTPException
from config.conexionDB import get_conexion

router = APIRouter()


# =========================
# GET - Listar Personal
# =========================
@router.get("/")
async def listar_personal(conn = Depends(get_conexion)):
    try:
        query = """
            SELECT p.*, c.nombre AS centro
            FROM personal p
            JOIN centros_rescate c ON p.id_centro = c.id_centro
            ORDER BY p.id_personal;
        """
        result = await conn.execute(query)
        return await result.fetchall()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =========================
# POST - Crear Personal
# =========================
@router.post("/")
async def crear_personal(persona: dict, conn = Depends(get_conexion)):
    try:
        query = """
            INSERT INTO personal
            (nombre, paterno, materno, cargo, telefono, email, id_centro)
            VALUES (%s,%s,%s,%s,%s,%s,%s)
            RETURNING *;
        """

        result = await conn.execute(
            query,
            (
                persona["nombre"],
                persona.get("paterno"),
                persona.get("materno"),
                persona["cargo"],
                persona.get("telefono"),
                persona.get("email"),
                persona["id_centro"]
            )
        )

        nuevo = await result.fetchone()
        await conn.commit()
        return nuevo

    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))