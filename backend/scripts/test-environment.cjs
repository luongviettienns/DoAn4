const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });

function configureTestEnvironment() {
  // Keep a source boundary even on clean CI machines with only TEST_DATABASE_URL.
  // Child processes inherit DATABASE_URL as the test target, so an absent source
  // must not be inferred from that rewritten value on the second configuration.
  const developmentUrl = process.env.DATABASE_URL || 'mysql://root:password@127.0.0.1:3306/cinema_booking_dev';
  const sourceUrl = process.env.TEST_SOURCE_DATABASE_URL || developmentUrl;
  const url = new URL(process.env.TEST_DATABASE_URL || developmentUrl);
  if (!process.env.TEST_DATABASE_URL) url.pathname = `${url.pathname}_test`;
  const database = url.pathname.slice(1);
  if (url.protocol !== 'mysql:' || !/^[a-zA-Z0-9_]+_test$/.test(database)) {
    throw new Error('Tests require a separate MySQL database whose name ends in _test. Refusing to modify development data.');
  }
  if (sourceUrl) {
    const source = new URL(sourceUrl);
    // Different host spellings can point to the same MySQL instance.
    if (decodeURIComponent(source.pathname) === decodeURIComponent(url.pathname)) {
      throw new Error('The test database must differ from the configured development database.');
    }
    // Preserve the original target across the runner and its child processes.
    process.env.TEST_SOURCE_DATABASE_URL = sourceUrl;
  }
  process.env.DATABASE_URL = url.toString();
  process.env.TEST_DATABASE_URL = url.toString();
  process.env.NODE_ENV = 'test';
  process.env.JWT_ACCESS_SECRET ||= 'cinex_super_secret_jwt_access_key_2026_dev_32chars';
  return { url, database, developmentUrl };
}
module.exports = { configureTestEnvironment };
