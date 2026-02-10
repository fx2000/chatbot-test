from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.ollama import ollama_service


# APIRouter is like express.Router() -- it groups related endpoints together.
router = APIRouter()


# --- Pydantic Models (like TypeScript interfaces + Zod validation) ---


class ChatMessage(BaseModel):
    """
    A single message in the conversation.

    Pydantic models automatically validate incoming JSON. If a request
    is missing a required field or has the wrong type, FastAPI returns
    a 422 error with details -- no manual validation needed.
    """

    role: str  # "user", "assistant", or "system"
    content: str


class ChatRequest(BaseModel):
    """Request body for the POST /api/chat endpoint."""

    model: str = "llama3.1:latest"
    messages: list[ChatMessage]


class ChatResponseMessage(BaseModel):
    """The assistant's response message from Ollama."""

    role: str
    content: str


class ChatResponse(BaseModel):
    """Response body returned from POST /api/chat."""

    model: str
    message: ChatResponseMessage
    done: bool


# --- Route ---


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Send a chat message to the Ollama model and get a response.

    This endpoint receives the conversation history (messages array)
    and forwards it to the Ollama server. The response contains
    the assistant's reply.

    The @router.post decorator is like app.post() in Express.
    The 'response_model' tells FastAPI what shape the response should be,
    and it automatically generates OpenAPI docs from it.
    """
    try:
        # Convert Pydantic models to plain dicts for the HTTP request.
        # model_dump() is like calling .toJSON() in JavaScript.
        messages_as_dicts = [msg.model_dump() for msg in request.messages]

        result = await ollama_service.chat(
            model=request.model,
            messages=messages_as_dicts,
        )

        return ChatResponse(
            model=result["model"],
            message=ChatResponseMessage(
                role=result["message"]["role"],
                content=result["message"]["content"],
            ),
            done=result.get("done", True),
        )

    except Exception as e:
        # HTTPException is like calling res.status(502).json({error: ...}) in Express.
        raise HTTPException(
            status_code=502,
            detail=f"Error communicating with Ollama: {str(e)}",
        )
