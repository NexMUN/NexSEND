#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const path = require('path');

require('ts-node/register/transpile-only');

const { AdminAuthService } = require('../src/modules/admin-auth/admin-auth.service');
const { AdminSessionGuard } = require('../src/modules/admin-auth/admin-session.guard');
const { AdminAuthController } = require('../src/modules/admin-auth/admin-auth.controller');
const { AdminController } = require('../src/modules/admin/admin.controller');

function createConfig(values) {
  return {
    get: (key, defaultValue) =>
      Object.prototype.hasOwnProperty.call(values, key) ? values[key] : defaultValue,
  };
}

function createPrismaMock() {
  const state = {
    users: [],
    sessions: [],
  };

  const adminUser = {
    count: async () => state.users.length,
    create: async ({ data }) => {
      const created = {
        id: `admin-${state.users.length + 1}`,
        email: data.email,
        passwordHash: data.passwordHash,
        isActive: data.isActive ?? true,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      state.users.push(created);
      return created;
    },
    findUnique: async ({ where }) => state.users.find((u) => u.email === where.email || u.id === where.id) || null,
    update: async ({ where, data }) => {
      const user = state.users.find((u) => u.id === where.id);
      if (!user) throw new Error('User not found');
      Object.assign(user, data, { updatedAt: new Date() });
      return user;
    },
  };

  const adminSession = {
    create: async ({ data }) => {
      const created = {
        id: `session-${state.sessions.length + 1}`,
        adminUserId: data.adminUserId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        revokedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      state.sessions.push(created);
      return created;
    },
    findUnique: async ({ where, include }) => {
      const session = state.sessions.find((s) => s.tokenHash === where.tokenHash) || null;
      if (!session) return null;
      if (include?.adminUser) {
        const adminUserRecord = state.users.find((u) => u.id === session.adminUserId) || null;
        return { ...session, adminUser: adminUserRecord };
      }
      return session;
    },
    updateMany: async ({ where, data }) => {
      let count = 0;
      for (const session of state.sessions) {
        if (session.tokenHash === where.tokenHash && session.revokedAt === where.revokedAt) {
          Object.assign(session, data, { updatedAt: new Date() });
          count += 1;
        }
      }
      return { count };
    },
  };

  return {
    state,
    prisma: {
      adminUser,
      adminSession,
      $transaction: async (cb) => cb({ adminUser }),
    },
  };
}

async function verifyAdminAuthLifecycle() {
  const { state, prisma } = createPrismaMock();
  const auth = new AdminAuthService(
    prisma,
    createConfig({
      NODE_ENV: 'production',
      ADMIN_AUTH_COOKIE_NAME: 'admin_session',
      ADMIN_SESSION_TTL_HOURS: 12,
    }),
  );

  assert.strictEqual(await auth.isSetupComplete(), false, 'setup should start as incomplete');

  await auth.setupAdmin('admin@example.com', 'StrongPassword123!');
  assert.strictEqual(state.users.length, 1, 'setup should create one admin');
  assert.strictEqual(await auth.isSetupComplete(), true, 'setup should report complete');

  await assert.rejects(
    () => auth.setupAdmin('another@example.com', 'StrongPassword123!'),
    /Admin setup already completed/,
    'second setup should be rejected',
  );

  const token = await auth.login('admin@example.com', 'StrongPassword123!');
  assert.ok(typeof token === 'string' && token.length > 0, 'login should return session token');

  const validated = await auth.validateSession(token);
  assert.strictEqual(validated.email, 'admin@example.com', 'session should resolve to admin');

  await auth.logout(token);
  await assert.rejects(
    () => auth.validateSession(token),
    /Invalid or expired session/,
    'revoked session should fail validation',
  );
}

async function verifyGuardOriginPolicy() {
  const adminAuthService = {
    getCookieName: () => 'admin_session',
    validateSession: async () => ({
      id: 'admin-1',
      email: 'admin@example.com',
      isActive: true,
      lastLoginAt: null,
    }),
  };

  const guard = new AdminSessionGuard(
    adminAuthService,
    createConfig({
      NODE_ENV: 'production',
      ADMIN_ALLOWED_ORIGINS: '',
      FRONTEND_URL: '',
    }),
  );

  const request = {
    method: 'POST',
    headers: {
      cookie: 'admin_session=test-token',
      origin: 'https://admin.example.com',
    },
  };

  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  };

  await assert.rejects(
    () => guard.canActivate(context),
    /Admin origin allowlist not configured/,
    'production mutating requests should require configured admin origins',
  );
}

async function verifyAdminServiceKeyContractShape() {
  const controller = new AdminController(
    { findAll: async () => ({ data: [], page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrevious: false }) },
    {
      findAll: async () => ({
        serviceKeys: [{ id: '1', serviceId: 'svc_1', name: 'Main Key', isActive: true }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasNext: false, hasPrevious: false },
      }),
    },
    {},
  );

  const result = await controller.getServiceKeys(1, 20);
  assert.ok(Array.isArray(result.data), 'contract should expose service keys under data');
  assert.strictEqual(result.data[0].serviceId, 'svc_1', 'contract should preserve key payload');
  assert.strictEqual(result.page, 1, 'contract should preserve pagination page');
}

function verifyBootstrapSetupTokenPolicy() {
  const authService = {
    isSetupComplete: async () => false,
    setupAdmin: async () => undefined,
    login: async () => 'token',
    getCookieName: () => 'admin_session',
    getCookieOptions: () => ({ httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 1 }),
  };

  const response = {
    cookie: () => undefined,
  };

  const prodNoTokenController = new AdminAuthController(
    authService,
    createConfig({ NODE_ENV: 'production', ADMIN_SETUP_TOKEN: '' }),
  );
  assert.throws(
    () => prodNoTokenController.validateSetupToken(undefined),
    /Admin setup token is not configured/,
    'production setup must require configured bootstrap token',
  );

  const prodTokenController = new AdminAuthController(
    authService,
    createConfig({ NODE_ENV: 'production', ADMIN_SETUP_TOKEN: 'expected-token' }),
  );
  assert.throws(
    () => prodTokenController.validateSetupToken('wrong-token'),
    /Invalid admin setup token/,
    'invalid bootstrap token should be rejected',
  );

  const devController = new AdminAuthController(
    authService,
    createConfig({ NODE_ENV: 'development', ADMIN_SETUP_TOKEN: '' }),
  );
  // Dev mode permits local setup without a configured token.
  assert.doesNotThrow(() => devController.validateSetupToken(undefined));

  return prodTokenController.setup(
    { email: 'admin@example.com', password: 'StrongPassword123!' },
    'expected-token',
    response,
  );
}

function verifyThrottlerGuardWiring() {
  const appModule = fs.readFileSync(path.join(process.cwd(), 'src/app.module.ts'), 'utf8');
  const adminController = fs.readFileSync(
    path.join(process.cwd(), 'src/modules/admin-auth/admin-auth.controller.ts'),
    'utf8',
  );

  assert.match(appModule, /APP_GUARD/, 'APP_GUARD must be registered for throttling');
  assert.match(appModule, /ThrottlerGuard/, 'ThrottlerGuard must be wired globally');
  assert.match(adminController, /@UseGuards\(ThrottlerGuard\)/, 'Admin auth controller must enforce ThrottlerGuard');
}

(async () => {
  await verifyAdminAuthLifecycle();
  await verifyGuardOriginPolicy();
  await verifyAdminServiceKeyContractShape();
  await verifyBootstrapSetupTokenPolicy();
  verifyThrottlerGuardWiring();
  console.log('Admin dashboard readiness verification passed');
})().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
