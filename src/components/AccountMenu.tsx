import { useState } from 'react';
import { signOut } from '../utils/auth';

interface AccountMenuProps {
  email: string;
  isDark: boolean;
  onSignOut: () => void;
}

export function AccountMenu({ email, isDark, onSignOut }: AccountMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
    setIsOpen(false);
    onSignOut();
  };

  // Truncate email for display
  const displayEmail = email.length > 20 ? email.slice(0, 17) + '...' : email;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
          isDark
            ? 'hover:bg-gray-700 text-gray-300'
            : 'hover:bg-gray-100 text-gray-600'
        }`}
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          isDark ? 'bg-emerald-600 text-white' : 'bg-emerald-500 text-white'
        }`}>
          {email.charAt(0).toUpperCase()}
        </div>
        <span className="text-sm hidden sm:block">{displayEmail}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop to close menu */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown menu */}
          <div
            className={`absolute right-0 mt-2 w-64 rounded-xl shadow-lg z-20 overflow-hidden ${
              isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}
          >
            <div className={`px-4 py-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <p className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                Signed in as
              </p>
              <p className={`text-sm truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {email}
              </p>
            </div>

            <div className="py-2">
              <div className={`px-4 py-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <div className="flex items-center gap-2 text-sm">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Cloud sync enabled
                </div>
              </div>

              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2 ${
                  signingOut
                    ? 'opacity-50 cursor-not-allowed'
                    : isDark
                      ? 'text-gray-300 hover:bg-gray-700'
                      : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {signingOut ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Signing out...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    Sign out
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
