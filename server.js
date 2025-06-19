const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

const pastesDir = path.join(__dirname, 'pastes');
if (!fs.existsSync(pastesDir)) fs.mkdirSync(pastesDir, { recursive: true });

app.use(express.json());
app.use(express.static('public'));

// Save paste
app.post('/documents', (req, res) => {
  let content = req.body.content;
  const expiryMinutes = parseInt(req.body.expiry) || 60;
  const language = req.body.language || 'plaintext';
  const redacted = !!req.body.redacted;
  const id = Math.random().toString(36).substr(2, 6);

  const created = Date.now();
  const expires = created + expiryMinutes * 60 * 1000;

  // Redact sensitive data if requested
  if (redacted) {
    content = content
      .replace(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g, "[REDACTED IP]")
      .replace(/(?:token|api[_-]?key|authorization)[:=]?\s*["']?[a-z0-9\-_\.]{16,}["']?/gi, "[REDACTED TOKEN]");
  }

  try {
    fs.writeFileSync(path.join(pastesDir, `${id}.txt`), content);
    fs.writeFileSync(
      path.join(pastesDir, `${id}.meta.json`),
      JSON.stringify({ created, expires, language, redacted })
    );
    res.json({ key: id });
  } catch (err) {
    console.error("❌ Failed to save paste:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// Raw paste content
app.get('/raw/:id', (req, res) => {
  const contentPath = path.join(pastesDir, `${req.params.id}.txt`);
  const metaPath = path.join(pastesDir, `${req.params.id}.meta.json`);

  if (!fs.existsSync(contentPath) || !fs.existsSync(metaPath)) {
    return res.status(404).send('Not found');
  }

  const meta = JSON.parse(fs.readFileSync(metaPath));
  if (Date.now() > meta.expires) {
    fs.unlinkSync(contentPath);
    fs.unlinkSync(metaPath);
    return res.status(410).send('Paste expired');
  }

  res.sendFile(contentPath);
});

// Metadata route
app.get('/meta/:id', (req, res) => {
  const metaPath = path.join(pastesDir, `${req.params.id}.meta.json`);
  if (!fs.existsSync(metaPath)) return res.status(404).send('Not found');

  const meta = JSON.parse(fs.readFileSync(metaPath));
  if (Date.now() > meta.expires) {
    const contentPath = path.join(pastesDir, `${req.params.id}.txt`);
    if (fs.existsSync(contentPath)) fs.unlinkSync(contentPath);
    fs.unlinkSync(metaPath);
    return res.status(410).send('Paste expired');
  }

  res.json(meta);
});

// Serve UI
app.get('/p/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Cleanup expired pastes every 30 mins
setInterval(() => {
  const files = fs.readdirSync(pastesDir);
  const now = Date.now();

  files.forEach(file => {
    if (file.endsWith('.meta.json')) {
      const id = file.replace('.meta.json', '');
      const metaPath = path.join(pastesDir, file);
      const contentPath = path.join(pastesDir, `${id}.txt`);

      try {
        const meta = JSON.parse(fs.readFileSync(metaPath));
        if (meta.expires && now > meta.expires) {
          fs.unlinkSync(metaPath);
          if (fs.existsSync(contentPath)) fs.unlinkSync(contentPath);
          console.log(` ^=^w^q  ^o Deleted expired paste: ${id}`);
        }
      } catch {
        console.warn(` ^z   ^o Failed to clean: ${file}`);
      }
    }
  });
}, 30 * 60 * 1000);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
