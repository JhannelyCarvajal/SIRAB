from config.conexionDB import app
from fastapi.middleware.cors import CORSMiddleware

from routers import (centros_rescate, especies, rescates, personal, animales, historial_centros, historial_medico, salidas, usuarios)

app.include_router(centros_rescate.router, prefix="/centros", tags=["Centros"])
app.include_router(especies.router, prefix="/especies", tags=["Especies"])
app.include_router(rescates.router, prefix="/rescates", tags=["Rescates"])
app.include_router(personal.router, prefix="/personal", tags=["Personal"])
app.include_router(animales.router, prefix="/animales", tags=["Animales"])
app.include_router(historial_centros.router, prefix="/historial-centros", tags=["Historial Centros"])
app.include_router(historial_medico.router, prefix="/historial-medico", tags=["Historial Médico"])
app.include_router(salidas.router, prefix="/salidas", tags=["Salidas"])
app.include_router(usuarios.router, prefix="/usuarios", tags=["Usuarios"])

# Configuración CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción se restringe
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)