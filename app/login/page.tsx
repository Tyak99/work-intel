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
              <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: '2s' }} />
            </>
          )}
        </>
      )}

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'hsl(var(--card))',
            color: 'hsl(var(--card-foreground))',
            border: '1px solid hsl(var(--border))',
            backdropFilter: isDark ? 'blur(10px)' : undefined,
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
                  <div className="p-2 rounded bg-[hsl(var(--status-warning-muted))] text-[hsl(var(--status-warning))] border border-[hsl(var(--status-warning)/0.2)] group-hover:border-[hsl(var(--status-warning)/0.4)] transition-colors">
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
                  <div className="p-2 rounded bg-[hsl(var(--status-info-muted))] text-[hsl(var(--status-info))] border border-[hsl(var(--status-info)/0.2)] group-hover:border-[hsl(var(--status-info)/0.4)] transition-colors">
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
                  <div className="p-2 rounded bg-[hsl(var(--status-success-muted))] text-[hsl(var(--status-success))] border border-[hsl(var(--status-success)/0.2)] group-hover:border-[hsl(var(--status-success)/0.4)] transition-colors">
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
                    hasGlowEffects ? 'shadow-glow-md hover:shadow-glow-lg' : 'shadow-md hover:shadow-lg'
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
