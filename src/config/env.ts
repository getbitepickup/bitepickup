// src/config/env.ts

export const env = {
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  NODE_ENV: import.meta.env.MODE || 'development',
  IS_DEVELOPMENT: import.meta.env.MODE === 'development',
  IS_PRODUCTION: import.meta.env.MODE === 'production',
};