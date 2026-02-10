/**
 * Types that mirror the backend's Pydantic models.
 *
 * These are the TypeScript equivalents of the Python classes
 * in server/app/routes/chat.py. Keeping them in sync means
 * the frontend and backend always agree on the data shape.
 */

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  conversation_id: string;
}

export interface ChatResponse {
  model: string;
  message: ChatMessage;
  done: boolean;
}

export interface Model {
  name: string;
  size: number | null;
  modified_at: string | null;
}

export interface ModelsResponse {
  models: Model[];
}

export interface Conversation {
  id: string;
  title: string | null;
  model: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationDetail extends Conversation {
  messages: ChatMessage[];
}
