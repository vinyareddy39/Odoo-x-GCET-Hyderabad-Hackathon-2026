import dotenv from 'dotenv';
dotenv.config();

if (!process.env.JWT_SECRET) {
  console.warn(
    '⚠️ [SECURITY WARNING] process.env.JWT_SECRET is not configured! Defaulting to development fallback secret.'
  );
}

export const JWT_SECRET = process.env.JWT_SECRET || 'stocksense_super_secret_jwt_key_2026';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
