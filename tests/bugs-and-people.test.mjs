import test from 'node:test';
import assert from 'node:assert/strict';
import { getStore, __resetAll } from '@netlify/blobs';
import bugsHandler from '../netlify/functions/bugs.mjs';
import friendsHandler from '../netlify/functions/friends.mjs';
import { COOKIE, createSession } from '../netlify/functions/_shared/auth.mjs';

const USERS=getStore('study-hub-users-v1');
function request(path,{method='GET',body,token,query='',ip='127.0.0.1'}={}){const headers={'content-type':'application/json','x-forwarded-for':ip};if(token)headers.cookie=`${COOKIE}=${token}`;return new Request(`https://study-hub.test/.netlify/functions/${path}${query}`,{method,headers,body:body?JSON.stringify(body):undefined});}
async function payload(response){return{status:response.status,data:await response.json()};}
async function user(input){const row={sessionVersion:1,status:'active',createdAt:1,updatedAt:1,normalizedUsername:input.username.toLowerCase(),displayName:input.username,socialPrivacy:{profileVisibility:'limited',friendRequests:'everyone'},...input};await USERS.setJSON(`user/${row.id}`,row);await USERS.setJSON(`username/${row.normalizedUsername}`,{userId:row.id});return row;}
async function token(row){return createSession(row,true,{superdevAuthenticated:row.securityRole==='superdev'});}
test.beforeEach(()=>{__resetAll();process.env.OWNER_USERNAME='owner';process.env.ADMIN_USERNAMES='';});

test('reporte normal sanitiza tokens y el miembro solo ve sus reportes',async()=>{
  const first=await user({id:'u1',username:'first'}),second=await user({id:'u2',username:'second'});const firstToken=await token(first),secondToken=await token(second);
  const created=await payload(await bugsHandler(request('bugs',{method:'POST',token:firstToken,body:{section:'Práctica',errorType:'study',userDescription:'Falló al responder',safeErrorMessage:'Authorization: abcdefghijklmnopqrstuvwxyz123456 URL https://example.test/x?token=secret',source:'manual'}})));
  assert.equal(created.status,201);assert.doesNotMatch(JSON.stringify(created.data),/abcdefghijklmnopqrstuvwxyz123456|\?token=/);
  assert.equal((await payload(await bugsHandler(request('bugs',{token:secondToken})))).data.reports.length,0);
  assert.equal((await payload(await bugsHandler(request('bugs',{token:firstToken})))).data.reports.length,1);
});

test('Admin lista y cambia estado/severidad; miembro no puede hacerlo',async()=>{
  const member=await user({id:'u1',username:'member'}),admin=await user({id:'a1',username:'staff',securityRole:'admin'});const memberToken=await token(member),adminToken=await token(admin);
  const created=(await payload(await bugsHandler(request('bugs',{method:'POST',token:memberToken,body:{section:'Hub',errorType:'ui',userDescription:'La tarjeta se corta',source:'manual'}})))).data.report;
  assert.equal((await payload(await bugsHandler(request('bugs',{method:'POST',token:memberToken,body:{action:'update',bugReportId:created.bugReportId,status:'fixed'}})))).status,403);
  const listed=await payload(await bugsHandler(request('bugs',{token:adminToken})));assert.equal(listed.data.reports.length,1);
  const updated=await payload(await bugsHandler(request('bugs',{method:'POST',token:adminToken,body:{action:'update',bugReportId:created.bugReportId,status:'confirmed',severity:'high',resolution:'En revisión'}})));
  assert.equal(updated.data.report.status,'confirmed');assert.equal(updated.data.report.severity,'high');
});

test('reportes similares se marcan como posible duplicado sin cerrarse',async()=>{
  const member=await user({id:'u1',username:'member'}),memberToken=await token(member);const body={section:'Calendario',errorType:'calendar',userDescription:'No abre',safeErrorMessage:'timeout calendar',source:'automatic'};
  const first=(await payload(await bugsHandler(request('bugs',{method:'POST',token:memberToken,body})))).data.report;
  const second=(await payload(await bugsHandler(request('bugs',{method:'POST',token:memberToken,body:{...body,userDescription:'Volvió a fallar'}})))).data.report;
  const admin=await user({id:'a1',username:'staff',securityRole:'admin'}),adminToken=await token(admin);const rows=(await payload(await bugsHandler(request('bugs',{token:adminToken})))).data.reports;
  const duplicate=rows.find(row=>row.bugReportId===second.bugReportId);assert.equal(duplicate.possibleDuplicate,first.bugReportId);assert.equal(duplicate.status,'new');
});

test('Personas excluye self, suspendidos, privados, bloqueados y no expone datos internos',async()=>{
  const viewer=await user({id:'u1',username:'viewer',email:'viewer@example.test'}),visible=await user({id:'u2',username:'visible',displayName:'Persona Visible',email:'secret@example.test'});await user({id:'u3',username:'private',socialPrivacy:{profileVisibility:'private',friendRequests:'everyone'}});await user({id:'u4',username:'suspended',status:'suspended'});await user({id:'u5',username:'closed',socialPrivacy:{profileVisibility:'limited',friendRequests:'nobody'}});
  const viewerToken=await token(viewer);const result=await payload(await friendsHandler(request('friends',{token:viewerToken,query:'?action=people&limit=20'})));
  assert.deepEqual(result.data.people.map(row=>row.username),['visible']);assert.doesNotMatch(JSON.stringify(result.data),/secret@example|"id"/);
  await friendsHandler(request('friends',{method:'POST',token:viewerToken,body:{action:'block',username:visible.username}}));
  assert.equal((await payload(await friendsHandler(request('friends',{token:viewerToken,query:'?action=people'})))).data.people.length,0);
});
