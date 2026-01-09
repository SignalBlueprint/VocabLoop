import { useState, useRef, useEffect, useCallback } from 'react';
import type { LLMProvider, LLMMessage } from '../lib/llm';
import { LLMError } from '../lib/llm';
import type { CharacterPersona, ConversationMessage } from '../prompts/conversation';
import {
  buildSystemPrompt,
  buildGreetingMessage,
  extractNewWordFromResponse,
  isPrimarilyEnglish,
  CONVERSATION_LIMITS,
  ENGLISH_DETECTED_PROMPT,
} from '../prompts/conversation';

interface ChatSessionProps {
  isDark: boolean;
  character: CharacterPersona;
  knownVocabulary: string[];
  provider: LLMProvider;
  difficultyLevel?: 'beginner' | 'intermediate' | 'advanced';
  onNewWordLearned?: (word: string, meaning: string) => void;
  onSessionEnd?: (messages: ConversationMessage[]) => void;
}

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  newWord?: { word: string; meaning: string };
}

export function ChatSession({
  isDark,
  character,
  knownVocabulary,
  provider,
  difficultyLevel = 'beginner',
  onNewWordLearned,
  onSessionEnd,
}: ChatSessionProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnCount, setTurnCount] = useState(0);
  const [sessionEnded, setSessionEnded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build system prompt
  const systemPrompt = buildSystemPrompt({
    character,
    knownVocabulary,
    difficultyLevel,
    maxResponseLength: 50,
    allowNewWords: true,
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send initial greeting
  useEffect(() => {
    const greeting = buildGreetingMessage(character);
    setMessages([
      {
        id: 'greeting',
        role: 'assistant',
        content: greeting,
        timestamp: Date.now(),
      },
    ]);
  }, [character]);

  // Focus input after assistant message
  useEffect(() => {
    if (!isLoading && !sessionEnded) {
      inputRef.current?.focus();
    }
  }, [isLoading, sessionEnded]);

  // Convert messages to LLM format
  const getMessagesForLLM = useCallback(
    (currentMessages: DisplayMessage[]): LLMMessage[] => {
      return [
        { role: 'system', content: systemPrompt },
        ...currentMessages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ];
    },
    [systemPrompt]
  );

  // Handle sending a message
  const handleSend = async () => {
    if (!input.trim() || isLoading || sessionEnded) return;

    const userMessage: DisplayMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    // Check if user wrote in English
    const isEnglish = isPrimarilyEnglish(userMessage.content);

    // Prepare messages for LLM
    const llmMessages = getMessagesForLLM([...messages, userMessage]);

    // If user wrote in English, add a system hint
    if (isEnglish) {
      llmMessages.push({
        role: 'system',
        content: ENGLISH_DETECTED_PROMPT,
      });
    }

    // Create placeholder for streaming response
    const assistantId = `assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
      },
    ]);

    try {
      // Use streaming for better UX
      let fullResponse = '';
      const stream = provider.streamMessage(llmMessages, {
        maxTokens: CONVERSATION_LIMITS.maxTokensPerTurn,
        temperature: 0.7,
      });

      for await (const chunk of stream) {
        fullResponse += chunk;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: fullResponse, isStreaming: true }
              : m
          )
        );
      }

      // Check for new word introduction
      const newWord = extractNewWordFromResponse(fullResponse, knownVocabulary);

      // Finalize message
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: fullResponse,
                isStreaming: false,
                newWord: newWord || undefined,
              }
            : m
        )
      );

      // Notify about new word
      if (newWord && onNewWordLearned) {
        onNewWordLearned(newWord.word, newWord.meaning);
      }

      // Update turn count
      const newTurnCount = turnCount + 1;
      setTurnCount(newTurnCount);

      // Check if session should end
      if (newTurnCount >= CONVERSATION_LIMITS.maxTurns) {
        setSessionEnded(true);
        if (onSessionEnd) {
          onSessionEnd(
            messages.map((m) => ({
              role: m.role,
              content: m.content,
              timestamp: m.timestamp,
              newWordIntroduced: m.newWord,
            }))
          );
        }
      }
    } catch (err) {
      // Remove streaming message on error
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));

      if (err instanceof LLMError) {
        switch (err.code) {
          case 'rate_limit':
            setError('Too many requests. Please wait a moment and try again.');
            break;
          case 'invalid_key':
            setError('API key issue. Please check your settings.');
            break;
          case 'network':
            setError('Connection issue. Please check your internet.');
            break;
          default:
            setError('Something went wrong. Please try again.');
        }
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // End session button
  const handleEndSession = () => {
    setSessionEnded(true);
    if (onSessionEnd) {
      onSessionEnd(
        messages.map((m) => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
          newWordIntroduced: m.newWord,
        }))
      );
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Character header */}
      <div
        className={`flex items-center gap-3 p-4 border-b ${
          isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
        }`}
      >
        <span className="text-3xl">{character.avatar}</span>
        <div>
          <h3
            className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}
          >
            {character.name}
          </h3>
          <p
            className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
          >
            {character.description}
          </p>
        </div>
        <div className="ml-auto">
          <span
            className={`text-xs px-2 py-1 rounded-full ${
              isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
            }`}
          >
            {turnCount}/{CONVERSATION_LIMITS.maxTurns} turns
          </span>
        </div>
      </div>

      {/* Messages area */}
      <div
        className={`flex-1 overflow-y-auto p-4 space-y-4 ${
          isDark ? 'bg-gray-900' : 'bg-white'
        }`}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                message.role === 'user'
                  ? isDark
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-500 text-white'
                  : isDark
                  ? 'bg-gray-800 text-gray-100'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              {message.isStreaming && (
                <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
              )}
              {message.newWord && (
                <div
                  className={`mt-2 pt-2 border-t text-xs ${
                    isDark ? 'border-gray-600' : 'border-gray-300'
                  }`}
                >
                  <span className="font-semibold">New word: </span>
                  <span className="text-yellow-500">{message.newWord.word}</span>
                  <span> = {message.newWord.meaning}</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex justify-start">
            <div
              className={`rounded-2xl px-4 py-2 ${
                isDark ? 'bg-gray-800' : 'bg-gray-100'
              }`}
            >
              <div className="flex gap-1">
                <span
                  className={`w-2 h-2 rounded-full animate-bounce ${
                    isDark ? 'bg-gray-500' : 'bg-gray-400'
                  }`}
                  style={{ animationDelay: '0ms' }}
                />
                <span
                  className={`w-2 h-2 rounded-full animate-bounce ${
                    isDark ? 'bg-gray-500' : 'bg-gray-400'
                  }`}
                  style={{ animationDelay: '150ms' }}
                />
                <span
                  className={`w-2 h-2 rounded-full animate-bounce ${
                    isDark ? 'bg-gray-500' : 'bg-gray-400'
                  }`}
                  style={{ animationDelay: '300ms' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div
            className={`text-center text-sm p-3 rounded-lg ${
              isDark
                ? 'bg-red-900/50 text-red-300'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Session ended message */}
        {sessionEnded && (
          <div
            className={`text-center p-4 rounded-lg ${
              isDark ? 'bg-gray-800' : 'bg-gray-100'
            }`}
          >
            <p
              className={`font-semibold mb-2 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              ¡Buen trabajo! Session complete.
            </p>
            <p
              className={`text-sm ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              You practiced {turnCount} conversation turns with {character.name}.
            </p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div
        className={`p-4 border-t ${
          isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
        }`}
      >
        {!sessionEnded ? (
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type in Spanish..."
              disabled={isLoading}
              className={`flex-1 px-4 py-2 rounded-full border focus:outline-none focus:ring-2 ${
                isDark
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-emerald-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-emerald-500'
              }`}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className={`px-4 py-2 rounded-full font-medium transition-colors ${
                !input.trim() || isLoading
                  ? isDark
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : isDark
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                  : 'bg-emerald-500 text-white hover:bg-emerald-600'
              }`}
            >
              Send
            </button>
            <button
              onClick={handleEndSession}
              className={`px-3 py-2 rounded-full text-sm transition-colors ${
                isDark
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
              title="End session"
            >
              End
            </button>
          </div>
        ) : (
          <div className="text-center">
            <button
              onClick={() => window.location.reload()}
              className={`px-6 py-2 rounded-full font-medium ${
                isDark
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                  : 'bg-emerald-500 text-white hover:bg-emerald-600'
              }`}
            >
              Start New Conversation
            </button>
          </div>
        )}

        {/* Help text */}
        <p
          className={`text-center text-xs mt-2 ${
            isDark ? 'text-gray-500' : 'text-gray-400'
          }`}
        >
          {sessionEnded
            ? 'Great practice session!'
            : 'Try to respond in Spanish. The AI will help you learn!'}
        </p>
      </div>
    </div>
  );
}
