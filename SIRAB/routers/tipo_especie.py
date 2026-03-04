from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from config.conexionDB import get_conexion

router = APIRouter()


class TipoEspecieCreate(BaseModel):
    nombre: str


# ── GET todos ──────────────────────────────────────────────
@router.get("/tipo_especie")
async def listar_tipos(conn=Depends(get_conexion)):
    async with conn.cursor() as cursor:
        await cursor.execute("SELECT * FROM tipo_especie ORDER BY id_tipo")
        return await cursor.fetchall()


# ── GET por id ─────────────────────────────────────────────
@router.get("/tipo_especie/{id_tipo}")
async def obtener_tipo(id_tipo: int, conn=Depends(get_conexion)):
    async with conn.cursor() as cursor:
        await cursor.execute(
            "SELECT * FROM tipo_especie WHERE id_tipo = %s",
            (id_tipo,)
        )
        dato = await cursor.fetchone()
        if not dato:
            raise HTTPException(status_code=404, detail="Tipo de especie no encontrado")
        return dato


# ── POST ────────────────────────────────────────────────────
@router.post("/tipo_especie")
async def crear_tipo(tipo: TipoEspecieCreate, conn=Depends(get_conexion)):
    try:
        async with conn.cursor() as cursor:
            await cursor.execute("""
                INSERT INTO tipo_especie (nombre)
                VALUES (%s)
                RETURNING id_tipo
            """, (tipo.nombre,))
            nuevo_id = await cursor.fetchone()
            await conn.commit()
            return {
                "mensaje": "Tipo de especie creado correctamente",
                "id_tipo": nuevo_id["id_tipo"]
            }
    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=400, detail=f"Error al crear tipo de especie: {str(e)}")


# ── PUT ─────────────────────────────────────────────────────
@router.put("/tipo_especie/{id_tipo}")
async def actualizar_tipo(id_tipo: int, tipo: TipoEspecieCreate, conn=Depends(get_conexion)):
    try:
        async with conn.cursor() as cursor:
            await cursor.execute("""
                UPDATE tipo_especie SET nombre = %s
                WHERE id_tipo = %s
                RETURNING id_tipo
            """, (tipo.nombre, id_tipo))
            resultado = await cursor.fetchone()
            if not resultado:
                raise HTTPException(status_code=404, detail="Tipo de especie no encontrado")
            await conn.commit()
            return {"mensaje": "Tipo de especie actualizado correctamente"}
    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=400, detail=f"Error al actualizar tipo: {str(e)}")


# ── DELETE ──────────────────────────────────────────────────
@router.delete("/tipo_especie/{id_tipo}")
async def eliminar_tipo(id_tipo: int, conn=Depends(get_conexion)):
    try:
        async with conn.cursor() as cursor:
            await cursor.execute(
                "DELETE FROM tipo_especie WHERE id_tipo = %s RETURNING id_tipo",
                (id_tipo,)
            )
            eliminado = await cursor.fetchone()
            if not eliminado:
                raise HTTPException(status_code=404, detail="Tipo de especie no encontrado")
            await conn.commit()
            return {"mensaje": "Tipo de especie eliminado correctamente"}
    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=400, detail=f"Error al eliminar tipo: {str(e)}")

