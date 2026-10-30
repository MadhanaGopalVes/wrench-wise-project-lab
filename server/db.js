'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');
const cfg = require('./config');

let db;
function open(file = cfg.DB_PATH) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS learners(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, phone TEXT NOT NULL,
      marketing_consent INTEGER NOT NULL DEFAULT 0,
      privacy_consent_at TEXT NOT NULL, source TEXT,
      created_at TEXT NOT NULL, last_activity TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions(
      token_hash TEXT PRIMARY KEY, learner_id INTEGER NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL, expires_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS progress(
      learner_id INTEGER NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
      project_id TEXT NOT NULL, data TEXT NOT NULL,
      started_at TEXT, updated_at TEXT NOT NULL, completed_at TEXT,
      PRIMARY KEY(learner_id, project_id)
    );
    CREATE TABLE IF NOT EXISTS events(
      id INTEGER PRIMARY KEY AUTOINCREMENT, learner_id INTEGER, project_id TEXT,
      type TEXT NOT NULL, meta TEXT, anon_id TEXT, ts TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS ix_events_type ON events(type, project_id);
    CREATE TABLE IF NOT EXISTS runs(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      learner_id INTEGER NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
      project_id TEXT NOT NULL, kind TEXT NOT NULL, payload TEXT NOT NULL, ts TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS ix_runs ON runs(learner_id, project_id, kind);
    CREATE TABLE IF NOT EXISTS attempts(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      learner_id INTEGER NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
      project_id TEXT NOT NULL, score REAL NOT NULL, passed INTEGER NOT NULL, detail TEXT, ts TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS certificates(
      id TEXT PRIMARY KEY,
      learner_id INTEGER NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
      project_id TEXT NOT NULL, holder_name TEXT NOT NULL, project_title TEXT NOT NULL,
      score REAL NOT NULL, issued_at TEXT NOT NULL, showcase INTEGER NOT NULL DEFAULT 0,
      revoked INTEGER NOT NULL DEFAULT 0, UNIQUE(learner_id, project_id)
    );
    CREATE TABLE IF NOT EXISTS outbox(
      id INTEGER PRIMARY KEY AUTOINCREMENT, event_type TEXT NOT NULL, payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0,
      next_attempt TEXT, last_error TEXT, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS quotas(
      learner_id INTEGER NOT NULL, day TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY(learner_id, day)
    );
    CREATE TABLE IF NOT EXISTS enrolments(
      email TEXT PRIMARY KEY, programme TEXT, imported_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS waitlist(
      email TEXT NOT NULL, project_id TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(email, project_id)
    );
  `);
  return db;
}
const get = () => db;
const now = () => new Date().toISOString();
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const q = {
  one: (sql, ...a) => db.prepare(sql).get(...a),
  all: (sql, ...a) => db.prepare(sql).all(...a),
  run: (sql, ...a) => db.prepare(sql).run(...a),
};
module.exports = { open, get, now, sha, q };
