const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Use /tmp for Vercel serverless compatibility
const UPLOAD_DIR = process.env.VERCEL ? "/tmp/uploads" : path.join(__dirname, "..", "..", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function audioFileFilter(_req, file, cb) {
    const allowedMime = new Set([
        "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav",
        "audio/mp4", "audio/ogg", "audio/x-m4a"
    ]);
    const ext = path.extname(file.originalname).toLowerCase();

    // Validate the file type and mime explicitly to catch unsupported files
    const ok = allowedMime.has(file.mimetype) || [".mp3", ".wav", ".m4a", ".ogg"].includes(ext);
    cb(null, ok);
}

const upload = multer({
    storage: multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
        filename: (_req, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname).toLowerCase()}`),
    }),
    fileFilter: audioFileFilter,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB max limit
});

module.exports = {
    UPLOAD_DIR,
    upload
};
