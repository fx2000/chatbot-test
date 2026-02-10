import asyncio
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, async_session
from app.models import Conversation, Message
from app.services.ollama import ollama_service


# APIRouter is like express.Router() -- it groups related endpoints together.
router = APIRouter()

# Generate (or regenerate) a title every N messages in the conversation.
TITLE_GENERATION_INTERVAL = 6


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
    conversation_id: str


class ChatResponseMessage(BaseModel):
    """The assistant's response message from Ollama."""

    role: str
    content: str


class ChatResponse(BaseModel):
    """Response body returned from POST /api/chat."""

    model: str
    message: ChatResponseMessage
    done: bool


# --- Background task for title generation ---


async def _generate_title_task(conversation_id: str, model: str, messages: list[dict]):
    """
    Fire-and-forget task that asks the LLM to generate a short title
    for the conversation.

    Uses its own DB session so it's fully independent of the request
    lifecycle. Sleeps briefly to give the main request time to commit.
    """
    try:
        # Small delay to ensure the main request's DB session has committed
        await asyncio.sleep(2)

        print(f"🏷️  Generating title for conversation {conversation_id}...")
        title = await ollama_service.generate_title(model, messages)
        print(f"🏷️  LLM returned title: '{title}'")

        async with async_session() as session:
            result = await session.execute(
                select(Conversation).where(Conversation.id == conversation_id)
            )
            conversation = result.scalar_one_or_none()
            if conversation:
                conversation.title = title
                await session.commit()
                print(f"✅ Saved title for {conversation_id}: {title}")
            else:
                print(f"⚠️ Conversation {conversation_id} not found in DB")
    except Exception as e:
        print(f"⚠️ Failed to generate title for {conversation_id}: {e}")


# --- Route ---


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
):
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

        assistant_content = result["message"]["content"]
        assistant_role = result["message"]["role"]

        # Persist the latest user message and the assistant reply
        user_msg = request.messages[-1]
        db.add(
            Message(
                conversation_id=request.conversation_id,
                role=user_msg.role,
                content=user_msg.content,
            )
        )
        db.add(
            Message(
                conversation_id=request.conversation_id,
                role=assistant_role,
                content=assistant_content,
            )
        )

        # Update the conversation's updated_at timestamp
        conv_result = await db.execute(
            select(Conversation).where(Conversation.id == request.conversation_id)
        )
        conversation = conv_result.scalar_one_or_none()
        if conversation:
            conversation.updated_at = datetime.now(timezone.utc)

        await db.flush()

        # Decide whether to generate a title.
        # The client sends the full message history, so len(request.messages)
        # tells us how many messages existed before this exchange:
        #   1st exchange: len=1, 2nd: len=3, 3rd: len=5, etc.
        # Generate on first exchange (len==1), and re-evaluate every
        # TITLE_GENERATION_INTERVAL messages, or whenever the title is still None.
        msg_count = len(request.messages)
        should_generate = (
            conversation is not None
            and (
                conversation.title is None
                or msg_count % TITLE_GENERATION_INTERVAL == 1
            )
        )

        if should_generate:
            # Build context: use the last few messages for title generation
            recent_messages = messages_as_dicts[-4:] if len(messages_as_dicts) > 4 else messages_as_dicts
            recent_messages.append({"role": assistant_role, "content": assistant_content})

            # Fire-and-forget using asyncio.create_task instead of BackgroundTasks
            asyncio.create_task(
                _generate_title_task(
                    request.conversation_id,
                    request.model,
                    recent_messages,
                )
            )

        return ChatResponse(
            model=result["model"],
            message=ChatResponseMessage(
                role=assistant_role,
                content=assistant_content,
            ),
            done=result.get("done", True),
        )

    except Exception as e:
        # HTTPException is like calling res.status(502).json({error: ...}) in Express.
        raise HTTPException(
            status_code=502,
            detail=f"Error communicating with Ollama: {str(e)}",
        )
