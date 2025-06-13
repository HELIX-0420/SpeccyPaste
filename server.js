const express = require('express');
const fs = require('fs');
const path = require('path');
const { nanoid } = require('nanoid');
const app = express();
const PORT = 3000;

const pastesDir = path.join(__dirname, 'pastes');
if (!fs.existsSync(pastesDir)) fs.mkdirSync(pastesDir);

app.use(express.json());
app.use(express.static('public'));

// Save paste
app.post('/documents', (req, res) => {
    const content = req.body.content;
    const expiryMinutes = parseInt(req.body.expiry) || 10080; // default to 7 days
    const id = nanoid(6);

    const created = Date.now();
    const expires = created + expiryMinutes * 60 * 1000;

    fs.writeFileSync(path.join(pastesDir, `${id}.txt`), content);
    fs.writeFileSync(path.join(pastesDir, `${id}.meta.json`), JSON.stringify({ created, expires }));

    res.json({ key: id });
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
        // Delete expired files
        fs.unlinkSync(contentPath);
        fs.unlinkSync(metaPath);
        return res.status(410).send('Paste expired');
    }

    res.sendFile(contentPath);
});

// Metadata route for expiration info
app.get('/meta/:id', (req, res) => {
    const metaPath = path.join(pastesDir, `${req.params.id}.meta.json`);
    if (!fs.existsSync(metaPath)) return res.status(404).send('Not found');

    const meta = JSON.parse(fs.readFileSync(metaPath));
    if (Date.now() > meta.expires) {
        // Cleanup if expired
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

// Periodic cleanup of expired pastes
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
                    console.log(`Deleted expired paste: ${id}`);
                }
            } catch {
                console.warn(`Failed to parse or clean: ${file}`);
            }
        }
    });
}, 30 * 60 * 1000); // every 30 minutes

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
