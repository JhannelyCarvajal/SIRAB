from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import date
from config.conexionDB import get_conexion

router = APIRouter()


class HistorialCentroCreate(BaseModel):
    id_animal: int
    id_centro: int
    fecha_inicio: date
    fecha_fin: date | None = None
    motivo: str | None = None



@router.get("/animal/{id_animal}")
async def historial_por_animal(id_animal: int, conn=Depends(get_conexion)):
    async with conn.cursor() as cursor:
        await cursor.execute("""
            SELECT hc.*, c.nombre AS centro, c.departamento
            FROM historial_centros hc
            JOIN centros_rescate c ON hc.id_centro = c.id_centro
            WHERE hc.id_animal = %s
            ORDER BY hc.fecha_inicio DESC
        """, (id_animal,))
        return await cursor.fetchall()



@router.get("/{id_historial}")
async def obtener_historial(id_historial: int, conn=Depends(get_conexion)):
    async with conn.cursor() as cursor:
        await cursor.execute("""
            SELECT hc.*, c.nombre AS centro, c.departamento
            FROM historial_centros hc
            JOIN centros_rescate c ON hc.id_centro = c.id_centro
            WHERE hc.id_historial = %s
        """, (id_historial,))
        dato = await cursor.fetchone()
        if not dato:
            raise HTTPException(status_code=404, detail="Historial de centro no encontrado")
        return dato



@router.post("/")
async def crear_historial(historial: HistorialCentroCreate, conn=Depends(get_conexion)):
    try:
        async with conn.cursor() as cursor:
            await cursor.execute("""
                INSERT INTO historial_centros (id_animal, id_centro, fecha_inicio, fecha_fin, motivo)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id_historial
            """, (
                historial.id_animal,
                historial.id_centro,
                historial.fecha_inicio,
                historial.fecha_fin,
                historial.motivo
            ))
            nuevo_id = await cursor.fetchone()
            await conn.commit()
            return {
                "mensaje": "Historial de centro registrado correctamente",
                "id_historial": nuevo_id["id_historial"]
            }
    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=400, detail=f"Error al registrar historial de centro: {str(e)}")



@router.put("/{id_historial}")
async def actualizar_historial(id_historial: int, historial: HistorialCentroCreate, conn=Depends(get_conexion)):
    try:
        async with conn.cursor() as cursor:
            await cursor.execute("""
                UPDATE historial_centros
                SET id_animal = %s, id_centro = %s, fecha_inicio = %s, fecha_fin = %s, motivo = %s
                WHERE id_historial = %s
                RETURNING id_historial
            """, (
                historial.id_animal,
                historial.id_centro,
                historial.fecha_inicio,
                historial.fecha_fin,
                historial.motivo,
                id_historial
            ))
            resultado = await cursor.fetchone()
            if not resultado:
                raise HTTPException(status_code=404, detail="Historial de centro no encontrado")
            await conn.commit()
            return {"mensaje": "Historial de centro actualizado correctamente"}
    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=400, detail=f"Error al actualizar historial de centro: {str(e)}")



@router.delete("/{id_historial}")
async def eliminar_historial(id_historial: int, conn=Depends(get_conexion)):
    try:
        async with conn.cursor() as cursor:
            await cursor.execute(
                "DELETE FROM historial_centros WHERE id_historial = %s RETURNING id_historial",
                (id_historial,)
            )
            eliminado = await cursor.fetchone()
            if not eliminado:
                raise HTTPException(status_code=404, detail="Historial de centro no encontrado")
            await conn.commit()
            return {"mensaje": "Historial de centro eliminado correctamente"}
    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=400, detail=f"Error al eliminar historial de centro: {str(e)}")
