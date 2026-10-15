const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
function loader(stubs={}){const cache=new Map();function load(relative){let filename=path.resolve(__dirname,'..',relative);if(!path.extname(filename))filename+='.ts';if(cache.has(filename))return cache.get(filename).exports;const mod=new Module(filename,module);mod.filename=filename;mod.paths=Module._nodeModulePaths(path.dirname(filename));const original=mod.require.bind(mod);mod.require=name=>{if(name in stubs)return stubs[name];if(name.startsWith('@/'))return load(name.slice(2));if(name.startsWith('.'))return load(path.relative(path.resolve(__dirname,'..'),path.resolve(path.dirname(filename),name)));return original(name)};cache.set(filename,mod);mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,filename);return mod.exports}return load}
const assignment='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',owner='11111111-1111-4111-8111-111111111111';
const field='foto_maschine_url',objectPath=owner+'/'+assignment+'/foto_maschine.jpg';

test('legacy and current references become stable authenticated URLs without storage requests',()=>{
 const {withEinsatzPhotoUrls,extractEinsatzPhotoPath}=loader()('lib/storage/einsatzPhotos.ts');
 const reference='https://fixture.invalid/storage/v1/object/public/einsatz-photos/'+objectPath;
 const row={assignment_id:assignment,user_id:owner,[field]:reference,foto_extra_url:null};
 const result=withEinsatzPhotoUrls(row);assert.equal(result[field],'/api/einsatz-photos?assignment='+assignment+'&user='+owner+'&photo='+field);assert.equal(result.foto_extra_url,null);assert.equal(row[field],reference);assert.equal(extractEinsatzPhotoPath(reference),objectPath);
 const list=withEinsatzPhotoUrls({id:assignment,lead_user_id:owner,tracking_foto_maschine_url:objectPath},['tracking_foto_maschine_url']);assert.equal(list.tracking_foto_maschine_url,result[field]);
});

test('viewing links coalesce concurrent requests, reuse valid signatures, and renew before expiry',async()=>{
 const {photoAccessUrl,validPhotoPath}=loader()('lib/storage/photoAccess.ts');let calls=0;const service={storage:{from:()=>({createSignedUrl:async()=>({data:{signedUrl:'https://fixture.invalid/image?token='+ ++calls}})})}};
 const original=Date.now;let now=original();Date.now=()=>now;
 try{const urls=await Promise.all([photoAccessUrl(service,'einsatz-photos',objectPath),photoAccessUrl(service,'einsatz-photos',objectPath),photoAccessUrl(service,'einsatz-photos',objectPath)]);assert.equal(calls,1);assert.ok(urls.every(url=>url===urls[0]));now+=16*60*1000;assert.notEqual(await photoAccessUrl(service,'einsatz-photos',objectPath),urls[0]);assert.equal(calls,2);await photoAccessUrl(service,'einsatz-photos',objectPath,true);assert.equal(calls,3)}finally{Date.now=original}
 for(const p of ['../private','/root','a/../b','a\\b','a\0b'])assert.equal(validPhotoPath(p),false,p);assert.equal(validPhotoPath(objectPath),true);
});

test('photo endpoint checks ownership on every request, including cached images and admin archives',async()=>{
 let auth={ok:true,user:{id:owner},isAdmin:false},signs=0,reads=0;
 const service={from:()=>{const query={select:()=>query,eq:()=>query,maybeSingle:async()=>{reads++;return{data:{[field]:objectPath}}}};return query},storage:{from:()=>({createSignedUrl:async()=>{signs++;return{data:{signedUrl:'https://fixture.invalid/image'}}}})}};
 const load=loader({'@/lib/auth/routeGuards':{requireUser:async()=>auth},'@/lib/supabase/service':{createSupabaseServiceClient:()=>service}});
 const {GET}=load('app/api/einsatz-photos/route.ts');
 const request=(params={})=>GET(new Request('http://fixture.invalid/api/einsatz-photos?'+new URLSearchParams({assignment,user:owner,photo:field,...params})));
 let res=await request();assert.equal(res.status,307);assert.equal(res.headers.get('cache-control'),'private, no-store');assert.equal(signs,1);
 auth={...auth,user:{id:'other'}};assert.equal((await request()).status,403);assert.equal(signs,1);assert.equal(reads,1);
 auth={...auth,isAdmin:true};assert.equal((await request()).status,307);assert.equal(reads,2);assert.equal(signs,1);
 assert.equal((await request({photo:'actual_start_time'})).status,400);assert.equal((await request({archive:objectPath,bucket:'documents'})).status,400);assert.equal((await request({archive:'../secret',bucket:'einsatz-photos'})).status,404);
 auth={...auth,isAdmin:false};assert.equal((await request({archive:objectPath,bucket:'einsatz-photos'})).status,403);
 auth={ok:false,response:require('next/server').NextResponse.json({error:'unauthorized'},{status:401})};assert.equal((await request()).status,401);
});

test('a rate-limited storage lookup stays a visible retryable failure, without erasing saved metadata',async()=>{
 const record={[field]:objectPath};let failed=true;
 const service={from:()=>{const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:record})};return q},storage:{from:()=>({createSignedUrl:async()=>failed?{error:{statusCode:'429',message:'Too many requests'}}:{data:{signedUrl:'https://fixture.invalid/recovered'}}})}};
 const {GET}=loader({'@/lib/auth/routeGuards':{requireUser:async()=>({ok:true,user:{id:owner},isAdmin:false})},'@/lib/supabase/service':{createSupabaseServiceClient:()=>service}})('app/api/einsatz-photos/route.ts');
 const req=()=>new Request('http://fixture.invalid/api/einsatz-photos?'+new URLSearchParams({assignment,user:owner,photo:field}));
 const res=await GET(req());assert.equal(res.status,503);assert.match((await res.json()).error,/erneut/);assert.equal(record[field],objectPath);failed=false;assert.equal((await GET(req())).status,307);
});

test('historical duplicate leads do not hide the unique photo uploader or create a false 404',async()=>{
 const assignments=[{id:assignment,lead_user_id:'other'},{id:assignment,lead_user_id:owner}];
 const rows=[{assignment_id:assignment,user_id:'other',status:'beendet'},{assignment_id:assignment,user_id:owner,[field]:objectPath,status:'beendet'}];
 const service={from:table=>{const q={select:()=>q,eq:()=>q,order:()=>q,then:resolve=>resolve({data:table==='assignments_with_buddy_info'?assignments:table==='assignment_tracking'?rows:[]})};return q}};
 const {GET}=loader({'@/lib/auth/routeGuards':{requireAdmin:async()=>({ok:true,user:{id:'admin'},isAdmin:true})},'@/lib/supabase/service':{createSupabaseServiceClient:()=>service},'@/lib/audit/dataAccess':{recordDataAccess:async()=>{}}})('app/api/assignments/[id]/tracking/route.ts');
 const res=await GET(new Request('http://fixture.invalid'),{params:Promise.resolve({id:assignment})});assert.equal(res.status,200);const result=await res.json();assert.equal(result.assignment.lead_user_id,owner);assert.equal(result.tracking.user_id,owner);assert.match(result.tracking[field],/api\/einsatz-photos/);
});

test('old market forms preserve newer photos while allowing comments and ordering changes',()=>{
 const {mergeMarketPhotos}=loader()('lib/storage/marketPhotos.ts');const current=[{url:'A',comment:'old'},{url:'B',comment:'new upload'}];
 assert.deepEqual(mergeMarketPhotos(current,[]).map(p=>p.url),['A','B']);const merged=mergeMarketPhotos(current,[{url:'A',comment:'edited'},{url:'unknown'}]);assert.equal(merged[0].comment,'edited');assert.equal(merged[1].url,'B');assert.equal(merged[1].comment,'new upload');assert.equal(current[0].comment,'old');
});

test('market import identity requires the same name, address, postcode and city',()=>{
 const {marketImportKey}=loader()('lib/storage/marketPhotos.ts');const row={name:'Fixture Markt',address:'Hauptstraße 1',plz:'1010',city:'Wien'};
 assert.equal(marketImportKey(row),marketImportKey({...row,name:' fixture markt '}));assert.notEqual(marketImportKey(row),marketImportKey({...row,address:'Hauptstraße 2'}));assert.notEqual(marketImportKey(row),marketImportKey({...row,plz:'1020'}));
});

test('optimistic market photo updates retry a concurrent upload and retain both photos',async()=>{
 const {updateMarketWithPhotos}=loader()('lib/storage/marketPhotos.ts');let current={photos_internal:[],photos_exterior:[{url:'A'}],photos_interior:[],photos_products:[]},race=true;
 const service={from:()=>{let change,expected;const q={select:()=>q,eq:(key,value)=>{if(key==='photos_exterior')expected=value;return q},update:value=>{change=value;return q},single:async()=>({data:structuredClone(current)}),maybeSingle:async()=>{if(race){race=false;current.photos_exterior.push({url:'B'});return{data:null}}assert.equal(expected,JSON.stringify(current.photos_exterior));current={...current,...change};return{data:structuredClone(current)}}};return q}};
 const result=await updateMarketWithPhotos(service,'market',{}, {photos_exterior:[{url:'C'}]},true);assert.deepEqual(result.photos_exterior.map(p=>p.url),['A','B','C']);
});

test('archive walks old folders and keeps stored photos visible when parent records are gone',async()=>{
 const linked='einsatz-photos/'+assignment+'_foto_maschine_1.jpg',orphan='einsatz-photos/deleted_foto_maschine_2.jpg';let listings=0;
 const files={'':[{name:'einsatz-photos',id:null,metadata:null}],'einsatz-photos':[{name:linked.split('/')[1],id:'linked',created_at:'2026-07-01'},{name:orphan.split('/')[1],id:'orphan',created_at:'2025-09-01'}]};
 const service={storage:{from:()=>({list:async folder=>{listings++;return{data:files[folder]||[]}}})},from:()=>{const q={select:()=>q,order:()=>q,range:async()=>({data:[{[field]:'https://fixture.invalid/storage/v1/object/public/einsatz-photos/'+linked}]})};return q}};
 const {photoArchive}=loader()('lib/storage/photoArchive.ts');const photos=await photoArchive(service,'einsatz-photos');assert.equal(photos.length,2);assert.equal(photos.find(p=>p.id==='linked').linked,true);assert.equal(photos.find(p=>p.id==='orphan').linked,false);assert.ok(photos.every(p=>p.url.startsWith('/api/einsatz-photos?')));await photoArchive(service,'einsatz-photos');assert.equal(listings,2);
});
