import { useState } from 'react';
import axios from 'axios';

// Your existing Markdown→HTML parser
const parseMarkdown = (markdown) => {
  if (!markdown) return "";
  const lines = markdown.split("\n");
  const html = lines.map(line => {
    if (/^# /.test(line))   return `<h1>${line.slice(2)}</h1>`;
    if (/^## /.test(line))  return `<h2>${line.slice(3)}</h2>`;
    if (/^### /.test(line)) return `<h3>${line.slice(4)}</h3>`;
    if (/^[-*] /.test(line)) return `<li>${line.slice(2)}</li>`;
    if (/^```/.test(line))   return '<pre><code>';
    if (/```$/.test(line))   return '</code></pre>';
    if (line.trim() === "")   return '<br/>';
    return `<p>${line}</p>`;
  }).join("\n")
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
  return html;
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

  // Publishing states
  const [publishingDevto, setPublishingDevto] = useState(false);
  const [publishingHashnode, setPublishingHashnode] = useState(false);
  const [publishingBlogger, setPublishingBlogger] = useState(false);

  // Success messages / URLs
  const [devtoUrl, setDevtoUrl] = useState('');
  const [hashnodeMsg, setHashnodeMsg] = useState('');
  const [bloggerUrl, setBloggerUrl] = useState('');

  const [error, setError] = useState("");

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Remove leading # Title from markdown
  const removeTitleFromMarkdown = markdown => {
    const lines = markdown.split("\n");
    if (lines[0]?.trim().startsWith("# ")) lines.shift();
    return lines.join("\n").trim();
  };

  const handleGenerate = async e => {
    e.preventDefault();
    setLoading(true);
    setError("");
    // Clear previous publish messages
    setDevtoUrl(""); setHashnodeMsg(""); setBloggerUrl("");

    try {
      const { data } = await axios.post('http://localhost:5000/generate-blog', {
        topic: formData.goal,
        tone: formData.tone,
        length: formData.length,
        keywords: formData.seoFocus === 'yes'
          ? 'SEO, search engine optimization, content marketing'
          : ''
      });
      // clean markdown body
      const cleaned = removeTitleFromMarkdown(data.blog);
      setBlog({ ...data, blog: cleaned });
    } catch (err) {
      setError("Failed to generate blog. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePublishDevto = async () => {
    if (!blog) return;
    setPublishingDevto(true);
    setError("");
    try {
      const { data } = await axios.post('http://localhost:5000/publish-to-devto', {
        content: blog.blog,
        title: blog.title,
        topic: blog.topic
      });
      setDevtoUrl(data.url);
    } catch (err) {
      setError("❌ Failed to publish to DEV.to");
    } finally {
      setPublishingDevto(false);
    }
  };

  const handlePublishHashnode = async () => {
    if (!blog) return;
    setPublishingHashnode(true);
    setError("");
    try {
      const { data } = await axios.post('http://localhost:5000/publish-to-hashnode', {
        content: blog.blog,
        title: blog.title
      });
      setHashnodeMsg(data.message || "Published to Hashnode!");
    } catch (err) {
      setError("❌ Failed to publish to Hashnode");
    } finally {
      setPublishingHashnode(false);
    }
  };

  const handlePublishBlogger = async () => {
    if (!blog) return;
    setPublishingBlogger(true);
    setError("");
    try {
      const { data } = await axios.post('http://localhost:5000/publish-to-blogger', {
        content: blog.blog,
        title: blog.title
      });
      setBloggerUrl(data.url);
    } catch (err) {
      setError("❌ Failed to publish to Blogger");
    } finally {
      setPublishingBlogger(false);
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: 'auto', padding: 20, fontFamily: 'sans-serif' }}>
      <h1>🧠 BlogBuddy—Full Blog Creator</h1>

      <form onSubmit={handleGenerate} style={{ display: 'grid', gap: 12 }}>
        <label>
          What’s your topic?
          <input
            type="text"
            name="goal"
            value={formData.goal}
            onChange={handleChange}
            placeholder="e.g. AI in Healthcare"
            required
          />
        </label>

        <label>
          Experience Level:
          <select name="experience" value={formData.experience} onChange={handleChange} required>
            <option value="">Select</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="experienced">Experienced</option>
          </select>
        </label>

        <label>
          Tone:
          <select name="tone" value={formData.tone} onChange={handleChange} required>
            <option value="">Select</option>
            <option value="casual">Casual</option>
            <option value="professional">Professional</option>
            <option value="emotional">Emotional</option>
            <option value="humorous">Humorous</option>
          </select>
        </label>

        <label>
          Length:
          <select name="length" value={formData.length} onChange={handleChange} required>
            <option value="">Select</option>
            <option value="short">Short (≤500 words)</option>
            <option value="medium">Medium (500–1,000 words)</option>
            <option value="long">Long (1,000+ words)</option>
          </select>
        </label>

        <label>
          SEO Focus:
          <select name="seoFocus" value={formData.seoFocus} onChange={handleChange} required>
            <option value="">Select</option>
            <option value="yes">Yes, SEO optimize</option>
            <option value="no">No, pure content</option>
          </select>
        </label>

        <button
          type="submit"
          disabled={loading}
          style={{ padding: 10, background: '#4CAF50', color: '#fff', border: 'none' }}
        >
          {loading ? 'Generating…' : '✨ Generate Blog'}
        </button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {blog && (
        <section style={{ marginTop: 20 }}>
          <h2>{blog.title}</h2>
          <div
            style={{
              background: '#fff',
              padding: 20,
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              lineHeight: 1.6
            }}
            dangerouslySetInnerHTML={{ __html: parseMarkdown(blog.blog) }}
          />

          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <button
              onClick={handlePublishDevto}
              disabled={publishingDevto}
              style={{ flex: 1, padding: '10px 20px', background: '#0a0a23', color: '#fff', border: 'none' }}
            >
              {publishingDevto ? 'Publishing…' : '🚀 Publish to DEV.to'}
            </button>

            <button
              onClick={handlePublishHashnode}
              disabled={publishingHashnode}
              style={{ flex: 1, padding: '10px 20px', background: '#2962FF', color: '#fff', border: 'none' }}
            >
              {publishingHashnode ? 'Publishing…' : '📝 Publish to Hashnode'}
            </button>

            <button
              onClick={handlePublishBlogger}
              disabled={publishingBlogger}
              style={{ flex: 1, padding: '10px 20px', background: '#FF5722', color: '#fff', border: 'none' }}
            >
              {publishingBlogger ? 'Publishing…' : '✒️ Publish to Blogger'}
            </button>
          </div>

          {devtoUrl && (
            <p style={{ color: 'green', marginTop: 8 }}>
              ✅ DEV.to: <a href={devtoUrl} target="_blank" rel="noopener noreferrer">{devtoUrl}</a>
            </p>
          )}
          {hashnodeMsg && (
            <p style={{ color: 'green', marginTop: 8 }}>
              ✅ Hashnode: {hashnodeMsg}
            </p>
          )}
          {bloggerUrl && (
            <p style={{ color: 'green', marginTop: 8 }}>
              ✅ Blogger: <a href={bloggerUrl} target="_blank" rel="noopener noreferrer">{bloggerUrl}</a>
            </p>
          )}
        </section>
      )}
    </div>
  );
}

export default App;
