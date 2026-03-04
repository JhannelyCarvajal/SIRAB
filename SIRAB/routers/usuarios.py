from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from config.conexionDB import get_conexion

router = APIRouter()


class UsuarioCreate(BaseModel):
    username: str
    password_hash: str      # En producción se hashea antes de guardar (ej. bcrypt)
    id_personal: int
    estado: bool = True
    id_rol: int


# ── GET todos ──────────────────────────────────────────────
@router.get("/")
async def listar_usuarios(conn=Depends(get_conexion)):
    async with conn.cursor() as cursor:
        await cursor.execute("""
            SELECT u.id_usuario, u.username, u.estado,
                   u.id_personal, u.id_rol,
                   p.nombre || ' ' || COALESCE(p.paterno, '') AS nombre_personal,
                   r.nombre AS rol
            FROM usuarios u
            JOIN personal p ON u.id_personal = p.id_personal
            JOIN roles    r ON u.id_rol      = r.id_rol
            ORDER BY u.id_usuario
        """)
        return await cursor.fetchall()


# ── GET por id ─────────────────────────────────────────────
@router.get("/{id_usuario}")
async def obtener_usuario(id_usuario: int, conn=Depends(get_conexion)):
    async with conn.cursor() as cursor:
        await cursor.execute("""
            SELECT u.id_usuario, u.username, u.estado,
                   u.id_personal, u.id_rol,
                   p.nombre || ' ' || COALESCE(p.paterno, '') AS nombre_personal,
                   r.nombre AS rol
            FROM usuarios u
            JOIN personal p ON u.id_personal = p.id_personal
            JOIN roles    r ON u.id_rol      = r.id_rol
            WHERE u.id_usuario = %s
        """, (id_usuario,))
        dato = await cursor.fetchone()
        if not dato:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        return dato


# ── POST ────────────────────────────────────────────────────
@router.post("/")
async def crear_usuario(usuario: UsuarioCreate, conn=Depends(get_conexion)):
    try:
        async with conn.cursor() as cursor:
            await cursor.execute("""
                INSERT INTO usuarios (username, password_hash, id_personal, estado, id_rol)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id_usuario
            """, (
                usuario.username,
                usuario.password_hash,
                usuario.id_personal,
                usuario.estado,
                usuario.id_rol
            ))
            nuevo_id = await cursor.fetchone()
            await conn.commit()
            return {
                "mensaje": "Usuario creado correctamente",
                "id_usuario": nuevo_id["id_usuario"]
            }
    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=400, detail=f"Error al crear usuario: {str(e)}")


# ── PUT ─────────────────────────────────────────────────────
@router.put("/{id_usuario}")
async def actualizar_usuario(id_usuario: int, usuario: UsuarioCreate, conn=Depends(get_conexion)):
    try:
        async with conn.cursor() as cursor:
            await cursor.execute("""
                UPDATE usuarios
                SET username = %s, password_hash = %s,
                    id_personal = %s, estado = %s, id_rol = %s
                WHERE id_usuario = %s
                RETURNING id_usuario
            """, (
                usuario.username,
                usuario.password_hash,
                usuario.id_personal,
                usuario.estado,
                usuario.id_rol,
                id_usuario
            ))
            resultado = await cursor.fetchone()
            if not resultado:
                raise HTTPException(status_code=404, detail="Usuario no encontrado")
            await conn.commit()
            return {"mensaje": "Usuario actualizado correctamente", "id_usuario": resultado["id_usuario"]}
    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=400, detail=f"Error al actualizar usuario: {str(e)}")


# ── DELETE ──────────────────────────────────────────────────
@router.delete("/{id_usuario}")
async def eliminar_usuario(id_usuario: int, conn=Depends(get_conexion)):
    try:
        async with conn.cursor() as cursor:
            await cursor.execute(
                "DELETE FROM usuarios WHERE id_usuario = %s RETURNING id_usuario",
                (id_usuario,)
            )
            eliminado = await cursor.fetchone()
            if not eliminado:
                raise HTTPException(status_code=404, detail="Usuario no encontrado")
            await conn.commit()
            return {"mensaje": "Usuario eliminado correctamente"}
    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=400, detail=f"Error al eliminar usuario: {str(e)}")

