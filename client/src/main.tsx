import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App.tsx";

/**
 * QueryClient is React Query's central controller.
 * It manages the cache, default options, and background refetching.
 *
 * QueryClientProvider makes it available to every component via
 * React context -- same pattern as Redux's <Provider store={store}>.
 */
const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
