from fastapi import APIRouter, HTTPException

from app.services.ollama import ollama_service


router = APIRouter()


@router.get("/models")
async def list_models():
    """
    List all models available on the Ollama server.

    Proxies to Ollama's GET /api/tags endpoint and returns
    the list of installed models. Useful for populating a
    model selector dropdown in the future UI.
    """
    try:
        result = await ollama_service.list_models()

        # Ollama returns { "models": [...] } -- we reshape it slightly
        # to return just the relevant info for each model.
        models = [
            {
                "name": model["name"],
                "size": model.get("size"),
                "modified_at": model.get("modified_at"),
            }
            for model in result.get("models", [])
        ]

        return {"models": models}

    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Error fetching models from Ollama: {str(e)}",
        )
