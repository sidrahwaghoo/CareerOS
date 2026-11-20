// End-to-end functional check of every Credensa API route.
// Runs the real Express app in-process. ONLY the Firebase ID-token check is replaced
// with a test double (fixed test user) so the flow can run headless; every controller,
// Gemini agent call and storage call is real. Test data is deleted at the end.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { admin } = require('../src/config/firebase');
const TEST_USER = { uid: 'e2e-test-user', email: 'e2e@credensa.test', name: 'E2E Tester' };
try {
  const authInstance = admin.auth();
  authInstance.verifyIdToken = async () => TEST_USER;
} catch (e) {
  admin.auth = () => ({ verifyIdToken: async () => TEST_USER });
}

const app = require('../server');
const results = [];
let base;

async function call(name, method, url, body, { form, raw } = {}) {
  const t = Date.now();
  const opts = { method, headers: { Authorization: 'Bearer test' } };
  if (form) opts.body = form;
  else if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  try {
    const res = await fetch(base + url, opts);
    const ms = Date.now() - t;
    let data;
    if (raw) { const buf = Buffer.from(await res.arrayBuffer()); data = { bytes: buf.length, type: res.headers.get('content-type'), buf }; }
    else { const txt = await res.text(); try { data = JSON.parse(txt); } catch { data = txt; } }
    const ok = res.status >= 200 && res.status < 300;
    const detail = ok ? summarize(data) : (data && data.error) || JSON.stringify(data).slice(0, 200);
    results.push({ name, status: res.status, ms, ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'} ${res.status} ${String(ms).padStart(6)}ms  ${name}  ${detail}`);
    return { ok, data };
  } catch (e) {
    results.push({ name, status: 'ERR', ms: Date.now() - t, ok: false, detail: e.message });
    console.log(`FAIL ERR  ${name}  ${e.message}`);
    return { ok: false, data: null };
  }
}

function summarize(d) {
  if (d && d.bytes !== undefined) return `${d.bytes} bytes ${d.type}`;
  if (Array.isArray(d)) return `array(${d.length})`;
  if (d && typeof d === 'object') return 'keys: ' + Object.keys(d).slice(0, 8).join(',');
  return String(d).slice(0, 80);
}
const idOf = (d, k) => d && (d.id || (d[k] && d[k].id) || (d.data && d.data.id));

const sample = {
  personalInfo: { name: 'E2E Tester', headline: 'Senior Backend Engineer', location: 'Remote', email: TEST_USER.email },
  experience: [{ id: 'exp1', company: 'NexaTech', role: 'Senior Backend Engineer', startDate: '2021-01-01', endDate: null, current: true,
    achievements: [{ text: 'Built event pipeline processing 1B events/day', metric: '45% latency reduction' }], skillsUsed: ['Node.js', 'Go', 'Kafka'] }],
  projects: [{ id: 'p1', name: 'Raft KV', description: 'Distributed KV store in Go', role: 'Creator', techStack: ['Go'], outcomes: [] }],
  education: [{ id: 'e1', degree: 'B.S. Computer Science', institution: 'State University', startDate: '2015-08-01', endDate: '2019-05-31' }],
  skills: [{ name: 'Node.js', level: 'Expert', years: 6 }, { name: 'Go', level: 'Advanced', years: 4 }, 'Kubernetes'],
};
const JD = 'Senior Backend Engineer. Requirements: 5+ years Node.js or Go, distributed systems, Kafka, Kubernetes, AWS. Lead design of high-throughput event pipelines and mentor engineers.';

(async () => {
  const server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  console.log('Testing against', base, '\n');

  await call('Health', 'GET', '/api/health');
  await call('User profile', 'GET', '/api/user/profile');
  await call('List records', 'GET', '/api/records');
  const created = await call('Create record (Load Demo Profile)', 'POST', '/api/records', sample);
  const recordId = idOf(created.data, 'record');
  if (!recordId) { console.log('\nNo record id returned; cannot continue dependent tests.'); return finish(server); }

  await call('Get record', 'GET', `/api/records/${recordId}`);
  await call('Get my record (/me)', 'GET', '/api/records/me');
  await call('Update record (Quick Add Entry)', 'PUT', `/api/records/${recordId}`, { ...sample, skills: [...sample.skills, 'AWS'] });
  await call('Career DNA (AI)', 'POST', `/api/records/${recordId}/dna`);
  await call('Copilot chat (AI)', 'POST', '/api/chat', { messages: [{ role: 'user', content: 'Give me one tip to improve my resume.' }], recordId });

  const match = await call('Match vs job (AI)', 'POST', '/api/match', { recordId, jobDescription: JD });
  const matchId = idOf(match.data, 'match');
  await call('List matches', 'GET', `/api/match/record/${recordId}`);

  let draftId;
  if (matchId) {
    const draft = await call('Draft tailored resume (AI)', 'POST', '/api/draft', { recordId, matchId, jobDescription: JD, style: 'modern' });
    draftId = idOf(draft.data, 'draft');
    await call('Interview prep (AI)', 'POST', '/api/interview', { recordId, matchId, jobDescription: JD });
  }
  let pdf;
  if (draftId) {
    await call('ATS review (AI)', 'POST', '/api/review', { draftId, jobDescription: JD });
    await call('Approve draft', 'POST', `/api/drafts/${draftId}/approve`);
    pdf = await call('Export resume PDF', 'POST', '/api/export/pdf', { draftId }, { raw: true });
    await call('Export cover letter', 'POST', '/api/export/cover-letter', { draftId }, { raw: true });
  }
  await call('Export JSON', 'GET', `/api/export/json/${recordId}`);

  if (pdf && pdf.ok && pdf.data.buf) {
    const form = new FormData();
    form.append('resume', new Blob([pdf.data.buf], { type: 'application/pdf' }), 'resume.pdf');
    await call('Resume upload + parse (AI)', 'POST', '/api/resume/upload', null, { form });
  } else {
    console.log('SKIP Resume upload (no PDF available to upload)');
  }

  await call('Delete record (cleanup)', 'DELETE', `/api/records/${recordId}`);
  finish(server);
})();

function finish(server) {
  const passed = results.filter((r) => r.ok).length;
  console.log(`\nRESULT: ${passed}/${results.length} passed`);
  server.close();
  setTimeout(() => process.exit(0), 200);
}
