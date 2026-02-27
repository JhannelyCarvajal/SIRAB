from fastapi import APIRouter, Depends, HTTPException
from config.conexionDB import get_conexion

router = APIRouter()


@router.get("/")
async def listar_especies(conn = Depends(get_conexion)):
    print("Hola como estas")
    
        try:
        query = "SELECT * FROM especies ORDER BY id_especie;"
        result = await conn.execute(query)
        return await result.fetchall()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/")
async def crear_especie(especie: dict, conn = Depends(get_conexion)):
    print(especie"Ah sido ingresado")
    try:
        query = """
            INSERT INTO especies
            (nombre_comun, nombre_cientifico, tipo, estado_conservacion, descripcion)
            VALUES (%s,%s,%s,%s,%s)
            RETURNING *;
        """

        result = await conn.execute(
            query,
            (
                especie["nombre_comun"],
                especie.get("nombre_cientifico"),
                especie.get("tipo"),
                especie.get("estado_conservacion"),
                especie.get("descripcion")
            )
        )

        nueva = await result.fetchone()
        await conn.commit()
        return nueva

    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))