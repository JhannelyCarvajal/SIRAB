from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from config.conexionDB import get_conexion

router = APIRouter()


class RolCreate(BaseModel):
    nombre: str
    descripcion: str | None = None



@router.get("/")
async def listar_roles(conn=Depends(get_conexion)):
    async with conn.cursor() as cursor:
        await cursor.execute("SELECT * FROM roles ORDER BY id_rol")
        return await cursor.fetchall()



@router.get("/{id_rol}")
async def obtener_rol(id_rol: int, conn=Depends(get_conexion)):
    async with conn.cursor() as cursor:
        await cursor.execute(
            "SELECT * FROM roles WHERE id_rol = %s",
            (id_rol,)
        )
        dato = await cursor.fetchone()
        if not dato:
            raise HTTPException(status_code=404, detail="Rol no encontrado")
        return dato



@router.post("/")
async def crear_rol(rol: RolCreate, conn=Depends(get_conexion)):
    try:
        async with conn.cursor() as cursor:
            await cursor.execute("""
                INSERT INTO roles (nombre, descripcion)
                VALUES (%s, %s)
                RETURNING id_rol
            """, (
                rol.nombre,
                rol.descripcion
            ))
            nuevo_id = await cursor.fetchone()
            await conn.commit()
            return {
                "mensaje": "Rol creado correctamente",
                "id_rol": nuevo_id["id_rol"]
            }
    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=400, detail=f"Error al crear rol: {str(e)}")



@router.put("/{id_rol}")
async def actualizar_rol(id_rol: int, rol: RolCreate, conn=Depends(get_conexion)):
    try:
        async with conn.cursor() as cursor:
            await cursor.execute("""
                UPDATE roles
                SET nombre = %s, descripcion = %s
                WHERE id_rol = %s
                RETURNING id_rol
            """, (
                rol.nombre,
                rol.descripcion,
                id_rol
            ))
            resultado = await cursor.fetchone()
            if not resultado:
                raise HTTPException(status_code=404, detail="Rol no encontrado")
            await conn.commit()
            return {"mensaje": "Rol actualizado correctamente", "id_rol": resultado["id_rol"]}
    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=400, detail=f"Error al actualizar rol: {str(e)}")



@router.delete("/{id_rol}")
async def eliminar_rol(id_rol: int, conn=Depends(get_conexion)):
    try:
        async with conn.cursor() as cursor:
            await cursor.execute(
                "DELETE FROM roles WHERE id_rol = %s RETURNING id_rol",
                (id_rol,)
            )
            eliminado = await cursor.fetchone()
            if not eliminado:
                raise HTTPException(status_code=404, detail="Rol no encontrado")
            await conn.commit()
            return {"mensaje": "Rol eliminado correctamente"}
    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=400, detail=f"Error al eliminar rol: {str(e)}")
