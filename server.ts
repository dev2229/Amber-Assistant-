import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- Mock Price Trend API ---
  app.get("/api/price-trend", async (req, res) => {
    try {
      const { default: handler } = await import("./api/price-trend.ts");
      handler(req, res);
    } catch (error) {
      console.error("Error loading API handler:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // --- Gemini Chat API ---
  app.post("/api/chat", async (req, res) => {
    try {
      const { default: handler } = await import("./api/chat.ts");
      await handler(req, res);
    } catch (error) {
      console.error("Error loading Chat handler:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting in development mode with Vite...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
