const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Directories
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Setup Multer Storage for 24/7 permanent media uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${safeName}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit for high-res images & short videos
});

// Helper: Read DB
function readDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading db.json:', err);
  }
  return null;
}

// Helper: Write DB
function writeDatabase(data) {
  try {
    data.lastUpdated = new Date().toISOString();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing to db.json:', err);
    return false;
  }
}

// Helper: Auto-push ke GitHub repository
function autoGitPushToGitHub(actionName = 'Update portfolio') {
  const timestamp = new Date().toLocaleString('id-ID');
  const cmd = `git add data/db.json public/uploads && git commit -m "${actionName} via Laptop Server (${timestamp})" && git push origin main`;
  exec(cmd, { cwd: __dirname }, (err, stdout, stderr) => {
    if (err) {
      console.warn('[AUTO GIT PUSH] Catatan push git:', err.message);
    } else {
      console.log('[AUTO GIT PUSH] Berhasil push perubahan ke GitHub live:', stdout.trim());
    }
  });
}

// API Routes

// 1. Health check & status
app.get('/api/status', (req, res) => {
  const db = readDatabase();
  res.json({
    status: 'online',
    serverTime: new Date().toISOString(),
    lastUpdated: db ? db.lastUpdated : null,
    totalProjects: db && db.portfolioProjects ? db.portfolioProjects.length : 0,
    owner: db && db.ownerProfile ? db.ownerProfile.name : 'M. HAFIDZ ARDAN'
  });
});

// 2. GET Portfolio Data (Accessed 24/7 by all visitors)
app.get('/api/portfolio', (req, res) => {
  const db = readDatabase();
  if (!db) {
    return res.status(500).json({ error: 'Database belum siap atau corrupt.' });
  }
  // Return public version without exposing secret PIN
  const sanitized = JSON.parse(JSON.stringify(db));
  if (sanitized.ownerProfile) {
    delete sanitized.ownerProfile.pin;
  }
  res.json(sanitized);
});

// 3. POST Update Portfolio (Authenticated with PIN)
app.post('/api/portfolio', (req, res) => {
  const currentDb = readDatabase();
  const { pin, ownerProfile, portfolioProjects } = req.body;

  // Validate Owner PIN
  const validPin = (currentDb && currentDb.ownerProfile && currentDb.ownerProfile.pin) || '1234';
  if (pin !== validPin) {
    return res.status(401).json({ error: 'PIN Pemilik tidak valid! Akses ditolak.' });
  }

  if (!ownerProfile || !Array.isArray(portfolioProjects)) {
    return res.status(400).json({ error: 'Payload tidak valid: ownerProfile dan portfolioProjects diperlukan.' });
  }

  // Preserve existing PIN if not explicitly updated
  const newPin = ownerProfile.pin || validPin;
  ownerProfile.pin = newPin;

  const success = writeDatabase({
    ownerProfile,
    portfolioProjects
  });

  if (success) {
    console.log(`[SYNC 24H] Portfolio berhasil diperbarui pada ${new Date().toISOString()}`);
    // Auto push ke GitHub agar laptop dan HP otomatis 100% sinkron ke semua orang!
    autoGitPushToGitHub('Update portfolio');
    res.json({
      success: true,
      message: 'Portofolio berhasil disimpan secara global dan live 24 jam untuk semua pengunjung!',
      lastUpdated: new Date().toISOString()
    });
  } else {
    res.status(500).json({ error: 'Gagal menulis ke penyimpanan server.' });
  }
});

// 4. File Upload (Media Slide / Foto Kegiatan / Video)
app.post('/api/upload', upload.single('mediaFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Tidak ada file yang diunggah.' });
  }
  const publicUrl = `/uploads/${req.file.filename}`;
  res.json({
    success: true,
    url: publicUrl,
    filename: req.file.filename,
    mimetype: req.file.mimetype,
    size: req.file.size
  });
});

// Serve uploads & static files
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(PUBLIC_DIR));
app.use(express.static(__dirname));

// Fallback to index.html for Single Page Application
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start listening
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 M. HAFIDZ ARDAN 360° PORTFOLIO SERVER RUNNING 24/7`);
  console.log(`📍 Local URL  : http://localhost:${PORT}`);
  console.log(`🌐 API Endpoint: http://localhost:${PORT}/api/portfolio`);
  console.log(`=======================================================`);
});

