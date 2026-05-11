import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV || 'production',
  tracesSampleRate: 0.1,
  // Evita inyectar headers baggage/sentry-trace en requests al backend propio
  // (el backend necesitaría tener Sentry configurado para recibirlos)
  tracePropagationTargets: [],
  replaysOnErrorSampleRate: 1.0,
  integrations: [new Sentry.Replay({ maskAllText: false, blockAllMedia: false })],
});

if (typeof window !== 'undefined') window.Sentry = Sentry;
