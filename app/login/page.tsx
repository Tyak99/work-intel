'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Sparkles, Shield, Zap, Activity } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/theme-provider';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, isDark, hasGlowEffects, hasAnimations } = useTheme();

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
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects - only for dark/future theme */}
      {isDark && (
        <>
          <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />
          {hasAnimations && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-scan-line opacity-50 pointer-events-none" />
          )}
          {hasGlowEffects && (
            <>
              <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] animate-pulse-glow" />
              <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: '2s' }} />
            </>
          )}
        </>
      )}

      <Toaster
        position="top-right"
        toastOptions={{
          style: isDark ? {
            background: '#0f172a',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
          } : {
            background: '#fff',
            color: '#0f172a',
            border: '1px solid #e2e8f0',
          }
        }}
      />

      <div className="max-w-md w-full relative z-10">
        <div className="mb-10 text-center relative group">
          <div className={`inline-flex items-center justify-center p-4 rounded-2xl border mb-6 relative overflow-hidden transition-colors ${
            isDark
              ? 'bg-black/40 border-primary/20 shadow-glow-md group-hover:border-primary/40'
              : 'bg-primary/10 border-primary/20 shadow-md group-hover:border-primary/40'
          }`}>
            {isDark && <div className="absolute inset-0 bg-primary/10 animate-pulse" />}
            <Activity className="h-10 w-10 text-primary relative z-10" />
          </div>

          <h1 className="text-4xl font-display font-bold text-foreground mb-2">
            {t('appName')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('appTagline')}
          </p>
        </div>

        <div className={`glass-panel p-1 relative overflow-hidden rounded-2xl ${isDark ? 'border-white/10' : 'border-border'}`}>
          {isDark && <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />}

          <div className={`rounded-xl p-8 border ${isDark ? 'bg-black/40 backdrop-blur-sm border-white/5' : 'bg-card border-border'}`}>
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-start gap-4 group">
                  <div className="p-2 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20 group-hover:border-amber-500/40 transition-colors">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground">Daily Briefs</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      AI-powered summaries from Jira, GitHub, and email
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 group">
                  <div className="p-2 rounded bg-purple-500/10 text-purple-600 border border-purple-500/20 group-hover:border-purple-500/40 transition-colors">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground">Smart Actions</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      AI-drafted replies, PR nudges, and meeting prep
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 group">
                  <div className="p-2 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 group-hover:border-emerald-500/40 transition-colors">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground">Secure & Private</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Read-only access. Your data stays private.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-border">
                <Button
                  onClick={handleSignIn}
                  className={`w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-all ${
                    hasGlowEffects ? 'shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]' : 'shadow-md hover:shadow-lg'
                  }`}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {t('loginButton')}
                </Button>

                <p className="text-[10px] text-center text-muted-foreground mt-4">
                  {t('loginDisclaimer')}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-[10px] text-muted-foreground">
            {t('loginFooter')}
          </p>
        </div>
      </div>
    </div>
  );
}
