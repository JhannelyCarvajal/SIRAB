from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import date
from config.conexionDB import get_conexion

router = APIRouter()


class RescateCreate(BaseModel):
    fecha_rescate: date
    ubicacion: str
    tipo_incidente: str
    descripcion: str | None = None


@router.get("/")
async def listar_rescates(conn=Depends(get_conexion)):
    async with conn.cursor() as cursor:
        await cursor.execute("SELECT * FROM rescates ORDER BY fecha_rescate DESC")
        return await cursor.fetchall()


@router.get("/{id_rescate}")
async def obtener_rescate(id_rescate: int, conn=Depends(get_conexion)):
    async with conn.cursor() as cursor:
        await cursor.execute(
            "SELECT * FROM rescates WHERE id_rescate = %s",
            (id_rescate,)
        )
        dato = await cursor.fetchone()
        if not dato:
            raise HTTPException(status_code=404, detail="Rescate no encontrado")
        return dato


@router.post("/")
async def crear_rescate(rescate: RescateCreate, conn=Depends(get_conexion)):
    try:
        async with conn.cursor() as cursor:
            await cursor.execute("""
                INSERT INTO rescates (fecha_rescate, ubicacion, tipo_incidente, descripcion)
                VALUES (%s, %s, %s, %s)
                RETURNING id_rescate
            """, (
                rescate.fecha_rescate,
                rescate.ubicacion,
                rescate.tipo_incidente,
                rescate.descripcion
            ))
            nuevo_id = await cursor.fetchone()
            await conn.commit()
            return {
                "mensaje": "Rescate registrado correctamente",
                "id_rescate": nuevo_id["id_rescate"]
            }
    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=400, detail=f"Error al registrar rescate: {str(e)}")


@router.put("/{id_rescate}")
async def actualizar_rescate(id_rescate: int, rescate: RescateCreate, conn=Depends(get_conexion)):
    try:
        async with conn.cursor() as cursor:
            await cursor.execute("""
                UPDATE rescates
                SET fecha_rescate = %s, ubicacion = %s, tipo_incidente = %s, descripcion = %s
                WHERE id_rescate = %s
                RETURNING id_rescate
            """, (
                rescate.fecha_rescate,
                rescate.ubicacion,
                rescate.tipo_incidente,
                rescate.descripcion,
                id_rescate
            ))
            resultado = await cursor.fetchone()
            if not resultado:
                raise HTTPException(status_code=404, detail="Rescate no encontrado")
            await conn.commit()
            return {"mensaje": "Rescate actualizado correctamente", "id_rescate": resultado["id_rescate"]}
    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=400, detail=f"Error al actualizar rescate: {str(e)}")


@router.delete("/{id_rescate}")
async def eliminar_rescate(id_rescate: int, conn=Depends(get_conexion)):
    try:
        async with conn.cursor() as cursor:
            await cursor.execute(
                "DELETE FROM rescates WHERE id_rescate = %s RETURNING id_rescate",
                (id_rescate,)
            )
            eliminado = await cursor.fetchone()
            if not eliminado:
                raise HTTPException(status_code=404, detail="Rescate no encontrado")
            await conn.commit()
            return {"mensaje": "Rescate eliminado correctamente"}
    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=400, detail=f"Error al eliminar rescate: {str(e)}")
