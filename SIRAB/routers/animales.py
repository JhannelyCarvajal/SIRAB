from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import date
from config.conexionDB import get_conexion

router = APIRouter()


class AnimalCreate(BaseModel):
    id_especie: int
    id_centro: int
    id_rescate: int
    sexo: str | None = None
    fecha_ingreso: date
    fecha_nacimiento_aprox: date | None = None
    estado_actual: str
    peso: float | None = None
    observaciones: str | None = None


# ── GET todos ──────────────────────────────────────────────
@router.get("/")
async def listar_animales(conn=Depends(get_conexion)):
    async with conn.cursor() as cursor:
        await cursor.execute("""
            SELECT a.*,
                   e.nombre_comun AS especie,
                   c.nombre       AS centro,
                   r.ubicacion    AS lugar_rescate
            FROM animales a
            JOIN especies        e ON a.id_especie = e.id_especie
            JOIN centros_rescate c ON a.id_centro  = c.id_centro
            JOIN rescates        r ON a.id_rescate = r.id_rescate
            ORDER BY a.fecha_ingreso DESC
        """)
        return await cursor.fetchall()


# ── GET por id ─────────────────────────────────────────────
@router.get("/{id_animal}")
async def obtener_animal(id_animal: int, conn=Depends(get_conexion)):
    async with conn.cursor() as cursor:
        await cursor.execute("""
            SELECT a.*,
                   e.nombre_comun AS especie,
                   c.nombre       AS centro,
                   r.ubicacion    AS lugar_rescate
            FROM animales a
            JOIN especies        e ON a.id_especie = e.id_especie
            JOIN centros_rescate c ON a.id_centro  = c.id_centro
            JOIN rescates        r ON a.id_rescate = r.id_rescate
            WHERE a.id_animal = %s
        """, (id_animal,))
        dato = await cursor.fetchone()
        if not dato:
            raise HTTPException(status_code=404, detail="Animal no encontrado")
        return dato


# ── POST ────────────────────────────────────────────────────
@router.post("/")
async def crear_animal(animal: AnimalCreate, conn=Depends(get_conexion)):
    try:
        async with conn.cursor() as cursor:
            await cursor.execute("""
                INSERT INTO animales (
                    id_especie, id_centro, id_rescate, sexo,
                    fecha_ingreso, fecha_nacimiento_aprox,
                    estado_actual, peso, observaciones
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id_animal
            """, (
                animal.id_especie,
                animal.id_centro,
                animal.id_rescate,
                animal.sexo,
                animal.fecha_ingreso,
                animal.fecha_nacimiento_aprox,
                animal.estado_actual,
                animal.peso,
                animal.observaciones
            ))
            nuevo_id = await cursor.fetchone()
            await conn.commit()
            return {
                "mensaje": "Animal registrado correctamente",
                "id_animal": nuevo_id["id_animal"]
            }
    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=400, detail=f"Error al registrar animal: {str(e)}")


# ── PUT ─────────────────────────────────────────────────────
@router.put("/{id_animal}")
async def actualizar_animal(id_animal: int, animal: AnimalCreate, conn=Depends(get_conexion)):
    try:
        async with conn.cursor() as cursor:
            await cursor.execute("""
                UPDATE animales
                SET id_especie = %s, id_centro = %s, id_rescate = %s, sexo = %s,
                    fecha_ingreso = %s, fecha_nacimiento_aprox = %s,
                    estado_actual = %s, peso = %s, observaciones = %s
                WHERE id_animal = %s
                RETURNING id_animal
            """, (
                animal.id_especie,
                animal.id_centro,
                animal.id_rescate,
                animal.sexo,
                animal.fecha_ingreso,
                animal.fecha_nacimiento_aprox,
                animal.estado_actual,
                animal.peso,
                animal.observaciones,
                id_animal
            ))
            resultado = await cursor.fetchone()
            if not resultado:
                raise HTTPException(status_code=404, detail="Animal no encontrado")
            await conn.commit()
            return {"mensaje": "Animal actualizado correctamente", "id_animal": resultado["id_animal"]}
    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=400, detail=f"Error al actualizar animal: {str(e)}")


# ── DELETE ──────────────────────────────────────────────────
@router.delete("/{id_animal}")
async def eliminar_animal(id_animal: int, conn=Depends(get_conexion)):
    try:
        async with conn.cursor() as cursor:
            await cursor.execute(
                "DELETE FROM animales WHERE id_animal = %s RETURNING id_animal",
                (id_animal,)
            )
            eliminado = await cursor.fetchone()
            if not eliminado:
                raise HTTPException(status_code=404, detail="Animal no encontrado")
            await conn.commit()
            return {"mensaje": "Animal eliminado correctamente"}
    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=400, detail=f"Error al eliminar animal: {str(e)}")
