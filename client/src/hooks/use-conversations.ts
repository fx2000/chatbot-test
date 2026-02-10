import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Conversation } from "@/lib/types";

/**
 * Custom hook for managing the conversations list.
 *
 * Provides:
 * - A query to fetch all conversations (for the sidebar)
 * - A mutation to create a new conversation
 * - A mutation to delete a conversation
 *
 * Both mutations automatically invalidate the conversations cache
 * so the sidebar stays in sync.
 */
export function useConversations() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const response = await api.get<Conversation[]>("/api/conversations");
      return response.data;
    },
    staleTime: 30 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: async (model: string) => {
      const response = await api.post<Conversation>("/api/conversations", {
        model,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/conversations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  return {
    conversations: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createConversation: createMutation.mutateAsync,
    deleteConversation: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
