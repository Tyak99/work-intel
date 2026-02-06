import posthog from 'posthog-js';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

let initialized = false;

export function initAnalytics(): void {
  if (initialized) return;
  if (typeof window === 'undefined') return;
  if (!POSTHOG_KEY) return;

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    autocapture: true,
    capture_pageview: true,
    persistence: 'localStorage+cookie',
  });

  initialized = true;
}

export function trackEvent(event: string, properties?: Record<string, any>): void {
  if (typeof window === 'undefined') return;
  if (!POSTHOG_KEY) return;

  posthog.capture(event, properties);
}

export function identifyUser(userId: string, traits?: Record<string, any>): void {
  if (typeof window === 'undefined') return;
  if (!POSTHOG_KEY) return;

  posthog.identify(userId, traits);
}

export function resetUser(): void {
  if (typeof window === 'undefined') return;
  if (!POSTHOG_KEY) return;

  posthog.reset();
}
