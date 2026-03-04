from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from config.conexionDB import get_conexion

router = APIRouter()


class EspecieCreate(BaseModel):
    nombre_comun: str
    nombre_cientifico: str | None = None
    estado_conservacion: str | None = None
    descripcion: str | None = None
    id_tipo: int



@router.get("/")
async def listar_especies(conn=Depends(get_conexion)):
    async with conn.cursor() as cursor:
        await cursor.execute("""
            SELECT e.*, t.nombre AS tipo
            FROM especies e
            JOIN tipo_especie t ON e.id_tipo = t.id_tipo
            ORDER BY e.id_especie
        """)
        return await cursor.fetchall()



@router.get("/{id_especie}")
async def obtener_especie(id_especie: int, conn=Depends(get_conexion)):
    async with conn.cursor() as cursor:
        await cursor.execute("""
            SELECT e.*, t.nombre AS tipo
            FROM especies e
            JOIN tipo_especie t ON e.id_tipo = t.id_tipo
            WHERE e.id_especie = %s
        """, (id_especie,))
        dato = await cursor.fetchone()
        if not dato:
            raise HTTPException(status_code=404, detail="Especie no encontrada")
        return dato



@router.post("/")
async def crear_especie(especie: EspecieCreate, conn=Depends(get_conexion)):
    try:
        async with conn.cursor() as cursor:
            await cursor.execute("""
                INSERT INTO especies (nombre_comun, nombre_cientifico, estado_conservacion, descripcion, id_tipo)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id_especie
            """, (
                especie.nombre_comun,
                especie.nombre_cientifico,
                especie.estado_conservacion,
                especie.descripcion,
                especie.id_tipo
            ))
            nuevo_id = await cursor.fetchone()
            await conn.commit()
            return {
                "mensaje": "Especie registrada correctamente",
                "id_especie": nuevo_id["id_especie"]
            }
    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=400, detail=f"Error al crear especie: {str(e)}")



@router.put("/{id_especie}")
async def actualizar_especie(id_especie: int, especie: EspecieCreate, conn=Depends(get_conexion)):
    try:
        async with conn.cursor() as cursor:
            await cursor.execute("""
                UPDATE especies
                SET nombre_comun = %s, nombre_cientifico = %s,
                    estado_conservacion = %s, descripcion = %s, id_tipo = %s
                WHERE id_especie = %s
                RETURNING id_especie
            """, (
                especie.nombre_comun,
                especie.nombre_cientifico,
                especie.estado_conservacion,
                especie.descripcion,
                especie.id_tipo,
                id_especie
            ))
            resultado = await cursor.fetchone()
            if not resultado:
                raise HTTPException(status_code=404, detail="Especie no encontrada")
            await conn.commit()
            return {"mensaje": "Especie actualizada correctamente", "id_especie": resultado["id_especie"]}
    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=400, detail=f"Error al actualizar especie: {str(e)}")



@router.delete("/{id_especie}")
async def eliminar_especie(id_especie: int, conn=Depends(get_conexion)):
    try:
        async with conn.cursor() as cursor:
            await cursor.execute(
                "DELETE FROM especies WHERE id_especie = %s RETURNING id_especie",
                (id_especie,)
            )
            eliminado = await cursor.fetchone()
            if not eliminado:
                raise HTTPException(status_code=404, detail="Especie no encontrada")
            await conn.commit()
            return {"mensaje": "Especie eliminada correctamente"}
    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=400, detail=f"Error al eliminar especie: {str(e)}")
