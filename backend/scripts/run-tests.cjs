const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');
const { configureTestEnvironment } = require('./test-environment.cjs');

function run(entry, args) {
  const script = entry === 'vitest' ? path.join(path.dirname(require.resolve('vitest/package.json')), 'vitest.mjs') : require.resolve(entry);
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: path.resolve(__dirname, '..'), env: process.env, stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

async function main() {
  const { url, database } = configureTestEnvironment();
  // The identifier is allowlisted above; no user SQL or development table is reset.
  const adminUrl = new URL(url);
  adminUrl.pathname = '/mysql';
  const admin = new PrismaClient({ datasources: { db: { url: adminUrl.toString() } } });
  try {
    await admin.$executeRawUnsafe(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  } finally {
    await admin.$disconnect();
  }
  console.log(`Preparing isolated database: ${database}`);
  run('prisma/build/index.js', ['db', 'push', '--force-reset', '--skip-generate']);
  const fs = require('node:fs');
  const client = new PrismaClient();
  try {
    const sql = fs.readFileSync(path.resolve(__dirname, '../prisma/constraints.sql'), 'utf8');
    for (const statement of sql.replace(/--[^\n]*/g, '').split(';').map(s => s.trim()).filter(Boolean)) {
      await client.$executeRawUnsafe(statement);
    }
  } finally {
    await client.$disconnect();
  }
  run('tsx/cli', ['prisma/seed.ts']);
  run('vitest', ['run', ...process.argv.slice(2)]);
}
main().catch(() => {
  console.error('Unable to prepare the isolated test database. Check TEST_DATABASE_URL and MySQL permissions. No development database was reset.');
  process.exitCode = 1;
});
