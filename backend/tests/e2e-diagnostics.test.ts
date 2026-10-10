import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { sanitizeFailureMessage, serviceDiagnostics } = require('../scripts/e2e-diagnostics.cjs');

describe('Browser E2E failure diagnostics', () => {
  it('preserves useful module and browser startup errors', () => {
    expect(sanitizeFailureMessage("Error: Cannot find module '@prisma/client'\n at server.ts:3"))
      .toBe("Error: Cannot find module '@prisma/client'\n at server.ts:3");
    expect(sanitizeFailureMessage("browserType.launch: Executable doesn't exist at /tmp/chromium"))
      .toContain("Executable doesn't exist");
  });

  it('removes database credentials and signed navigation URLs while preserving error codes', () => {
    const message = 'page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:3101/return?vnp_SecureHash=signed-value\n'
      + 'Connection failed at mysql://account:db-secret@localhost:3306/cinema_test';
    const result = sanitizeFailureMessage(message);
    expect(result).toContain('ERR_CONNECTION_REFUSED');
    for (const secret of ['http://', 'mysql://', 'account', 'db-secret', 'signed-value', 'vnp_SecureHash']) {
      expect(result).not.toContain(secret);
    }
  });

  it('removes known environment secrets including encoded values and standalone URL credentials', () => {
    const result = sanitizeFailureMessage('provider rejected plain-secret and s3cr%24et%402026; user account used db-secret', {
      JWT_ACCESS_SECRET: 'plain-secret', VNPAY_HASH_SECRET: 's3cr$et@2026',
      DATABASE_URL: 'mysql://account:db-secret@localhost:3306/cinema_test',
    });
    expect(result).toContain('provider rejected');
    for (const secret of ['plain-secret', 's3cr%24et%402026', 'account', 'db-secret']) expect(result).not.toContain(secret);
  });

  it('omits cookie, bearer and token fields from multi-line error messages', () => {
    const result = sanitizeFailureMessage('Request failed\nSet-Cookie: refreshToken=refresh-value; HttpOnly\n'
      + 'Authorization: Bearer bearer-value\n{"accessToken":"access-value"}\nVNPAY_HASH_SECRET=gateway-value');
    expect(result).toContain('Request failed');
    for (const secret of ['refresh-value', 'bearer-value', 'access-value', 'gateway-value']) expect(result).not.toContain(secret);
  });

  it('omits multi-line sensitive field values and escaped connection URLs', () => {
    const result = sanitizeFailureMessage('Request failed\n"accessToken":\n"private-multiline-value"\nend of response');
    expect(result).toContain('Request failed');
    expect(result).not.toContain('private-multiline-value');
    const escapedUrl = sanitizeFailureMessage('Connection failed at mysql:\\/\\/user1:p4ss!@localhost:3306/cinema_test');
    expect(escapedUrl).toContain('Connection failed');
    expect(escapedUrl).not.toContain('user1');
    expect(escapedUrl).not.toContain('p4ss!');
  });

  it('redacts malformed Unicode environment secrets without aborting diagnostics', () => {
    expect(sanitizeFailureMessage('Failed with private-\ud800-value', { JWT_ACCESS_SECRET: 'private-\ud800-value' }))
      .not.toContain('private-');
  });

  it('removes unlabelled JWTs and long random token or signature values', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJleGFtcGxlIn0.abcdefghijklmno';
    const result = sanitizeFailureMessage(`Failed with ${jwt} or ${'a1'.repeat(32)}`);
    expect(result).toContain('Failed with');
    expect(result).not.toContain(jwt);
    expect(result).not.toContain('a1'.repeat(32));
  });

  it('bounds terminal and report messages after redaction and removes ANSI escapes', () => {
    const result = sanitizeFailureMessage(`\u001b[31m${'x'.repeat(3000)} private-value\u001b[0m`, { JWT_ACCESS_SECRET: 'private-value' });
    expect(result.length).toBeLessThanOrEqual(2000);
    expect(result).not.toContain('private-value');
    expect(result).not.toContain('\u001b');
  });

  it('records safe service failure metadata even when no browser exists', () => {
    const result = serviceDiagnostics({ label: 'Backend', ready: false,
      child: { exitCode: 1, signalCode: null },
      spawnError: { code: 'ENOENT', message: 'spawn mysql://account:db-secret@localhost' },
      output: "Error: Cannot find module '@prisma/client'\nECONNREFUSED with private-value",
    });
    expect(result).toMatchObject({ label: 'Backend', state: 'SPAWN_ERROR', ready: false,
      exitCode: 1, signalCode: null, spawnError: { code: 'ENOENT' },
      detectedIssues: ['MODULE_NOT_FOUND', 'ECONNREFUSED'],
    });
    const serialized = JSON.stringify(result);
    for (const secret of ['mysql://', 'account', 'db-secret', 'private-value', '@prisma/client']) expect(serialized).not.toContain(secret);
  });

  it('reports a ready running service and its bounded capture size without copying output', () => {
    const result = serviceDiagnostics({ label: 'Frontend', ready: true,
      child: { exitCode: null, signalCode: null }, spawnError: null, output: 'Listening with secret-value',
    });
    expect(result).toMatchObject({ label: 'Frontend', state: 'RUNNING', ready: true,
      exitCode: null, signalCode: null, spawnError: null, detectedIssues: [], capturedOutputCharacters: 27,
    });
    expect(JSON.stringify(result)).not.toContain('secret-value');
  });
});
