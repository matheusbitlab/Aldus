const path = require('node:path');
function validateReleaseSigning(env, exists) {
  const keys = ['ALDUS_SIGNING_STORE_FILE', 'ALDUS_SIGNING_STORE_PASSWORD', 'ALDUS_SIGNING_KEY_ALIAS', 'ALDUS_SIGNING_KEY_PASSWORD'];
  const supplied = keys.filter(key => !!env[key]);
  if (supplied.length && supplied.length !== keys.length) throw Error('Incomplete private signing configuration.');
  if (!supplied.length) {
    if (env.ALDUS_ALLOW_DEVELOPMENT_SIGNING !== 'device-rehearsal') throw Error('Private release signing is required.');
    return 'device-rehearsal';
  }
  if (!path.isAbsolute(env.ALDUS_SIGNING_STORE_FILE) || /(?:^|[\\/])debug\.keystore$/i.test(env.ALDUS_SIGNING_STORE_FILE) || !exists(env.ALDUS_SIGNING_STORE_FILE)) throw Error('A private non-development keystore file is required.');
  return 'private';
}
module.exports = { validateReleaseSigning };
