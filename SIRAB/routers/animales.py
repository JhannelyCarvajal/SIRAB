from fastapi import APIRouter, Depends, HTTPException
from config.conexionDB import get_conexion

router = APIRouter()


# =========================
# GET - Listar Animales
# =========================
@router.get("/")
async def listar_animales(conn = Depends(get_conexion)):
    try:
        query = """
            SELECT a.*,
                   e.nombre_comun,
                   c.nombre AS centro,
                   r.ubicacion
            FROM animales a
            JOIN especies e ON a.id_especie = e.id_especie
            JOIN centros_rescate c ON a.id_centro = c.id_centro
            JOIN rescates r ON a.id_rescate = r.id_rescate
            ORDER BY a.id_animal;
        """
        result = await conn.execute(query)
        return await result.fetchall()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =========================
# POST - Crear Animal
# =========================
@router.post("/")
async def crear_animal(animal: dict, conn = Depends(get_conexion)):
    try:
        query = """
            INSERT INTO animales
            (id_especie, id_centro, id_rescate, sexo,
             fecha_ingreso, fecha_nacimiento_aprox,
             estado_actual, peso, observaciones)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
            RETURNING *;
        """

        result = await conn.execute(
            query,
            (
                animal["id_especie"],
                animal["id_centro"],
                animal["id_rescate"],
                animal.get("sexo"),
                animal["fecha_ingreso"],
                animal.get("fecha_nacimiento_aprox"),
                animal["estado_actual"],
                animal.get("peso"),
                animal.get("observaciones")
            )
        )

        nuevo = await result.fetchone()
        await conn.commit()
        return nuevo

    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))