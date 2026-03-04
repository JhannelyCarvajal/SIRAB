from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from config.conexionDB import get_conexion

router = APIRouter()


class PersonalCreate(BaseModel):
    nombre: str
    paterno: str | None = None
    materno: str | None = None
    cargo: str
    telefono: str | None = None
    email: str | None = None
    id_centro: int
    estado: bool = True


# ── GET todos ──────────────────────────────────────────────
@router.get("/")
async def listar_personal(conn=Depends(get_conexion)):
    async with conn.cursor() as cursor:
        await cursor.execute("""
            SELECT p.*, c.nombre AS centro
            FROM personal p
            JOIN centros_rescate c ON p.id_centro = c.id_centro
            ORDER BY p.id_personal
        """)
        return await cursor.fetchall()


# ── GET por id ─────────────────────────────────────────────
@router.get("/{id_personal}")
async def obtener_personal(id_personal: int, conn=Depends(get_conexion)):
    async with conn.cursor() as cursor:
        await cursor.execute("""
            SELECT p.*, c.nombre AS centro
            FROM personal p
            JOIN centros_rescate c ON p.id_centro = c.id_centro
            WHERE p.id_personal = %s
        """, (id_personal,))
        dato = await cursor.fetchone()
        if not dato:
            raise HTTPException(status_code=404, detail="Personal no encontrado")
        return dato


# ── POST ────────────────────────────────────────────────────
@router.post("/")
async def crear_personal(persona: PersonalCreate, conn=Depends(get_conexion)):
    try:
        async with conn.cursor() as cursor:
            await cursor.execute("""
                INSERT INTO personal (nombre, paterno, materno, cargo, telefono, email, id_centro, estado)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id_personal
            """, (
                persona.nombre,
                persona.paterno,
                persona.materno,
                persona.cargo,
                persona.telefono,
                persona.email,
                persona.id_centro,
                persona.estado
            ))
            nuevo_id = await cursor.fetchone()
            await conn.commit()
            return {
                "mensaje": "Personal registrado correctamente",
                "id_personal": nuevo_id["id_personal"]
            }
    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=400, detail=f"Error al registrar personal: {str(e)}")


# ── PUT ─────────────────────────────────────────────────────
@router.put("/{id_personal}")
async def actualizar_personal(id_personal: int, persona: PersonalCreate, conn=Depends(get_conexion)):
    try:
        async with conn.cursor() as cursor:
            await cursor.execute("""
                UPDATE personal
                SET nombre = %s, paterno = %s, materno = %s, cargo = %s,
                    telefono = %s, email = %s, id_centro = %s, estado = %s
                WHERE id_personal = %s
                RETURNING id_personal
            """, (
                persona.nombre,
                persona.paterno,
                persona.materno,
                persona.cargo,
                persona.telefono,
                persona.email,
                persona.id_centro,
                persona.estado,
                id_personal
            ))
            resultado = await cursor.fetchone()
            if not resultado:
                raise HTTPException(status_code=404, detail="Personal no encontrado")
            await conn.commit()
            return {"mensaje": "Personal actualizado correctamente", "id_personal": resultado["id_personal"]}
    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=400, detail=f"Error al actualizar personal: {str(e)}")


# ── DELETE ──────────────────────────────────────────────────
@router.delete("/{id_personal}")
async def eliminar_personal(id_personal: int, conn=Depends(get_conexion)):
    try:
        async with conn.cursor() as cursor:
            await cursor.execute(
                "DELETE FROM personal WHERE id_personal = %s RETURNING id_personal",
                (id_personal,)
            )
            eliminado = await cursor.fetchone()
            if not eliminado:
                raise HTTPException(status_code=404, detail="Personal no encontrado")
            await conn.commit()
            return {"mensaje": "Personal eliminado correctamente"}
    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=400, detail=f"Error al eliminar personal: {str(e)}")
