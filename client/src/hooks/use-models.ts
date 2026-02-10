import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ModelsResponse } from "@/lib/types";

/**
 * Custom hook for fetching available models from the Ollama server.
 *
 * Uses React Query's useQuery to cache and manage the models list.
 * The query runs once on mount and is cached for 5 minutes,
 * avoiding unnecessary refetches when the component re-renders.
 */
export function useModels() {
  return useQuery({
    queryKey: ["models"],
    queryFn: async () => {
      const response = await api.get<ModelsResponse>("/api/models");
      return response.data.models;
    },
    staleTime: 5 * 60 * 1000,
  });
}
