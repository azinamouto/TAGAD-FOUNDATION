import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { DatabaseConnectionMonitor } from './databaseConnectionMonitor';
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL || 'postgresql://postgres:postgres@localhost:5432/tagad?schema=public';
}
const prisma = new PrismaClient({ log: [] });
const monitor = new DatabaseConnectionMonitor(() => prisma.$queryRaw`SELECT 1`);
export async function testDatabaseConnection(): Promise<boolean> { return monitor.check(); }
export function isDatabaseConnected(): boolean { return monitor.connected; }
/** Explicit test fixture override; also cancels scheduled background probes. */
export function setDatabaseConnected(connected: boolean): void { monitor.stop(); monitor.connected = connected; }
export function stopDatabaseConnectionMonitor(): void { monitor.stop(); }
// NODE_TEST_CONTEXT is set by Node's isolated test runner. Qualification scripts
// explicitly call testDatabaseConnection against their disposable PostgreSQL DB.
if (!process.env.NODE_TEST_CONTEXT && process.env.DATABASE_PROBE_DISABLED !== 'true') {
  void testDatabaseConnection();
}
export default prisma;
