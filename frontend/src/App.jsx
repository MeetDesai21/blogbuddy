import { useState } from 'react';
import axios from 'axios';

const parseMarkdown = (markdown) => {
  if (!markdown) return "";
  let lines = markdown.split("\n");
  const htmlLines = lines.map((line) => {
    if (/^# /.test(line)) return `<h1>${line.replace(/^# /, '')}</h1>`;
    if (/^## /.test(line)) return `<h2>${line.replace(/^## /, '')}</h2>`;
    if (/^### /.test(line)) return `<h3>${line.replace(/^### /, '')}</h3>`;
    if (/^[-*] /.test(line)) return `<li>${line.replace(/^[-*] /, '')}</li>`;
    if (/^```/.test(line)) return "<pre><code>"; // opening code block
    if (/```$/.test(line)) return "</code></pre>"; // closing code block
    if (line.trim() === "") return "<br/>";
    return `<p>${line}</p>`;
  });

  const joined = htmlLines.join("\n")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");

  return joined;
};

function App() {
  const [formData, setFormData] = useState({
    goal: '',
    experience: '',
    tone: '',
    length: '',
    seoFocus: ''
  });

  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage("");

    try {
      const response = await axios.post('http://localhost:5000/generate-blog', {
        topic: formData.goal,
        tone: formData.tone,
        length: formData.length,
        keywords: formData.seoFocus === "yes" ? "SEO, search engine optimization, content marketing" : ""
      });

      setBlog(response.data);
    } catch (err) {
      setError("Failed to generate blog. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!blog) return;

    setPublishing(true);
    setError(null);
    setSuccessMessage("");

    try {
      const response = await axios.post('http://localhost:5000/publish-to-devto', {
        title: blog.title || "Untitled Blog",
        content: blog.blog
      });

      if (response.data.success) {
        setSuccessMessage("✅ Blog successfully published to DEV.to!");
      } else {
        setError("❌ Failed to publish to DEV.to.");
      }
    } catch (err) {
      setError("❌ Failed to publish to DEV.to.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div style={{ maxWidth: '700px', margin: 'auto', padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1 style={{ textAlign: 'center' }}>🧠 BlogBuddy: Generate a Full Blog with AI</h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <label>
          Goal:
          <select name="goal" value={formData.goal} onChange={handleChange}>
            <option value="">Select</option>
            <option value="audience">Grow my audience</option>
            <option value="express">Personal expression</option>
            <option value="educate">Educate others</option>
            <option value="brand">Build my brand</option>
          </select>
        </label>

        <label>
          Experience:
          <select name="experience" value={formData.experience} onChange={handleChange}>
            <option value="">Select</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="experienced">Experienced</option>
          </select>
        </label>

        <label>
          Tone:
          <select name="tone" value={formData.tone} onChange={handleChange}>
            <option value="">Select</option>
            <option value="casual">Casual</option>
            <option value="professional">Professional</option>
            <option value="emotional">Emotional</option>
            <option value="humorous">Humorous</option>
          </select>
        </label>

        <label>
          Length:
          <select name="length" value={formData.length} onChange={handleChange}>
            <option value="">Select</option>
            <option value="short">Short (≤500 words)</option>
            <option value="medium">Medium (500–1,000 words)</option>
            <option value="long">Long (1,000+ words)</option>
          </select>
        </label>

        <label>
          SEO Focus:
          <select name="seoFocus" value={formData.seoFocus} onChange={handleChange}>
            <option value="">Select</option>
            <option value="yes">Yes, optimize for SEO</option>
            <option value="no">No, pure content</option>
          </select>
        </label>

        <button type="submit" style={{ background: "#4CAF50", color: "#fff", padding: "10px", border: "none", cursor: "pointer" }}>
          ✨ Generate Blog
        </button>
      </form>

      {loading && <p>⏳ Generating your blog...</p>}
      {publishing && <p>📤 Publishing to DEV.to...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {successMessage && <p style={{ color: "green" }}>{successMessage}</p>}

      {blog && (
        <>
          <div style={{
            marginTop: '2rem',
            background: '#fff',
            padding: '2rem',
            borderRadius: '10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            fontFamily: "'Georgia', serif",
            lineHeight: '1.8',
            color: '#333'
          }}>
            <div dangerouslySetInnerHTML={{ __html: parseMarkdown(blog.blog) }} />
          </div>

          <button
            onClick={handlePublish}
            style={{
              marginTop: '1rem',
              background: '#1D9BF0',
              color: '#fff',
              padding: '10px 15px',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            🚀 Publish to DEV.to
          </button>
        </>
      )}
    </div>
  );
}

export default App;
