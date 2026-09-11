import 'dotenv/config';
import express, { Request, Response, NextFunction } from "express";
import cors from 'cors';
import helmet from 'helmet';
import { validateJwtConfig } from './server/lib/jwt';
import { TokenRevocationService } from './server/services/TokenRevocationService';
import { requestLogger } from './server/middleware/requestLogger';
import { logger } from './server/lib/logger';
import { sendError } from './server/lib/response';
import { configureCors } from './server/lib/cors';
import { logDemoModeWarning, validateDemoModeConfig } from './server/services/AuthService';

// Route imports
import authRoutes from './server/routes/auth';
import publicRoutes from './server/routes/public';
import adminRoutes from './server/routes/admin/index';

// Transitional legacy compatibility routes
import userRoutes from './server/routes/users';
import beneficiaryRoutes from './server/routes/beneficiaries';
import programRoutes from './server/routes/programs';
import gadPlanRoutes from './server/routes/gadPlans';
import accomplishmentRoutes from './server/routes/accomplishments';
import dashboardRoutes from './server/routes/dashboard';
import reportRoutes from './server/routes/reports';
import statisticalCatalogRoutes from './server/routes/statisticalCatalog';

export { configureCors };

async function startServer() {
  try {
    validateDemoModeConfig();
    logDemoModeWarning();
  } catch (err: any) {
    logger.error('FATAL_STARTUP_DEMO_MODE_CONFIG_ERROR', err);
    process.exit(1);
    return;
  }

  // Validate critical security & JWT configuration
  try {
    validateJwtConfig();
  } catch (err: any) {
    logger.error('FATAL_STARTUP_JWT_CONFIG_ERROR', err);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }

  // Hydrate durable token revocation store
  try {
    await TokenRevocationService.hydrateFromDatabase();
  } catch (err: any) {
    logger.warn('TOKEN_REVOCATION_HYDRATION_WARNING', { error: err.message });
  }

  const app = express();
  const PORT = 3000;

  // BE-1/BE-2: Trust reverse proxy (1 hop for Cloud Run / Nginx container ingress)
  // Ensures req.ip correctly resolves client IP for rate limiting and logging without header spoofing
  const trustProxyConfig = process.env.TRUST_PROXY ? (
    process.env.TRUST_PROXY === 'true' ? true :
    process.env.TRUST_PROXY === 'false' ? false :
    !isNaN(Number(process.env.TRUST_PROXY)) ? Number(process.env.TRUST_PROXY) :
    process.env.TRUST_PROXY
  ) : 1;
  app.set('trust proxy', trustProxyConfig);

  // BE-2: Security Headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      frameguard: false,
      xContentTypeOptions: true,
      xDnsPrefetchControl: true,
      xDownloadOptions: true,
      xPermittedCrossDomainPolicies: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    })
  );

  // BE-2: Explicit CORS Allowlist (No wildcard with credentials)
  app.use(cors(configureCors()));

  // BE-6: Structured Request Tracing & Logging Middleware
  app.use(requestLogger);

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      system: "TAGAD - Talibon Analytics for Gender and Development",
      version: "2.0.0",
      timestamp: new Date().toISOString(),
    });
  });

  // Canonical Target API Boundaries
  app.use('/api/auth', authRoutes);
  app.use('/api/public', publicRoutes);
  app.use('/api/admin', adminRoutes);

  // Transitional Compatibility Layer (Delegates directly to hardened services)
  app.use('/api/users', userRoutes);
  app.use('/api/beneficiaries', beneficiaryRoutes);
  app.use('/api/programs', programRoutes);
  app.use('/api/gad-plans', gadPlanRoutes);
  app.use('/api/accomplishments', accomplishmentRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/statistical-catalog', statisticalCatalogRoutes);

  // Centralized Error Handling Middleware for API routes (BE-6)
  app.use('/api', (err: any, req: Request, res: Response, next: NextFunction) => {
    logger.error('API_UNHANDLED_ERROR', err, {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: err.statusCode || 500,
    });
    sendError(res, err, err.statusCode || 500);
  });

  app.listen(PORT, "0.0.0.0", () => {
    logger.info('TAGAD_BACKEND_SERVER_STARTED', {
      port: PORT,
      url: `http://localhost:${PORT}`,
      env: process.env.NODE_ENV || 'development',
    });
  });
}

// Only start when executed directly
if (process.env.NODE_ENV !== 'test') {
  startServer();
}
