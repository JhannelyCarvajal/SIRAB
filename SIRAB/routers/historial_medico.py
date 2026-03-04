from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import date
from config.conexionDB import get_conexion

router = APIRouter()


class HistorialMedicoCreate(BaseModel):
    id_animal: int
    id_personal: int
    fecha_revision: date
    diagnostico: str | None = None
    tratamiento: str | None = None
    estado_salud: str | None = None
    proxima_revision: date | None = None


# ── GET por animal ─────────────────────────────────────────
@router.get("/animal/{id_animal}")
async def historial_por_animal(id_animal: int, conn=Depends(get_conexion)):
    async with conn.cursor() as cursor:
        await cursor.execute("""
            SELECT hm.*,
                   p.nombre || ' ' || COALESCE(p.paterno, '') AS veterinario
            FROM historial_medico hm
            JOIN personal p ON hm.id_personal = p.id_personal
            WHERE hm.id_animal = %s
            ORDER BY hm.fecha_revision DESC
        """, (id_animal,))
        return await cursor.fetchall()


# ── GET por id ─────────────────────────────────────────────
@router.get("/{id_historial}")
async def obtener_historial(id_historial: int, conn=Depends(get_conexion)):
    async with conn.cursor() as cursor:
        await cursor.execute("""
            SELECT hm.*,
                   p.nombre || ' ' || COALESCE(p.paterno, '') AS veterinario
            FROM historial_medico hm
            JOIN personal p ON hm.id_personal = p.id_personal
            WHERE hm.id_historial = %s
        """, (id_historial,))
        dato = await cursor.fetchone()
        if not dato:
            raise HTTPException(status_code=404, detail="Historial médico no encontrado")
        return dato


# ── POST ────────────────────────────────────────────────────
@router.post("/")
async def crear_historial(historial: HistorialMedicoCreate, conn=Depends(get_conexion)):
    try:
        async with conn.cursor() as cursor:
            await cursor.execute("""
                INSERT INTO historial_medico (
                    id_animal, id_personal, fecha_revision,
                    diagnostico, tratamiento, estado_salud, proxima_revision
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id_historial
            """, (
                historial.id_animal,
                historial.id_personal,
                historial.fecha_revision,
                historial.diagnostico,
                historial.tratamiento,
                historial.estado_salud,
                historial.proxima_revision
            ))
            nuevo_id = await cursor.fetchone()
            await conn.commit()
            return {
                "mensaje": "Historial médico registrado correctamente",
                "id_historial": nuevo_id["id_historial"]
            }
    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=400, detail=f"Error al registrar historial médico: {str(e)}")


# ── PUT ─────────────────────────────────────────────────────
@router.put("/{id_historial}")
async def actualizar_historial(id_historial: int, historial: HistorialMedicoCreate, conn=Depends(get_conexion)):
    try:
        async with conn.cursor() as cursor:
            await cursor.execute("""
                UPDATE historial_medico
                SET id_animal = %s, id_personal = %s, fecha_revision = %s,
                    diagnostico = %s, tratamiento = %s, estado_salud = %s, proxima_revision = %s
                WHERE id_historial = %s
                RETURNING id_historial
            """, (
                historial.id_animal,
                historial.id_personal,
                historial.fecha_revision,
                historial.diagnostico,
                historial.tratamiento,
                historial.estado_salud,
                historial.proxima_revision,
                id_historial
            ))
            resultado = await cursor.fetchone()
            if not resultado:
                raise HTTPException(status_code=404, detail="Historial médico no encontrado")
            await conn.commit()
            return {"mensaje": "Historial médico actualizado correctamente"}
    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=400, detail=f"Error al actualizar historial médico: {str(e)}")


# ── DELETE ──────────────────────────────────────────────────
@router.delete("/{id_historial}")
async def eliminar_historial(id_historial: int, conn=Depends(get_conexion)):
    try:
        async with conn.cursor() as cursor:
            await cursor.execute(
                "DELETE FROM historial_medico WHERE id_historial = %s RETURNING id_historial",
                (id_historial,)
            )
            eliminado = await cursor.fetchone()
            if not eliminado:
                raise HTTPException(status_code=404, detail="Historial médico no encontrado")
            await conn.commit()
            return {"mensaje": "Historial médico eliminado correctamente"}
    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=400, detail=f"Error al eliminar historial médico: {str(e)}")
