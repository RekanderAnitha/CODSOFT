import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(express.json());

// In-memory feedback storage for the current session
const feedbackLog: any[] = [];
// In-memory custom rules storage
const customRules: string[] = [];

// API Routes
app.get("/api/rules", (req, res) => {
  console.log("GET /api/rules");
  res.json({ rules: customRules });
});

app.post("/api/rules", (req, res) => {
  const { rule } = req.body;
  console.log("POST /api/rules:", rule);
  if (rule && !customRules.includes(rule)) {
    customRules.push(rule);
  }
  res.json({ rules: customRules });
});

app.delete("/api/rules", (req, res) => {
  const { rule } = req.body;
  console.log("DELETE /api/rules:", rule);
  const index = customRules.indexOf(rule);
  if (index > -1) {
    customRules.splice(index, 1);
  }
  res.json({ rules: customRules });
});

const classifyMessageLocally = (message: string) => {
  const lowerMsgText = message.toLowerCase();
  const indicators: string[] = [];
  let score = 0;

  // 1. Check Custom Rules
  customRules.forEach(rule => {
    if (lowerMsgText.includes(rule.toLowerCase())) {
      indicators.push(`Matches custom rule: ${rule}`);
      score += 0.4;
    }
  });

  // 2. Urgency & Action Keywords
  const urgencyKeywords = ["act now", "urgent", "immediate", "expires", "last chance", "hurry", "limited time"];
  urgencyKeywords.forEach(word => {
    if (lowerMsgText.includes(word)) {
      indicators.push(`Urgency keyword: "${word}"`);
      score += 0.2;
    }
  });

  // 3. Financial & Prizes
  const financialKeywords = ["win", "won", "prize", "cash", "lottery", "claim", "free", "congratulations", "loan", "debt", "crypto", "bitcoin", "refund", "unclaimed"];
  financialKeywords.forEach(word => {
    if (lowerMsgText.includes(word)) {
      indicators.push(`Financial/Prize keyword: "${word}"`);
      score += 0.25;
    }
  });

  // 4. Suspicious Links/URLs
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  const urls = message.match(urlPattern);
  if (urls) {
    indicators.push("Contains URL");
    score += 0.15;
    // Check for common shorteners or weird patterns
    const shorteners = ["bit.ly", "t.co", "tinyurl.com", "goo.gl", "ow.ly", "is.gd", "buff.ly", "rebrand.ly"];
    urls.forEach(url => {
      if (shorteners.some(s => url.includes(s))) {
        indicators.push(`Suspicious URL shortener: ${url}`);
        score += 0.2;
      }
    });
  }

  // 5. Impersonation (Common targets)
  const impersonationKeywords = ["amazon", "netflix", "paypal", "fedex", "ups", "apple", "microsoft", "bank", "security alert"];
  impersonationKeywords.forEach(word => {
    if (lowerMsgText.includes(word)) {
      indicators.push(`Common impersonation target: "${word}"`);
      score += 0.3;
    }
  });

  // 6. Formatting Patterns
  if (message === message.toUpperCase() && message.length > 10) {
    indicators.push("Excessive capitalization (ALL CAPS)");
    score += 0.25;
  }
  if ((message.match(/[!?.]{3,}/g) || []).length > 0) {
    indicators.push("Excessive punctuation");
    score += 0.15;
  }
  if ((message.match(/\d/g) || []).length > 5) {
    indicators.push("High numeric density");
    score += 0.1;
  }

  const confidence = Math.min(score, 0.99) || 0.1;
  const classification = score >= 0.5 ? "spam" : "ham";
  
  let analysis = "";
  if (classification === "spam") {
    analysis = `Message classified as spam due to multiple suspicious markers: ${indicators.join(", ")}.`;
  } else {
    analysis = indicators.length > 0 
      ? `Looks mostly safe, but keep an eye on: ${indicators.join(", ")}.`
      : "No common spam patterns detected. The message appears safe.";
  }

  return {
    classification,
    confidence,
    analysis,
    indicators
  };
};

app.post("/api/classify", async (req, res) => {
  console.log("POST /api/classify hit (Local Mode)");
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Perform local classification (No API required)
    const result = classifyMessageLocally(message);
    
    // Artificial delay to simulate processing
    await new Promise(resolve => setTimeout(resolve, 800));

    res.json(result);
  } catch (error: any) {
    console.error("Local classification error:", error);
    res.status(500).json({ 
      error: "CLASSIFICATION_ERROR", 
      message: "An internal error occurred during classification." 
    });
  }
});

app.post("/api/feedback", (req, res) => {
  console.log("POST /api/feedback hit");
  const { message, classification, isCorrect, timestamp } = req.body;
  
  if (!message || !classification) {
    return res.status(400).json({ error: "Missing required feedback data" });
  }

  const feedback = {
    message,
    classification,
    isCorrect,
    timestamp: timestamp || Date.now(),
  };

  feedbackLog.push(feedback);
  console.log("Feedback received:", feedback);
  
  res.json({ status: "success", count: feedbackLog.length });
});

// Global error handler for JSON API consistency
app.use("/api", (err: any, req: any, res: any, next: any) => {
  console.error("API Error:", err);
  res.status(500).json({ error: "Internal Server Error", message: err.message });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("Vite middleware mounted");
    } catch (e) {
      console.error("Failed to setup Vite:", e);
    }
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

startServer();
