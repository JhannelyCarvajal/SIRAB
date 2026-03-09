from fastapi import APIRouter, Depends, HTTPException
from config.conexionDB import get_conexion

router = APIRouter()


# ── REPORTE GENERAL DE ANIMALES ───────────────────────────
@router.get("/animales")
async def reporte_animales(conn=Depends(get_conexion)):
    async with conn.cursor() as cursor:
        await cursor.execute("""
            SELECT
                a.id_animal,
                e.nombre_comun   AS especie,
                te.nombre        AS tipo_especie,
                c.nombre         AS centro,
                a.sexo,
                a.estado_actual,
                a.peso,
                a.fecha_ingreso
            FROM animales a
            JOIN especies        e  ON a.id_especie = e.id_especie
            JOIN tipo_especie    te ON e.id_tipo     = te.id_tipo
            JOIN centros_rescate c  ON a.id_centro   = c.id_centro
            LEFT JOIN rescates   r  ON a.id_rescate  = r.id_rescate
            ORDER BY a.fecha_ingreso DESC
        """)
        return await cursor.fetchall()


# ── ANIMALES POR ESPECIE ──────────────────────────────────
@router.get("/animales-especie")
async def animales_por_especie(conn=Depends(get_conexion)):
    async with conn.cursor() as cursor:
        await cursor.execute("""
            SELECT
                e.nombre_comun  AS especie,
                te.nombre       AS tipo,
                COUNT(a.id_animal) AS cantidad
            FROM animales a
            JOIN especies     e  ON a.id_especie = e.id_especie
            JOIN tipo_especie te ON e.id_tipo    = te.id_tipo
            GROUP BY e.nombre_comun, te.nombre
            ORDER BY cantidad DESC
        """)
        return await cursor.fetchall()


# ── ANIMALES POR ESTADO ───────────────────────────────────
@router.get("/animales-estado")
async def animales_por_estado(conn=Depends(get_conexion)):
    async with conn.cursor() as cursor:
        await cursor.execute("""
            SELECT
                COALESCE(estado_actual, 'Sin estado') AS estado_actual,
                COUNT(*) AS cantidad
            FROM animales
            GROUP BY estado_actual
            ORDER BY cantidad DESC
        """)
        return await cursor.fetchall()


# ── RESCATES POR CENTRO ───────────────────────────────────
@router.get("/rescates-centro")
async def rescates_por_centro(conn=Depends(get_conexion)):
    async with conn.cursor() as cursor:
        await cursor.execute("""
            SELECT
                c.nombre        AS centro,
                c.departamento,
                COUNT(a.id_animal) AS cantidad_rescates
            FROM animales a
            JOIN centros_rescate c ON a.id_centro = c.id_centro
            GROUP BY c.nombre, c.departamento
            ORDER BY cantidad_rescates DESC
        """)
        return await cursor.fetchall()


# ── ANIMALES POR TIPO DE ESPECIE ──────────────────────────
@router.get("/animales-tipo")
async def animales_por_tipo(conn=Depends(get_conexion)):
    async with conn.cursor() as cursor:
        await cursor.execute("""
            SELECT
                te.nombre       AS tipo,
                COUNT(a.id_animal) AS cantidad
            FROM animales a
            JOIN especies     e  ON a.id_especie = e.id_especie
            JOIN tipo_especie te ON e.id_tipo    = te.id_tipo
            GROUP BY te.nombre
            ORDER BY cantidad DESC
        """)
        return await cursor.fetchall()


# ── ACTIVIDAD MÉDICA POR VETERINARIO ─────────────────────
@router.get("/actividad-veterinarios")
async def actividad_veterinarios(id_centro: int = None, conn=Depends(get_conexion)):
    async with conn.cursor() as cursor:
        if id_centro:
            await cursor.execute("""
                SELECT
                    p.nombre || ' ' || COALESCE(p.paterno, '') AS veterinario,
                    c.nombre   AS centro,
                    COUNT(hm.id_historial) AS total_registros,
                    MAX(hm.fecha_revision) AS ultimo_registro
                FROM historial_medico hm
                JOIN personal        p ON hm.id_personal = p.id_personal
                JOIN centros_rescate c ON p.id_centro    = c.id_centro
                WHERE p.id_centro = %s
                GROUP BY p.nombre, p.paterno, c.nombre
                ORDER BY total_registros DESC
            """, (id_centro,))
        else:
            await cursor.execute("""
                SELECT
                    p.nombre || ' ' || COALESCE(p.paterno, '') AS veterinario,
                    c.nombre   AS centro,
                    COUNT(hm.id_historial) AS total_registros,
                    MAX(hm.fecha_revision) AS ultimo_registro
                FROM historial_medico hm
                JOIN personal        p ON hm.id_personal = p.id_personal
                JOIN centros_rescate c ON p.id_centro    = c.id_centro
                GROUP BY p.nombre, p.paterno, c.nombre
                ORDER BY total_registros DESC
            """)
        return await cursor.fetchall()


# ── RESCATES POR TIPO DE INCIDENTE ────────────────────────
@router.get("/rescates-tipo")
async def rescates_por_tipo(conn=Depends(get_conexion)):
    async with conn.cursor() as cursor:
        await cursor.execute("""
            SELECT
                COALESCE(tipo_incidente, 'No especificado') AS tipo_incidente,
                COUNT(*) AS cantidad
            FROM rescates
            GROUP BY tipo_incidente
            ORDER BY cantidad DESC
        """)
        return await cursor.fetchall()


# ── RESUMEN GENERAL DEL SISTEMA ───────────────────────────
@router.get("/resumen-global")
async def resumen_global(conn=Depends(get_conexion)):
    async with conn.cursor() as cursor:
        await cursor.execute("""
            SELECT
                (SELECT COUNT(*) FROM centros_rescate WHERE estado = 'aprobado') AS centros_activos,
                (SELECT COUNT(*) FROM centros_rescate WHERE estado = 'pendiente') AS centros_pendientes,
                (SELECT COUNT(*) FROM animales) AS total_animales,
                (SELECT COUNT(*) FROM animales WHERE estado_actual ILIKE '%rehabilitaci%') AS en_rehabilitacion,
                (SELECT COUNT(*) FROM animales WHERE estado_actual ILIKE '%liberaci%') AS liberados,
                (SELECT COUNT(*) FROM rescates) AS total_rescates,
                (SELECT COUNT(*) FROM historial_medico) AS total_registros_medicos,
                (SELECT COUNT(*) FROM personal WHERE estado = true) AS personal_activo
        """)
        return await cursor.fetchone()


# ── HISTORIAL COMPLETO DE UN ANIMAL ──────────────────────
@router.get("/historial-animal/{id_animal}")
async def historial_completo_animal(id_animal: int, conn=Depends(get_conexion)):
    async with conn.cursor() as cursor:

        await cursor.execute("""
            SELECT
                a.id_animal,
                e.nombre_comun   AS especie,
                e.nombre_cientifico,
                te.nombre        AS tipo_especie,
                a.sexo,
                a.estado_actual,
                a.peso,
                a.fecha_ingreso,
                c.nombre         AS centro_actual,
                r.ubicacion      AS lugar_rescate,
                r.fecha_rescate
            FROM animales a
            JOIN especies        e  ON a.id_especie = e.id_especie
            JOIN tipo_especie    te ON e.id_tipo    = te.id_tipo
            JOIN centros_rescate c  ON a.id_centro  = c.id_centro
            LEFT JOIN rescates   r  ON a.id_rescate = r.id_rescate
            WHERE a.id_animal = %s
        """, (id_animal,))
        animal = await cursor.fetchone()
        if not animal:
            raise HTTPException(status_code=404, detail="Animal no encontrado")

        await cursor.execute("""
            SELECT
                c.nombre  AS centro,
                hc.fecha_inicio,
                hc.fecha_fin,
                hc.motivo
            FROM historial_centros  hc
            JOIN centros_rescate    c ON hc.id_centro = c.id_centro
            WHERE hc.id_animal = %s
            ORDER BY hc.fecha_inicio
        """, (id_animal,))
        historial_centros = await cursor.fetchall()

        await cursor.execute("""
            SELECT
                hm.fecha_revision,
                hm.diagnostico,
                hm.tratamiento,
                hm.estado_salud,
                hm.proxima_revision,
                p.nombre || ' ' || COALESCE(p.paterno, '') AS veterinario
            FROM historial_medico hm
            JOIN personal        p ON hm.id_personal = p.id_personal
            WHERE hm.id_animal = %s
            ORDER BY hm.fecha_revision DESC
        """, (id_animal,))
        historial_medico = await cursor.fetchall()

        return {
            "animal":            animal,
            "historial_centros": historial_centros,
            "historial_medico":  historial_medico,
        }
