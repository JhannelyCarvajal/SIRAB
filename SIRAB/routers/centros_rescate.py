from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from config.conexionDB import get_conexion

router = APIRouter()


class CentroCreate(BaseModel):
    nombre: str
    departamento: str
    direccion: str | None = None
    telefono: str | None = None
    email: str | None = None


# ── GET todos ──────────────────────────────────────────────
@router.get("/")
async def listar_centros(conn=Depends(get_conexion)):
    async with conn.cursor() as cursor:
        await cursor.execute("SELECT * FROM centros_rescate ORDER BY id_centro")
        return await cursor.fetchall()


# ── GET por id ─────────────────────────────────────────────
@router.get("/{id_centro}")
async def obtener_centro(id_centro: int, conn=Depends(get_conexion)):
    async with conn.cursor() as cursor:
        await cursor.execute(
            "SELECT * FROM centros_rescate WHERE id_centro = %s",
            (id_centro,)
        )
        dato = await cursor.fetchone()
        if not dato:
            raise HTTPException(status_code=404, detail="Centro de rescate no encontrado")
        return dato


# ── POST ────────────────────────────────────────────────────
@router.post("/")
async def crear_centro(centro: CentroCreate, conn=Depends(get_conexion)):
    try:
        async with conn.cursor() as cursor:
            await cursor.execute("""
                INSERT INTO centros_rescate (nombre, departamento, direccion, telefono, email)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id_centro
            """, (
                centro.nombre,
                centro.departamento,
                centro.direccion,
                centro.telefono,
                centro.email
            ))
            nuevo_id = await cursor.fetchone()
            await conn.commit()
            return {
                "mensaje": "Centro de rescate registrado correctamente",
                "id_centro": nuevo_id["id_centro"]
            }
    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=400, detail=f"Error al crear centro: {str(e)}")


# ── PUT ─────────────────────────────────────────────────────
@router.put("/{id_centro}")
async def actualizar_centro(id_centro: int, centro: CentroCreate, conn=Depends(get_conexion)):
    try:
        async with conn.cursor() as cursor:
            await cursor.execute("""
                UPDATE centros_rescate
                SET nombre = %s, departamento = %s, direccion = %s,
                    telefono = %s, email = %s
                WHERE id_centro = %s
                RETURNING id_centro
            """, (
                centro.nombre,
                centro.departamento,
                centro.direccion,
                centro.telefono,
                centro.email,
                id_centro
            ))
            resultado = await cursor.fetchone()
            if not resultado:
                raise HTTPException(status_code=404, detail="Centro de rescate no encontrado")
            await conn.commit()
            return {"mensaje": "Centro actualizado correctamente", "id_centro": resultado["id_centro"]}
    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=400, detail=f"Error al actualizar centro: {str(e)}")


# ── DELETE ──────────────────────────────────────────────────
@router.delete("/{id_centro}")
async def eliminar_centro(id_centro: int, conn=Depends(get_conexion)):
    try:
        async with conn.cursor() as cursor:
            await cursor.execute(
                "DELETE FROM centros_rescate WHERE id_centro = %s RETURNING id_centro",
                (id_centro,)
            )
            eliminado = await cursor.fetchone()
            if not eliminado:
                raise HTTPException(status_code=404, detail="Centro de rescate no encontrado")
            await conn.commit()
            return {"mensaje": "Centro eliminado correctamente", "id_centro": eliminado["id_centro"]}
    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=400, detail=f"Error al eliminar centro: {str(e)}")
