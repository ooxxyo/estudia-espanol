const FIXTURE_TIME = 1_700_000_000_000;

const PERSONA_ROWS = Object.freeze([
  { id: 'qa-student-new', username: 'qa-student-new', displayName: 'QA Student New' },
  { id: 'qa-student', username: 'qa-student', displayName: 'QA Student' },
  { id: 'qa-admin', username: 'qa-admin', displayName: 'QA Admin', securityRole: 'admin' },
  { id: 'qa-owner', username: 'qa-owner', displayName: 'QA Owner' },
  { id: 'qa-suspended', username: 'qa-suspended', displayName: 'QA Suspended', status: 'suspended' },
]);

export function assertBrowserTestSafety(env = process.env, blobsMockActive = false) {
  if (env.STUDY_HUB_ENV !== 'local-test') {
    throw new Error('Browser test server requires STUDY_HUB_ENV=local-test. Startup aborted.');
  }
  if (blobsMockActive !== true) {
    throw new Error('Browser test server requires the in-memory Netlify Blobs mock. Startup aborted.');
  }
}

export function configureLocalTestEnvironment(env = process.env) {
  env.STUDY_HUB_ENV = 'local-test';
  env.QA_TOOLS_ENABLED = 'true';
  env.OWNER_USERNAME = 'qa-owner';
  env.ADMIN_USERNAMES = '';
  env.DEV_LOGIN_CODE = '';
}

function userRow(input) {
  return {
    sessionVersion: 1,
    status: 'active',
    createdAt: FIXTURE_TIME,
    updatedAt: FIXTURE_TIME,
    normalizedUsername: input.username,
    ...input,
  };
}

async function putUser(users, input) {
  const row = userRow(input);
  await users.setJSON(`user/${row.id}`, row);
  await users.setJSON(`username/${row.normalizedUsername}`, { userId: row.id });
  if (row.email) await users.setJSON(`email/${row.email}`, { userId: row.id });
  return row;
}

export async function resetBrowserFixtures(blobs) {
  assertBrowserTestSafety(process.env, blobs?.__STUDY_HUB_TEST_BLOBS__);
  blobs.__resetAll();
  const users = blobs.getStore('study-hub-users-v1');
  const progress = blobs.getStore('study-hub-progress-v1');
  const personas = {};
  for (const input of PERSONA_ROWS) personas[input.id] = await putUser(users, input);
  await progress.setJSON('user/qa-student', {
    updatedAt: FIXTURE_TIME,
    state: {
      version: '2.0',
      savedAt: FIXTURE_TIME,
      totalAnswered: 4,
      totalCorrect: 3,
      currentStreak: 2,
      bestStreak: 2,
      studySeconds: 300,
      stats: {},
      errors: [],
      saved: [],
      history: [],
      session: null,
    },
  });

  const superdev = await putUser(users, { id: 'superdev-test', username: 'superdev', displayName: 'Super Dev' });
  await putUser(users, { id: 'old-test', username: 'cuentaantigua', email: 'antigua@example.test' });
  await putUser(users, { id: 'new-test', username: 'cuentanueva', displayName: 'Amiga Nueva', email: 'nueva@example.test', veteran: true, entitlement: 'veteran', visibleRank: 'Veterano' });
  await putUser(users, { id: 'admin-test', username: 'adminamigo', displayName: 'Admin Amigo', securityRole: 'admin' });
  return { personas, superdev };
}
