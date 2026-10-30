'use strict';
// Central configuration. All secrets come from environment variables (or a local .env file
// that is git-ignored). Nothing secret is hardcoded and nothing here is ever sent to the browser.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function loadDotEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadDotEnv();

const env = (k, d) => (process.env[k] !== undefined && process.env[k] !== '' ? process.env[k] : d);
const int = (k, d) => parseInt(env(k, d), 10);

module.exports = {
  ROOT,
  PORT: int('PORT', 3000),
  PUBLIC_BASE_URL: env('PUBLIC_BASE_URL', `http://localhost:${int('PORT', 3000)}`),
  DB_PATH: env('DB_PATH', path.join(ROOT, 'data', 'projectlab.db')),
  // Used to sign certificate check digits. MUST be set in production.
  CERT_SECRET: env('CERT_SECRET', 'dev-only-cert-secret-change-me'),
  ADMIN_TOKEN: env('ADMIN_TOKEN', ''), // empty => admin endpoints disabled
  SESSION_DAYS: int('SESSION_DAYS', 90),
  PASS_MARK: int('PASS_MARK', 70), // % required on the final assessment quiz

  // Abuse protection
  RATE_LIMIT_PER_MIN: int('RATE_LIMIT_PER_MIN', 120),
  RATE_LIMIT_WRITE_PER_MIN: int('RATE_LIMIT_WRITE_PER_MIN', 40),
  RATE_LIMIT_REGISTER_PER_HOUR: int('RATE_LIMIT_REGISTER_PER_HOUR', 20),
  AI_DAILY_QUOTA: int('AI_DAILY_QUOTA', 60), // lab inference calls / learner / day
  MAX_UPLOAD_BYTES: int('MAX_UPLOAD_BYTES', 2 * 1024 * 1024),
  MAX_BODY_BYTES: int('MAX_BODY_BYTES', 3 * 1024 * 1024),
  AGENT_MAX_STEPS: int('AGENT_MAX_STEPS', 8),

  // AI provider layer: demo | openai | gemini
  AI_PROVIDER: env('AI_PROVIDER', 'demo'),
  OPENAI_API_KEY: env('OPENAI_API_KEY', ''),
  OPENAI_MODEL: env('OPENAI_MODEL', 'gpt-4o-mini'),
  GEMINI_API_KEY: env('GEMINI_API_KEY', ''),
  GEMINI_MODEL: env('GEMINI_MODEL', 'gemini-1.5-flash'),

  // CRM layer: none | webhook | zoho
  CRM_PROVIDER: env('CRM_PROVIDER', 'none'),
  CRM_WEBHOOK_URL: env('CRM_WEBHOOK_URL', ''),
  CRM_WEBHOOK_SECRET: env('CRM_WEBHOOK_SECRET', ''),
  ZOHO_ACCOUNTS_URL: env('ZOHO_ACCOUNTS_URL', 'https://accounts.zoho.in'),
  ZOHO_API_DOMAIN: env('ZOHO_API_DOMAIN', 'https://www.zohoapis.in'),
  ZOHO_CLIENT_ID: env('ZOHO_CLIENT_ID', ''),
  ZOHO_CLIENT_SECRET: env('ZOHO_CLIENT_SECRET', ''),
  ZOHO_REFRESH_TOKEN: env('ZOHO_REFRESH_TOKEN', ''),
  CRM_FLUSH_INTERVAL_MS: int('CRM_FLUSH_INTERVAL_MS', 30000),

  // Where "Enroll Now"/"View Syllabus" go once the real website exists. Empty => local stub page.
  PROGRAMME_BASE_URL: env('PROGRAMME_BASE_URL', ''),
};
