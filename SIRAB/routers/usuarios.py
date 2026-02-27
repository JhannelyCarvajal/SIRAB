from fastapi import APIRouter, Depends, HTTPException
from config.conexionDB import get_conexion

router = APIRouter()


@router.get("/")
async def listar_usuarios(conn = Depends(get_conexion)):
    try:
        query = """
            SELECT id_usuario, username, rol, estado
            FROM usuarios
            ORDER BY id_usuario;
        """
        result = await conn.execute(query)
        return await result.fetchall()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/")
async def crear_usuario(usuario: dict, conn = Depends(get_conexion)):
    try:
        query = """
            INSERT INTO usuarios
            (username, password_hash, rol, id_personal)
            VALUES (%s,%s,%s,%s)
            RETURNING id_usuario, username, rol, estado;
        """

        result = await conn.execute(
            query,
            (
                usuario["username"],
                usuario["password_hash"],
                usuario["rol"],
                usuario["id_personal"]
            )
        )

        nuevo = await result.fetchone()
        await conn.commit()
        return nuevo

    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))