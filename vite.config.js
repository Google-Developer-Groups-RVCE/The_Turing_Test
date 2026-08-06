import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite config for the "Decode the Context" response-capture frontend.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173
  },
  preview: {
    host: true,
    port: 4173
  }
});
