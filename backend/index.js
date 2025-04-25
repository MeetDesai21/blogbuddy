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

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ———————————————————————————
// Utility: Extract title and body from Gemini content
// ———————————————————————————
function extractTitleAndBody(rawContent) {
  const titleMatch = rawContent.match(/blog-title:\s*(.*)/i);
  const bodyMatch = rawContent.match(/blog-body:\s*([\s\S]*)/i);

  return {
    title: titleMatch ? titleMatch[1].trim() : null,
    body: bodyMatch ? bodyMatch[1].trim() : rawContent
  };
}

// ———————————————————————————
// Utility: Generate up to 4 unique tags
// ———————————————————————————
function generateTags(topic = "") {
  const baseTags = ["ai", "blogging"];
  const topicWords = topic
    .toLowerCase()
    .replace(/[^\w\s]/gi, "")
    .split(" ")
    .filter(w => w.length > 3 && !baseTags.includes(w));

  const allTags = Array.from(new Set([...baseTags, ...topicWords]));
  return allTags.slice(0, 4); // Limit to 4 tags for DEV.to
}

// ———————————————————————————
// Utility: Remove leading Markdown title (e.g. "# Title")
// ———————————————————————————
function cleanBody(content) {
  const lines = content.split("\n");
  if (lines[0]?.trim().startsWith("# ")) lines.shift();
  return lines.join("\n").trim();
}

// ———————————————————————————
// Route: Generate Blog via Gemini
// ———————————————————————————
app.post("/generate-blog", async (req, res) => {
  const { topic, tone, length, keywords } = req.body;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
Generate a blog in the following format:

blog-title: <title of the blog here>
blog-body: <markdown formatted blog body here>

Write a ${length} blog post about "${topic}".
- Tone: ${tone}
- Include these keywords: ${keywords}
- Use markdown headers, bullet points, and a strong conclusion.
- Make it engaging and suitable for DEV.to publication.
`;

    const result = await model.generateContent([prompt]);
    const raw = result.response.text();

    const { title, body } = extractTitleAndBody(raw);
    const finalTitle =
      title ||
      raw.split("\n").find(l => l.startsWith("# "))?.replace(/^#\s*/, "").trim() ||
      "Untitled Blog";

    res.json({ blog: body, title: finalTitle, topic });
  } catch (err) {
    console.error("Gemini error:", err);
    res.status(500).json({ error: `Failed to generate blog post: ${err.message}` });
  }
});

// ———————————————————————————
// Route: Publish to DEV.to
// ———————————————————————————
app.post("/publish-to-devto", async (req, res) => {
  let { content, title, topic } = req.body;

  try {
    // Fallback extraction if title is missing
    if (!title) {
      const extracted = extractTitleAndBody(content);
      title = extracted.title || "Untitled Blog";
      content = extracted.body;
    }

    const bodyMarkdown = cleanBody(content);
    const tags = generateTags(topic);

    const response = await axios.post(
      "https://dev.to/api/articles",
      {
        article: {
          title,
          published: true,
          body_markdown: bodyMarkdown,
          tags
        }
      },
      {
        headers: {
          "api-key": process.env.DEVTO_API_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    res.json({ success: true, url: response.data.url });
  } catch (err) {
    console.error("DEV.to publishing error:", err.response?.data || err.message || err);
    res.status(500).json({
      success: false,
      error: err.response?.data || err.message || "Unknown error"
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
