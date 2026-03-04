from pydantic_settings import BaseSettings

class Constantes(BaseSettings):
    DB_NAME: str
    DB_USER: str
    DB_PASSWORD: str
    DB_HOST: str
    DB_PORT: int

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

config = Constantes()