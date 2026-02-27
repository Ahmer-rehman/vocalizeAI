# Vocalize AI 🎙️

Vocalize AI is a modular, high-performance transcription pipeline that elegantly bridges standard Node.js API architecture with local, hardware-accelerated Machine Learning using `whisper.cpp`. It converts uploaded audio files (MP3, WAV, OGG, M4A) into highly accurate, timestamped transcript segments safely and asynchronously.

## Features ✨
* **Local ML Execution:** Powers text transcription entirely locally via a custom-bound implementation of the `ggml-base.en` Whisper Neural Network. 
* **Dynamic Auditory Chunking:** Intelligently analyzes audio density via `FFmpeg/FFprobe` to proactively map and split heavy audio files exactly at silence drops. By batching segments (defaulting near ~30s), it bypasses Node memory bottlenecking entirely.
* **Premium Glassmorphism UI:** Complete with dragging/dropping capabilities and sleek timestamp breakdowns.
* **Safety First:** Secures memory through rigorous automated File System garbage-collection, robust MIME-Type filtering against injection attacks, and fallback metadata protections.

## Project Architecture 🏗️
The project uses a structured Service-Oriented Architecture (SOA) format:
```
vocalizeAI/
├── src/
│   ├── index.js                  # Primary Express Router connecting middleware
│   ├── public/                   # The Client-Side application (HTML/CSS/JS)
│   └── services/
│       ├── transcribe.js         # ML logic layer (FFmpeg normalization, Chunking Algorithms, Whisper API bindings)
│       └── upload.js             # Storage logic layer (Multer disk streaming & File type validation)
├── whisper.cpp/                  # The cloned whisper ML binaries (compiled!)
└── package.json                  
```

## Setup & Installation 🚀

### Prerequisites
* **Node.js**: v16+
* **FFmpeg / FFprobe**: Must be installed globally in your PATH (`brew install ffmpeg`).

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Service
```bash
npm start
```
*The web-app and transcription API will spin up on `http://localhost:3000`.*

## System Engineering Decisions ⚙️
1. **Normalization:** The system refuses to send raw user uploads to the ML engine. Instead, it securely spawns a child-process to convert incoming M4A, OGG, and MP3 structures strictly into `16kHz Mono WAVs` first—dramatically reducing model crash rates.
2. **GPU Overrides:** In order to mitigate localized hallucination errors occurring on external AMD/Metal dependencies inside Mac ecosystems, the backend dynamically pushes the `-ng` flag to `whisper.cpp`, ensuring accurate CPU execution through BLAS natively. 
3. **Ghost Cleanup:** Temporary storage layers (`uploads/` & `work/`) are designed ephemerally. A defensive unlinking sweep destroys all residual chunks and generated SRT templates before the HTTP packet responds successfully back to the client, preventing DDOS disk-floods.

## API Documentation 📡

### `POST /transcribe`
Submits an audio file for Deep-Learning analysis.
* **Headers:** `Content-Type: multipart/form-data`
* **Body:**
  * `audio`: (File) The target Audio File. Max: `100MB`.
* **Query Params (Optional):**
  * `?language=xx` (Overrides Auto-detect. Example: `en`, `es`, `fr`).

#### Response Example (200 OK)
```json
{
  "ok": true,
  "transcript": "Hello world, this is a test.",
  "segments": [
    {
      "start": 0,
      "end": 2.503,
      "text": "Hello world, this is a test."
    }
  ],
  "meta": {
    "originalName": "audio.wav",
    "mimeType": "audio/wav",
    "sizeBytes": 320950,
    "language": "auto",
    "totalChunksProcessed": 1
  }
}
```
