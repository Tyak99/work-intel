'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dashboard } from '@/components/dashboard/dashboard';

export default function PersonalPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'founder' | 'not-founder' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;

    async function checkAccess() {
      try {
        const response = await fetch('/api/auth/founder-check', {
          credentials: 'include',
        });

        if (cancelled) return;

        if (!response.ok) {
          // 401 or other error - redirect to home
          router.replace('/');
          return;
        }

        const data = await response.json();

        if (cancelled) return;

        if (data.isFounder) {
          setStatus('founder');
        } else {
          setStatus('not-founder');
          router.replace('/');
        }
      } catch (error) {
        console.error('Error checking founder status:', error);
        if (!cancelled) {
          setStatus('error');
          router.replace('/');
        }
      }
    }

    checkAccess();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // Show loading while checking
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute -inset-1 rounded-full bg-primary/20 blur animate-pulse" />
            <div className="relative h-12 w-12 rounded-full border-2 border-primary/50 border-t-transparent animate-spin" />
          </div>
          <p className="font-mono text-sm text-primary animate-pulse tracking-widest uppercase">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  // Not founder or error - show redirecting message (router.replace already called)
  if (status !== 'founder') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground font-mono">Redirecting...</p>
      </div>
    );
  }

  // Founder - show the personal dashboard
  return <Dashboard />;
}
