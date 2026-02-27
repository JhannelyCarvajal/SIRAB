from fastapi import APIRouter, Depends, HTTPException
from config.conexionDB import get_conexion

router = APIRouter()


# =========================
# GET - Listar Centros
# =========================
@router.get("/")
async def listar_centros(conn = Depends(get_conexion)):
    try:
        query = "SELECT * FROM centros_rescate ORDER BY id_centro;"
        result = await conn.execute(query)
        data = await result.fetchall()
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =========================
# POST - Crear Centro
# =========================
@router.post("/")
async def crear_centro(centro: dict, conn = Depends(get_conexion)):
    try:
        query = """
            INSERT INTO centros_rescate
            (nombre, departamento, direccion, telefono, email)
            VALUES (%s,%s,%s,%s,%s)
            RETURNING *;
        """

        result = await conn.execute(
            query,
            (
                centro["nombre"],
                centro["departamento"],
                centro.get("direccion"),
                centro.get("telefono"),
                centro.get("email")
            )
        )

        nuevo = await result.fetchone()
        await conn.commit()
        return nuevo

    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))