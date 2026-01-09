# LLM Integration Research for VocabLoop Conversational Practice

## Overview

This document evaluates LLM providers for powering the Conversational Practice Mode, where users practice Spanish vocabulary through AI-powered conversations.

## Requirements

1. **Spanish language proficiency** - Must handle Spanish conversations naturally
2. **Vocabulary constraints** - Must respect vocabulary level restrictions
3. **Low latency** - Conversational feel requires fast responses
4. **Cost efficiency** - Per-conversation costs must be sustainable
5. **Safety** - Appropriate content filtering for language learning context
6. **Streaming support** - Real-time token streaming for better UX

---

## Provider Evaluation

### 1. OpenAI GPT-4o-mini

**Model ID:** `gpt-4o-mini`

**Pros:**
- Excellent Spanish language capability
- Very fast inference (typically <1s for short responses)
- Strong instruction following for vocabulary constraints
- Well-documented API with good SDK support
- Streaming responses supported
- Good at staying in character

**Cons:**
- Requires API key management
- Usage-based pricing (though relatively affordable)
- Data sent to external servers

**Pricing (as of Jan 2025):**
| Metric | Cost |
|--------|------|
| Input tokens | $0.15 / 1M tokens |
| Output tokens | $0.60 / 1M tokens |
| Cached input | $0.075 / 1M tokens |

**Estimated Cost per Conversation:**
- Average conversation: 5 turns × ~200 tokens/turn = ~1,000 tokens
- System prompt + vocabulary list: ~500 tokens (cached after first call)
- Estimated cost: ~$0.001 per conversation (~1,000 conversations per $1)

**Rate Limits:**
- 500 RPM (requests per minute) on Tier 1
- 200,000 TPM (tokens per minute)
- Sufficient for individual user sessions

**Latency:**
- Time to first token: ~200-400ms
- Full response (short): ~500-800ms

---

### 2. Anthropic Claude 3.5 Haiku

**Model ID:** `claude-3-5-haiku-20241022`

**Pros:**
- Strong multilingual capabilities including Spanish
- Excellent at following nuanced instructions
- Constitutional AI approach (safety built-in)
- Generally follows vocabulary constraints well
- Streaming supported
- Slightly better at creative/natural conversation

**Cons:**
- Slightly higher latency than GPT-4o-mini
- API less mature than OpenAI
- Requires separate Anthropic account

**Pricing (as of Jan 2025):**
| Metric | Cost |
|--------|------|
| Input tokens | $0.80 / 1M tokens |
| Output tokens | $4.00 / 1M tokens |
| Prompt caching | $0.10 / 1M tokens (90% reduction) |

**Estimated Cost per Conversation:**
- With prompt caching: ~$0.004 per conversation
- Without caching: ~$0.005 per conversation
- ~200-250 conversations per $1

**Rate Limits:**
- 50 RPM on initial tier
- Scales with usage

**Latency:**
- Time to first token: ~300-500ms
- Full response (short): ~700-1200ms

---

### 3. Local Models (Ollama + Llama 3.2)

**Model:** Llama 3.2 3B or 8B via Ollama

**Pros:**
- Complete privacy - no data leaves device
- No API costs after setup
- No rate limits
- Works offline
- Full control over model behavior

**Cons:**
- Requires user to install Ollama
- Performance depends on user hardware
- Llama 3.2 3B has limited Spanish capability
- 8B model needs 8GB+ RAM
- Inconsistent instruction following
- No built-in safety filters

**Requirements:**
- Ollama installed locally
- Minimum 8GB RAM for 3B model
- Recommended 16GB for 8B model
- ~5GB disk space for model

**Latency:**
- Varies significantly by hardware
- M1/M2 Mac: ~500-1000ms for short response
- GPU-equipped PC: ~300-700ms
- CPU-only: 2-5 seconds

**Spanish Capability:**
- 3B model: Basic conversational, may make grammatical errors
- 8B model: Better but still not as fluent as GPT-4o-mini
- May struggle with vocabulary constraints

---

## Comparison Matrix

| Criteria | GPT-4o-mini | Claude Haiku | Ollama/Llama |
|----------|-------------|--------------|--------------|
| Spanish Quality | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Instruction Following | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Latency | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Cost | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ (free) |
| Privacy | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Setup Ease | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| Safety | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| Offline Support | ❌ | ❌ | ✅ |

---

## Recommendation

### Primary: OpenAI GPT-4o-mini

**Rationale:**
1. **Best cost-to-quality ratio** - At ~$0.001 per conversation, costs are negligible
2. **Fastest responses** - Critical for conversational feel
3. **Excellent Spanish** - Native-level fluency
4. **Strong instruction following** - Reliably respects vocabulary constraints
5. **Mature ecosystem** - Well-documented, reliable SDK

### Secondary: Anthropic Claude Haiku

**Rationale:**
- Offer as alternative for users who prefer Anthropic
- Slightly better at nuanced, natural conversation
- Strong safety features

### Optional: Ollama (Privacy Mode)

**Rationale:**
- Offer for privacy-conscious users
- Clearly communicate quality tradeoffs
- Requires user to install Ollama separately

---

## Implementation Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    LLM Client (src/lib/llm.ts)          │
├─────────────────────────────────────────────────────────┤
│  interface LLMProvider {                                │
│    sendMessage(messages, config): Promise<string>       │
│    streamMessage(messages, config): AsyncGenerator      │
│  }                                                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   OpenAI    │  │  Anthropic  │  │   Ollama    │     │
│  │   Adapter   │  │   Adapter   │  │   Adapter   │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## API Key Management

### Environment Variables

```env
# .env.local (gitignored)
VITE_OPENAI_API_KEY=sk-...
VITE_ANTHROPIC_API_KEY=sk-ant-...

# Optional: Ollama endpoint (defaults to localhost:11434)
VITE_OLLAMA_ENDPOINT=http://localhost:11434
```

### Security Considerations

1. **Never commit API keys** - Use .env.local (already in .gitignore)
2. **Client-side exposure** - Keys in VITE_ vars are exposed to browser
3. **Recommendation for production:**
   - Use backend proxy to hide API keys
   - Or use Supabase Edge Functions
   - Current POC: Accept client-side keys with user awareness

### User-Provided Keys (Alternative)

Allow users to input their own API keys:
- Store encrypted in localStorage
- Clear on sign-out
- Show cost estimates before use

---

## Cost Controls

### User-Facing Limits

1. **Daily conversation limit** - 10 conversations/day (free tier)
2. **Turn limit** - 5 turns per conversation (POC scope)
3. **Token limit** - Max 500 tokens per response

### Backend Protections (Future)

1. Rate limiting per user
2. Monthly budget caps
3. Usage dashboard in Stats page

---

## Error Handling

| Error | User Message | Recovery |
|-------|--------------|----------|
| Rate limit | "Too many requests. Try again in a moment." | Retry with backoff |
| API key invalid | "API key issue. Check your settings." | Show settings |
| Network error | "Connection issue. Check your internet." | Retry button |
| Content filtered | "Let's keep our conversation friendly!" | Continue |
| Timeout | "Taking too long. Let's try again." | Retry |

---

## Next Steps

1. **Implement LLM client abstraction** (`src/lib/llm.ts`)
   - OpenAI adapter first
   - Add Anthropic adapter
   - Optional Ollama adapter

2. **Create conversation prompt template** (`src/prompts/conversation.ts`)
   - Character persona
   - Vocabulary constraints
   - Safety guidelines

3. **Build ChatSession component** (`src/components/ChatSession.tsx`)
   - Streaming responses
   - Typing indicator
   - Error states

4. **Add settings for API keys**
   - Settings page integration
   - Key validation

---

## Appendix: API Documentation Links

- OpenAI: https://platform.openai.com/docs/api-reference
- Anthropic: https://docs.anthropic.com/en/api
- Ollama: https://github.com/ollama/ollama/blob/main/docs/api.md
