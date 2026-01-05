import { useState } from 'react';

const ONBOARDING_KEY = 'vocabloop_onboarding_complete';

interface OnboardingProps {
  onComplete: () => void;
  isDark: boolean;
}

interface OnboardingStep {
  title: string;
  description: string;
  icon: string;
}

const STEPS: OnboardingStep[] = [
  {
    title: 'Welcome to VocabLoop!',
    description: 'Learn Spanish vocabulary with spaced repetition - the scientifically proven method for long-term memory.',
    icon: '👋',
  },
  {
    title: 'Create Flashcards',
    description: 'Add Spanish words with translations, example sentences, and tags to organize your learning.',
    icon: '📝',
  },
  {
    title: 'Smart Reviews',
    description: 'Review cards at the optimal time. Cards you know well appear less often, while challenging ones repeat more.',
    icon: '🧠',
  },
  {
    title: 'Build Streaks',
    description: 'Practice daily to build your streak. The more consistent you are, the faster you\'ll learn!',
    icon: '🔥',
  },
  {
    title: 'Spanish Tools',
    description: 'Practice verb conjugations, import common words from the Top 500 list, and create fill-in-the-blank cards.',
    icon: '🇪🇸',
  },
];

export function Onboarding({ onComplete, isDark }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      markOnboardingComplete();
      onComplete();
    }
  };

  const handleSkip = () => {
    markOnboardingComplete();
    onComplete();
  };

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-br from-emerald-600 to-teal-700">
      <div
        className={`w-full max-w-md rounded-2xl p-8 text-center shadow-2xl ${
          isDark ? 'bg-gray-800' : 'bg-white'
        }`}
      >
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
          {STEPS.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentStep
                  ? 'w-6 bg-emerald-500'
                  : index < currentStep
                  ? 'bg-emerald-400'
                  : isDark
                  ? 'bg-gray-600'
                  : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="text-6xl mb-4">{step.icon}</div>

        {/* Content */}
        <h2 className={`text-2xl font-bold mb-3 ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
          {step.title}
        </h2>
        <p className={`mb-8 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          {step.description}
        </p>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleNext}
            className="w-full bg-emerald-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            {isLastStep ? 'Get Started' : 'Next'}
          </button>
          {!isLastStep && (
            <button
              onClick={handleSkip}
              className={`w-full py-2 text-sm ${
                isDark ? 'text-gray-500 hover:text-gray-400' : 'text-gray-400 hover:text-gray-500'
              }`}
            >
              Skip tutorial
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Check if onboarding has been completed
export function hasCompletedOnboarding(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === 'true';
}

// Mark onboarding as complete
export function markOnboardingComplete(): void {
  localStorage.setItem(ONBOARDING_KEY, 'true');
}

// Reset onboarding (for testing)
export function resetOnboarding(): void {
  localStorage.removeItem(ONBOARDING_KEY);
}
