import type { GameCard } from './types.js';

// Card pool for multiplayer games
// Each card has Spanish word and multiple accepted English translations
const CARD_POOL: Omit<GameCard, 'index'>[] = [
  { spanish: 'casa', english: ['house', 'home'] },
  { spanish: 'perro', english: ['dog'] },
  { spanish: 'gato', english: ['cat'] },
  { spanish: 'agua', english: ['water'] },
  { spanish: 'comida', english: ['food', 'meal'] },
  { spanish: 'libro', english: ['book'] },
  { spanish: 'mesa', english: ['table'] },
  { spanish: 'silla', english: ['chair'] },
  { spanish: 'puerta', english: ['door'] },
  { spanish: 'ventana', english: ['window'] },
  { spanish: 'coche', english: ['car', 'automobile'] },
  { spanish: 'tiempo', english: ['time', 'weather'] },
  { spanish: 'trabajo', english: ['work', 'job'] },
  { spanish: 'escuela', english: ['school'] },
  { spanish: 'amigo', english: ['friend'] },
  { spanish: 'familia', english: ['family'] },
  { spanish: 'ciudad', english: ['city'] },
  { spanish: 'pais', english: ['country'] },
  { spanish: 'mundo', english: ['world'] },
  { spanish: 'vida', english: ['life'] },
  { spanish: 'mano', english: ['hand'] },
  { spanish: 'ojo', english: ['eye'] },
  { spanish: 'cabeza', english: ['head'] },
  { spanish: 'cuerpo', english: ['body'] },
  { spanish: 'dia', english: ['day'] },
  { spanish: 'noche', english: ['night'] },
  { spanish: 'sol', english: ['sun'] },
  { spanish: 'luna', english: ['moon'] },
  { spanish: 'dinero', english: ['money'] },
  { spanish: 'calle', english: ['street'] },
  { spanish: 'tienda', english: ['store', 'shop'] },
  { spanish: 'restaurante', english: ['restaurant'] },
  { spanish: 'playa', english: ['beach'] },
  { spanish: 'montaña', english: ['mountain'] },
  { spanish: 'rio', english: ['river'] },
  { spanish: 'arbol', english: ['tree'] },
  { spanish: 'flor', english: ['flower'] },
  { spanish: 'animal', english: ['animal'] },
  { spanish: 'pajaro', english: ['bird'] },
  { spanish: 'pez', english: ['fish'] },
  { spanish: 'grande', english: ['big', 'large'] },
  { spanish: 'pequeño', english: ['small', 'little'] },
  { spanish: 'nuevo', english: ['new'] },
  { spanish: 'viejo', english: ['old'] },
  { spanish: 'bueno', english: ['good'] },
  { spanish: 'malo', english: ['bad'] },
  { spanish: 'facil', english: ['easy'] },
  { spanish: 'dificil', english: ['difficult', 'hard'] },
  { spanish: 'feliz', english: ['happy'] },
  { spanish: 'triste', english: ['sad'] },
  { spanish: 'rapido', english: ['fast', 'quick'] },
  { spanish: 'lento', english: ['slow'] },
  { spanish: 'caliente', english: ['hot'] },
  { spanish: 'frio', english: ['cold'] },
  { spanish: 'comer', english: ['to eat', 'eat'] },
  { spanish: 'beber', english: ['to drink', 'drink'] },
  { spanish: 'dormir', english: ['to sleep', 'sleep'] },
  { spanish: 'hablar', english: ['to speak', 'speak', 'to talk', 'talk'] },
  { spanish: 'escribir', english: ['to write', 'write'] },
  { spanish: 'leer', english: ['to read', 'read'] },
  { spanish: 'correr', english: ['to run', 'run'] },
  { spanish: 'caminar', english: ['to walk', 'walk'] },
  { spanish: 'trabajar', english: ['to work', 'work'] },
  { spanish: 'estudiar', english: ['to study', 'study'] },
  { spanish: 'aprender', english: ['to learn', 'learn'] },
  { spanish: 'enseñar', english: ['to teach', 'teach'] },
  { spanish: 'comprar', english: ['to buy', 'buy'] },
  { spanish: 'vender', english: ['to sell', 'sell'] },
  { spanish: 'cocinar', english: ['to cook', 'cook'] },
  { spanish: 'bailar', english: ['to dance', 'dance'] },
  { spanish: 'cantar', english: ['to sing', 'sing'] },
  { spanish: 'jugar', english: ['to play', 'play'] },
  { spanish: 'pensar', english: ['to think', 'think'] },
  { spanish: 'sentir', english: ['to feel', 'feel'] },
  { spanish: 'querer', english: ['to want', 'want', 'to love', 'love'] },
  { spanish: 'poder', english: ['to be able', 'can'] },
  { spanish: 'saber', english: ['to know', 'know'] },
  { spanish: 'conocer', english: ['to know', 'to meet', 'know', 'meet'] },
  { spanish: 'ver', english: ['to see', 'see'] },
  { spanish: 'oir', english: ['to hear', 'hear'] },
];

/**
 * Shuffle an array using Fisher-Yates algorithm
 */
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Get a random selection of cards for a game
 */
export function getGameCards(count: number): GameCard[] {
  const shuffled = shuffle(CARD_POOL);
  return shuffled.slice(0, Math.min(count, shuffled.length)).map((card, index) => ({
    ...card,
    index,
  }));
}

/**
 * Check if an answer is correct for a card
 */
export function isAnswerCorrect(card: GameCard, answer: string): boolean {
  const normalizedAnswer = answer.toLowerCase().trim();
  return card.english.some(
    (eng) => eng.toLowerCase() === normalizedAnswer
  );
}
