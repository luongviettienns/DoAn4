export function validateEnvironment() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';

  // Required in all environments
  const requiredVars = ['DATABASE_URL'];
  const missing = requiredVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`[Configuration Error] Missing required environment variables: ${missing.join(', ')}`);
  }

  // Strict validation for production deployments
  if (isProduction) {
    const defaultInsecureSecrets = [
      'cinex_super_secret_jwt_access_key_2026_dev_32chars',
      'cinex_super_secret_jwt_refresh_key_2026_dev_32chars',
      'secret',
      'changeme',
    ];
    const accessSecret = process.env.JWT_ACCESS_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;

    if (!accessSecret || defaultInsecureSecrets.includes(accessSecret) || accessSecret.length < 32) {
      throw new Error('[Security Error] In production, JWT_ACCESS_SECRET must be configured with a secure random secret of at least 32 characters.');
    }
    if (!refreshSecret || defaultInsecureSecrets.includes(refreshSecret) || refreshSecret.length < 32) {
      throw new Error('[Security Error] In production, JWT_REFRESH_SECRET must be configured with a secure random secret of at least 32 characters.');
    }
    if (!process.env.CORS_ALLOWED_ORIGINS) {
      console.warn('[Security Warning] CORS_ALLOWED_ORIGINS is not explicitly configured for production.');
    }
  }
}
