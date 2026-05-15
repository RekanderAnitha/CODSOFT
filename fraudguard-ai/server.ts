import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  const genAI = process.env.GEMINI_API_KEY 
    ? new GoogleGenAI({ 
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      })
    : null;

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // AI Assistant Endpoint
  app.post("/api/ai/assistant", async (req, res) => {
    try {
      const { message, context } = req.body;
      if (!genAI) return res.status(500).json({ error: "Gemini API key not configured" });

      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: message,
        config: { 
          systemInstruction: `You are FraudShield X AI, a high-performance cybersecurity assistant. 
          Analyze the transaction data provided and offer professional risk assessments. 
          Keep responses brief, technical, and use markdown formatting. 
          Context provided: ${JSON.stringify(context)}`
        }
      });

      res.json({ text: response.text });
    } catch (error) {
      console.error("AI Assistant Error:", error);
      res.status(500).json({ error: "Analysis failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
