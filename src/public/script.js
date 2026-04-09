const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('audioFile');
const browseBtn = document.getElementById('browseBtn');
const uploadForm = document.getElementById('uploadForm');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const removeBtn = document.getElementById('removeBtn');
const submitBtn = document.getElementById('submitBtn');
const submitText = submitBtn.querySelector('span');
const loader = document.getElementById('loader');

const resultCard = document.getElementById('resultCard');
const metaLang = document.getElementById('metaLang');
const metaChunks = document.getElementById('metaChunks');
const tabBtns = document.querySelectorAll('.tab-btn');
const fullTextDiv = document.getElementById('fullText');
const segmentList = document.getElementById('segmentList');
const copyBtn = document.getElementById('copyBtn');
const resetBtn = document.getElementById('resetBtn');

const errorToast = document.getElementById('errorToast');
const errorMsg = document.getElementById('errorMsg');
const closeToast = document.getElementById('closeToast');

// Live recording elements
const recordBtn = document.getElementById('recordBtn');
const recordBtnText = document.getElementById('recordBtnText');
const recordingIndicator = document.getElementById('recordingIndicator');
const recordingTime = document.getElementById('recordingTime');
const liveTranscript = document.getElementById('liveTranscript');
const liveTranscriptContent = document.getElementById('liveTranscriptContent');
const clearTranscriptBtn = document.getElementById('clearTranscriptBtn');
const liveLanguageSelect = document.getElementById('liveLanguageSelect');

let currentFile = null;

// Live recording state
let isRecording = false;
let recognition = null;
let recordingStartTime = null;
let recordingTimer = null;
let liveTranscriptText = '';
let currentLanguageIndex = 0;
let languageOptions = [];

// --- Live Recording Logic ---
function initSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        showError('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
        recordBtn.disabled = true;
        return null;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
        isRecording = true;
        recordingStartTime = Date.now();
        startRecordingTimer();
    };

    recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
            } else {
                interimTranscript += transcript;
            }
        }

        if (finalTranscript) {
            liveTranscriptText += finalTranscript;
            updateLiveTranscript();
        }
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
            showError('Microphone access denied. Please allow microphone access to use live recording.');
        } else if (event.error === 'service-not-allowed') {
            // Try next language option if available
            if (languageOptions.length > currentLanguageIndex + 1) {
                currentLanguageIndex++;
                console.log(`Trying alternative locale: ${languageOptions[currentLanguageIndex]}`);
                recognition.lang = languageOptions[currentLanguageIndex];
                try {
                    recognition.start();
                    return;
                } catch (e) {
                    console.error('Failed to restart with alternative locale:', e);
                }
            }
            // If all options failed, fall back to English
            if (languageOptions.length > 0 && languageOptions[0].startsWith('ur')) {
                console.log('Urdu not supported, falling back to English');
                recognition.lang = 'en-US';
                try {
                    recognition.start();
                    showError('Urdu language not supported in your browser. Using English instead.');
                    return;
                } catch (e) {
                    console.error('Failed to fallback to English:', e);
                }
            }
            showError('Speech recognition service not available for this language. Please try English.');
        } else if (event.error === 'no-speech') {
            // Ignore no-speech errors
            return;
        } else {
            showError(`Speech recognition error: ${event.error}`);
        }
        stopRecording();
    };

    recognition.onend = () => {
        if (isRecording) {
            // Restart if still supposed to be recording
            recognition.start();
        }
    };

    return recognition;
}

function startRecording() {
    if (!recognition) {
        recognition = initSpeechRecognition();
        if (!recognition) return;
    }

    const selectedLanguage = liveLanguageSelect.value;
    // Map language codes to proper locale codes for Web Speech API
    const languageMap = {
        'auto': ['en-US'],
        'en': ['en-US'],
        'ur': ['ur-PK', 'ur-IN', 'ur'],  // Try multiple Urdu locales
        'es': ['es-ES'],
        'fr': ['fr-FR'],
        'de': ['de-DE']
    };
    
    languageOptions = languageMap[selectedLanguage] || ['en-US'];
    currentLanguageIndex = 0;
    
    recognition.lang = languageOptions[0];

    try {
        recognition.start();
        recordBtn.classList.add('recording');
        recordBtnText.textContent = 'Stop Recording';
        recordingIndicator.classList.remove('hidden');
        liveTranscript.classList.remove('hidden');
        liveTranscriptContent.innerHTML = '<p class="placeholder">Listening... Speak now.</p>';
    } catch (error) {
        console.error('Failed to start recognition:', error);
        showError('Failed to start recording. Please try again.');
    }
}

function stopRecording() {
    if (recognition) {
        recognition.stop();
    }
    isRecording = false;
    stopRecordingTimer();
    recordBtn.classList.remove('recording');
    recordBtnText.textContent = 'Start Recording';
    recordingIndicator.classList.add('hidden');
    
    if (liveTranscriptText.trim()) {
        liveTranscriptContent.innerHTML = liveTranscriptText;
    } else {
        liveTranscriptContent.innerHTML = '<p class="placeholder">No speech detected. Try again.</p>';
    }
}

function updateLiveTranscript() {
    if (liveTranscriptText.trim()) {
        liveTranscriptContent.textContent = liveTranscriptText;
        // Auto-scroll to bottom
        liveTranscriptContent.scrollTop = liveTranscriptContent.scrollHeight;
    }
}

function startRecordingTimer() {
    recordingStartTime = Date.now();
    updateRecordingTime();
    recordingTimer = setInterval(updateRecordingTime, 1000);
}

function stopRecordingTimer() {
    if (recordingTimer) {
        clearInterval(recordingTimer);
        recordingTimer = null;
    }
}

function updateRecordingTime() {
    if (!recordingStartTime) return;
    const elapsed = Date.now() - recordingStartTime;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    recordingTime.textContent = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function clearLiveTranscript() {
    liveTranscriptText = '';
    liveTranscriptContent.innerHTML = '<p class="placeholder">Start recording to see real-time transcription...</p>';
}

// Event listeners for live recording
recordBtn.addEventListener('click', () => {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
});

clearTranscriptBtn.addEventListener('click', clearLiveTranscript);

// Initialize speech recognition on page load
document.addEventListener('DOMContentLoaded', () => {
    initSpeechRecognition();
});

// --- Drag & Drop Logic ---
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
});

dropZone.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;

    if (files.length > 0) {
        handleFileSelect(files[0]);
    }
}

browseBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', function () {
    if (this.files.length > 0) {
        handleFileSelect(this.files[0]);
    }
});

function handleFileSelect(file) {
    // Quick frontend validation
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/ogg', 'audio/x-m4a'];
    const validExts = ['.mp3', '.wav', '.ogg', '.m4a'];
    const extName = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!validTypes.includes(file.type) && !validExts.includes(extName)) {
        showError("Invalid file type. Please upload MP3, WAV, OGG, or M4A.");
        return;
    }

    if (file.size > 100 * 1024 * 1024) {
        showError("File too large. Maximum size is 100MB");
        return;
    }

    currentFile = file;

    // Update UI
    dropZone.querySelector('.drop-content').classList.add('hidden');
    fileInfo.classList.remove('hidden');

    fileName.textContent = file.name;
    fileSize.textContent = (file.size / (1024 * 1024)).toFixed(2) + ' MB';

    submitBtn.disabled = false;
    errorToast.classList.add('hidden');

    // Update hidden file input so FormData captures it correctly
    // Since we can't programmatically set FileList on all browsers reliably,
    // we use a DataTransfer object trick.
    const dt = new DataTransfer();
    dt.items.add(file);
    fileInput.files = dt.files;
}

removeBtn.addEventListener('click', resetUploadState);

function resetUploadState() {
    currentFile = null;
    fileInput.value = '';

    dropZone.querySelector('.drop-content').classList.remove('hidden');
    fileInfo.classList.add('hidden');
    submitBtn.disabled = true;

    // Hide results if showing
    resultCard.classList.add('hidden');
}

// --- Form Submission ---
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentFile) return;

    const formData = new FormData(uploadForm);

    // Toggle Loader State
    submitBtn.disabled = true;
    submitText.style.opacity = '0';
    loader.classList.remove('hidden');
    resultCard.classList.add('hidden');
    errorToast.classList.add('hidden');

    try {
        const response = await fetch('/transcribe', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Server error occurred');
        }

        renderResults(data);

    } catch (err) {
        showError(err.message);
    } finally {
        submitBtn.disabled = false;
        submitText.style.opacity = '1';
        loader.classList.add('hidden');
    }
});

// --- Results Rendering ---
function renderResults(data) {
    if (!data.ok) return;

    // Fill Meta
    metaLang.textContent = `Lang: ${data.meta.language.toUpperCase()}`;
    metaChunks.textContent = `${data.meta.totalChunksProcessed} Chunk(s)`;

    // Fill Full Text
    fullTextDiv.textContent = data.transcript || "No transcript returned.";

    // Fill Timestamps (Format: MM:SS)
    segmentList.innerHTML = '';

    if (data.segments && data.segments.length > 0) {
        data.segments.forEach(seg => {
            const li = document.createElement('li');
            li.classList.add('segment-item');

            const timeWrap = document.createElement('span');
            timeWrap.classList.add('segment-time');
            timeWrap.textContent = `[${formatTime(seg.start)} - ${formatTime(seg.end)}]`;

            const textWrap = document.createElement('span');
            textWrap.classList.add('segment-text');
            textWrap.textContent = seg.text;

            li.appendChild(timeWrap);
            li.appendChild(textWrap);
            segmentList.appendChild(li);
        });
    } else {
        segmentList.innerHTML = '<li>No timestamp data available.</li>';
    }

    resultCard.classList.remove('hidden');

    // Scroll smoothly to results
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

// --- Tabs Logic ---
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active from all
        tabBtns.forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content .content').forEach(c => c.classList.remove('active'));

        // Add active to clicked target
        btn.classList.add('active');
        const targetId = btn.dataset.tab === 'full' ? 'fullText' : 'timestampContent';
        document.getElementById(targetId).classList.add('active');
    });
});

// --- Utility Buttons ---
copyBtn.addEventListener('click', () => {
    const textToCopy = fullTextDiv.textContent;
    navigator.clipboard.writeText(textToCopy).then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => copyBtn.textContent = originalText, 2000);
    }).catch(err => {
        showError('Failed to copy to clipboard.');
    });
});

resetBtn.addEventListener('click', () => {
    resetUploadState();
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// --- Toast Logic ---
function showError(message) {
    errorMsg.textContent = message;
    errorToast.classList.remove('hidden');
}

closeToast.addEventListener('click', () => {
    errorToast.classList.add('hidden');
});
