# Backend error tracking

Set backend-only `SENTRY_DSN` to an operator-managed Sentry project DSN and
`SENTRY_RELEASE` to the deployed Git commit. Without a DSN, telemetry is disabled.
The SDK initializes before the Express application starts. Central `sendError`
reports 5xx errors, including errors caught in controllers; uncaught exceptions
and unhandled rejections use SDK handlers. Validation/authentication 4xx errors
are not reported. Tracing is disabled.

Events use an allowlist: error category and stack locations, environment and
release. Raw messages, requests, headers, cookies, user context, breadcrumbs,
variables and SQL parameter values are excluded. The test uses an in-process
Sentry transport and asserts a real Express 5xx is captured without synthetic
private values. It sends nothing to an external service.

Operator activation: configure DSN/release, trigger a controlled synthetic error
in staging, confirm the event appears with the expected release, then configure
an issue alert for new errors and a sustained 5xx threshold. No test-error route
is exposed by the deployed application. Production delivery and alert routing
remain unverified until the operator supplies a project and validates delivery.

Reference: [Sentry Node SDK](https://github.com/getsentry/sentry-javascript/tree/develop/packages/node).
