const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const XLSX = require('xlsx');
const cache = new Map();
function sourceModule(relative) {
  const filename = path.resolve(__dirname, '..', relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = loaded.require.bind(loaded);
  loaded.require = name => {
    if (name.startsWith('@/')) return sourceModule(name.slice(2) + '.ts');
    if (name.startsWith('.')) return sourceModule(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(filename), name)) + '.ts');
    return original(name);
  };
  cache.set(filename, loaded);
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText, filename);
  return loaded.exports;
}
const { buildLeaderboard, rankLeaderboard } = sourceModule('lib/statistics/rankings.ts');
const profiles = ['a','b','old'].map(user_id => ({ user_id, role:'promotor', display_name:user_id }));
profiles.push({ user_id:'deleted', role:'promotor', deleted:true }, { user_id:'admin', role:'admin_staff' });
const sale = (user_id, month, mc, sent_at='2026-10-13') => ({ user_id, wave_month:month+'-01', einsatztage:2, mc, tma:mc/2, vl:0, sent_at });
test('admin ranks include sent rows, employee ranks exclude drafts and names', () => {
  const rows=[sale('a','2026-10',8),sale('b','2026-10',10,null),sale('deleted','2026-10',20),sale('admin','2026-10',30)];
  const options={ userId:'a', month:'2026-10' };
  const admin=buildLeaderboard(rows,[],profiles,{...options,admin:true});
  assert.equal(admin.leaderboard.length,2);
  assert.equal(rankLeaderboard(admin.leaderboard,'mcet').find(x=>x.user_id==='a').rank,2);
  const employee=buildLeaderboard(rows,[],profiles,{...options,admin:false});
  assert.equal(employee.leaderboard.length,1);
  assert.equal(employee.currentUserData.mcet,4);
  assert.equal(employee.currentUserData.name,undefined);
});
test('latest ranks compare one reporting month, with monthly data replacing duplicate feedback', () => {
  const feedback=[{user_id:'a',wave_month:'2026-10-01',created_at:'2026-12-01',mc_et:99,tma:99,vl_value:99}];
  const result=buildLeaderboard([sale('a','2026-10',8),sale('old','2026-09',20)],feedback,profiles,{userId:'a',admin:false});
  assert.equal(result.waveMonth,'2026-10');
  assert.equal(result.leaderboard.length,1);
  assert.equal(result.currentUserData.mcet,4);
});
test('legacy feedback uses its reporting month and six-month averages count each month once', () => {
  const feedback=[{user_id:'a',wave_month:'2026-09-01',created_at:'2026-12-01',mc_et:6,tma:80,vl_value:10}];
  const result=buildLeaderboard([sale('a','2026-10',8)],feedback,profiles,{userId:'a',admin:false,timeframe:'6months'});
  assert.equal(result.currentUserData.mcet,5);
});
test('ties have the same rank in the list and current-user position', () => {
  const entries=['b','a','c'].map((user_id,i)=>({user_id,isCurrentUser:user_id==='a',mcet:i===2?3:4,tma:75,vlshare:0}));
  assert.deepEqual(rankLeaderboard(entries,'mcet').map(row=>[row.user_id,row.rank]),[['a',1],['b',1],['c',3]]);
});

test('unassigned legacy rows do not turn the upload month into the latest reporting period', () => {
 const feedback=[{user_id:'b',wave_month:null,created_at:'2026-12-01',mc_et:9,tma:90,vl_value:10}];
 const result=buildLeaderboard([sale('a','2026-10',8)],feedback,profiles,{userId:'a',admin:false});
 assert.equal(result.waveMonth,'2026-10');assert.equal(result.leaderboard.length,1);
});
