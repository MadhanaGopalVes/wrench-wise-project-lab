'use strict';
// CRM integration layer. Events are written to a durable outbox in the same request, then delivered
// asynchronously by `flush()` with retry/backoff. Providers: none | webhook | zoho.
// With CRM_PROVIDER=none nothing leaves the server; rows stay 'pending' (visible in the admin dashboard).
const crypto = require('crypto');
const cfg = require('./config');
const { q, now } = require('./db');
const catalogue = require('../content/catalogue');

function leadRecord(learnerId, projectId) {
  const l = q.one('SELECT * FROM learners WHERE id=?', learnerId);
  if (!l) return null;
  const proj = catalogue.byId(projectId);
  const prog = projectId ? q.one('SELECT * FROM progress WHERE learner_id=? AND project_id=?', learnerId, projectId) : null;
  const cert = projectId ? q.one('SELECT id FROM certificates WHERE learner_id=? AND project_id=? AND revoked=0', learnerId, projectId) : null;
  let status = 'Registered';
  if (prog) status = prog.completed_at ? 'Completed' : 'In progress';
  return {
    name: l.name, email: l.email, phone: l.phone,
    lead_source: l.source || 'project-lab',
    selected_project: proj ? proj.title : null,
    project_category: proj ? proj.categoryLabel : null,
    interested_certification: proj && proj.programme ? proj.programme.name : null,
    project_activity_status: status,
    completion_status: prog && prog.completed_at ? 'Completed' : 'Not completed',
    certificate_id: cert ? cert.id : null,
    marketing_consent: !!l.marketing_consent,
    last_activity: l.last_activity,
  };
}

function enqueue(type, learnerId, projectId, meta = {}) {
  const lead = learnerId ? leadRecord(learnerId, projectId) : null;
  q.run('INSERT INTO outbox(event_type,payload,created_at,next_attempt) VALUES(?,?,?,?)',
    type, JSON.stringify({ event: type, project_id: projectId || null, meta, lead, at: now() }), now(), now());
}

async function deliverWebhook(payload) {
  const body = JSON.stringify(payload);
  const sig = crypto.createHmac('sha256', cfg.CRM_WEBHOOK_SECRET).update(body).digest('hex');
  const r = await fetch(cfg.CRM_WEBHOOK_URL, { method: 'POST', headers: { 'content-type': 'application/json', 'x-wrenchwise-signature': sig }, body });
  if (!r.ok) throw new Error(`Webhook HTTP ${r.status}`);
}

let zohoToken = { value: null, exp: 0 };
async function zohoAccessToken() {
  if (zohoToken.value && Date.now() < zohoToken.exp) return zohoToken.value;
  const p = new URLSearchParams({ refresh_token: cfg.ZOHO_REFRESH_TOKEN, client_id: cfg.ZOHO_CLIENT_ID, client_secret: cfg.ZOHO_CLIENT_SECRET, grant_type: 'refresh_token' });
  const r = await fetch(`${cfg.ZOHO_ACCOUNTS_URL}/oauth/v2/token`, { method: 'POST', body: p });
  const j = await r.json();
  if (!j.access_token) throw new Error('Zoho token refresh failed');
  zohoToken = { value: j.access_token, exp: Date.now() + (j.expires_in - 120) * 1000 };
  return zohoToken.value;
}
// NOTE: custom fields (Project_Selected, etc.) must be created in Zoho CRM first. See docs/README.md.
async function deliverZoho(payload) {
  if (!payload.lead) return;
  const l = payload.lead; const [first, ...rest] = l.name.split(' ');
  const rec = {
    First_Name: rest.length ? first : '', Last_Name: rest.length ? rest.join(' ') : first, Email: l.email, Phone: l.phone,
    Lead_Source: 'Project Lab', Project_Selected: l.selected_project, Project_Category: l.project_category,
    Interested_Certification: l.interested_certification, Project_Activity_Status: l.project_activity_status,
    Completion_Status: l.completion_status, Certificate_ID: l.certificate_id, Marketing_Consent: l.marketing_consent,
    Last_Project_Event: payload.event, Last_Activity_At: l.last_activity,
  };
  const token = await zohoAccessToken();
  const r = await fetch(`${cfg.ZOHO_API_DOMAIN}/crm/v6/Leads/upsert`, {
    method: 'POST', headers: { authorization: `Zoho-oauthtoken ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ data: [rec], duplicate_check_fields: ['Email'] }),
  });
  if (!r.ok) throw new Error(`Zoho HTTP ${r.status}`);
}

function configured() {
  if (cfg.CRM_PROVIDER === 'webhook') return !!(cfg.CRM_WEBHOOK_URL && cfg.CRM_WEBHOOK_SECRET);
  if (cfg.CRM_PROVIDER === 'zoho') return !!(cfg.ZOHO_CLIENT_ID && cfg.ZOHO_CLIENT_SECRET && cfg.ZOHO_REFRESH_TOKEN);
  return false;
}

async function flush(limit = 25) {
  if (!configured()) return { delivered: 0, skipped: 'CRM not configured' };
  const rows = q.all(`SELECT * FROM outbox WHERE status='pending' AND next_attempt<=? ORDER BY id LIMIT ?`, now(), limit);
  let delivered = 0;
  for (const row of rows) {
    try {
      const payload = JSON.parse(row.payload);
      if (cfg.CRM_PROVIDER === 'webhook') await deliverWebhook(payload); else await deliverZoho(payload);
      q.run(`UPDATE outbox SET status='sent', attempts=attempts+1 WHERE id=?`, row.id); delivered++;
    } catch (e) {
      const attempts = row.attempts + 1;
      const status = attempts >= 6 ? 'failed' : 'pending';
      const next = new Date(Date.now() + Math.min(3600e3, 2 ** attempts * 30e3)).toISOString();
      q.run('UPDATE outbox SET status=?, attempts=?, last_error=?, next_attempt=? WHERE id=?', status, attempts, String(e.message).slice(0, 200), next, row.id);
    }
  }
  return { delivered };
}

let timer;
function start() { timer = setInterval(() => flush().catch(() => {}), cfg.CRM_FLUSH_INTERVAL_MS); timer.unref(); }
const info = () => ({ provider: cfg.CRM_PROVIDER, configured: configured() });

module.exports = { enqueue, flush, start, info, leadRecord };
