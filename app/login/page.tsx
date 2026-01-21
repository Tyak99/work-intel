'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Sparkles, Shield, Zap } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check for error messages from OAuth callback
    const error = searchParams.get('error');
    if (error) {
      toast.error(decodeURIComponent(error));
    }
  }, [searchParams]);

  const handleSignIn = () => {
    // Redirect to Nylas OAuth initiation
    window.location.href = '/api/auth/nylas/initiate';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center px-4">
      <Toaster position="top-right" />

      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-10 w-10 text-indigo-500" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Work Intel
            </h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Your AI-powered work intelligence dashboard
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8">
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Zap className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-slate-900 dark:text-white">Daily AI Briefs</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Get synthesized insights from GitHub, Jira, Gmail, and Calendar
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-purple-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-slate-900 dark:text-white">Smart Actions</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    AI-drafted email replies, PR nudges, and meeting prep
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-slate-900 dark:text-white">Secure & Private</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Read-only access to your accounts, data stays private
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={handleSignIn}
                className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
              >
                <Mail className="h-5 w-5" />
                Sign in with Gmail
              </button>

              <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-4">
                By signing in, you agree to grant read-only access to your Gmail and Calendar
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
          No account needed - just sign in with Google
        </p>
      </div>
    </div>
  );
}
