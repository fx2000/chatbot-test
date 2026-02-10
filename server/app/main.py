from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import chat, health, models
from app.services.ollama import ollama_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manages the application lifecycle (startup & shutdown).

    In FastAPI, the 'lifespan' context manager replaces the old
    @app.on_event("startup") / @app.on_event("shutdown") pattern.

    Think of it like this:
      - Everything BEFORE 'yield' runs on startup
      - Everything AFTER 'yield' runs on shutdown

    We use it here to properly open and close the HTTP client connection
    to Ollama (similar to how you'd close a DB connection pool in Node).
    """
    # --- Startup ---
    # The ollama_service client is already created, nothing extra to do.
    print(f"🚀 Server starting. Ollama URL: {ollama_service._client.base_url}")
    yield
    # --- Shutdown ---
    await ollama_service._client.aclose()
    print("👋 Server shutting down. Ollama client closed.")


# Create the FastAPI app -- this is like `const app = express()` in Express.
app = FastAPI(
    title="Chatbot API",
    description="A REST API that proxies chat requests to a remote Ollama server.",
    version="0.1.0",
    lifespan=lifespan,
)


# --- CORS Middleware ---
# This is like the `cors` middleware in Express.
# We allow all origins for now so the future frontend can connect
# from any dev server port (e.g., localhost:3000, localhost:5173).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, you'd restrict this to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Register Routes ---
# include_router is like app.use("/api", chatRouter) in Express.
# The 'prefix' prepends /api to all routes in each router,
# and 'tags' groups them in the auto-generated Swagger docs.
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(chat.router, prefix="/api", tags=["Chat"])
app.include_router(models.router, prefix="/api", tags=["Models"])


@app.get("/")
async def root():
    """Root endpoint -- just a welcome message with links to docs."""
    return {
        "message": "Chatbot API is running",
        "docs": "/docs",
        "health": "/api/health",
    }
