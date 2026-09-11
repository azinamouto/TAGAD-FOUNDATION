import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AuthService,
  isDemoModeEnabled,
  validateDemoModeConfig,
} from '../server/services/AuthService';

const demoPasswordEnv = {
  DEMO_MODE: 'true',
  DEMO_SUPER_ADMIN_PASSWORD: 'super-admin-test-password',
  DEMO_ADMIN_PASSWORD: 'admin-test-password',
  DEMO_ENCODER_PASSWORD: 'encoder-test-password',
  DEMO_VIEWER_PASSWORD: 'viewer-test-password',
};

test('demo authentication is disabled unless DEMO_MODE is explicitly true', () => {
  const previous = process.env.DEMO_MODE;
  delete process.env.DEMO_MODE;

  try {
    assert.equal(isDemoModeEnabled(), false);
    assert.equal(AuthService.getDemoUser('admin@talibon.gov.ph'), null);
  } finally {
    if (previous === undefined) delete process.env.DEMO_MODE;
    else process.env.DEMO_MODE = previous;
  }
});

test('demo mode requires all role-specific passwords and authenticates with configured values', async () => {
  const previous = new Map(Object.keys(demoPasswordEnv).map((key) => [key, process.env[key]]));
  Object.entries(demoPasswordEnv).forEach(([key, value]) => {
    process.env[key] = value;
  });

  try {
    validateDemoModeConfig();
    const result = await AuthService.login('admin@talibon.gov.ph', demoPasswordEnv.DEMO_ADMIN_PASSWORD);
    assert.equal(result.user.role, 'ADMIN');
    await assert.rejects(
      () => AuthService.login('admin@talibon.gov.ph', 'not-the-configured-password'),
      (error: any) => error.code === 'INVALID_CREDENTIALS'
    );
  } finally {
    previous.forEach((value, key) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    });
  }
});

test('demo mode configuration fails when a role password is missing', () => {
  const previous = new Map(Object.keys(demoPasswordEnv).map((key) => [key, process.env[key]]));
  Object.entries(demoPasswordEnv).forEach(([key, value]) => {
    process.env[key] = value;
  });
  delete process.env.DEMO_VIEWER_PASSWORD;

  try {
    assert.throws(() => validateDemoModeConfig(), /DEMO_VIEWER_PASSWORD/);
  } finally {
    previous.forEach((value, key) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    });
  }
});