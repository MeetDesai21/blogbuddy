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

// ——————————————————
// Helpers (as before)
// ——————————————————
function extractTitleAndBody(raw) {
  const t = raw.match(/blog-title:\s*(.*)/i);
  const b = raw.match(/blog-body:\s*([\s\S]*)/i);
  return {
    title: t ? t[1].trim() : null,
    body:  b ? b[1].trim() : raw
  };
}
function cleanBody(c) {
  const lines = c.split("\n");
  if (lines[0]?.trim().startsWith("# ")) lines.shift();
  return lines.join("\n").trim();
}
function generateTags(topic="") {
  const base = ["ai","blogging"];
  const extras = topic.toLowerCase().match(/\b\w{4,}\b/g)||[];
  return Array.from(new Set([...base, ...extras])).slice(0,4);
}

// ———————————————————————————
// 1) Generate Blog with Gemini
// ———————————————————————————
app.post("/generate-blog", async (req, res) => {
  const { topic, tone, length, keywords } = req.body;
  try {
    const model = genAI.getGenerativeModel({model:"gemini-1.5-flash"});
    const prompt = `
Generate a blog in this format:

blog-title: <your title>
blog-body: <markdown blog body>

Write a ${length} blog post about "${topic}".
- Tone: ${tone}
- Keywords: ${keywords}
- Use markdown headers, bullets, conclusion, and make it engaging.
`;
    const raw = (await model.generateContent([prompt])).response.text();
    const {title,body} = extractTitleAndBody(raw);
    const finalTitle = title || raw.split("\n").find(l=>l.startsWith("# "))?.slice(2).trim() || "Untitled";
    res.json({ blog: cleanBody(body), title: finalTitle, topic });
  } catch(err) {
    console.error("Gemini error:", err);
    res.status(500).json({error:err.message});
  }
});

// ———————————————————————————
// 2) Publish to DEV.to
// ———————————————————————————
app.post("/publish-to-devto", async (req, res) => {
  let { content, title, topic } = req.body;
  if (!title) {
    const ex = extractTitleAndBody(content);
    title = ex.title || "Untitled";
    content = ex.body;
  }
  const body_md = cleanBody(content);
  const tags = generateTags(topic);

  try {
    const { data } = await axios.post(
      "https://dev.to/api/articles",
      { article:{ title, published:true, body_markdown:body_md, tags } },
      { headers:{ "api-key":process.env.DEVTO_API_KEY } }
    );
    res.json({ success:true, url:data.url });
  } catch(err) {
    console.error("DEV.to error:", err.response?.data||err.message);
    res.status(500).json({error:err.response?.data||err.message});
  }
});

   // ———————————————————————————
   // 3) Publish to Hashnode
   // ———————————————————————————
   app.post("/publish-to-hashnode", async (req, res) => {
    const { content, title, topic } = req.body;

    try {
      const tags = generateTags(topic);

      const query = `
        mutation Publish($input: PublishPostInput!) {
          publishPost(input: $input) {
            post {
              title
              slug
              url
            }
          }
        }
      `;

      const variables = {
        input: {
          title,
          contentMarkdown: content,
          tags: tags.map(name => ({ name })),
          publicationId: process.env.HASHNODE_PUBLICATION_ID
        }
      };

      const response = await axios.post(
        "https://gql.hashnode.com",
        { query, variables },
        {
          headers: {
            Authorization: process.env.HASHNODE_API_KEY,
            "Content-Type": "application/json"
          }
        }
      );

      const post = response.data?.data?.publishPost?.post;
      const url = post?.url || null;

      res.json({ success: true, url });
    } catch (err) {
      console.error("Hashnode error:", err.response?.data || err.message);
      res.status(500).json({
        success: false,
        error: err.response?.data || err.message
      });
    }
  });




// ———————————————————————————
// 4) Publish to Blogger
// ———————————————————————————
app.post("/publish-to-blogger", async (req, res) => {
  const { content, title } = req.body;
  const blogId = process.env.BLOGGER_BLOG_ID;
  try {
    const endpoint = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts/?key=${process.env.BLOGGER_API_KEY}`;
    const postBody = { kind:"blogger#post", title, content };
    const { data } = await axios.post(endpoint, postBody, {
      headers:{ "Content-Type":"application/json" }
    });
    res.json({ success:true, url:data.url });
  } catch(err) {
    console.error("Blogger error:", err.response?.data||err.message);
    res.status(500).json({ error: err.response?.data||err.message });
  }
});

app.listen(PORT, ()=>console.log(`🚀 Server running on http://localhost:${PORT}`));
