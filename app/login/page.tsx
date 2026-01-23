'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Sparkles, Shield, Zap, Activity } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { Button } from '@/components/ui/button';

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
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background scanline effect */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-scan-line opacity-50 pointer-events-none" />

      {/* Ambient glow blobs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: '2s' }} />

      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: '#0f172a',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
          }
        }}
      />

      <div className="max-w-md w-full relative z-10">
        <div className="mb-10 text-center relative group">
          <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-black/40 border border-primary/20 shadow-glow-md mb-6 relative overflow-hidden group-hover:border-primary/40 transition-colors">
            <div className="absolute inset-0 bg-primary/10 animate-pulse" />
            <Activity className="h-10 w-10 text-primary relative z-10" />
          </div>
          
          <h1 className="text-4xl font-display font-bold text-foreground mb-2 tracking-wide uppercase">
            Work<span className="text-primary text-glow">Intel</span>
          </h1>
          <p className="text-sm font-mono text-muted-foreground uppercase tracking-widest">
            Mission Control System
          </p>
        </div>

        <div className="glass-panel border-white/10 p-1 relative overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
          
          <div className="bg-black/40 rounded-xl p-8 backdrop-blur-sm border border-white/5">
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-start gap-4 group">
                  <div className="p-2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 group-hover:border-amber-500/40 transition-colors">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-sm text-foreground uppercase tracking-wide">Daily Intelligence</h3>
                    <p className="text-xs text-muted-foreground font-mono mt-1">
                      Synthesized data streams from JIRA, GitHub & Comms
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 group">
                  <div className="p-2 rounded bg-purple-500/10 text-purple-500 border border-purple-500/20 group-hover:border-purple-500/40 transition-colors">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-sm text-foreground uppercase tracking-wide">AI Protocols</h3>
                    <p className="text-xs text-muted-foreground font-mono mt-1">
                      Automated drafts for comms and code review
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 group">
                  <div className="p-2 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 group-hover:border-emerald-500/40 transition-colors">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-sm text-foreground uppercase tracking-wide">Secure Access</h3>
                    <p className="text-xs text-muted-foreground font-mono mt-1">
                      Read-only encrypted connection. Private data handling.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/10">
                <Button
                  onClick={handleSignIn}
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-display font-bold tracking-wider uppercase shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Initialize Session
                </Button>

                <p className="text-[10px] text-center text-slate-500 font-mono mt-4 uppercase">
                  Authorization Required • Level 1 Clearance
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">
            System Version 2.0.4 • Status: Nominal
          </p>
        </div>
      </div>
    </div>
  );
}
