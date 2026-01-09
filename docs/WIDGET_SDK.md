# VocabLoop Widget SDK Design

Design document for embeddable widgets that allow third-party apps to integrate VocabLoop vocabulary learning.

## Overview

The VocabLoop Widget SDK enables other applications to embed vocabulary learning components, creating an ecosystem where Spanish learning happens everywhere users consume content.

## Widget Types

### 1. Inline Word Highlight

**Purpose:** Highlight Spanish words on any webpage based on user's vocabulary knowledge.

**Appearance:**
- Known words: Subtle green underline
- Learning words: Yellow underline
- Unknown words: Dotted gray underline (clickable to add)

**Use Cases:**
- News sites (El País, BBC Mundo)
- E-book readers
- Subtitle overlays

**Configuration:**
```javascript
VocabLoop.highlight({
  container: document.body,
  theme: 'light' | 'dark',
  showTranslations: true,
  onUnknownClick: (word, context) => void,
});
```

### 2. Popup Card

**Purpose:** Show vocabulary flashcard in a modal overlay.

**Features:**
- Spanish word with audio pronunciation
- English translation (revealed on tap)
- Example sentence with word highlighted
- "Add to deck" button for unknown words
- Quick grade buttons (Again, Hard, Good, Easy)

**Use Cases:**
- Click-through from highlighted words
- Vocabulary tooltips in reading apps
- Embedded learning moments

**Configuration:**
```javascript
VocabLoop.showCard({
  word: 'hablar',
  context: '¿Puedes hablar más despacio?',
  position: { x: 100, y: 200 } | 'center',
  onGrade: (grade) => void,
  onAdd: (word) => void,
});
```

### 3. Mini Review Widget

**Purpose:** Compact review session for quick vocabulary practice.

**Features:**
- Single-card review interface
- 5-card quick session option
- Progress indicator
- Streak display
- Responsive sizing (fits sidebar, footer, overlay)

**Sizes:**
- Small: 200x150px (single card only)
- Medium: 300x250px (with progress)
- Large: 400x300px (full featured)

**Use Cases:**
- Website sidebars
- App dashboards
- Browser new tab page
- Video player overlays during pauses

**Configuration:**
```javascript
VocabLoop.embed({
  container: '#vocab-widget',
  size: 'small' | 'medium' | 'large',
  cardCount: 1 | 5 | 10,
  theme: 'light' | 'dark' | 'auto',
  onComplete: (results) => void,
});
```

### 4. Vocabulary Badge

**Purpose:** Display user's vocabulary stats as a badge/widget.

**Features:**
- Word count (known/total)
- Current streak
- Level/rank
- Animated on milestone

**Sizes:**
- Icon: 32x32px (count only)
- Compact: 100x40px (count + streak)
- Full: 200x60px (all stats)

**Use Cases:**
- User profiles
- Forum signatures
- Social media embeds
- Achievement displays

**Configuration:**
```javascript
VocabLoop.badge({
  container: '#vocab-badge',
  size: 'icon' | 'compact' | 'full',
  showStreak: true,
  animate: true,
});
```

## JavaScript Embed API

### Installation

```html
<!-- Async load (recommended) -->
<script async src="https://sdk.vocabloop.app/v1/widget.js"></script>

<!-- Or via npm -->
npm install @vocabloop/widget-sdk
```

### Initialization

```javascript
// With API key (for usage tracking)
VocabLoop.init({
  apiKey: 'vl_pub_xxx',
  userId: 'optional-user-id',
  theme: 'auto',
  locale: 'en',
});

// Anonymous mode (limited features)
VocabLoop.init({ anonymous: true });
```

### Core Methods

```javascript
// Check if user is authenticated
VocabLoop.isAuthenticated(): boolean

// Get user's vocabulary
VocabLoop.getVocabulary(): Promise<{
  known: string[],
  learning: string[],
  mastered: string[],
}>

// Check if word is known
VocabLoop.isKnown(word: string): boolean

// Add word to user's deck
VocabLoop.addWord(word: string, context?: string): Promise<void>

// Record a review
VocabLoop.recordReview(cardId: string, grade: 'again' | 'hard' | 'good' | 'easy'): Promise<void>

// Get stats
VocabLoop.getStats(): Promise<{
  totalWords: number,
  knownWords: number,
  streak: number,
  level: number,
}>
```

### Events

```javascript
// Listen for widget events
VocabLoop.on('ready', () => void)
VocabLoop.on('authenticated', (user) => void)
VocabLoop.on('word-added', (word) => void)
VocabLoop.on('review-complete', (results) => void)
VocabLoop.on('error', (error) => void)

// Remove listener
VocabLoop.off('ready', handler)
```

## OAuth Flow for Third-Party Apps

### Overview

Third-party apps can authenticate users via OAuth 2.0 to access their vocabulary data.

### Flow

1. **Authorization Request**
   ```
   GET https://vocabloop.app/oauth/authorize
   ?client_id=YOUR_CLIENT_ID
   &redirect_uri=https://your-app.com/callback
   &response_type=code
   &scope=vocabulary:read vocabulary:write reviews:write
   &state=random_state_string
   ```

2. **User Grants Permission**
   - User sees VocabLoop login (if needed)
   - User sees permission request
   - User approves or denies

3. **Authorization Code**
   ```
   Redirect to: https://your-app.com/callback
   ?code=AUTHORIZATION_CODE
   &state=random_state_string
   ```

4. **Token Exchange**
   ```
   POST https://api.vocabloop.app/oauth/token
   Content-Type: application/x-www-form-urlencoded

   grant_type=authorization_code
   &code=AUTHORIZATION_CODE
   &client_id=YOUR_CLIENT_ID
   &client_secret=YOUR_CLIENT_SECRET
   &redirect_uri=https://your-app.com/callback
   ```

5. **Access Token Response**
   ```json
   {
     "access_token": "vl_at_xxx",
     "token_type": "Bearer",
     "expires_in": 3600,
     "refresh_token": "vl_rt_xxx",
     "scope": "vocabulary:read vocabulary:write reviews:write"
   }
   ```

### Scopes

| Scope | Description |
|-------|-------------|
| `vocabulary:read` | Read user's vocabulary list |
| `vocabulary:write` | Add words to user's deck |
| `reviews:read` | Read review history |
| `reviews:write` | Submit review grades |
| `stats:read` | Read user statistics |
| `profile:read` | Read user profile (name, avatar) |

## Rate Limits and Pricing Tiers

### Free Tier

- **Rate Limit:** 100 requests/minute, 10,000 requests/day
- **Features:**
  - Inline word highlighting
  - Popup cards (view only)
  - Vocabulary badge
- **Restrictions:**
  - No custom branding
  - "Powered by VocabLoop" attribution required
  - No write operations (add word, record review)

### Developer Tier ($29/month)

- **Rate Limit:** 1,000 requests/minute, 100,000 requests/day
- **Features:**
  - All Free tier features
  - Mini review widget
  - Write operations (add word, record review)
  - Custom theming
  - Remove attribution
- **Support:** Email support, 48-hour response

### Business Tier ($199/month)

- **Rate Limit:** 10,000 requests/minute, 1,000,000 requests/day
- **Features:**
  - All Developer tier features
  - White-label widgets
  - Custom vocabulary lists
  - Analytics dashboard
  - Priority support
  - SLA (99.9% uptime)
- **Support:** Dedicated support, 4-hour response

### Enterprise Tier (Custom)

- **Rate Limit:** Unlimited
- **Features:**
  - All Business tier features
  - On-premise deployment option
  - Custom integrations
  - Dedicated account manager
  - Custom SLA
- **Support:** 24/7 support, 1-hour response

## Technical Architecture

### CDN Distribution

```
https://sdk.vocabloop.app/v1/widget.js     (latest v1.x)
https://sdk.vocabloop.app/v1.2.3/widget.js (specific version)
```

- Served via CloudFlare CDN
- Gzip/Brotli compression
- Cache-Control: 1 hour for latest, 1 year for versioned
- Bundle size target: <50KB gzipped

### API Endpoints

```
Base URL: https://api.vocabloop.app/v1

GET    /vocabulary          - Get user's vocabulary
POST   /vocabulary          - Add word to deck
GET    /vocabulary/:word    - Check if word is known
POST   /reviews             - Record a review
GET    /stats               - Get user statistics
GET    /cards/random        - Get random card for review
```

### Iframe Security

Widgets can be embedded via iframe with postMessage communication:

```html
<iframe
  src="https://widget.vocabloop.app/mini-review?apiKey=xxx"
  sandbox="allow-scripts allow-same-origin"
  allow="microphone"
></iframe>
```

```javascript
// Parent page listens for events
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://widget.vocabloop.app') return;

  switch (event.data.type) {
    case 'REVIEW_COMPLETE':
      console.log('Review results:', event.data.results);
      break;
    case 'WORD_ADDED':
      console.log('Added word:', event.data.word);
      break;
  }
});
```

### Authentication Flow in Widget

1. Widget checks for existing session cookie
2. If not authenticated, shows "Connect VocabLoop" button
3. Button opens popup to vocabloop.app/widget-auth
4. User logs in (or is already logged in)
5. Popup posts success message and closes
6. Widget receives auth token via postMessage
7. Widget stores token in localStorage with domain prefix

## Implementation Roadmap

### Phase 1: Core Infrastructure (4-6 weeks)

1. Set up API endpoints for vocabulary and reviews
2. Implement OAuth 2.0 provider
3. Create base widget JavaScript bundle
4. Set up CDN distribution
5. Build developer portal for API key management

### Phase 2: Widgets (4-6 weeks)

1. Inline word highlight component
2. Popup card component
3. Mini review widget
4. Vocabulary badge

### Phase 3: Partner Integrations (ongoing)

1. Chrome extension (leverage existing)
2. YouTube subtitle overlay
3. Kindle vocabulary builder
4. Language exchange apps

### Phase 4: Analytics & Growth (ongoing)

1. Usage analytics dashboard
2. A/B testing framework
3. Referral program integration
4. Partner success tracking

## Security Considerations

### API Key Security

- API keys are domain-restricted (CORS)
- Separate public (client) and secret (server) keys
- Rate limiting per key
- Key rotation supported

### Data Privacy

- OAuth scopes limit data access
- User can revoke third-party access
- GDPR compliance (data export, deletion)
- No PII stored in widget analytics

### XSS Prevention

- All user content escaped before rendering
- Content Security Policy headers
- Sandboxed iframes where possible
- No eval() or inline scripts

## Example Integrations

### News Website Sidebar

```html
<div id="vocab-sidebar"></div>
<script src="https://sdk.vocabloop.app/v1/widget.js"></script>
<script>
  VocabLoop.init({ apiKey: 'vl_pub_xxx' });
  VocabLoop.embed({
    container: '#vocab-sidebar',
    size: 'medium',
    cardCount: 5,
    theme: 'auto',
  });
</script>
```

### E-book Reader

```javascript
import { VocabLoop } from '@vocabloop/widget-sdk';

// Initialize with OAuth token
VocabLoop.init({ token: userAccessToken });

// Highlight words in current page
function processPage(content) {
  return VocabLoop.highlight({
    text: content,
    onWordClick: (word, rect) => {
      VocabLoop.showCard({ word, position: rect });
    },
  });
}
```

### Video Subtitle Overlay

```javascript
// During video pause, show quick review
videoPlayer.on('pause', () => {
  if (VocabLoop.isAuthenticated()) {
    VocabLoop.embed({
      container: '#overlay',
      size: 'small',
      cardCount: 1,
      onComplete: () => videoPlayer.play(),
    });
  }
});
```

## Conclusion

The VocabLoop Widget SDK transforms vocabulary learning from a dedicated app activity into an ambient experience across the web. By providing easy-to-embed components with flexible pricing, we can build an ecosystem where every Spanish content interaction becomes a learning opportunity.
