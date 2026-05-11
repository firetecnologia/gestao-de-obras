from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "Radar de Obras"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/radar_obras"

    SECRET_KEY: str = "change-me-in-production-use-a-real-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    PNCP_BASE_URL: str = "https://pncp.gov.br/api/consulta/v1"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
