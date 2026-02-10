import { MessageSquare, Trash2, Plus, PanelLeftClose, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Conversation } from "@/lib/types";

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  isLoading: boolean;
  isOpen: boolean;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  onToggle: () => void;
}

/**
 * Formats a date string into a short relative or absolute label.
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/**
 * Sidebar component displaying the list of past conversations.
 *
 * Each conversation item is clickable to resume it, and has a
 * delete button. A "New Chat" button sits at the top.
 * The sidebar can be collapsed via a toggle button.
 */
export function Sidebar({
  conversations,
  activeId,
  isLoading,
  isOpen,
  onSelect,
  onNewChat,
  onDelete,
  onToggle,
}: SidebarProps) {
  if (!isOpen) {
    return (
      <div className="border-r p-2 flex flex-col items-center shrink-0">
        <Button variant="ghost" size="icon" onClick={onToggle} title="Open sidebar">
          <PanelLeft className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-64 border-r flex flex-col shrink-0 bg-muted/30">
      {/* Sidebar header */}
      <div className="p-3 border-b flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 mr-2"
          onClick={onNewChat}
        >
          <Plus className="h-4 w-4 mr-1" />
          New Chat
        </Button>
        <Button variant="ghost" size="icon" onClick={onToggle} title="Close sidebar">
          <PanelLeftClose className="h-5 w-5" />
        </Button>
      </div>

      {/* Conversation list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isLoading && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Loading...
            </p>
          )}
          {!isLoading && conversations.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No conversations yet
            </p>
          )}
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`group flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer transition-colors ${
                conv.id === activeId
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "hover:bg-muted"
              }`}
              onClick={() => onSelect(conv.id)}
            >
              <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium">
                  {conv.title || "New conversation"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(conv.updated_at)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(conv.id);
                }}
                title="Delete conversation"
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
