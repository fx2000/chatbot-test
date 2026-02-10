import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // This lets you import from "@/components/..." instead of "../../components/..."
      // shadcn/ui requires this alias to work properly.
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
