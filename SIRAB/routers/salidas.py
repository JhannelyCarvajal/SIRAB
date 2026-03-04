from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import date
from config.conexionDB import get_conexion

router = APIRouter()


class SalidaCreate(BaseModel):
    id_animal: int
    id_personal: int
    fecha_salida: date
    tipo_salida: str
    destino: str | None = None
    motivo: str | None = None
    observaciones: str | None = None


@router.get("/")
async def listar_salidas(conn=Depends(get_conexion)):
    async with conn.cursor() as cursor:
        await cursor.execute("""
            SELECT s.*,
                   p.nombre || ' ' || COALESCE(p.paterno, '') AS responsable,
                   e.nombre_comun AS especie
            FROM salidas s
            JOIN personal p ON s.id_personal = p.id_personal
            JOIN animales a ON s.id_animal   = a.id_animal
            JOIN especies e ON a.id_especie  = e.id_especie
            ORDER BY s.fecha_salida DESC
        """)
        return await cursor.fetchall()


@router.get("/animal/{id_animal}")
async def salidas_por_animal(id_animal: int, conn=Depends(get_conexion)):
    async with conn.cursor() as cursor:
        await cursor.execute("""
            SELECT s.*,
                   p.nombre || ' ' || COALESCE(p.paterno, '') AS responsable
            FROM salidas s
            JOIN personal p ON s.id_personal = p.id_personal
            WHERE s.id_animal = %s
            ORDER BY s.fecha_salida DESC
        """, (id_animal,))
        return await cursor.fetchall()


@router.get("/{id_salida}")
async def obtener_salida(id_salida: int, conn=Depends(get_conexion)):
    async with conn.cursor() as cursor:
        await cursor.execute("""
            SELECT s.*,
                   p.nombre || ' ' || COALESCE(p.paterno, '') AS responsable,
                   e.nombre_comun AS especie
            FROM salidas s
            JOIN personal p ON s.id_personal = p.id_personal
            JOIN animales a ON s.id_animal   = a.id_animal
            JOIN especies e ON a.id_especie  = e.id_especie
            WHERE s.id_salida = %s
        """, (id_salida,))
        dato = await cursor.fetchone()
        if not dato:
            raise HTTPException(status_code=404, detail="Salida no encontrada")
        return dato


@router.post("/")
async def crear_salida(salida: SalidaCreate, conn=Depends(get_conexion)):
    try:
        async with conn.cursor() as cursor:
            await cursor.execute("""
                INSERT INTO salidas (id_animal, id_personal, fecha_salida, tipo_salida, destino, motivo, observaciones)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id_salida
            """, (
                salida.id_animal,
                salida.id_personal,
                salida.fecha_salida,
                salida.tipo_salida,
                salida.destino,
                salida.motivo,
                salida.observaciones
            ))
            nuevo_id = await cursor.fetchone()
            await conn.commit()
            return {
                "mensaje": "Salida registrada correctamente",
                "id_salida": nuevo_id["id_salida"]
            }
    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=400, detail=f"Error al registrar salida: {str(e)}")


@router.put("/{id_salida}")
async def actualizar_salida(id_salida: int, salida: SalidaCreate, conn=Depends(get_conexion)):
    try:
        async with conn.cursor() as cursor:
            await cursor.execute("""
                UPDATE salidas
                SET id_animal = %s, id_personal = %s, fecha_salida = %s,
                    tipo_salida = %s, destino = %s, motivo = %s, observaciones = %s
                WHERE id_salida = %s
                RETURNING id_salida
            """, (
                salida.id_animal,
                salida.id_personal,
                salida.fecha_salida,
                salida.tipo_salida,
                salida.destino,
                salida.motivo,
                salida.observaciones,
                id_salida
            ))
            resultado = await cursor.fetchone()
            if not resultado:
                raise HTTPException(status_code=404, detail="Salida no encontrada")
            await conn.commit()
            return {"mensaje": "Salida actualizada correctamente", "id_salida": resultado["id_salida"]}
    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=400, detail=f"Error al actualizar salida: {str(e)}")


@router.delete("/{id_salida}")
async def eliminar_salida(id_salida: int, conn=Depends(get_conexion)):
    try:
        async with conn.cursor() as cursor:
            await cursor.execute(
                "DELETE FROM salidas WHERE id_salida = %s RETURNING id_salida",
                (id_salida,)
            )
            eliminado = await cursor.fetchone()
            if not eliminado:
                raise HTTPException(status_code=404, detail="Salida no encontrada")
            await conn.commit()
            return {"mensaje": "Salida eliminada correctamente"}
    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=400, detail=f"Error al eliminar salida: {str(e)}")
