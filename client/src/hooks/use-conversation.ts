import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ConversationDetail } from "@/lib/types";

/**
 * Custom hook for fetching a single conversation with its messages.
 *
 * Only fires when a valid conversationId is provided (enabled: !!conversationId).
 * Used when the user selects an existing conversation from the sidebar
 * to resume or review it.
 */
export function useConversation(conversationId: string | null) {
  return useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: async () => {
      const response = await api.get<ConversationDetail>(
        `/api/conversations/${conversationId}`
      );
      return response.data;
    },
    enabled: !!conversationId,
  });
}
