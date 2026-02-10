import { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "@/hooks/use-chat";
import { useModels } from "@/hooks/use-models";
import { useConversations } from "@/hooks/use-conversations";
import { useConversation } from "@/hooks/use-conversation";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ChatMessage } from "@/lib/types";

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback
          className={isUser ? "bg-primary text-primary-foreground" : "bg-muted"}
        >
          {isUser ? "You" : "AI"}
        </AvatarFallback>
      </Avatar>
      <div
        className={`rounded-lg px-4 py-2 max-w-[80%] whitespace-pre-wrap ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}

function App() {
  const { data: models, isLoading: modelsLoading } = useModels();
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Auto-select the first model once loaded
  useEffect(() => {
    if (models?.length && !selectedModel) {
      setSelectedModel(models[0].name);
    }
  }, [models, selectedModel]);

  const {
    conversations,
    isLoading: conversationsLoading,
    createConversation,
    deleteConversation,
  } = useConversations();

  // Auto-select the most recent conversation on initial load
  useEffect(() => {
    if (conversations.length > 0 && !activeConversationId) {
      setActiveConversationId(conversations[0].id);
      setSelectedModel(conversations[0].model);
    }
  }, [conversations, activeConversationId]);

  const { data: conversationDetail } = useConversation(activeConversationId);

  const {
    messages,
    sendMessage,
    clearMessages,
    seedMessages,
    isPending,
    error,
  } = useChat(selectedModel, activeConversationId);

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingMessageRef = useRef<string | null>(null);

  // When a pending message exists and conversationId updates, send it
  useEffect(() => {
    if (activeConversationId && pendingMessageRef.current) {
      const msg = pendingMessageRef.current;
      pendingMessageRef.current = null;
      sendMessage(msg);
    }
  }, [activeConversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Seed messages when loading an existing conversation
  useEffect(() => {
    if (conversationDetail?.messages) {
      seedMessages(
        conversationDetail.messages.map((m) => ({
          role: m.role as ChatMessage["role"],
          content: m.content,
        }))
      );
    }
  }, [conversationDetail, seedMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isPending]);

  /** Start a brand-new conversation. */
  const handleNewChat = useCallback(async () => {
    if (!selectedModel) return;
    const conversation = await createConversation(selectedModel);
    setActiveConversationId(conversation.id);
    clearMessages();
  }, [selectedModel, createConversation, clearMessages]);

  /** Select an existing conversation from the sidebar. */
  const handleSelectConversation = useCallback(
    (id: string) => {
      if (id === activeConversationId) return;
      setActiveConversationId(id);
      // Find the conversation to set its model in the dropdown
      const conv = conversations.find((c) => c.id === id);
      if (conv) {
        setSelectedModel(conv.model);
      }
    },
    [activeConversationId, conversations]
  );

  /** Delete a conversation and clear it if it was active. */
  const handleDeleteConversation = useCallback(
    async (id: string) => {
      await deleteConversation(id);
      if (id === activeConversationId) {
        setActiveConversationId(null);
        clearMessages();
      }
    },
    [deleteConversation, activeConversationId, clearMessages]
  );

  /**
   * Handle sending a message.
   * If no conversation is active, create one first (lazy creation).
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isPending || !selectedModel) return;

    // Lazy-create a conversation if none is active.
    // We store the message in a ref and let the useEffect
    // above dispatch it once the conversationId state updates.
    if (!activeConversationId) {
      const conversation = await createConversation(selectedModel);
      pendingMessageRef.current = trimmed;
      setActiveConversationId(conversation.id);
      setInput("");
      return;
    }

    sendMessage(trimmed);
    setInput("");
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeId={activeConversationId}
        isLoading={conversationsLoading}
        isOpen={sidebarOpen}
        onSelect={handleSelectConversation}
        onNewChat={handleNewChat}
        onDelete={handleDeleteConversation}
        onToggle={() => setSidebarOpen((prev) => !prev)}
      />

      {/* Main chat area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="border-b px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold">Chatbot</h1>
            <Select
              value={selectedModel}
              onValueChange={setSelectedModel}
              disabled={modelsLoading || !models?.length}
            >
              <SelectTrigger className="w-[200px] h-8 text-sm">
                <SelectValue
                  placeholder={
                    modelsLoading ? "Loading models..." : "No models available"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {models?.map((model) => (
                  <SelectItem key={model.name} value={model.name}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={handleNewChat}>
            New Chat
          </Button>
        </header>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full min-h-[50vh]">
                <div className="text-center text-muted-foreground">
                  <p className="text-lg font-medium">
                    Send a message to get started
                  </p>
                  <p className="text-sm mt-1">
                    Your messages are sent to a local Ollama server
                  </p>
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}
            {isPending && (
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-muted">AI</AvatarFallback>
                </Avatar>
                <div className="rounded-lg px-4 py-2 bg-muted text-muted-foreground">
                  <span className="animate-pulse">Thinking...</span>
                </div>
              </div>
            )}
            {error && (
              <div className="rounded-lg px-4 py-2 bg-destructive/10 text-destructive text-sm">
                Error: {error.message}
              </div>
            )}
          </div>
        </div>

        {/* Input bar */}
        <div className="border-t p-4 shrink-0">
          <form
            onSubmit={handleSubmit}
            className="max-w-3xl mx-auto flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              disabled={isPending}
              className="flex-1"
              autoFocus
            />
            <Button type="submit" disabled={isPending || !input.trim()}>
              Send
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;
