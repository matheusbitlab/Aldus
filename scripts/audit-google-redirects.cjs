// Real GoTrue redirect probe. Only public app configuration is used.
// Simulates provider cancellation; never logs state, codes, cookies or credentials.
const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');

const local = {};
if (fs.existsSync('.env.local')) {
  for (const raw of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const line = raw.trim(), separator = line.indexOf('=');
    if (separator > 0 && !line.startsWith('#')) {
      local[line.slice(0, separator).trim()] = line.slice(separator + 1).trim().replace(/^(["'])(.*)\1$/, '$2');
    }
  }
}
const base = process.env.EXPO_PUBLIC_SUPABASE_URL || local.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY || local.EXPO_PUBLIC_SUPABASE_KEY;
const request = (url, options = {}) => fetch(url, { ...options, redirect: 'manual', signal: AbortSignal.timeout(20000) });
const reportPath = path.resolve('artifacts/auth/urgent/redirect-probe.json');
let currentReport;
function saveReport() {
  if (!currentReport) return;
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(currentReport, null, 2) + '\n');
}

async function run() {
  if (!base || !key) throw Error('PUBLIC_CONFIGURATION_MISSING');
  const project = new URL(base);
  if (project.protocol !== 'https:' || !project.hostname.endsWith('.supabase.co')) throw Error('INVALID_SUPABASE_PROJECT_URL');
  const report = {
    time: new Date().toISOString(), project: project.hostname,
    method: 'Real OAuth initiation followed by simulated provider cancellation; no user login, email or code exchange',
    executionStatus: 'RUNNING', checks: [],
  };
  currentReport = report;
  saveReport();
  for (const [label, redirectTo] of [
    ['native', 'aldus://auth/callback'],
    ['native_recovery', 'aldus://auth/callback?next=reset-password'],
    ['web_dev', 'http://localhost:8081/auth/callback'],
    ['unknown_control', 'aldus-test-invalid://auth/callback'],
    ['native_path_control', 'aldus://auth/unapproved-callback'],
  ]) {
    const memory = new Map();
    const client = createClient(base, key, { auth: {
      persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, flowType: 'pkce',
      storage: { getItem: k => memory.get(k) || null, setItem: (k, value) => memory.set(k, value), removeItem: k => memory.delete(k) },
    } });
    const { data, error } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: true } });
    if (error || !data.url) throw Error('OAUTH_INITIALIZATION_FAILED');
    const authorizeUrl = new URL(data.url);
    if (authorizeUrl.origin !== project.origin || authorizeUrl.pathname !== '/auth/v1/authorize') throw Error('UNEXPECTED_AUTHORIZE_ENDPOINT');
    const start = await request(authorizeUrl), provider = start.headers.get('location');
    await start.body?.cancel();
    if (!provider) throw Error('PROVIDER_REDIRECT_MISSING');
    const providerUrl = new URL(provider), state = providerUrl.searchParams.get('state');
    if (providerUrl.hostname !== 'accounts.google.com' || !state) throw Error('UNEXPECTED_PROVIDER_REDIRECT');
    const providerCallback = new URL(providerUrl.searchParams.get('redirect_uri') || '');
    if (providerCallback.origin !== project.origin || providerCallback.pathname !== '/auth/v1/callback' ||
      providerCallback.search || providerCallback.hash || providerCallback.username || providerCallback.password) throw Error('UNEXPECTED_GOOGLE_CALLBACK');
    const callback = new URL('/auth/v1/callback', project);
    callback.searchParams.set('state', state);
    callback.searchParams.set('error', 'access_denied');
    callback.searchParams.set('error_description', 'User cancelled authorization');
    const cookies = (start.headers.getSetCookie?.() || []).map(cookie => cookie.split(';')[0]).join('; ');
    const end = await request(callback, { headers: cookies ? { Cookie: cookies } : {} });
    const location = end.headers.get('location');
    await end.body?.cancel();
    let destination;
    try { destination = new URL(location); } catch { /* report absent/invalid redirect without the value */ }
    const requested = new URL(redirectTo);
    const params = destination ? new URLSearchParams(destination.hash.slice(1)) : new URLSearchParams();
    const providerError = params.get('error') || destination?.searchParams.get('error');
    const result = {
      label, requestedCallback: redirectTo, authorizeStatus: start.status,
      pkce: authorizeUrl.searchParams.get('code_challenge_method') === 's256' && !!authorizeUrl.searchParams.get('code_challenge'),
      providerHost: providerUrl.hostname, providerCallback: providerCallback.origin + providerCallback.pathname,
      callbackStatus: end.status,
      returnedScheme: destination?.protocol.replace(':', '') ?? null,
      returnedHost: destination?.hostname ?? null, returnedAuthority: destination?.host ?? null,
      returnedPath: destination?.pathname ?? null,
      returnedRecovery: destination?.searchParams.get('next') === 'reset-password',
      cancellationConfirmed: providerError === 'access_denied',
      matchesRequestedCallback: !!destination && destination.protocol === requested.protocol && destination.host === requested.host &&
        destination.pathname === requested.pathname && destination.searchParams.get('next') === requested.searchParams.get('next'),
    };
    report.checks.push(result);
    saveReport();
    console.log(JSON.stringify(result));
    memory.clear();
  }
  report.nativeRedirects = report.checks.filter(check => ['native', 'native_recovery'].includes(check.label)).every(check =>
    check.callbackStatus === 302 && check.cancellationConfirmed && check.matchesRequestedCallback && check.returnedScheme === 'aldus');
  report.unknownRedirectsRejected = report.checks.filter(check => check.label.endsWith('_control')).every(check =>
    check.callbackStatus === 302 && check.cancellationConfirmed && !check.matchesRequestedCallback);
  report.webDevelopmentPreserved = report.checks.find(check => check.label === 'web_dev')?.matchesRequestedCallback === true;
  report.executionStatus = 'COMPLETED';
  saveReport();
  console.log(JSON.stringify({ nativeRedirects: report.nativeRedirects ? 'PASS' : 'FAIL_EXTERNAL_CONFIGURATION',
    unknownRedirectsRejected: report.unknownRedirectsRejected, webDevelopmentPreserved: report.webDevelopmentPreserved, reportPath }));
  if (process.argv.includes('--expect-native') && (!report.nativeRedirects || !report.unknownRedirectsRejected || !report.webDevelopmentPreserved)) process.exitCode = 2;
}

run().catch(error => {
  const failure = { error: /^[A-Z_]+$/.test(error.message) ? error.message : error.name,
    networkCode: /^[A-Z0-9_]{1,60}$/.test(error.cause?.code ?? '') ? error.cause.code : null };
  if (currentReport) { currentReport.executionStatus = 'ERROR'; currentReport.failure = failure; saveReport(); }
  console.error(JSON.stringify(failure));
  process.exitCode = 1;
});
