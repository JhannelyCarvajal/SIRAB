from fastapi import APIRouter, Depends, HTTPException
from config.conexionDB import get_conexion

router = APIRouter()


# ------------------------------------------------
# REPORTE GENERAL DE ANIMALES
# ------------------------------------------------

@router.get("/animales")
async def reporte_animales(conn=Depends(get_conexion)):

    async with conn.cursor() as cursor:
        await cursor.execute("""
            SELECT 
                a.id_animal,
                e.nombre_comun AS especie,
                c.nombre AS centro,
                r.ubicacion AS lugar_rescate,
                a.sexo,
                a.estado_actual,
                a.peso,
                a.fecha_ingreso
            FROM animales a
            JOIN especies e ON a.id_especie = e.id_especie
            JOIN centros_rescate c ON a.id_centro = c.id_centro
            JOIN rescates r ON a.id_rescate = r.id_rescate
            ORDER BY a.fecha_ingreso DESC
        """)
        return await cursor.fetchall()



# ------------------------------------------------
# ANIMALES POR ESPECIE
# ------------------------------------------------

@router.get("/animales-especie")
async def animales_por_especie(conn=Depends(get_conexion)):

    async with conn.cursor() as cursor:
        await cursor.execute("""
            SELECT 
                e.nombre_comun AS especie,
                COUNT(a.id_animal) AS cantidad
            FROM animales a
            JOIN especies e ON a.id_especie = e.id_especie
            GROUP BY e.nombre_comun
            ORDER BY cantidad DESC
        """)
        return await cursor.fetchall()



# ------------------------------------------------
# ANIMALES POR ESTADO
# ------------------------------------------------

@router.get("/animales-estado")
async def animales_por_estado(conn=Depends(get_conexion)):

    async with conn.cursor() as cursor:
        await cursor.execute("""
            SELECT 
                estado_actual,
                COUNT(*) AS cantidad
            FROM animales
            GROUP BY estado_actual
            ORDER BY cantidad DESC
        """)
        return await cursor.fetchall()



# ------------------------------------------------
# RESCATES POR CENTRO
# ------------------------------------------------

@router.get("/rescates-centro")
async def rescates_por_centro(conn=Depends(get_conexion)):

    async with conn.cursor() as cursor:
        await cursor.execute("""
            SELECT 
                c.nombre AS centro,
                COUNT(a.id_rescate) AS cantidad_rescates
            FROM animales a
            JOIN centros_rescate c ON a.id_centro = c.id_centro
            GROUP BY c.nombre
            ORDER BY cantidad_rescates DESC
        """)
        return await cursor.fetchall()



# ------------------------------------------------
# HISTORIAL COMPLETO DE UN ANIMAL
# ------------------------------------------------

@router.get("/historial-animal/{id_animal}")
async def historial_completo_animal(id_animal: int, conn=Depends(get_conexion)):

    async with conn.cursor() as cursor:

        # DATOS GENERALES DEL ANIMAL
        await cursor.execute("""
            SELECT 
                a.id_animal,
                e.nombre_comun AS especie,
                e.nombre_cientifico,
                a.sexo,
                a.estado_actual,
                a.peso,
                a.fecha_ingreso,
                c.nombre AS centro_actual,
                r.ubicacion AS lugar_rescate,
                r.fecha_rescate
            FROM animales a
            JOIN especies e ON a.id_especie = e.id_especie
            JOIN centros_rescate c ON a.id_centro = c.id_centro
            JOIN rescates r ON a.id_rescate = r.id_rescate
            WHERE a.id_animal = %s
        """, (id_animal,))

        animal = await cursor.fetchone()

        if not animal:
            raise HTTPException(status_code=404, detail="Animal no encontrado")


        # HISTORIAL DE CENTROS
        await cursor.execute("""
            SELECT 
                c.nombre AS centro,
                hc.fecha_inicio,
                hc.fecha_fin,
                hc.motivo
            FROM historial_centros hc
            JOIN centros_rescate c ON hc.id_centro = c.id_centro
            WHERE hc.id_animal = %s
            ORDER BY hc.fecha_inicio
        """, (id_animal,))

        historial_centros = await cursor.fetchall()


        # HISTORIAL MEDICO
        await cursor.execute("""
            SELECT 
                hm.fecha_revision,
                hm.diagnostico,
                hm.tratamiento,
                hm.estado_salud,
                hm.proxima_revision
            FROM historial_medico hm
            WHERE hm.id_animal = %s
            ORDER BY hm.fecha_revision
        """, (id_animal,))

        historial_medico = await cursor.fetchall()


        return {
            "animal": animal,
            "historial_centros": historial_centros,
            "historial_medico": historial_medico
        }