const fs = require('node:fs');

function readEnvFile(path) {
  const values = {};
  for (const rawLine of fs.readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

const envPath = process.argv[2] || '.env.local';
if (!fs.existsSync(envPath)) {
  throw new Error(`Public environment file not found: ${envPath}`);
}

const env = readEnvFile(envPath);
const baseUrl = env.EXPO_PUBLIC_SUPABASE_URL;
const publicKey = env.EXPO_PUBLIC_SUPABASE_KEY;
if (!baseUrl || !publicKey) {
  throw new Error('EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY are required');
}

const headers = {
  apikey: publicKey,
  Authorization: `Bearer ${publicKey}`,
};

function print(result) {
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

async function probe(label, url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: { ...headers, ...(options.headers || {}) },
    });
    const body = await response.text();
    let parsed = null;
    try { parsed = JSON.parse(body); } catch {}
    const result = {
      label,
      status: response.status,
      ok: response.ok,
      errorCode: parsed && typeof parsed.code === 'string' ? parsed.code : null,
    };
    print(result);
    return { response, parsed };
  } catch (error) {
    print({
      label,
      status: 'NETWORK_ERROR',
      ok: false,
      errorCode: error?.cause?.code || error?.name || 'unknown',
    });
    return null;
  }
}

async function main() {
  const health = await probe('auth_health', `${baseUrl}/auth/v1/health`);
  if (health?.parsed) {
    print({
      label: 'auth_health_metadata',
      version: health.parsed.version || null,
      name: health.parsed.name || null,
    });
  }

  const settings = await probe('auth_settings', `${baseUrl}/auth/v1/settings`);
  if (settings?.parsed) {
    print({
      label: 'auth_settings_metadata',
      disable_signup: settings.parsed.disable_signup ?? null,
      mailer_autoconfirm: settings.parsed.mailer_autoconfirm ?? null,
      email_enabled: settings.parsed.external?.email ?? null,
      google_enabled: settings.parsed.external?.google ?? null,
    });
  }

  await probe('rest_openapi', `${baseUrl}/rest/v1/`, {
    headers: { Accept: 'application/openapi+json' },
  });

  const tables = {
    profiles: 'id,username,display_name,avatar_url,role,account_status,created_at,updated_at',
    user_feature_overrides: 'user_id,feature_key,enabled,created_at,updated_at',
    users: '*',
    decks: '*',
    cards: '*',
    battles: '*',
    study_sessions: '*',
    card_reviews: '*',
  };
  for (const [table, selection] of Object.entries(tables)) {
    await probe(
      `rest_${table}`,
      `${baseUrl}/rest/v1/${table}?select=${encodeURIComponent(selection)}&limit=0`,
    );
  }

  await probe('edge_username_login_options', `${baseUrl}/functions/v1/username-login`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://example.invalid',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'authorization,content-type',
    },
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
