import httpx

from app.config import settings


class OllamaService:
    """
    Async HTTP client for communicating with the Ollama REST API.

    This is similar to creating an API service class in TypeScript --
    it encapsulates all HTTP calls to a specific external service
    so the rest of your app doesn't need to know the details.

    Usage:
        async with OllamaService() as ollama:
            models = await ollama.list_models()
    """

    def __init__(self):
        # httpx.AsyncClient is like axios.create() -- a reusable HTTP client
        # with pre-configured defaults (base URL, timeouts, etc.)
        self._client = httpx.AsyncClient(
            base_url=settings.ollama_base_url,
            # LLM responses can take a while, so we set a generous timeout.
            # In httpx, timeout is in seconds (not milliseconds like in JS).
            timeout=httpx.Timeout(timeout=120.0),
        )

    async def __aenter__(self):
        """Called when entering an 'async with' block (context manager pattern)."""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Called when exiting an 'async with' block -- ensures the client is closed."""
        await self._client.aclose()

    async def health_check(self) -> bool:
        """
        Ping the Ollama server to check if it's reachable.

        Returns True if the server responds, False otherwise.
        """
        try:
            response = await self._client.get("/")
            return response.status_code == 200
        except httpx.RequestError:
            return False

    async def list_models(self) -> dict:
        """
        Fetch the list of models available on the Ollama server.

        Proxies to Ollama's GET /api/tags endpoint.
        """
        response = await self._client.get("/api/tags")
        response.raise_for_status()
        return response.json()

    async def generate_title(self, model: str, messages: list[dict]) -> str:
        """
        Ask the LLM to generate a short title for a conversation.

        Sends the first exchange along with a system prompt instructing
        the model to produce a concise title (max 5 words).
        Returns the generated title string.
        """
        title_messages = [
            {
                "role": "system",
                "content": (
                    "Generate a very short title (maximum 5 words) that summarizes "
                    "the following conversation. Reply ONLY with the title, no quotes, "
                    "no punctuation, no explanation."
                ),
            },
            *messages,
        ]
        payload = {
            "model": model,
            "messages": title_messages,
            "stream": False,
        }
        response = await self._client.post("/api/chat", json=payload)
        response.raise_for_status()
        data = response.json()
        return data["message"]["content"].strip()

    async def chat(self, model: str, messages: list[dict]) -> dict:
        """
        Send a chat request to Ollama and return the full response.

        Proxies to Ollama's POST /api/chat endpoint with streaming disabled.
        This returns the complete response at once (non-streaming).
        """
        payload = {
            "model": model,
            "messages": messages,
            "stream": False,
        }
        response = await self._client.post("/api/chat", json=payload)
        response.raise_for_status()
        return response.json()


# Singleton instance -- created once and reused across requests.
# In a real production app, you might manage this differently,
# but for learning purposes this keeps things simple.
ollama_service = OllamaService()
