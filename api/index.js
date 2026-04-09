const express = require("express");
const path = require("path");
const fs = require("fs");

// Import the separated modules
const { upload } = require("../src/services/upload");
const { WORK_DIR, convertTo16kMonoWav, validateAudioMetadata, chunkWavFile, transcribeToSrtSegments } = require("../src/services/transcribe");

const app = express();

// ---------- static ui ----------
app.use(express.static(path.join(__dirname, "..", "src", "public")));

// ---------- routes ----------
app.get("/", (_req, res) => {
    res.json({
        ok: true,
        message: "POST /transcribe (multipart/form-data key: audio) optional query: ?language=auto|en|...",
    });
});

app.post("/transcribe", upload.single("audio"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ ok: false, error: "No file uploaded. Use form-data key 'audio' (.wav/.mp3)." });
        }

        const language = (req.query.language || "auto").toString();
        const inputPath = req.file.path;

        // 0. Validate metadata before processing to catch corrupt files safely
        const isValid = await validateAudioMetadata(inputPath);
        if (!isValid) {
            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            return res.status(400).json({ ok: false, error: "Corrupt or unsupported audio file format." });
        }

        const baseName = path.parse(req.file.filename).name;
        const wavPath = path.join(WORK_DIR, `${baseName}.16k_mono.wav`);

        // 1. Convert to standardized format (Handles different audio formats question)
        try {
            await convertTo16kMonoWav(inputPath, wavPath);
        } catch (e) {
            console.warn("FFmpeg conversion failed/mocked.", e.message);
            // Copy original if ffmpeg is missing for fallback
            fs.copyFileSync(inputPath, wavPath);
        }

        // 2. Chunk processing (Handles long audio files question + silence splitting)
        const CHUNK_DURATION = 30; // 30 seconds target
        const chunksPrefix = `${baseName}_chunk`;
        let chunkData = [];

        try {
            chunkData = await chunkWavFile(wavPath, WORK_DIR, chunksPrefix, CHUNK_DURATION);
        } catch (e) {
            console.warn("Chunking failed/mocked.", e.message);
            chunkData = [{ path: wavPath, offset: 0 }];
        }

        // Handle empty chunking case gracefully
        if (chunkData.length === 0) chunkData = [{ path: wavPath, offset: 0 }];

        // 3. Process each chunk separately and combine results
        let allSegments = [];

        for (let i = 0; i < chunkData.length; i++) {
            const { path: chunkPath, offset } = chunkData[i];
            const chunkOutBase = path.join(WORK_DIR, `${baseName}_out_${i}`);

            const segments = await transcribeToSrtSegments(chunkPath, chunkOutBase, language, offset);
            allSegments = allSegments.concat(segments);

            // clean up temporary chunk and SRT
            if (chunkPath !== wavPath && fs.existsSync(chunkPath)) fs.unlinkSync(chunkPath);
            if (fs.existsSync(`${chunkOutBase}.srt`)) fs.unlinkSync(`${chunkOutBase}.srt`);
        }

        const transcript = allSegments.map((s) => s.text).join(" ").trim();

        // 4. Return unified result
        res.json({
            ok: true,
            transcript,
            segments: allSegments, // [{start, end, text}, ...]
            meta: {
                originalName: req.file.originalname,
                mimeType: req.file.mimetype,
                sizeBytes: req.file.size,
                language,
                totalChunksProcessed: chunkData.length
            },
        });

        // Clean up original standard wav file & upload
        if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath);
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// Export for Vercel serverless
module.exports = app;
