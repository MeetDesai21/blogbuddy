import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// Gemini setup (unchanged)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ———————————————
// Your blog generator
// ———————————————
app.post("/generate-blog", async (req, res) => {
  const { topic, tone, length, keywords } = req.body;
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
      Write a ${length} blog post about "${topic}".
      - Tone: ${tone}
      - Include these keywords: ${keywords}
      - Use headers, bullet points, and a strong conclusion.
      - Make it engaging and suitable for DEV.to publication.
    `;
    const result = await model.generateContent([prompt]);
    const blogContent = result.response.text();
    res.json({ blog: blogContent });
  } catch (err) {
    console.error("Gemini error:", err);
    res.status(500).json({ error: `Failed to generate blog post: ${err.message}` });
  }
});

// ————————————————
// NEW: Publish to DEV.to
// ————————————————
app.post("/publish-to-devto", async (req, res) => {
  const { title, content, tags } = req.body;
  try {
    const response = await axios.post(
      "https://dev.to/api/articles",
      {
        article: {
          title,
          published: true,
          body_markdown: content,
          tags: tags || ["AI", "Blogging"]
        }
      },
      {
        headers: {
          "api-key": process.env.DEVTO_API_KEY,
          "Content-Type": "application/json"
        }
      }
    );
    // DEV.to returns `url` under data
    res.json({ success: true, url: response.data.url });
  } catch (err) {
    console.error("DEV.to publishing error:", err.response?.data || err.message);
    res.status(500).json({ success: false, error: "Failed to publish to DEV.to" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
