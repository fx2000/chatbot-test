from fastapi import APIRouter

from app.services.ollama import ollama_service


router = APIRouter()


@router.get("/health")
async def health_check():
    """
    Health check endpoint that also verifies Ollama connectivity.

    Returns the status of both this API server and the remote
    Ollama server. Useful for debugging connection issues.
    """
    ollama_reachable = await ollama_service.health_check()

    return {
        "status": "ok",
        "ollama": {
            "reachable": ollama_reachable,
            "url": ollama_service._client.base_url.__str__(),
        },
    }
