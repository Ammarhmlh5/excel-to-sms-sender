import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

function adminEntry(): Plugin {
  return {
    name: "admin-entry",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === "/" || req.url === "/index.html") {
          req.url = "/index-admin.html";
        }
        next();
      });
    },
  };
}

export default defineConfig({
  publicDir: "public",
  server: {
    host: "::",
    port: 5181,
  },
  build: {
    outDir: "dist-admin",
    rollupOptions: {
      input: path.resolve(__dirname, "index-admin.html"),
    },
  },
  plugins: [react(), adminEntry()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
