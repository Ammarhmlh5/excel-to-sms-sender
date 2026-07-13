import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  root: path.resolve(__dirname, "src/admin"),
  publicDir: path.resolve(__dirname, "public"),
  envDir: __dirname,
  server: {
    host: "::",
    port: 5181,
    strictPort: true,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "dist-admin"),
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, "src/admin/index.html"),
    },
  },
});
