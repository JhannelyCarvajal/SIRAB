from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import bcrypt
from config.conexionDB import get_conexion

router = APIRouter()


class UsuarioCreate(BaseModel):
    username: str
    password: str
    id_personal: int
    estado: bool = True
    id_rol: int


class LoginRequest(BaseModel):
    username: str
    password: str
    id_centro: int


@router.post("/login")
async def login(datos: LoginRequest, conn=Depends(get_conexion)):
    async with conn.cursor() as cursor:

        await cursor.execute("""
            SELECT u.id_usuario, u.username, u.password_hash,
                   u.estado, u.id_rol,
                   r.nombre AS rol,
                   p.nombre || ' ' || COALESCE(p.paterno, '') AS nombre_personal,
                   p.id_centro
            FROM usuarios u
            JOIN personal p ON u.id_personal = p.id_personal
            JOIN roles    r ON u.id_rol      = r.id_rol
            WHERE u.username = %s
        """, (datos.username,))

        usuario = await cursor.fetchone()

        if not usuario:
            raise HTTPException(
                status_code=401,
                detail="Usuario o contraseña incorrectos"
            )

        if not usuario["estado"]:
            raise HTTPException(
                status_code=403,
                detail="Tu cuenta está desactivada. Contacta al administrador."
            )

        if usuario["id_centro"] != datos.id_centro:
            raise HTTPException(
                status_code=403,
                detail="No perteneces al centro seleccionado."
            )

        if not bcrypt.checkpw(
            datos.password.encode('utf-8'),
            usuario["password_hash"].encode('utf-8')
        ):
            raise HTTPException(
                status_code=401,
                detail="Usuario o contraseña incorrectos"
            )

        return {
            "mensaje": "Acceso concedido",
            "token": "pendiente-jwt",
            "usuario": {
                "id_usuario": usuario["id_usuario"],
                "username": usuario["username"],
                "nombre_personal": usuario["nombre_personal"],
                "rol": usuario["rol"],
                "id_centro": usuario["id_centro"],
            }
        }


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
            JOIN roles r ON u.id_rol = r.id_rol
            ORDER BY u.id_usuario
        """)
        return await cursor.fetchall()


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
            JOIN roles r ON u.id_rol = r.id_rol
            WHERE u.id_usuario = %s
        """, (id_usuario,))

        dato = await cursor.fetchone()

        if not dato:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        return dato


@router.post("/")
async def crear_usuario(usuario: UsuarioCreate, conn=Depends(get_conexion)):
    try:
        async with conn.cursor() as cursor:

            # hash de contraseña
            hashed = bcrypt.hashpw(
                usuario.password.encode('utf-8'),
                bcrypt.gensalt()
            ).decode('utf-8')

            await cursor.execute("""
                INSERT INTO usuarios (username, password_hash, id_personal, estado, id_rol)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id_usuario
            """, (
                usuario.username,
                hashed,
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
        raise HTTPException(
            status_code=400,
            detail=f"Error al crear usuario: {str(e)}"
        )

@router.put("/{id_usuario}")
async def actualizar_usuario(id_usuario: int, usuario: UsuarioCreate, conn=Depends(get_conexion)):
    try:
        async with conn.cursor() as cursor:

            hashed = bcrypt.hashpw(
                usuario.password.encode('utf-8'),
                bcrypt.gensalt()
            ).decode('utf-8')

            await cursor.execute("""
                UPDATE usuarios
                SET username = %s,
                    password_hash = %s,
                    id_personal = %s,
                    estado = %s,
                    id_rol = %s
                WHERE id_usuario = %s
                RETURNING id_usuario
            """, (
                usuario.username,
                hashed,
                usuario.id_personal,
                usuario.estado,
                usuario.id_rol,
                id_usuario
            ))

            resultado = await cursor.fetchone()

            if not resultado:
                raise HTTPException(status_code=404, detail="Usuario no encontrado")

            await conn.commit()

            return {
                "mensaje": "Usuario actualizado correctamente",
                "id_usuario": resultado["id_usuario"]
            }

    except Exception as e:
        await conn.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"Error al actualizar usuario: {str(e)}"
        )



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
        raise HTTPException(
            status_code=400,
            detail=f"Error al eliminar usuario: {str(e)}"
        )