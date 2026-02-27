from fastapi import APIRouter, Depends, HTTPException
from config.conexionDB import get_conexion

router = APIRouter()


@router.get("/")
async def listar_historial_medico(conn = Depends(get_conexion)):
    try:
        query = """
            SELECT hm.*, p.nombre AS veterinario
            FROM historial_medico hm
            JOIN personal p ON hm.id_personal = p.id_personal
            ORDER BY hm.id_historial;
        """
        result = await conn.execute(query)
        return await result.fetchall()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/")
async def crear_historial_medico(historial: dict, conn = Depends(get_conexion)):
    try:
        query = """
            INSERT INTO historial_medico
            (id_animal, id_personal, fecha_revision, diagnostico,
             tratamiento, estado_salud, proxima_revision)
            VALUES (%s,%s,%s,%s,%s,%s,%s)
            RETURNING *;
        """

        result = await conn.execute(
            query,
            (
                historial["id_animal"],
                historial["id_personal"],
                historial["fecha_revision"],
                historial.get("diagnostico"),
                historial.get("tratamiento"),
                historial.get("estado_salud"),
                historial.get("proxima_revision")
            )
        )

        nuevo = await result.fetchone()
        await conn.commit()
        return nuevo

    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))