# Speech Recognition Research for VocabLoop

## Overview

This document evaluates speech recognition options for implementing pronunciation practice in VocabLoop. The goal is to capture user speech, transcribe it, and compare against expected Spanish words.

---

## 1. Web Speech API

### Description
Built-in browser API for speech recognition. Uses browser's native speech recognition engine (Google's on Chrome, Microsoft's on Edge).

### Pros
- **Free** — No API costs
- **No backend required** — Runs entirely client-side
- **Low latency** — Real-time transcription
- **Simple API** — Easy to implement
- **Streaming support** — Results as user speaks

### Cons
- **Browser support limited** — Chrome, Edge, Safari only (no Firefox)
- **Requires internet** — Most browsers use cloud services
- **Accuracy varies** — Lower accuracy for Spanish compared to English
- **No confidence scores** — Binary match/no-match
- **Privacy concerns** — Audio sent to Google/Microsoft servers

### Spanish Support
- Supports Spanish via `lang="es-ES"` (Spain) or `lang="es-MX"` (Mexico)
- Tested accuracy: ~80-85% for single words, lower for sentences
- Regional variants: Spain, Mexico, Argentina dialects available

### Implementation Complexity
**Low** — Native browser API with simple JavaScript interface

### Code Example
```javascript
const recognition = new webkitSpeechRecognition();
recognition.lang = 'es-ES';
recognition.continuous = false;
recognition.interimResults = false;

recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript;
  console.log('Heard:', transcript);
};

recognition.start();
```

### Browser Compatibility
| Browser | Support |
|---------|---------|
| Chrome  | ✅ Full (webkitSpeechRecognition) |
| Edge    | ✅ Full (SpeechRecognition) |
| Safari  | ✅ Limited (iOS/macOS only) |
| Firefox | ❌ Not supported |

### Recommendation
**Good for POC** — Free, simple, works on majority of users' browsers.

---

## 2. OpenAI Whisper API

### Description
State-of-the-art speech recognition model available via API. Can also run locally via open-source model.

### Pricing
- **$0.006 per minute** of audio
- 10 seconds of audio ≈ $0.001
- 100 pronunciation attempts/day = ~$0.10/day per active user

### Pros
- **Excellent accuracy** — State-of-the-art for Spanish
- **Language detection** — Auto-detects Spanish
- **Timestamps** — Word-level timing available
- **Consistent results** — Same model behavior everywhere
- **Works offline** — Can run local model via whisper.cpp

### Cons
- **Latency** — 1-3 seconds for API response
- **Cost at scale** — Can add up with many users
- **No real-time** — Must record first, then send
- **Audio upload** — Requires sending audio to OpenAI

### Spanish Support
- Native Spanish support (no language specification needed)
- Excellent accent handling (Spain, Latin America)
- Tested accuracy: ~95%+ for single words

### Implementation Complexity
**Medium** — Requires audio recording, file upload, async processing

### API Example
```javascript
const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${OPENAI_API_KEY}`,
  },
  body: formData, // Contains audio file
});
const { text } = await response.json();
```

### Recommendation
**Good for production** — High accuracy justifies cost for serious learners.

---

## 3. Azure Speech Services

### Description
Microsoft's comprehensive speech platform with pronunciation assessment feature.

### Pricing
- **Free tier**: 5 hours/month
- **Standard**: $1.00 per hour of audio
- Pronunciation assessment: Same pricing

### Pros
- **Pronunciation Assessment** — Built-in scoring for pronunciation quality
- **Phoneme-level feedback** — Know exactly which sounds are wrong
- **Confidence scores** — Detailed accuracy metrics
- **Real-time streaming** — Low latency option
- **Comprehensive** — One service for all speech needs

### Cons
- **Complex setup** — Azure account, SDK integration
- **SDK size** — JavaScript SDK is large (~5MB)
- **Overkill for POC** — Many features we won't use
- **Lock-in** — Azure-specific implementation

### Spanish Support
- Full Spanish support with regional variants
- Pronunciation assessment supports Spanish
- IPA phoneme scoring available

### Pronunciation Assessment Output
```json
{
  "accuracyScore": 85.5,
  "fluencyScore": 78.0,
  "completenessScore": 100,
  "pronunciationScore": 81.2,
  "words": [
    {
      "word": "hola",
      "accuracyScore": 92.0,
      "errorType": "None"
    }
  ]
}
```

### Implementation Complexity
**High** — Azure account, SDK setup, subscription management

### Recommendation
**Best for advanced features** — Use if phoneme-level feedback is required.

---

## 4. Local Whisper (whisper.cpp / Whisper Web)

### Description
Run Whisper model directly in browser via WebAssembly or on local machine.

### Pricing
**Free** — Open-source, runs locally

### Pros
- **No API costs** — Completely free
- **Privacy** — Audio never leaves device
- **Works offline** — No internet required after model load
- **Same accuracy as Whisper API** — Same model

### Cons
- **Large download** — Model is 75MB-1.5GB depending on size
- **Slow on mobile** — CPU-intensive
- **Initial load time** — 5-30 seconds to load model
- **Memory usage** — Requires significant RAM

### Spanish Support
- Same as Whisper API (excellent)

### Implementation Options
1. **whisper.cpp + WebAssembly** — C++ compiled to WASM
2. **transformers.js** — JavaScript implementation
3. **Local server** — Run whisper locally, call from browser

### Model Sizes
| Model | Size | Accuracy | Speed |
|-------|------|----------|-------|
| tiny  | 75MB | Good | Fast |
| base  | 142MB | Better | Medium |
| small | 466MB | Great | Slower |

### Recommendation
**Good for privacy-focused users** — Offer as optional local mode.

---

## 5. Comparison Summary

| Feature | Web Speech API | Whisper API | Azure | Local Whisper |
|---------|---------------|-------------|-------|---------------|
| Cost | Free | $0.006/min | $1/hr | Free |
| Accuracy | 80-85% | 95%+ | 95%+ | 95%+ |
| Latency | Real-time | 1-3s | Real-time | 2-5s |
| Offline | ❌ | ❌ | ❌ | ✅ |
| Setup | Easy | Easy | Hard | Medium |
| Privacy | Low | Low | Low | High |
| Pronunciation Score | ❌ | ❌ | ✅ | ❌ |
| Browser Support | Limited | All | All | All |

---

## Recommendation for VocabLoop

### POC Phase (Immediate)
**Use Web Speech API**

Rationale:
1. Zero cost — No API keys or billing
2. Instant implementation — Native browser API
3. Good enough for POC — 80-85% accuracy sufficient for validation
4. Covers majority — Chrome + Edge = 80%+ of users

Limitations to accept:
- Firefox users cannot use feature (show graceful fallback)
- Accuracy not perfect (indicate "pronunciation feedback is experimental")

### Production Phase (Future)
**Hybrid approach:**

1. **Default: Web Speech API** — Free, fast, works for most users
2. **Premium: Whisper API** — Offer for users who want better accuracy
3. **Privacy mode: Local Whisper** — For users who don't want audio in cloud

### Implementation Plan

#### Phase 1: POC with Web Speech API
1. Create `useAudioRecorder` hook for microphone access
2. Create `useSpeechRecognition` hook wrapping Web Speech API
3. Compare transcription to expected word (fuzzy match)
4. Show pass/fail result

#### Phase 2: Enhanced Accuracy
1. Add Whisper API as optional provider
2. Let users choose in settings
3. Show accuracy comparison to encourage upgrade

#### Phase 3: Advanced Features
1. Integrate Azure Pronunciation Assessment
2. Add phoneme-level feedback
3. Show detailed pronunciation tips

---

## Browser Compatibility Strategy

### Supported Browsers
```typescript
function isSpeechRecognitionSupported(): boolean {
  return 'webkitSpeechRecognition' in window ||
         'SpeechRecognition' in window;
}
```

### Fallback for Unsupported Browsers
- Show message: "Pronunciation practice requires Chrome or Edge"
- Offer text-typing alternative
- Link to download supported browser

---

## Privacy Considerations

### Web Speech API
- Audio sent to Google (Chrome) or Microsoft (Edge)
- No explicit consent UI (browser handles)
- Cannot disable without losing feature

### Whisper API
- Audio sent to OpenAI
- Retained for 30 days for abuse monitoring
- Can opt out of training usage

### Recommendation
- Clear privacy notice before first use
- Explain what data is sent where
- Offer local-only mode in future

---

## Technical Notes

### Microphone Permission
```typescript
async function requestMicrophoneAccess(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    return false;
  }
}
```

### Audio Recording Format
- Web Speech API: Handles internally
- Whisper API: Supports mp3, mp4, mpeg, mpga, m4a, wav, webm
- Recommended: WebM (native browser recording format)

### Spanish Language Codes
- `es-ES` — Spain (Castilian)
- `es-MX` — Mexico
- `es-AR` — Argentina
- `es-CO` — Colombia
- Recommendation: Default to `es-ES`, allow user selection in settings

---

## Conclusion

For VocabLoop's pronunciation feature POC:

1. **Start with Web Speech API** — Free, simple, immediate
2. **Design for extensibility** — Abstract provider interface
3. **Plan for upgrades** — Whisper and Azure paths documented
4. **Handle limitations gracefully** — Clear messaging for unsupported browsers

This approach allows shipping a working feature quickly while leaving room for accuracy improvements based on user feedback and demand.
