import type * as Sentry from '@sentry/node';
let sdk: typeof import('@sentry/node') | null = null;

/** Allowlist telemetry fields: never transmit request/user data or error text. */
export function sanitizeErrorEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  return {
    type: undefined, event_id: event.event_id, timestamp: event.timestamp, platform: 'node', level: 'error',
    environment: process.env.NODE_ENV || 'development', release: process.env.SENTRY_RELEASE,
    tags: { component: 'tagad-backend' },
    exception: { values: (event.exception?.values || []).map(exception => ({
      type: ['TypeError', 'RangeError', 'SyntaxError'].includes(exception.type || '') ? exception.type : 'Error',
      value: 'Backend operation failed',
      stacktrace: exception.stacktrace ? { frames: exception.stacktrace.frames?.map(frame => ({
        filename: frame.filename?.replace(/.*[\\/]backend[\\/]/, 'backend/'),
        function: frame.function, lineno: frame.lineno, colno: frame.colno, in_app: frame.in_app,
      })) } : undefined,
    })) },
  };
}

export async function initializeErrorTracking(options: Pick<Sentry.NodeOptions, 'dsn' | 'transport' | 'integrations'> = {}): Promise<boolean> {
  const dsn = options.dsn || process.env.SENTRY_DSN;
  if (!dsn) return false;
  sdk = await import('@sentry/node');
  sdk.init({
    dsn, environment: process.env.NODE_ENV || 'development', release: process.env.SENTRY_RELEASE,
    sendDefaultPii: false, defaultIntegrations: false,
    integrations: options.integrations || [sdk.onUncaughtExceptionIntegration(), sdk.onUnhandledRejectionIntegration()],
    tracesSampleRate: 0, maxBreadcrumbs: 0, beforeSend: sanitizeErrorEvent,
    transport: options.transport,
  });
  return true;
}

export function captureBackendError(error: unknown, status: number): void {
  if (status < 500 || !sdk?.isEnabled()) return;
  sdk.captureException(error instanceof Error ? error : new Error('Backend operation failed'));
}
