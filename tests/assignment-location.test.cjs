const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

// Exercise the real start route with isolated auth/storage boundaries.
function fixture({ enabled = false, user = 'promotor', existing = null, assigned = true } = {}) {
  const state = { tracking: existing, geocodingCalls: 0, writes: 0 };
  const service = {
    from(table) {
      let mutation;
      const query = {
        select() { return query; }, eq() { return query; },
        update(value) { mutation = value; return query; },
        insert(value) { mutation = value; return query; },
        async single() { return query.maybeSingle(); },
        async maybeSingle() {
          if (table === 'assignment_participants') return { data: assigned ? { user_id: user } : null };
          if (table === 'user_profiles') return { data: { role: user === 'admin' ? 'admin_staff' : 'promotor' } };
          if (table === 'assignments') return { data: { id: 'visit', title: 'Fixture market', location_text: 'Fixture address' } };
          if (table === 'assignment_tracking') {
            if (mutation) {
              state.writes++;
              state.tracking = { id: 'tracking', ...state.tracking, ...mutation };
            }
            return { data: state.tracking };
          }
          throw new Error('Unexpected table: ' + table);
        },
      };
      return query;
    },
  };
  const cache = new Map();
  function load(relative) {
    const filename = path.resolve(__dirname, '..', relative);
    if (cache.has(filename)) return cache.get(filename).exports;
    const loaded = new Module(filename, module);
    loaded.filename = filename;
    loaded.paths = Module._nodeModulePaths(path.dirname(filename));
    const original = loaded.require.bind(loaded);
    loaded.require = name => {
      if (name === '@/lib/location/config') return { ASSIGNMENT_LOCATION_TRACKING_ENABLED: enabled };
      if (name === '@/lib/supabase/server') return { createSupabaseServerClientAsync: async () => ({ auth: { getUser: async () => ({ data: { user: user ? { id: user } : null } }) } }) };
      if (name === '@/lib/supabase/service') return { createSupabaseServiceClient: () => service };
      if (name === '@/lib/storage/einsatzPhotos') return { signEinsatzPhotoFields: async (_, row) => row };
      if (name === '@/lib/location/googleGeocoding') return {
        MarketGeocodingError: class extends Error {},
        geocodeMarketAddress: async () => { state.geocodingCalls++; return { latitude: 48.2, longitude: 16.3, formattedAddress: 'Fixture market' }; },
      };
      if (name.startsWith('@/')) return load(name.slice(2) + '.ts');
      return original(name);
    };
    cache.set(filename, loaded);
    loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    }).outputText, filename);
    return loaded.exports;
  }
  const { PATCH } = load('app/api/assignments/today/route.ts');
  return { state, start: payload => PATCH(new Request('http://fixture.invalid/api/assignments/today', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assignment_id: 'visit', ...payload }),
  })) };
}

test('disabled tracking starts visits without coordinates through both start APIs', async () => {
  for (const payload of [
    { action: 'start' },
    { actual_start_time: '2026-10-14T09:00:00.000Z', status: 'gestartet', early_start_reason: 'Fixture reason', minutes_early_start: 20 },
  ]) {
    const f = fixture();
    assert.equal((await f.start(payload)).status, 200);
    assert.equal(f.state.tracking.status, 'gestartet');
    assert.ok(f.state.tracking.actual_start_time);
    assert.equal(f.state.geocodingCalls, 0);
    assert.equal(f.state.tracking.start_latitude, undefined);
    assert.equal(f.state.tracking.location_confirmed, undefined);
    if (payload.early_start_reason) assert.equal(f.state.tracking.early_start_reason, payload.early_start_reason);
  }
});

test('disabled tracking ignores stale client coordinates and preserves historical location data', async () => {
  const historical = { id: 'tracking', market_latitude: 48.2, market_longitude: 16.3, start_latitude: 48.2, start_location_status: 'verified' };
  for (const existing of [null, historical]) {
    const f = fixture({ existing });
    assert.equal((await f.start({ action: 'start', location: { latitude: 0, longitude: 0, accuracy_meters: 10 } })).status, 200);
    assert.equal(f.state.geocodingCalls, 0);
    assert.equal(f.state.tracking.start_latitude, existing?.start_latitude);
    assert.equal(f.state.tracking.start_location_status, existing?.start_location_status);
  }
});

test('the bypass retains authentication, assignment ownership, and required completion photos', async () => {
  for (const [options, payload, status] of [
    [{ user: null }, { action: 'start' }, 401],
    [{ assigned: false }, { action: 'start' }, 403],
    [{}, { action: 'start', user_id: 'other-promotor' }, 403],
    [{}, { status: 'gestartet' }, 400],
    [{}, { action: 'stop' }, 409],
  ]) {
    const f = fixture(options);
    assert.equal((await f.start(payload)).status, status);
    assert.equal(f.state.writes, 0);
  }
});

test('reenabling the switch restores location requirements, the radius check, and verified stamps', async () => {
  for (const [location, status, code] of [
    [undefined, 422, 'LOCATION_REQUIRED'],
    [{ latitude: 0, longitude: 0, accuracy_meters: 10 }, 422, 'LOCATION_OUTSIDE_RADIUS'],
    [{ latitude: 48.2, longitude: 16.3, accuracy_meters: 10 }, 200, undefined],
  ]) {
    const f = fixture({ enabled: true });
    const response = await f.start({ action: 'start', location });
    assert.equal(response.status, status);
    const result = await response.json();
    assert.equal(result.code, code);
    if (status === 200) {
      assert.equal(f.state.tracking.start_location_status, 'verified');
      assert.equal(f.state.tracking.location_confirmed, true);
      assert.equal(f.state.tracking.start_latitude, 48.2);
      assert.ok(f.state.tracking.start_location_captured_at);
    } else assert.equal(f.state.writes, 0);
  }
});

test('middleware permits promoter tracking updates while retaining admin edits and deleted-account guards', async () => {
  const filename = path.resolve(__dirname, '..', 'middleware.ts');
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = loaded.require.bind(loaded);
  let user = { id: 'promotor' };
  let profile = { role: 'promotor', deleted: false };
  loaded.require = name => name === '@supabase/ssr' ? {
    createServerClient: () => ({
      auth: { getUser: async () => ({ data: { user } }) },
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: profile }) }) }) }),
    }),
  } : original(name);
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, filename);
  const { NextRequest } = require('next/server');
  const before = [process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY];
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://fixture.invalid';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'fixture-anon';
  try {
    const request = (pathname, method = 'PATCH') => loaded.exports.middleware(new NextRequest('http://fixture.invalid' + pathname, { method }));
    assert.equal((await request('/api/assignments/today')).headers.get('x-middleware-next'), '1');
    assert.equal((await request('/api/assignments/11111111-1111-4111-8111-111111111111')).status, 403);
    assert.equal((await request('/api/assignments/today', 'DELETE')).status, 403);
    profile = { role: 'promotor', deleted: true };
    assert.equal((await request('/api/assignments/today')).status, 403);
    user = null;
    assert.equal((await request('/api/assignments/today')).status, 401);
  } finally {
    ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'].forEach((key, i) => {
      if (before[i] === undefined) delete process.env[key];
      else process.env[key] = before[i];
    });
  }
});
