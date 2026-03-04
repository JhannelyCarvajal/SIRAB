from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config.conexionDB import lifespan

app = FastAPI(
    lifespan=lifespan,
    title="SIRAB - Sistema de Rescate de Animales de Bolivia",
    description="API para la gestión de centros de rescate de fauna silvestre en Bolivia",
    version="1.0.0"
)

from routers import (
    centros_rescate, tipo_especie, especies, rescates,
    personal, animales, historial_centros, historial_medico,
    salidas, roles, usuarios,
)

app.include_router(centros_rescate.router,   prefix="/centros",           tags=["Centros"])
app.include_router(tipo_especie.router,      prefix="/tipo-especie",      tags=["Tipo Especie"])
app.include_router(especies.router,          prefix="/especies",          tags=["Especies"])
app.include_router(rescates.router,          prefix="/rescates",          tags=["Rescates"])
app.include_router(personal.router,          prefix="/personal",          tags=["Personal"])
app.include_router(animales.router,          prefix="/animales",          tags=["Animales"])
app.include_router(historial_centros.router, prefix="/historial-centros", tags=["Historial Centros"])
app.include_router(historial_medico.router,  prefix="/historial-medico",  tags=["Historial Médico"])
app.include_router(salidas.router,           prefix="/salidas",           tags=["Salidas"])
app.include_router(roles.router,             prefix="/roles",             tags=["Roles"])
app.include_router(usuarios.router,          prefix="/usuarios",          tags=["Usuarios"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)