from fastapi import APIRouter, Depends, HTTPException
from config.conexionDB import get_conexion

router = APIRouter()


@router.get("/")
async def listar_salidas(conn = Depends(get_conexion)):
    try:
        query = """
            SELECT s.*, p.nombre AS responsable
            FROM salidas s
            JOIN personal p ON s.id_personal = p.id_personal
            ORDER BY s.id_salida;
        """
        result = await conn.execute(query)
        return await result.fetchall()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/")
async def crear_salida(salida: dict, conn = Depends(get_conexion)):
    try:
        query = """
            INSERT INTO salidas
            (id_animal, id_personal, fecha_salida,
             tipo_salida, destino, motivo, observaciones)
            VALUES (%s,%s,%s,%s,%s,%s,%s)
            RETURNING *;
        """

        result = await conn.execute(
            query,
            (
                salida["id_animal"],
                salida["id_personal"],
                salida["fecha_salida"],
                salida["tipo_salida"],
                salida.get("destino"),
                salida.get("motivo"),
                salida.get("observaciones")
            )
        )

        nuevo = await result.fetchone()
        await conn.commit()
        return nuevo

    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))