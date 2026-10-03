import test from 'node:test';
import assert from 'node:assert/strict';
import { getStore, __resetAll, __inspectionGuard, __inspectionSnapshot, __inspectionAccess, __inspectionFault } from '@netlify/blobs';
import { USERS, COOKIE, createSession, hashSecret } from '../netlify/functions/_shared/auth.mjs';
let inspect;
try { ({ default: inspect } = await import('../netlify/functions/qa-inspect.mjs')); } catch {}
const names = ['qa-student-new','qa-student','qa-admin','qa-owner','qa-suspended','superdev','testmem'];
const progress = getStore('study-hub-progress-v1');
const feedback = getStore('study-hub-feedback-v1');
const baseline = {updatedAt:1700000000000,state:{version:'2.0',savedAt:1700000000000,totalAnswered:4,totalCorrect:3,currentStreak:2,bestStreak:2,studySeconds:300,stats:{},errors:[],saved:[],history:[],session:null}};
let users, ownerToken;
function req(token = '', query = '', method = 'GET') {
  return new Request(`https://qa.example.test/.netlify/functions/qa-inspect${query}`, {method,headers:{cookie:token?`${COOKIE}=${token}`:''}});
}
async function fixture() {
  users = {};
  for (const [i,name] of names.entries()) {
    const user = {id:`fictitious-id-${i}`,username:name,normalizedUsername:name,status:name==='qa-suspended'?'suspended':'active',sessionVersion:7,email:'PRIVATE-FICTITIOUS-EMAIL',password:hashSecret('FAKE-INSPECTION-PASSWORD'),recovery:{salt:'PRIVATE-FICTITIOUS-SALT',hash:'PRIVATE-FICTITIOUS-HASH'},displayName:name};
    users[name] = user;
    await USERS.setJSON(`user/${user.id}`,user);
    await USERS.setJSON(`username/${name}`,{userId:user.id});
  }
  await USERS.setJSON('user/unknown-fictitious-id',{id:'unknown-fictitious-id',username:'outside-user',privateData:'PRIVATE-OUTSIDE-DATA'});
  await progress.setJSON(`user/${users['qa-student'].id}`,baseline);
  await progress.setJSON(`user/${users.testmem.id}`,{state:{saved:['PRIVATE-PROGRESS']}});
  await feedback.setJSON('private-object-key',{message:'PRIVATE-FEEDBACK'});
  ownerToken = await createSession(users['qa-owner']);
}
async function readOnly(request) {
  assert.equal(typeof inspect,'function','Read-only inspection endpoint missing');
  const before = __inspectionSnapshot();
  __inspectionGuard();
  const response = await inspect(request);
  assert.deepEqual(__inspectionAccess().writes,[],'inspection attempted a store write');
  assert.deepEqual(__inspectionSnapshot(),before,'inspection modified data');
  return response;
}
test.beforeEach(async()=>{
  __resetAll();
  Object.assign(process.env,{STUDY_HUB_ENV:'qa',QA_TOOLS_ENABLED:'true',OWNER_USERNAME:'qa-owner',ADMIN_USERNAMES:'qa-admin',QA_SEED_TOKEN:'PRIVATE-ENV-SENTINEL',DEV_LOGIN_CODE:'PRIVATE-DEV-SENTINEL'});
  await fixture();
});
test('inspection is absent outside exact enabled QA without touching stores',async()=>{
  for(const env of ['production','local-test','unknown','QA','']) {
    process.env.STUDY_HUB_ENV=env;
    assert.equal((await readOnly(req(ownerToken))).status,404);
    assert.deepEqual(__inspectionAccess().reads,[]);
  }
  process.env.STUDY_HUB_ENV='qa';
  for(const flag of ['false','TRUE','']) {
    process.env.QA_TOOLS_ENABLED=flag;
    assert.equal((await readOnly(req(ownerToken))).status,404);
  }
});
test('anonymous, Member, Admin, revoked and suspended sessions cannot inspect',async()=>{
  assert.equal((await readOnly(req())).status,401);
  for(const name of ['qa-student','qa-admin']) {
    __inspectionGuard(false);
    const token=await createSession(users[name]);
    assert.equal((await readOnly(req(token))).status,403);
  }
  __inspectionGuard(false);
  const token=await createSession(users['qa-suspended']);
  assert.equal((await readOnly(req(token))).status,401);
  __inspectionGuard(false);
  users['qa-owner'].sessionVersion++;
  await USERS.setJSON(`user/${users['qa-owner'].id}`,users['qa-owner']);
  assert.equal((await readOnly(req(ownerToken))).status,401);
});
test('Owner gets only allowlisted metadata and safe exact progress summaries with no writes',async()=>{
  const response=await readOnly(req(ownerToken));
  assert.equal(response.status,200);
  assert.equal(response.headers.get('cache-control'),'no-store');
  const body=await response.json();
  assert.equal(body.schemaVersion,1);
  assert.equal(body.environment,'qa');
  assert.deepEqual(body.accounts.map(a=>a.username),names);
  for(const account of body.accounts) {
    assert.deepEqual(Object.keys(account).sort(),['username','exists','id','sessionVersion','status','role','baseline','progress','integrity'].sort());
    assert.equal(account.id,users[account.username].id);
    assert.equal(account.sessionVersion.stored,7);
    assert.equal(account.sessionVersion.effective,7);
  }
  const student=body.accounts.find(a=>a.username==='qa-student');
  assert.equal(student.baseline.matches,true);
  assert.deepEqual(student.progress,{present:true,totalAnswered:4,totalCorrect:3,currentStreak:2,bestStreak:2,studySeconds:300,statsCount:0,errorsCount:0,savedCount:0,historyCount:0,sessionPresent:false});
  assert.equal(body.accounts.find(a=>a.username==='qa-suspended').status,'suspended');
  assert.equal(body.accounts.find(a=>a.username==='qa-suspended').role.effective,null);
  assert.equal(body.accounts.find(a=>a.username==='superdev').role.effective,null);
  for(const name of ['qa-student-new','qa-admin','qa-owner','qa-suspended']) assert.equal(body.accounts.find(a=>a.username===name).baseline.matches,true);
  const serialized=JSON.stringify(body);
  for(const value of ['PRIVATE-FICTITIOUS-EMAIL','PRIVATE-FICTITIOUS-SALT','PRIVATE-FICTITIOUS-HASH','PRIVATE-OUTSIDE-DATA','PRIVATE-PROGRESS','PRIVATE-FEEDBACK','PRIVATE-ENV-SENTINEL','PRIVATE-DEV-SENTINEL',ownerToken,users.testmem.password.hash,'outside-user','unknown-fictitious-id','private-object-key']) assert.ok(!serialized.includes(value),`private value escaped: ${value.slice(0,10)}`);
  assert.doesNotMatch(serialized,/"(password|recovery|cookie|token|email|hash|salt)"/i);
});
test('SuperDev requires its real session flag and effective role is verified only for that session',async()=>{
  const weak=await createSession(users.superdev);
  assert.equal((await readOnly(req(weak))).status,403);
  __inspectionGuard(false);
  const strong=await createSession(users.superdev,false,{superdevAuthenticated:true});
  const response=await readOnly(req(strong,'?username=superdev'));
  assert.equal(response.status,200);
  const [account]=(await response.json()).accounts;
  assert.equal(account.role.effective,'superdev');
  assert.equal(account.role.sessionVerified,true);
});
test('closed query allowlist rejects extra keys, duplicate selectors, malformed names and mutation verbs',async()=>{
  for(const query of ['?username=outside-user','?username=qa-owner&username=testmem','?username=QA-OWNER','?store=study-hub-users-v1','?username=qa-owner&reset=true']) {
    assert.equal((await readOnly(req(ownerToken,query))).status,400);
  }
  for(const method of ['POST','PUT','DELETE','PATCH']) assert.equal((await readOnly(req(ownerToken,'',method))).status,405);
});
test('named integrity and private inventory detect foreign modifications, additions and deletion',async()=>{
  const before=await (await readOnly(req(ownerToken))).json();
  const same=await (await readOnly(req(ownerToken))).json();
  assert.deepEqual(same.integrity,before.integrity);
  assert.deepEqual(same.accounts,before.accounts);
  __inspectionGuard(false);
  users.testmem.password={salt:'CHANGED-PRIVATE-SALT',hash:'CHANGED-PRIVATE-HASH'};
  await USERS.setJSON(`user/${users.testmem.id}`,users.testmem);
  await feedback.setJSON('new-private-key',{message:'NEW-PRIVATE-DATA'});
  const after=await (await readOnly(req(ownerToken))).json();
  assert.notEqual(after.accounts.find(a=>a.username==='testmem').integrity.userDigest,before.accounts.find(a=>a.username==='testmem').integrity.userDigest);
  assert.equal(after.accounts.find(a=>a.username==='superdev').integrity.userDigest,before.accounts.find(a=>a.username==='superdev').integrity.userDigest);
  assert.notEqual(after.integrity.stores.find(s=>s.name==='study-hub-feedback-v1').digest,before.integrity.stores.find(s=>s.name==='study-hub-feedback-v1').digest);
  __inspectionGuard(false);
  await feedback.delete('private-object-key');
  const deleted=await (await readOnly(req(ownerToken))).json();
  assert.notEqual(deleted.integrity.stores.find(s=>s.name==='study-hub-feedback-v1').digest,after.integrity.stores.find(s=>s.name==='study-hub-feedback-v1').digest);
});
test('absence, legacy version default and inconsistent identity are explicit and safe',async()=>{
  await USERS.delete(`username/qa-student-new`);
  await USERS.delete(`user/${users['qa-student-new'].id}`);
  delete users.testmem.sessionVersion;
  await USERS.setJSON(`user/${users.testmem.id}`,users.testmem);
  const response=await readOnly(req(ownerToken));
  assert.equal(response.status,200);
  const body=await response.json();
  assert.deepEqual(body.accounts.find(a=>a.username==='qa-student-new'),{username:'qa-student-new',exists:false});
  assert.deepEqual(body.accounts.find(a=>a.username==='testmem').sessionVersion,{stored:null,effective:1});
  __inspectionGuard(false);
  await USERS.setJSON('username/qa-student-new',{userId:users.testmem.id});
  const invalid=await readOnly(req(ownerToken));
  assert.equal(invalid.status,409);
  assert.doesNotMatch(await invalid.text(),/testmem|fictitious-id|PRIVATE/i);
});
test('inventory is bounded and never claims completion after exceeding the object budget',async()=>{
  for(let i=0;i<513;i++) await feedback.setJSON(`opaque-${i}`,{value:i});
  const response=await readOnly(req(ownerToken));
  assert.equal(response.status,409);
  assert.doesNotMatch(await response.text(),/opaque-|"complete":true/);
});
test('canonical integrity does not depend on JSON property insertion order',async()=>{
  await feedback.setJSON('ordered',{a:1,b:{c:2,d:3}});
  const before=await (await readOnly(req(ownerToken))).json();
  __inspectionGuard(false);
  await feedback.setJSON('ordered',{b:{d:3,c:2},a:1});
  const after=await (await readOnly(req(ownerToken))).json();
  assert.deepEqual(after.integrity,before.integrity);
});
test('unknown store fails closed without reading its private contents',async()=>{
  await getStore('outside-scope-store').setJSON('outside-key',{secret:'PRIVATE-OUTSIDE-STORE'});
  const response=await readOnly(req(ownerToken));
  assert.equal(response.status,409);
  assert.ok(!__inspectionAccess().reads.some(r=>r.name==='outside-scope-store'));
  assert.doesNotMatch(await response.text(),/outside-scope|PRIVATE/);
});
test('unstable or incomplete observations fail without an application retry or partial snapshot',async()=>{
  let reads=0;
  __inspectionFault(({name,key,result})=>{
    if(name==='study-hub-feedback-v1' && key==='private-object-key') {
      reads++;
      return {...result,data:{value:reads}};
    }
    return result;
  });
  const response=await readOnly(req(ownerToken));
  assert.equal(response.status,409);
  assert.equal(reads,2);
  assert.doesNotMatch(await response.text(),/"complete":true/);
  __inspectionFault(({name,result})=>name==='study-hub-feedback-v1'?null:result);
  assert.equal((await readOnly(req(ownerToken))).status,409);
});
test('object size and invalid versions fail safely without exposing payload',async()=>{
  await feedback.setJSON('too-large',{value:'x'.repeat(1_000_001)});
  assert.equal((await readOnly(req(ownerToken))).status,409);
  __inspectionGuard(false);
  await feedback.delete('too-large');
  users.testmem.sessionVersion='PRIVATE-BAD-VERSION';
  await USERS.setJSON(`user/${users.testmem.id}`,users.testmem);
  const invalid=await readOnly(req(ownerToken));
  assert.equal(invalid.status,409);
  assert.doesNotMatch(await invalid.text(),/PRIVATE/);
});
test('orphaned or duplicate named identities and outside aliases cannot be mistaken for absent/owned accounts',async()=>{
  await USERS.delete('username/qa-student-new');
  assert.equal((await readOnly(req(ownerToken))).status,409);
  __inspectionGuard(false);
  await USERS.setJSON('username/qa-student-new',{userId:users['qa-student-new'].id});
  await USERS.setJSON('username/outside-alias',{userId:users.testmem.id});
  assert.equal((await readOnly(req(ownerToken))).status,409);
});
test('revocation during inspection cannot return an authorized snapshot',async()=>{
  let sessionReads=0;
  __inspectionFault(({name,result,method})=>{
    if(name==='study-hub-sessions-v1' && method==='get') {
      sessionReads++;
      if(sessionReads===2) return {...result,expiresAt:0};
    }
    return result;
  });
  assert.equal((await readOnly(req(ownerToken))).status,401);
  assert.equal(sessionReads,2);
});
test('metadata affects integrity but metadata contents never escape',async()=>{
  const before=await (await readOnly(req(ownerToken))).json();
  __inspectionFault(({name,result,method})=>name==='study-hub-feedback-v1' && method==='getWithMetadata'?{...result,metadata:{private:'PRIVATE-METADATA'}}:result);
  const response=await readOnly(req(ownerToken));
  assert.equal(response.status,200);
  const after=await response.json();
  assert.notEqual(after.integrity.stores.find(s=>s.name==='study-hub-feedback-v1').digest,before.integrity.stores.find(s=>s.name==='study-hub-feedback-v1').digest);
  assert.ok(!JSON.stringify(after).includes('PRIVATE-METADATA'));
});
test('an existing null or scalar progress object is never mistaken for an empty baseline',async()=>{
  for(const value of [null,false,0,'']) {
    __inspectionGuard(false);
    await progress.setJSON(`user/${users['qa-student-new'].id}`,value);
    const response=await readOnly(req(ownerToken,'?username=qa-student-new'));
    assert.equal(response.status,200);
    const [account]=(await response.json()).accounts;
    assert.equal(account.baseline.matches,false);
    assert.equal(account.progress.present,true);
  }
});
test('an existing Owner outside target allowlist may inspect without exposing its identity',async()=>{
  process.env.OWNER_USERNAME='qa-owner,existing-inspector';
  const actor={id:'fictitious-inspector-id',username:'existing-inspector',status:'active',sessionVersion:1};
  await USERS.setJSON(`user/${actor.id}`,actor);
  const token=await createSession(actor);
  const response=await readOnly(req(token));
  assert.equal(response.status,200);
  const body=await response.json();
  assert.deepEqual(body.accounts.map(a=>a.username),names);
  assert.ok(!JSON.stringify(body).includes('existing-inspector'));
  assert.ok(!JSON.stringify(body).includes(actor.id));
});

test('inspector requests strong consistency for catalog, store listings and object reads',async()=>{
  assert.equal((await readOnly(req(ownerToken))).status,200);
  const reads=__inspectionAccess().reads;
  assert.equal(reads.filter(r=>r.method==='listStores').length,2);
  assert.equal(reads.filter(r=>r.method==='getStore').length,18);
  assert.equal(reads.filter(r=>r.method==='list').length,18);
  assert.ok(reads.some(r=>r.method==='getWithMetadata'));
  assert.ok(reads.some(r=>r.method==='get'));
  for(const read of reads) assert.equal(read.consistency,'strong',`weak read: ${read.method}`);
});

test('final read failures stop on the first SDK rejection without our own retry or partial data',async()=>{
  for(const method of ['listStores','list','getWithMetadata','get']) {
    let calls=0;
    __inspectionFault(event=>{
      if(event.method===method && (method==='listStores' || event.name==='study-hub-users-v1')) {
        calls++;
        if(calls===1) throw new Error('PRIVATE-FINAL-READ-FAILURE');
      }
      return event.result;
    });
    const response=await readOnly(req(ownerToken));
    assert.equal(response.status,409,method);
    assert.equal(calls,1,`application retried ${method}`);
    const body=await response.json();
    assert.deepEqual(Object.keys(body),['error']);
    assert.ok(!JSON.stringify(body).includes('PRIVATE'));
  }
});

test('malformed SDK object envelopes fail closed without returning a partial snapshot',async()=>{
  for(const envelope of [{}, {metadata:{}}, {data:undefined,metadata:{}}, {data:{}}, {data:{},metadata:null}, {data:{},metadata:'PRIVATE-METADATA'}, {data:{},metadata:[]}]) {
    __inspectionFault(event=>event.method==='getWithMetadata' && event.name==='study-hub-feedback-v1'?envelope:event.result);
    const response=await readOnly(req(ownerToken));
    assert.equal(response.status,409);
    assert.deepEqual(Object.keys(await response.json()),['error']);
  }
});

test('a final read failure in the second capture discards the already completed first capture',async()=>{
  let reads=0;
  __inspectionFault(event=>{
    if(event.method==='getWithMetadata' && event.name==='study-hub-feedback-v1' && ++reads===2) throw new Error('PRIVATE-LATE-READ-ERROR');
    return event.result;
  });
  const response=await readOnly(req(ownerToken));
  assert.equal(response.status,409);
  assert.equal(reads,2);
  const body=await response.json();
  assert.deepEqual(Object.keys(body),['error']);
  assert.ok(!JSON.stringify(body).includes('PRIVATE'));
});

test('write guard detects set, setJSON, delete and deleteAll even when their errors are swallowed',async()=>{
  for(const method of ['set','setJSON','delete','deleteAll']) {
    let attempted=false;
    __inspectionFault(async event=>{
      if(!attempted && event.method==='getWithMetadata') {
        attempted=true;
        try { await feedback[method]('private-object-key',{message:'FORBIDDEN-WRITE'}); } catch {}
      }
      return event.result;
    });
    await assert.rejects(()=>readOnly(req(ownerToken)),/inspection attempted a store write/,method);
    assert.equal(__inspectionAccess().writes.length,1);
    assert.equal(__inspectionAccess().writes[0].method,method);
  }
});

test('real Blobs SDK may retry a read internally; final exhaustion still fails the endpoint safely',async()=>{
  // Load the installed SDK itself; only its external transport is simulated. No network is used.
  const previousNodeEnv=process.env.NODE_ENV;
  process.env.NODE_ENV='test';
  let sdk;
  try { sdk=await import(new URL('../node_modules/@netlify/blobs/dist/main.js',import.meta.url)); }
  finally { if(previousNodeEnv===undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV=previousNodeEnv; }
  let transportCalls=0, logicalCalls=0, failFinally=false;
  const sdkStore=sdk.getStore({name:'study-hub-feedback-v1',consistency:'strong',siteID:'fictitious-site',token:'FAKE-SDK-TOKEN',edgeURL:'https://cached.example.test',uncachedEdgeURL:'https://strong.example.test',fetch:async(url,options)=>{
    assert.equal(options.method.toLowerCase(),'get','SDK attempted a write');
    assert.equal(new URL(url).host,'strong.example.test','SDK used a stale-capable endpoint');
    transportCalls++;
    if(failFinally || transportCalls===1) return new Response('PRIVATE-TRANSPORT-ERROR',{status:503});
    return Response.json({message:'PRIVATE-FEEDBACK'});
  }});
  __inspectionFault(event=>{
    if(event.method==='getWithMetadata' && event.name==='study-hub-feedback-v1') {
      logicalCalls++;
      return sdkStore.getWithMetadata(event.key,{type:'json',consistency:'strong'});
    }
    return event.result;
  });
  const allowed=await readOnly(req(ownerToken));
  assert.equal(allowed.status,200);
  assert.equal(logicalCalls,2,'more than two application captures');
  assert.equal(transportCalls,3,'one SDK retry plus the two successful reads');
  const serialized=JSON.stringify(await allowed.json());
  for(const value of ['PRIVATE-FEEDBACK','PRIVATE-TRANSPORT-ERROR','FAKE-SDK-TOKEN',ownerToken,users.testmem.password.hash]) assert.ok(!serialized.includes(value));
  assert.doesNotMatch(serialized,/"(password|recovery|cookie|token|email|hash|salt)"/i);
  failFinally=true; transportCalls=0; logicalCalls=0;
  const exhausted=await readOnly(req(ownerToken));
  assert.equal(exhausted.status,409);
  assert.equal(logicalCalls,1,'Study Hub retried a rejected SDK operation');
  assert.equal(transportCalls,6,'installed SDK must stop after five internal retries');
  assert.deepEqual(Object.keys(await exhausted.json()),['error']);
});
