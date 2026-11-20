'use strict';

// End-to-end test of the Credensa agentic pipeline.
// Runs against the throwaway backend spawned on port 3002 by run-tests.js.
// Uses only Node.js built-ins (node:test, node:assert/strict, global fetch).

const test = require('node:test');
const assert = require('node:assert/strict');

const BASE_URL = process.env.TEST_API_BASE_URL || 'http://localhost:3002/api';

/**
 * Small fetch wrapper.
 * JSON responses are parsed into objects; binary responses (e.g. PDF) are
 * returned as Buffers so tests can inspect raw bytes.
 */
async function apiRequest(method, urlPath, body) {
  const options = { method, headers: {} };
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${urlPath}`, options);
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : Buffer.from(await response.arrayBuffer());

  return { status: response.status, ok: response.ok, contentType, data };
}

// One top-level test so subtests share state and run in a guaranteed order:
// health -> record -> match -> draft -> review -> export -> approval -> validation.
test('agentic pipeline end-to-end', async (t) => {
  // Every record created here is tracked by exact id and deleted in cleanup.
  // All named records use the TEST- prefix; the validation record is empty by
  // design (no name) but is still removed by its captured id.
  const createdRecordIds = [];
  const ctx = {};

  const jobDescription = [
    'Senior Frontend Engineer',
    'Required: React, TypeScript, Node.js, System Design.',
    'Preferred: Leadership, Figma.',
    'Own end-to-end product delivery and mentor engineers.',
  ].join('\n');

  // Cleanup always runs after the test (and its subtests), even on failures.
  t.after(async () => {
    if (createdRecordIds.length === 0) {
      console.log('  [cleanup] no test records to delete');
      return;
    }
    for (const id of createdRecordIds) {
      try {
        const res = await apiRequest('DELETE', `/records/${id}`);
        console.log(`  [cleanup] deleted TEST record ${id} -> HTTP ${res.status}`);
      } catch (err) {
        console.log(`  [cleanup] FAILED to delete TEST record ${id}: ${err.message}`);
      }
    }
  });

  await t.test('a) health endpoint reports ok plus storage and AI mode', async () => {
    const res = await apiRequest('GET', '/health');
    assert.equal(res.status, 200, 'GET /api/health should return HTTP 200');
    assert.equal(res.data.status, 'ok', 'health status should be "ok"');
    assert.ok(
      ['local-json', 'firestore'].includes(res.data.storage),
      `health should report a storage mode, got: ${res.data.storage}`
    );
    assert.ok(
      ['gemini-live', 'gemini-demo'].includes(res.data.ai),
      `health should report an AI mode, got: ${res.data.ai}`
    );
    console.log(`  [health] storage=${res.data.storage} ai=${res.data.ai}`);
  });

  await t.test('b) POST /api/records creates a full career record', async () => {
    const record = {
      personalInfo: {
        name: 'TEST-Pipeline Candidate',
        email: 'test.pipeline@example.com',
        phone: '+1-555-0100',
        location: 'Test City',
        linkedin: 'https://www.linkedin.com/in/test-pipeline',
      },
      experience: [
        {
          company: 'TEST-Acme Corp',
          role: 'Senior Software Engineer',
          startDate: '2021-01',
          endDate: '2024-01',
          current: false,
          achievements: [
            'Reduced API latency by 42% by optimizing database queries',
            'Led a team of 5 engineers to ship 3 major product releases',
          ],
        },
      ],
      projects: [
        {
          name: 'TEST-Portfolio Platform',
          description: 'Built a full-stack product used by 10,000+ users',
          technologies: ['React', 'Node.js', 'PostgreSQL'],
        },
      ],
      education: [
        {
          institution: 'TEST-University',
          degree: 'B.S. Computer Science',
          startDate: '2016',
          endDate: '2020',
        },
      ],
      skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Figma', 'System Design'],
    };

    const res = await apiRequest('POST', '/records', record);
    assert.equal(res.status, 201, 'creating a record should return HTTP 201');
    assert.ok(res.data.id, 'created record must have an id');
    assert.ok(res.data.version >= 1, 'created record must have a version >= 1');
    assert.equal(res.data.personalInfo.name, 'TEST-Pipeline Candidate');
    assert.ok(Array.isArray(res.data.experience), 'record should echo experience');
    assert.ok(Array.isArray(res.data.projects), 'record should echo projects');
    assert.ok(Array.isArray(res.data.education), 'record should echo education');
    assert.ok(Array.isArray(res.data.skills), 'record should echo skills');

    createdRecordIds.push(res.data.id);
    ctx.recordId = res.data.id;
    console.log(`  [record] created ${res.data.id} (version ${res.data.version})`);
  });

  await t.test('c) POST /api/match returns fit analysis with optional jdParsed', async () => {
    const res = await apiRequest('POST', '/match', {
      recordId: ctx.recordId,
      jobDescription,
    });
    assert.equal(res.status, 201, 'POST /api/match should return HTTP 201');

    const match = res.data;
    assert.equal(typeof match.fitScore, 'number', 'fitScore must be a number');
    assert.ok(match.fitScore >= 0 && match.fitScore <= 100, 'fitScore must be within 0-100');
    assert.ok(
      ['Strong', 'Ready', 'Improve'].includes(match.tier),
      `tier must be Strong/Ready/Improve, got: ${match.tier}`
    );
    assert.ok(Array.isArray(match.matchedSkills), 'matchedSkills must be an array');
    assert.ok(Array.isArray(match.missingSkills), 'missingSkills must be an array');
    assert.ok(Array.isArray(match.suggestions), 'suggestions must be an array');

    if (match.jdParsed !== undefined) {
      assert.ok(
        typeof match.jdParsed === 'object' && match.jdParsed !== null && !Array.isArray(match.jdParsed),
        'jdParsed, when present, must be an object'
      );
      assert.ok(Array.isArray(match.jdParsed.requiredSkills), 'jdParsed.requiredSkills must be an array');
      assert.ok(Array.isArray(match.jdParsed.preferredSkills), 'jdParsed.preferredSkills must be an array');
      assert.ok(Array.isArray(match.jdParsed.responsibilities), 'jdParsed.responsibilities must be an array');
      assert.equal(typeof match.jdParsed.experienceLevel, 'string', 'jdParsed.experienceLevel must be a string');
      console.log('  [match] jdParsed present and well-formed');
    } else {
      console.log('  [match] jdParsed not present (optional field) - skipped its assertions');
    }

    assert.ok(match.id, 'match must have an id');
    ctx.matchId = match.id;
    console.log(`  [match] fitScore=${match.fitScore} tier=${match.tier} id=${match.id}`);
  });

  await t.test('d) POST /api/draft returns tailored resume content', async () => {
    const res = await apiRequest('POST', '/draft', {
      recordId: ctx.recordId,
      matchId: ctx.matchId,
      jobDescription,
    });
    assert.equal(res.status, 201, 'POST /api/draft should return HTTP 201');

    const draft = res.data;
    assert.ok(draft.id, 'draft must have an id');
    assert.ok(draft.content && typeof draft.content === 'object', 'draft.content must be an object');
    assert.equal(typeof draft.content.summary, 'string', 'content.summary must be a string');
    assert.ok(draft.content.summary.length > 0, 'content.summary must not be empty');
    assert.ok(Array.isArray(draft.content.experience), 'content.experience must be an array');
    assert.ok(
      draft.content.experience.some(
        (exp) => Array.isArray(exp.achievements) && exp.achievements.length > 0
      ),
      'at least one experience entry must contain achievements'
    );
    assert.ok(Array.isArray(draft.content.skills), 'content.skills must be an array');
    assert.ok(draft.content.skills.length > 0, 'content.skills must not be empty');

    ctx.draftId = draft.id;
    console.log(`  [draft] id=${draft.id} achievements=${draft.content.experience
      .reduce((n, exp) => n + (Array.isArray(exp.achievements) ? exp.achievements.length : 0), 0)}`);
  });

  await t.test('e) POST /api/review returns ATS review result', async () => {
    const res = await apiRequest('POST', '/review', {
      draftId: ctx.draftId,
      jobDescription,
    });
    assert.equal(res.status, 200, 'POST /api/review should return HTTP 200');

    const reviewResult = res.data.reviewResult;
    assert.ok(reviewResult && typeof reviewResult === 'object', 'reviewResult must be present');
    assert.equal(typeof reviewResult.atsScore, 'number', 'reviewResult.atsScore must be a number');
    assert.ok(reviewResult.atsScore >= 0 && reviewResult.atsScore <= 100, 'atsScore must be within 0-100');
    assert.ok(Array.isArray(reviewResult.checks), 'reviewResult.checks must be an array');
    console.log(`  [review] atsScore=${reviewResult.atsScore} checks=${reviewResult.checks.length}`);
  });

  await t.test('f) POST /api/export/pdf returns a PDF buffer', async () => {
    const res = await apiRequest('POST', '/export/pdf', { draftId: ctx.draftId });
    assert.equal(res.status, 200, 'POST /api/export/pdf should return HTTP 200');
    assert.match(res.contentType, /pdf/i, 'content-type should indicate a PDF');
    assert.ok(Buffer.isBuffer(res.data), 'PDF response should be a Buffer');
    assert.ok(res.data.length > 4, 'PDF buffer should not be empty');
    assert.equal(res.data.subarray(0, 4).toString('ascii'), '%PDF', 'PDF buffer must start with %PDF');
    console.log(`  [export/pdf] received ${res.data.length}-byte PDF (%PDF header verified)`);
  });

  await t.test('g) GET /api/export/json/:recordId returns record, matches and drafts', async () => {
    const res = await apiRequest('GET', `/export/json/${ctx.recordId}`);
    assert.equal(res.status, 200, 'GET /api/export/json/:recordId should return HTTP 200');

    const bundle = res.data;
    assert.ok(bundle.record && typeof bundle.record === 'object', 'bundle.record must be present');
    assert.equal(bundle.record.id, ctx.recordId, 'bundle.record.id must match the requested record');
    assert.ok(Array.isArray(bundle.matches), 'bundle.matches must be an array');
    assert.ok(Array.isArray(bundle.drafts), 'bundle.drafts must be an array');
    assert.ok(
      bundle.matches.some((m) => m.id === ctx.matchId),
      'bundle.matches should contain the match created above'
    );
    assert.ok(
      bundle.drafts.some((d) => d.id === ctx.draftId),
      'bundle.drafts should contain the draft created above'
    );
    console.log(`  [export/json] matches=${bundle.matches.length} drafts=${bundle.drafts.length}`);
  });

  await t.test('h) draft approve/reject endpoints work when available', async () => {
    for (const action of ['approve', 'reject']) {
      const res = await apiRequest('POST', `/drafts/${ctx.draftId}/${action}`);
      if (res.status === 404) {
        console.log(
          `  [skip] POST /api/drafts/:id/${action} returned 404 - endpoint not available; skipping gracefully`
        );
        continue;
      }
      assert.equal(res.status, 200, `POST /api/drafts/:id/${action} should return HTTP 200`);
      assert.equal(res.data.status, action === 'approve' ? 'approved' : 'rejected', 'draft status should update');
      assert.ok(Array.isArray(res.data.approvalHistory), 'approvalHistory should be an array');
      console.log(`  [drafts/${action}] status=${res.data.status} history=${res.data.approvalHistory.length}`);
    }
  });

  await t.test('i) empty-body record creation does not 500', async () => {
    const res = await apiRequest('POST', '/records', {});
    assert.notEqual(res.status, 500, 'POST /api/records with an empty body must not return 500');
    assert.equal(res.status, 201, 'POST /api/records with an empty body should still return HTTP 201');
    assert.ok(res.data.id, 'the validation record should still have an id');

    // No TEST- name exists on this record by design; it is removed by exact id.
    createdRecordIds.push(res.data.id);
    console.log(`  [validation] empty-body record created ${res.data.id} (will be deleted by id)`);
  });
});
