# Vercel Deployment Notes

## Important Limitations

This app has been modified to work on Vercel, but with significant limitations:

### Why Vercel Deployment is Limited

Your original app uses:
- **whisper.cpp**: Native ML binaries that require compilation and can't run in Vercel's serverless environment
- **FFmpeg/FFprobe**: System-level binaries not available in Vercel's serverless functions
- **File system operations**: Requires persistent storage beyond `/tmp`

### What Was Changed

1. **Created `vercel.json`**: Configures Vercel to use the serverless API handler
2. **Created `api/index.js`**: Exports the Express app as a serverless function instead of using `app.listen()`
3. **Updated file paths**: Changed `uploads/` and `work/` directories to use `/tmp` when running in Vercel
4. **Added Vercel detection**: Code detects `process.env.VERCEL` to switch between local and cloud behavior
5. **Mocked dependencies**: 
   - FFmpeg operations are mocked (files are copied instead of converted)
   - whisper.cpp transcription is mocked (returns placeholder text)
   - FFmpeg-based chunking is disabled

### Current Behavior on Vercel

- ✅ App deploys successfully
- ✅ API endpoints respond
- ✅ File uploads work
- ❌ **Transcription is mocked** - returns placeholder text instead of actual transcription
- ❌ **Audio conversion is skipped** - files are used as-is
- ❌ **Smart chunking is disabled** - files are processed as single chunks

### Recommended Alternatives

For production transcription on Vercel, consider:

1. **Use a cloud transcription API**:
   - OpenAI Whisper API
   - Google Cloud Speech-to-Text
   - AWS Transcribe
   - AssemblyAI

2. **Deploy on a different platform**:
   - Railway, Render, or Fly.io (support native binaries)
   - AWS EC2 or DigitalOcean (full server control)
   - Self-hosted VPS

3. **Hybrid approach**:
   - Deploy the API on Vercel
   - Offload transcription to a separate service with native dependencies

### How to Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel --prod
```

### Local Development

```bash
# Run locally with full whisper.cpp and FFmpeg support
npm start

# Test Vercel deployment locally (with mocked dependencies)
npm run dev
```

### Environment Variables

- `VERCEL`: Automatically set by Vercel (used for detection)
- `WHISPER_CLI`: Path to whisper-cli binary (for local development)
- `WHISPER_MODEL`: Path to whisper model file (for local development)
