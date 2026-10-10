import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

function configure(source: string, target?: string) {
  return spawnSync(process.execPath, ['-e', "try { const result = require('./scripts/test-environment.cjs').configureTestEnvironment(); console.log(result.database); } catch { process.exitCode = 1; }"], {
    cwd: process.cwd(), encoding: 'utf8',
    env: { ...process.env, DATABASE_URL: source, TEST_DATABASE_URL: target || '', TEST_SOURCE_DATABASE_URL: '' },
  });
}

describe('Disposable test database safeguards', () => {
  it('derives a different database name without touching MySQL', () => {
    const result = configure('mysql://test:password@127.0.0.1:3306/fixture_dev');
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe('fixture_dev_test');
  });

  it('accepts an explicitly separate test target', () => {
    const result = configure('mysql://test:password@localhost:3306/fixture_dev', 'mysql://test:password@localhost:3306/fixture_ci_test');
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe('fixture_ci_test');
  });

  it('can configure a CI target twice without a development env file', () => {
    const result = spawnSync(process.execPath, ['-e', "const { configureTestEnvironment } = require('./scripts/test-environment.cjs'); configureTestEnvironment(); console.log(configureTestEnvironment().database);"], {
      cwd: process.cwd(), encoding: 'utf8',
      env: { ...process.env, DATABASE_URL: '', TEST_SOURCE_DATABASE_URL: '', TEST_DATABASE_URL: 'mysql://test:password@127.0.0.1:3306/fixture_ci_test' },
    });
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe('fixture_ci_test');
  });

  it('preserves the source boundary in a child process after CI configuration', () => {
    const child = "console.log(require('./scripts/test-environment.cjs').configureTestEnvironment().database);";
    const script = `require('./scripts/test-environment.cjs').configureTestEnvironment(); const child = require('node:child_process').spawnSync(process.execPath, ['-e', ${JSON.stringify(child)}], { encoding: 'utf8', env: process.env }); process.stdout.write(child.stdout); process.exitCode = child.status;`;
    const result = spawnSync(process.execPath, ['-e', script], {
      cwd: process.cwd(), encoding: 'utf8',
      env: { ...process.env, DATABASE_URL: '', TEST_SOURCE_DATABASE_URL: '', TEST_DATABASE_URL: 'mysql://test:password@127.0.0.1:3306/fixture_ci_test' },
    });
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe('fixture_ci_test');
  });

  it('still refuses switching a configured test target back to the source database', () => {
    const script = "const { configureTestEnvironment } = require('./scripts/test-environment.cjs'); configureTestEnvironment(); process.env.TEST_DATABASE_URL = process.env.TEST_SOURCE_DATABASE_URL; try { configureTestEnvironment(); process.exitCode = 2; } catch { console.log('refused'); }";
    const result = spawnSync(process.execPath, ['-e', script], {
      cwd: process.cwd(), encoding: 'utf8',
      env: { ...process.env, DATABASE_URL: 'mysql://test:password@127.0.0.1:3306/source_test', TEST_SOURCE_DATABASE_URL: '', TEST_DATABASE_URL: 'mysql://test:password@127.0.0.1:3306/fixture_ci_test' },
    });
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe('refused');
  });

  it.each([
    'mysql://test:password@127.0.0.1:3306/fixture_test',
    'mysql://test:password@localhost:3306/fixture_test',
    'mysql://another:other-password@remote.example.test:3306/fixture_test',
    'mysql://test:password@127.0.0.1:3306/%66ixture_test',
  ])('refuses a target with the development database name: %s', (target) => {
    expect(configure('mysql://test:password@127.0.0.1:3306/fixture_test', target).status).toBe(1);
  });

  it.each(['mysql://test:password@localhost:3306/fixture_dev', 'mysql://test:password@localhost:3306/unsafe%60_test', 'postgresql://test:password@localhost:5432/fixture_test'])(
    'refuses a non-disposable or unsafe target: %s', (target) => {
      expect(configure('mysql://test:password@localhost:3306/fixture_dev', target).status).toBe(1);
    },
  );
});
