const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = 3000;
const pastesDir = path.join(__dirname, 'pastes');
if (!fs.existsSync(pastesDir)) fs.mkdirSync(pastesDir);

app.use(express.json());
app.use(express.static('public'));

app.post('/documents', (req, res) => {
  const { content, expiry, language, redacted, password } = req.body;
  const id = Math.random().toString(36).substr(2, 6);
  const created = Date.now();
  const expires = created + (parseInt(expiry) || 60) * 60 * 1000;
  const passwordHash = password ? crypto.createHash('sha256').update(password).digest('hex') : null;

  try {
    fs.writeFileSync(path.join(pastesDir, `${id}.txt`), content);
    fs.writeFileSync(
      path.join(pastesDir, `${id}.meta.json`),
      JSON.stringify({ created, expires, language, redacted, passwordHash })
    );
    res.json({ key: id });
  } catch (err) {
    console.error("Failed to save paste:", err);
    res.status(500).json({ error: 'Failed to save paste' });
  }
});

app.all('/raw/:id', (req, res) => {
  const id = req.params.id;
  const metaPath = path.join(pastesDir, `${id}.meta.json`);
  const contentPath = path.join(pastesDir, `${id}.txt`);

  if (!fs.existsSync(metaPath) || !fs.existsSync(contentPath)) {
    return res.status(404).send("Not found");
  }

  const meta = JSON.parse(fs.readFileSync(metaPath));
  if (Date.now() > meta.expires) {
    fs.unlinkSync(metaPath);
    fs.unlinkSync(contentPath);
    return res.status(410).send("Expired");
  }

  if (meta.passwordHash) {
    const provided = req.method === "POST" && req.body?.password
      ? crypto.createHash("sha256").update(req.body.password).digest("hex")
      : null;

    if (provided !== meta.passwordHash) {
      return res.status(401).send("Unauthorized: password required");
    }
  }

  res.sendFile(contentPath);
});

app.get('/meta/:id', (req, res) => {
  const metaPath = path.join(pastesDir, `${req.params.id}.meta.json`);
  if (!fs.existsSync(metaPath)) return res.status(404).send('Meta not found');

  const meta = JSON.parse(fs.readFileSync(metaPath));
  if (Date.now() > meta.expires) {
    const contentPath = path.join(pastesDir, `${req.params.id}.txt`);
    if (fs.existsSync(contentPath)) fs.unlinkSync(contentPath);
    fs.unlinkSync(metaPath);
    return res.status(410).send('Paste expired');
  }

  res.json(meta);
});

app.post('/validate-password/:id', (req, res) => {
  const metaPath = path.join(pastesDir, `${req.params.id}.meta.json`);
  if (!fs.existsSync(metaPath)) return res.status(404).json({ error: 'Meta not found' });

  const meta = JSON.parse(fs.readFileSync(metaPath));
  const passwordHash = meta.passwordHash;
  const provided = req.body.password
    ? crypto.createHash('sha256').update(req.body.password).digest('hex')
    : null;

  if (!passwordHash) {
    return res.status(400).json({ error: 'This paste does not require a password' });
  }

  if (passwordHash === provided) {
    return res.status(200).json({ success: true });
  } else {
    return res.status(401).json({ error: 'Incorrect password' });
  }
});

app.get('/p/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

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
          console.log(`🗑 Deleted expired paste: ${id}`);
        }
      } catch {
        console.warn(`⚠️ Failed to clean: ${file}`);
      }
    }
  });
}, 30 * 60 * 1000);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
