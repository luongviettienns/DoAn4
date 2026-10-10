function sanitizeFailureMessage(message, environment = {}) {
  let text = String(message || 'Unknown E2E failure')
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '');
  const secrets = new Set();
  for (const [name, value] of Object.entries(environment)) {
    if (typeof value !== 'string' || !value || !/(?:JWT|VNPAY|DATABASE_URL|PASSWORD|SECRET|TOKEN|COOKIE|(?:^|_)KEY(?:$|_))/i.test(name)) continue;
    secrets.add(value);
    // Drivers sometimes report credentials separately from the connection URL.
    try {
      const url = new URL(value);
      for (const credential of [url.username, url.password]) {
        if (credential) secrets.add(decodeURIComponent(credential));
      }
    } catch { /* Most sensitive environment values are plain strings. */ }
  }
  for (const secret of [...secrets].sort((left, right) => right.length - left.length)) {
    const variants = new Set([secret, JSON.stringify(secret).slice(1, -1)]);
    try { variants.add(encodeURIComponent(secret)); }
    catch { /* A lone Unicode surrogate has no URI encoding; redact its raw value. */ }
    for (const value of variants) {
      text = text.split(value).join('[REDACTED]');
    }
  }
  // Omit every URL, so callback queries and connection credentials never survive.
  text = text.replace(/\\\//g, '/')
    .replace(/\b[a-z][a-z0-9+.-]*:\/\/[^\s<>"']+/gi, '[URL REDACTED]')
    .replace(/\beyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/g, '[REDACTED]')
    .replace(/\b[a-f0-9]{32,}\b/gi, '[REDACTED]');
  const sensitiveField = /\b(?:[\w-]*(?:token|cookie|password|secret)[\w-]*|authorization|bearer|vnp_\w+|(?:test_)?database_url)\b/i;
  const lines = text.split(/\r?\n/);
  const sensitiveIndex = lines.findIndex((line) => sensitiveField.test(line));
  // Pretty-printed headers or JSON can put a secret on the following line.
  text = (sensitiveIndex === -1 ? lines : [...lines.slice(0, sensitiveIndex), '[Sensitive diagnostic lines omitted]']).join('\n');
  return text.slice(0, 2000);
}

function serviceDiagnostics(service) {
  // Raw output can contain arbitrary application data. Export only fixed labels
  // and recognized failure categories, even when the process never spawned.
  const output = String(service.output || '').slice(-8000);
  const knownSpawnCodes = ['ENOENT', 'EACCES', 'EADDRINUSE', 'EMFILE', 'EAGAIN', 'EPIPE'];
  const exitCode = Number.isInteger(service.child.exitCode) ? service.child.exitCode : null;
  const signalCode = /^SIG[A-Z0-9]{1,8}$/.test(service.child.signalCode || '') ? service.child.signalCode : null;
  const issuePatterns = [
    ['MODULE_NOT_FOUND', /MODULE_NOT_FOUND|Cannot find (?:module|package)/i],
    ['ECONNREFUSED', /\bECONNREFUSED\b/],
    ['EADDRINUSE', /\bEADDRINUSE\b|Port \d+ is already in use/],
    ['EACCES', /\bEACCES\b/],
    ['PRISMA_INITIALIZATION', /PrismaClientInitializationError|@prisma\/client did not initialize/i],
    ['DATABASE_UNREACHABLE', /Can't reach database server|\bP1001\b/i],
    ['DATABASE_AUTH_FAILED', /Authentication failed|Access denied|\bP1000\b/i],
  ];
  return {
    label: ['Backend', 'Frontend'].includes(service.label) ? service.label : 'Unknown',
    state: service.spawnError ? 'SPAWN_ERROR' : exitCode !== null || signalCode ? 'EXITED' : 'RUNNING',
    ready: service.ready === true,
    exitCode,
    signalCode,
    spawnError: service.spawnError ? { code: knownSpawnCodes.includes(service.spawnError.code) ? service.spawnError.code : 'UNKNOWN' } : null,
    capturedOutputCharacters: output.length,
    detectedIssues: issuePatterns.filter(([, pattern]) => pattern.test(output)).map(([code]) => code),
  };
}

module.exports = { sanitizeFailureMessage, serviceDiagnostics };
