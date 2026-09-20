import { isDatabaseConnected } from './server/lib/prisma';
import './server/instrument';
import 'dotenv/config';
import express, { Request, Response, NextFunction } from "express";
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { validateJwtConfig } from './server/lib/jwt';
import { TokenRevocationService } from './server/services/TokenRevocationService';
import { requestLogger } from './server/middleware/requestLogger';
import { logger } from './server/lib/logger';
import { sendError } from './server/lib/response';
import { configureCors } from './server/lib/cors';
import { parseTrustProxy } from './server/lib/trustProxy';
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
  const PORT = Number(process.env.PORT || 3000);
  if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) throw new Error('PORT must be an integer from 1 to 65535');

  app.set('trust proxy', parseTrustProxy());

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

  // Readiness is distinct from liveness: never route authenticated traffic
  // before database connectivity and durable revocation state are available.
  app.get('/api/ready', (_req, res) => {
    const ready = isDatabaseConnected() && TokenRevocationService.isReady();
    res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'not_ready' });
  });

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

  // 404 fallback for undefined API routes
  app.all('/api/*', (req: Request, res: Response) => {
    res.status(404).json({ error: 'Endpoint not found', path: req.originalUrl });
  });

  // Frontend integration: Serve React SPA via Vite middleware in dev, static files in production test
  const frontendDir = path.resolve(process.cwd(), 'frontend');
  const distPath = path.resolve(frontendDir, 'dist');

  if (process.env.NODE_ENV !== 'production' && !process.env.SERVE_STATIC) {
    try {
      const viteModuleName = 'vite';
      const { createServer: createViteServer } = (await import(viteModuleName)) as any;
      const vite = await createViteServer({
        root: frontendDir,
        configFile: path.resolve(frontendDir, 'vite.config.ts'),
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      logger.info('VITE_MIDDLEWARE_ATTACHED', { root: frontendDir });
    } catch (err: any) {
      logger.warn('VITE_MIDDLEWARE_ATTACH_FAILED', { error: err.message });
      if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
        app.get('*', (_req: Request, res: Response) => {
          res.sendFile(path.join(distPath, 'index.html'));
        });
      }
    }
  } else {
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

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
