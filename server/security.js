'use strict';
const cfg = require('./config');
const { q, now } = require('./db');

// ---- Rate limiting (in-memory sliding window; swap for Redis when running >1 instance) ----
const buckets = new Map();
function rateLimit(key, limit, windowMs) {
  const t = Date.now();
  const arr = (buckets.get(key) || []).filter((x) => t - x < windowMs);
  if (arr.length >= limit) { buckets.set(key, arr); return false; }
  arr.push(t); buckets.set(key, arr);
  return true;
}
setInterval(() => { const t = Date.now(); for (const [k, v] of buckets) if (!v.some((x) => t - x < 3600e3)) buckets.delete(k); }, 600e3).unref();

// ---- Per-learner daily AI / inference quota ----
function useQuota(learnerId, cost = 1) {
  const day = now().slice(0, 10);
  const row = q.one('SELECT count FROM quotas WHERE learner_id=? AND day=?', learnerId, day);
  const used = row ? row.count : 0;
  if (used + cost > cfg.AI_DAILY_QUOTA) return { ok: false, used, limit: cfg.AI_DAILY_QUOTA };
  q.run(`INSERT INTO quotas(learner_id,day,count) VALUES(?,?,?)
         ON CONFLICT(learner_id,day) DO UPDATE SET count=count+excluded.count`, learnerId, day, cost);
  return { ok: true, used: used + cost, limit: cfg.AI_DAILY_QUOTA };
}

// ---- Validation ----
function normPhone(p) {
  const s = String(p || '').trim();
  const digits = s.replace(/[^\d]/g, '');
  if (digits.length < 8 || digits.length > 15 || !/^\+?[\d\s\-()]+$/.test(s)) return null;
  return (s.startsWith('+') ? '+' : '') + digits;
}
const validEmail = (e) => typeof e === 'string' && e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
const cleanText = (s, max = 120) => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max);

// ---- Prompt-injection heuristics (defence in depth; untrusted text is never executed as instructions) ----
const INJECTION = [
  /ignore (all |any |the )?(previous|prior|above) (instructions|prompts?|rules)/i,
  /disregard (all |the )?(previous|prior|system)/i,
  /(reveal|show|print|repeat) (your |the )?(system|hidden) (prompt|instructions)/i,
  /you are now (dan|an? unrestricted|in developer mode)/i,
  /act as (the )?(admin|system|developer)/i,
  /\bapprove (this|the) refund (automatically|without)/i,
];
const detectInjection = (text) => INJECTION.some((r) => r.test(String(text || '')));

// ---- Upload validation ----
function validateUpload({ filename, dataBase64 }) {
  if (!filename || !dataBase64) return { ok: false, error: 'filename and dataBase64 required' };
  if (!/\.(pdf|txt)$/i.test(filename)) return { ok: false, error: 'Only .pdf or .txt files are accepted' };
  if (dataBase64.length > cfg.MAX_UPLOAD_BYTES * 1.4) return { ok: false, error: `File too large (max ${Math.round(cfg.MAX_UPLOAD_BYTES / 1024 / 1024)}MB)` };
  let buf;
  try { buf = Buffer.from(dataBase64, 'base64'); } catch { return { ok: false, error: 'Invalid encoding' }; }
  if (buf.length > cfg.MAX_UPLOAD_BYTES) return { ok: false, error: 'File too large' };
  if (buf.length === 0) return { ok: false, error: 'Empty file' };
  const isPdfName = /\.pdf$/i.test(filename);
  if (isPdfName && buf.slice(0, 5).toString('latin1') !== '%PDF-') return { ok: false, error: 'File is not a valid PDF (bad signature)' };
  if (!isPdfName && buf.includes(0)) return { ok: false, error: 'Text file contains binary data' };
  return { ok: true, buf, kind: isPdfName ? 'pdf' : 'txt' };
}

// Image upload (for future image classifier): magic-byte check
function sniffImage(buf) {
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.slice(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'jpeg';
  return null;
}

module.exports = { rateLimit, useQuota, normPhone, validEmail, cleanText, detectInjection, validateUpload, sniffImage };
