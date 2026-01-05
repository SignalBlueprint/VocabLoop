import { useState, useEffect } from 'react';

interface DailyWord {
  spanish: string;
  english: string;
  example: string;
  exampleTranslation: string;
  category: string;
}

// Curated list of interesting words - cycles through based on day of year
const DAILY_WORDS: DailyWord[] = [
  {
    spanish: "madrugada",
    english: "early morning / dawn",
    example: "Me desperté en la madrugada.",
    exampleTranslation: "I woke up at dawn.",
    category: "time"
  },
  {
    spanish: "estrenar",
    english: "to use/wear for the first time",
    example: "Voy a estrenar mis zapatos nuevos.",
    exampleTranslation: "I'm going to wear my new shoes for the first time.",
    category: "verbs"
  },
  {
    spanish: "sobremesa",
    english: "time spent chatting after a meal",
    example: "Disfrutamos de una larga sobremesa.",
    exampleTranslation: "We enjoyed a long after-meal chat.",
    category: "culture"
  },
  {
    spanish: "aprovechar",
    english: "to take advantage of / make the most of",
    example: "Hay que aprovechar el buen tiempo.",
    exampleTranslation: "We should make the most of the good weather.",
    category: "verbs"
  },
  {
    spanish: "tutear",
    english: "to address someone as 'tú' (informal you)",
    example: "¿Puedo tutearte?",
    exampleTranslation: "Can I address you informally?",
    category: "culture"
  },
  {
    spanish: "merienda",
    english: "afternoon snack",
    example: "Los niños toman la merienda a las cinco.",
    exampleTranslation: "The children have their afternoon snack at five.",
    category: "food"
  },
  {
    spanish: "madrugar",
    english: "to wake up very early",
    example: "Tengo que madrugar mañana.",
    exampleTranslation: "I have to wake up very early tomorrow.",
    category: "verbs"
  },
  {
    spanish: "empalagar",
    english: "to be too sweet / sickeningly sweet",
    example: "Este pastel me empalaga.",
    exampleTranslation: "This cake is too sweet for me.",
    category: "food"
  },
  {
    spanish: "trasnochar",
    english: "to stay up very late",
    example: "No me gusta trasnochar entre semana.",
    exampleTranslation: "I don't like staying up late on weekdays.",
    category: "verbs"
  },
  {
    spanish: "antojarse",
    english: "to crave / to fancy",
    example: "Se me antoja un helado.",
    exampleTranslation: "I'm craving an ice cream.",
    category: "verbs"
  },
  {
    spanish: "entrañable",
    english: "endearing / heartwarming",
    example: "Es una película muy entrañable.",
    exampleTranslation: "It's a very heartwarming movie.",
    category: "adjectives"
  },
  {
    spanish: "desvelarse",
    english: "to stay awake / to lose sleep over",
    example: "Me desvelé estudiando para el examen.",
    exampleTranslation: "I stayed up all night studying for the exam.",
    category: "verbs"
  },
  {
    spanish: "quisquilloso",
    english: "picky / fussy",
    example: "Mi hijo es muy quisquilloso con la comida.",
    exampleTranslation: "My son is very picky about food.",
    category: "adjectives"
  },
  {
    spanish: "friolero",
    english: "someone who gets cold easily",
    example: "Soy muy friolero, siempre llevo chaqueta.",
    exampleTranslation: "I get cold easily, I always wear a jacket.",
    category: "adjectives"
  },
  {
    spanish: "encantar",
    english: "to love / to enchant",
    example: "Me encanta la música.",
    exampleTranslation: "I love music.",
    category: "verbs"
  },
  {
    spanish: "cotidiano",
    english: "daily / everyday",
    example: "Es parte de mi vida cotidiana.",
    exampleTranslation: "It's part of my daily life.",
    category: "adjectives"
  },
  {
    spanish: "madrileño",
    english: "from Madrid",
    example: "El acento madrileño es distintivo.",
    exampleTranslation: "The Madrid accent is distinctive.",
    category: "demonyms"
  },
  {
    spanish: "atardecer",
    english: "dusk / late afternoon",
    example: "El atardecer en la playa es hermoso.",
    exampleTranslation: "The sunset at the beach is beautiful.",
    category: "time"
  },
  {
    spanish: "anochecer",
    english: "nightfall / to get dark",
    example: "Llegamos al anochecer.",
    exampleTranslation: "We arrived at nightfall.",
    category: "time"
  },
  {
    spanish: "aguafiestas",
    english: "party pooper / killjoy",
    example: "No seas aguafiestas.",
    exampleTranslation: "Don't be a party pooper.",
    category: "expressions"
  },
  {
    spanish: "cumpleaños",
    english: "birthday",
    example: "¡Feliz cumpleaños!",
    exampleTranslation: "Happy birthday!",
    category: "celebrations"
  },
  {
    spanish: "cualquier",
    english: "any / whatever",
    example: "Puedes venir cualquier día.",
    exampleTranslation: "You can come any day.",
    category: "pronouns"
  },
  {
    spanish: "merendar",
    english: "to have an afternoon snack",
    example: "Vamos a merendar al parque.",
    exampleTranslation: "Let's have a snack at the park.",
    category: "verbs"
  },
  {
    spanish: "resaca",
    english: "hangover",
    example: "Tengo una resaca terrible.",
    exampleTranslation: "I have a terrible hangover.",
    category: "expressions"
  },
  {
    spanish: "empacharse",
    english: "to get an upset stomach from overeating",
    example: "Me empaché con tanto dulce.",
    exampleTranslation: "I got a stomachache from so many sweets.",
    category: "verbs"
  },
  {
    spanish: "bromear",
    english: "to joke around",
    example: "Solo estoy bromeando.",
    exampleTranslation: "I'm just joking.",
    category: "verbs"
  },
  {
    spanish: "butaca",
    english: "armchair / theater seat",
    example: "Prefiero las butacas del centro.",
    exampleTranslation: "I prefer the center seats.",
    category: "furniture"
  },
  {
    spanish: "susurrar",
    english: "to whisper",
    example: "Me susurró un secreto.",
    exampleTranslation: "She whispered a secret to me.",
    category: "verbs"
  },
  {
    spanish: "carcajada",
    english: "burst of laughter",
    example: "Soltó una carcajada.",
    exampleTranslation: "She burst out laughing.",
    category: "expressions"
  },
  {
    spanish: "madrugador",
    english: "early riser",
    example: "Soy muy madrugador.",
    exampleTranslation: "I'm an early riser.",
    category: "adjectives"
  }
];

function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

interface WordOfTheDayProps {
  isDark: boolean;
}

export function WordOfTheDay({ isDark }: WordOfTheDayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [word, setWord] = useState<DailyWord | null>(null);

  useEffect(() => {
    const dayOfYear = getDayOfYear();
    const wordIndex = dayOfYear % DAILY_WORDS.length;
    setWord(DAILY_WORDS[wordIndex]);
  }, []);

  if (!word) return null;

  return (
    <div className={`rounded-xl p-4 ${isDark ? 'bg-gradient-to-r from-purple-900/50 to-indigo-900/50 border border-purple-700/30' : 'bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">💡</span>
          <span className={`text-xs font-medium uppercase tracking-wide ${isDark ? 'text-purple-300' : 'text-purple-600'}`}>
            Word of the Day
          </span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-purple-800/50 text-purple-300' : 'bg-purple-100 text-purple-600'}`}>
          {word.category}
        </span>
      </div>

      <div className="mb-2">
        <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {word.spanish}
        </p>
        <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          {word.english}
        </p>
      </div>

      {isExpanded && (
        <div className={`mt-3 pt-3 border-t ${isDark ? 'border-purple-700/30' : 'border-purple-200'}`}>
          <p className={`text-sm italic ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            "{word.example}"
          </p>
          <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {word.exampleTranslation}
          </p>
        </div>
      )}

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`mt-2 text-xs font-medium ${isDark ? 'text-purple-400 hover:text-purple-300' : 'text-purple-600 hover:text-purple-700'}`}
      >
        {isExpanded ? 'Show less' : 'Show example'}
      </button>
    </div>
  );
}
