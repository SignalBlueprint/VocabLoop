import { useState, useEffect, useMemo } from 'react';
import type { Card, Page } from '../types';
import { ChatSession } from '../components/ChatSession';
import {
  getBestAvailableProvider,
  saveApiKey,
  loadApiKey,
  createLLMProvider,
  type LLMProvider,
  type LLMProviderType,
} from '../lib/llm';
import { CHARACTERS, getCharacter, type CharacterPersona } from '../prompts/conversation';
import { buildVocabContext } from '../utils/vocabExtract';
import { getAllCards } from '../db/cards';

interface ConversationPageProps {
  isDark: boolean;
  onNavigate: (page: Page) => void;
  onNewWordLearned?: (word: string, meaning: string) => void;
}

type SetupStep = 'provider' | 'character' | 'ready';

export function ConversationPage({
  isDark,
  onNavigate,
  onNewWordLearned,
}: ConversationPageProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [step, setStep] = useState<SetupStep>('provider');
  const [provider, setProvider] = useState<LLMProvider | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterPersona | null>(null);
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [apiKey, setApiKey] = useState('');
  const [providerType, setProviderType] = useState<LLMProviderType>('openai');
  const [keyError, setKeyError] = useState<string | null>(null);

  // Get vocabulary from user's cards
  const knownVocabulary = useMemo(() => {
    return buildVocabContext(cards, 100).split(', ');
  }, [cards]);

  // Load cards on mount
  useEffect(() => {
    const loadCardsData = async () => {
      const allCards = await getAllCards();
      setCards(allCards);
    };
    loadCardsData();
  }, []);

  // Check if LLM is already configured
  useEffect(() => {
    const existingProvider = getBestAvailableProvider();
    if (existingProvider) {
      setProvider(existingProvider);
      setStep('character');
    } else {
      // Check for saved keys
      const savedOpenAI = loadApiKey('openai');
      const savedAnthropic = loadApiKey('anthropic');
      if (savedOpenAI) {
        setProviderType('openai');
        setApiKey(savedOpenAI);
      } else if (savedAnthropic) {
        setProviderType('anthropic');
        setApiKey(savedAnthropic);
      }
    }
  }, []);

  // Handle API key submission
  const handleSaveApiKey = () => {
    if (!apiKey.trim()) {
      setKeyError('Please enter an API key');
      return;
    }

    // Basic validation
    if (providerType === 'openai' && !apiKey.startsWith('sk-')) {
      setKeyError('OpenAI API keys start with "sk-"');
      return;
    }
    if (providerType === 'anthropic' && !apiKey.startsWith('sk-ant-')) {
      setKeyError('Anthropic API keys start with "sk-ant-"');
      return;
    }

    // Save the key
    saveApiKey(providerType, apiKey);

    // Create provider
    const newProvider = createLLMProvider({
      type: providerType,
      apiKey: apiKey,
    });

    if (newProvider.isAvailable()) {
      setProvider(newProvider);
      setKeyError(null);
      setStep('character');
    } else {
      setKeyError('Invalid API key format');
    }
  };

  // Handle character selection
  const handleSelectCharacter = (characterId: string) => {
    const character = getCharacter(characterId);
    if (character) {
      setSelectedCharacter(character);
      setStep('ready');
    }
  };

  // Go back to setup
  const handleBack = () => {
    if (step === 'ready') {
      setStep('character');
    } else if (step === 'character') {
      setStep('provider');
    } else {
      onNavigate('home');
    }
  };

  // Render provider setup
  const renderProviderSetup = () => (
    <div className="max-w-md mx-auto p-4">
      <h2
        className={`text-2xl font-bold mb-6 text-center ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}
      >
        Set Up Conversation Mode
      </h2>

      <div
        className={`rounded-xl p-6 ${
          isDark ? 'bg-gray-800' : 'bg-gray-50'
        }`}
      >
        <p
          className={`text-sm mb-4 ${
            isDark ? 'text-gray-300' : 'text-gray-600'
          }`}
        >
          To enable AI conversations, you need to provide an API key from OpenAI
          or Anthropic. Your key is stored locally and never sent to our servers.
        </p>

        {/* Provider selection */}
        <div className="mb-4">
          <label
            className={`block text-sm font-medium mb-2 ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            }`}
          >
            Provider
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setProviderType('openai')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                providerType === 'openai'
                  ? isDark
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-500 text-white'
                  : isDark
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              OpenAI
            </button>
            <button
              onClick={() => setProviderType('anthropic')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                providerType === 'anthropic'
                  ? isDark
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-500 text-white'
                  : isDark
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Anthropic
            </button>
          </div>
        </div>

        {/* API key input */}
        <div className="mb-4">
          <label
            className={`block text-sm font-medium mb-2 ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            }`}
          >
            API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setKeyError(null);
            }}
            placeholder={
              providerType === 'openai' ? 'sk-...' : 'sk-ant-...'
            }
            className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 ${
              isDark
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-emerald-500'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-emerald-500'
            }`}
          />
          {keyError && (
            <p className="text-red-500 text-sm mt-1">{keyError}</p>
          )}
        </div>

        {/* Cost estimate */}
        <div
          className={`text-xs mb-4 p-3 rounded-lg ${
            isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'
          }`}
        >
          <p className="font-medium mb-1">Estimated cost:</p>
          <p>
            {providerType === 'openai'
              ? '~$0.001 per conversation (~1,000 conversations per $1)'
              : '~$0.004 per conversation (~250 conversations per $1)'}
          </p>
        </div>

        {/* Submit button */}
        <button
          onClick={handleSaveApiKey}
          className={`w-full py-3 rounded-lg font-medium transition-colors ${
            isDark
              ? 'bg-emerald-600 text-white hover:bg-emerald-500'
              : 'bg-emerald-500 text-white hover:bg-emerald-600'
          }`}
        >
          Continue
        </button>

        {/* Help links */}
        <div className="mt-4 text-center">
          <a
            href={
              providerType === 'openai'
                ? 'https://platform.openai.com/api-keys'
                : 'https://console.anthropic.com/settings/keys'
            }
            target="_blank"
            rel="noopener noreferrer"
            className={`text-sm underline ${
              isDark ? 'text-emerald-400' : 'text-emerald-600'
            }`}
          >
            Get an API key
          </a>
        </div>
      </div>

      {/* Back button */}
      <button
        onClick={handleBack}
        className={`w-full mt-4 py-2 text-sm ${
          isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-700'
        }`}
      >
        ← Back to Home
      </button>
    </div>
  );

  // Render character selection
  const renderCharacterSelection = () => (
    <div className="max-w-md mx-auto p-4">
      <h2
        className={`text-2xl font-bold mb-6 text-center ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}
      >
        Choose Your Conversation Partner
      </h2>

      <div className="space-y-4">
        {CHARACTERS.map((character) => (
          <button
            key={character.id}
            onClick={() => handleSelectCharacter(character.id)}
            className={`w-full p-4 rounded-xl text-left transition-all ${
              isDark
                ? 'bg-gray-800 hover:bg-gray-700'
                : 'bg-gray-50 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-4">
              <span className="text-4xl">{character.avatar}</span>
              <div>
                <h3
                  className={`font-bold text-lg ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  {character.name}
                </h3>
                <p
                  className={`text-sm ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  {character.description}
                </p>
                <p
                  className={`text-xs mt-1 ${
                    isDark ? 'text-gray-500' : 'text-gray-400'
                  }`}
                >
                  Topics: {character.topics.join(', ')}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Difficulty selection */}
      <div className="mt-6">
        <label
          className={`block text-sm font-medium mb-2 ${
            isDark ? 'text-gray-300' : 'text-gray-700'
          }`}
        >
          Difficulty Level
        </label>
        <div className="flex gap-2">
          {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
            <button
              key={level}
              onClick={() => setDifficulty(level)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium capitalize transition-colors ${
                difficulty === level
                  ? isDark
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-500 text-white'
                  : isDark
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Vocabulary summary */}
      <div
        className={`mt-6 p-4 rounded-xl ${
          isDark ? 'bg-gray-800' : 'bg-gray-50'
        }`}
      >
        <h4
          className={`font-medium text-sm mb-2 ${
            isDark ? 'text-gray-300' : 'text-gray-700'
          }`}
        >
          Your Vocabulary
        </h4>
        <p
          className={`text-xs ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}
        >
          {cards.length > 0
            ? `${knownVocabulary.length} words from ${cards.length} cards will guide the conversation.`
            : 'No cards yet. Basic vocabulary will be used.'}
        </p>
      </div>

      {/* Back button */}
      <button
        onClick={handleBack}
        className={`w-full mt-4 py-2 text-sm ${
          isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-700'
        }`}
      >
        ← Change API Key
      </button>
    </div>
  );

  // Render chat session
  const renderChatSession = () => {
    if (!provider || !selectedCharacter) {
      return null;
    }

    return (
      <div className="h-full flex flex-col">
        {/* Header with back button */}
        <div
          className={`flex items-center gap-2 p-2 ${
            isDark ? 'bg-gray-800' : 'bg-gray-100'
          }`}
        >
          <button
            onClick={handleBack}
            className={`p-2 rounded-lg ${
              isDark
                ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
                : 'text-gray-600 hover:text-gray-700 hover:bg-gray-200'
            }`}
          >
            ←
          </button>
          <span
            className={`text-sm ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} level
          </span>
        </div>

        {/* Chat session */}
        <div className="flex-1 overflow-hidden">
          <ChatSession
            isDark={isDark}
            character={selectedCharacter}
            knownVocabulary={knownVocabulary}
            provider={provider}
            difficultyLevel={difficulty}
            onNewWordLearned={onNewWordLearned}
            onSessionEnd={(messages) => {
              console.log('Session ended with messages:', messages);
              // Could save session history here
            }}
          />
        </div>
      </div>
    );
  };

  // Main render
  return (
    <div
      className={`h-full ${
        isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
      }`}
    >
      {step === 'provider' && renderProviderSetup()}
      {step === 'character' && renderCharacterSelection()}
      {step === 'ready' && renderChatSession()}
    </div>
  );
}
