/**
 * Conversation prompts for the Conversational Practice Mode.
 * These prompts are used to instruct the LLM to act as a Spanish conversation partner.
 */

/**
 * Character persona definitions
 */
export interface CharacterPersona {
  id: string;
  name: string;
  nameEs: string;
  description: string;
  avatar: string;
  greeting: string;
  personality: string;
  topics: string[];
}

/**
 * Available conversation characters (POC: single character)
 */
export const CHARACTERS: CharacterPersona[] = [
  {
    id: 'maria',
    name: 'María',
    nameEs: 'María',
    description: 'Your friendly neighbor who loves to chat about everyday life',
    avatar: '👩',
    greeting: '¡Hola! Soy María, tu vecina. ¿Cómo estás hoy?',
    personality: 'warm, patient, encouraging, speaks slowly and clearly',
    topics: ['daily life', 'family', 'food', 'weather', 'hobbies'],
  },
];

/**
 * Get a character by ID
 */
export function getCharacter(id: string): CharacterPersona | undefined {
  return CHARACTERS.find((c) => c.id === id);
}

/**
 * Configuration for conversation generation
 */
export interface ConversationConfig {
  character: CharacterPersona;
  knownVocabulary: string[];
  maxResponseLength?: number;
  allowNewWords?: boolean;
  difficultyLevel?: 'beginner' | 'intermediate' | 'advanced';
}

/**
 * Build the system prompt for conversation.
 * This instructs the LLM how to behave as a Spanish conversation partner.
 */
export function buildSystemPrompt(config: ConversationConfig): string {
  const {
    character,
    knownVocabulary,
    maxResponseLength = 50,
    allowNewWords = true,
    difficultyLevel = 'beginner',
  } = config;

  const vocabList = knownVocabulary.length > 0
    ? knownVocabulary.join(', ')
    : 'hola, adiós, gracias, por favor, sí, no';

  const difficultyInstructions = {
    beginner: 'Use very simple sentences. Stick to present tense. Avoid complex grammar.',
    intermediate: 'Use moderate complexity. Include some past tense. Use common expressions.',
    advanced: 'Use natural, flowing Spanish. Include subjunctive and complex structures when appropriate.',
  };

  return `You are ${character.name}, ${character.description}.

PERSONALITY:
${character.personality}

YOUR ROLE:
You are having a friendly conversation in Spanish with a language learner. Your goal is to help them practice their Spanish vocabulary in a natural, encouraging way.

VOCABULARY CONSTRAINTS:
The learner knows these Spanish words: ${vocabList}

IMPORTANT RULES:
1. PRIMARILY use words from the vocabulary list above
2. Keep responses SHORT (under ${maxResponseLength} words)
3. Use simple sentence structures appropriate for ${difficultyLevel} level
4. ${difficultyInstructions[difficultyLevel]}
5. Be encouraging and patient
6. If the learner makes a mistake, gently correct it
7. Ask simple follow-up questions to keep the conversation going

${allowNewWords ? `NEW WORD INTRODUCTION:
- You may introduce ONE new word per response
- When introducing a new word, immediately explain it in context
- Format: "[new word] - it means [English meaning]"
- Only introduce words related to the conversation topic` : 'Do NOT introduce any new vocabulary words.'}

CONVERSATION TOPICS:
Focus on: ${character.topics.join(', ')}

SAFETY GUIDELINES:
- Keep all content appropriate for language learning
- Avoid controversial, political, or sensitive topics
- If asked about inappropriate topics, redirect to language learning
- Do not pretend to be a real person or give personal advice

RESPONSE FORMAT:
- Respond naturally as ${character.name}
- Use proper Spanish punctuation (¿ ¡)
- Keep responses conversational and friendly
- End with a question or prompt when appropriate to encourage the learner to respond`;
}

/**
 * Build the initial greeting message from the character.
 */
export function buildGreetingMessage(character: CharacterPersona): string {
  return character.greeting;
}

/**
 * System message for handling user messages in English.
 * Encourages the user to try Spanish.
 */
export const ENGLISH_DETECTED_PROMPT = `The user wrote in English. Gently encourage them to try responding in Spanish. You can:
1. Provide a simple Spanish phrase they could use
2. Translate what they said into simple Spanish
3. Ask "¿Puedes intentar en español?" (Can you try in Spanish?)

Keep your response short and encouraging.`;

/**
 * System message for handling off-topic or inappropriate content.
 */
export const REDIRECT_PROMPT = `The user's message was off-topic or inappropriate. Politely redirect the conversation:
1. Acknowledge briefly
2. Suggest returning to practicing Spanish
3. Ask a simple Spanish question about an appropriate topic

Example: "Hmm, mejor hablemos de algo diferente. ¿Qué te gusta hacer los fines de semana?"`;

/**
 * Prompt for encouraging the user when they struggle.
 */
export const ENCOURAGEMENT_PROMPTS = [
  '¡Muy bien! You\'re doing great!',
  '¡Excelente! Keep practicing!',
  '¡Perfecto! Your Spanish is improving!',
  '¡Buen trabajo! Don\'t worry about mistakes.',
  '¡Fantástico! Every conversation helps!',
];

/**
 * Get a random encouragement prompt.
 */
export function getRandomEncouragement(): string {
  const index = Math.floor(Math.random() * ENCOURAGEMENT_PROMPTS.length);
  return ENCOURAGEMENT_PROMPTS[index];
}

/**
 * Message types for the conversation
 */
export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
  newWordIntroduced?: {
    word: string;
    meaning: string;
  };
}

/**
 * Format messages for the LLM API.
 * Converts our internal message format to the API format.
 */
export function formatMessagesForAPI(
  systemPrompt: string,
  messages: ConversationMessage[]
): Array<{ role: 'user' | 'assistant' | 'system'; content: string }> {
  return [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  ];
}

/**
 * Extract a new word introduction from the AI response.
 * Looks for patterns like "[word] - it means [meaning]" or "[word] means [meaning]"
 */
export function extractNewWordFromResponse(
  response: string,
  knownVocabulary: string[]
): { word: string; meaning: string } | null {
  // Pattern: "word - it means meaning" or "word means meaning"
  const patterns = [
    /[""]?(\w+)[""]?\s*[-–—]\s*(?:it\s+)?means?\s+[""]?([^"".\n]+)[""]?/i,
    /[""]?(\w+)[""]?\s+means?\s+[""]?([^"".\n]+)[""]?/i,
    /\((\w+)\s*=\s*([^)]+)\)/i,
  ];

  for (const pattern of patterns) {
    const match = response.match(pattern);
    if (match) {
      const word = match[1].toLowerCase();
      const meaning = match[2].trim();

      // Check if this is actually a new word
      if (!knownVocabulary.some((v) => v.toLowerCase() === word)) {
        return { word, meaning };
      }
    }
  }

  return null;
}

/**
 * Check if the user's message is primarily in English.
 */
export function isPrimarilyEnglish(text: string): boolean {
  // Common Spanish-specific characters and words
  const spanishIndicators = /[áéíóúüñ¿¡]|(\b(el|la|los|las|un|una|es|está|son|tengo|quiero|puedo|hola|gracias|por favor)\b)/i;

  // Common English words
  const englishIndicators = /\b(the|is|are|am|have|has|do|does|what|where|when|why|how|this|that|it's|I'm|you're)\b/gi;

  const spanishMatches = (text.match(spanishIndicators) || []).length;
  const englishMatches = (text.match(englishIndicators) || []).length;

  // If more English indicators than Spanish, consider it English
  return englishMatches > spanishMatches && englishMatches >= 2;
}

/**
 * Conversation turn limits
 */
export const CONVERSATION_LIMITS = {
  maxTurns: 5,          // POC limit
  maxTokensPerTurn: 500,
  maxConversationsPerDay: 10,
};

/**
 * Default configuration for new conversations
 */
export const DEFAULT_CONVERSATION_CONFIG: Partial<ConversationConfig> = {
  maxResponseLength: 50,
  allowNewWords: true,
  difficultyLevel: 'beginner',
};
