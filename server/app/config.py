from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables / .env file.

    Think of this like a typed config object -- similar to how you'd use
    a Zod schema to validate env vars in a Node.js app.

    Pydantic will automatically read from the .env file and validate
    that all required values are present and correctly typed.
    """

    ollama_base_url: str
    database_url: str

    class Config:
        env_file = ".env"


# Create a single shared instance (like a singleton export in JS)
settings = Settings()
