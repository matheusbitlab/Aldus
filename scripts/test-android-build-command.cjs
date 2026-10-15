const assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path'), cp = require('node:child_process');
const { androidBuildCommand } = require('./android-build-command.cjs');
assert.throws(() => androidBuildCommand('gradlew.bat'), /absolute/);
const posix = androidBuildCommand(path.resolve('android/gradlew'), 'linux');
assert.equal(posix.file, path.resolve('android/gradlew')); assert.equal(posix.args[0], ':app:assembleRelease');
if (process.platform === 'win32') {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'aldus-wrapper-test '));
  const wrapper = path.join(directory, 'gradlew.bat');
  fs.writeFileSync(wrapper, '@echo off\r\necho ALDUS_WRAPPER_FIXTURE %*\r\n', 'utf8');
  const env = { ...process.env, NoDefaultCurrentDirectoryInExePath: '1' };
  const baseline = cp.spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'gradlew.bat :app:assembleRelease --console=plain'], { cwd: directory, env, encoding: 'utf8' });
  assert.notEqual(baseline.status, 0, 'Reproduce Windows current-directory lookup failure');
  const command = androidBuildCommand(wrapper);
  const fixed = cp.spawnSync(command.file, command.args, { ...command.options, cwd: directory, env, encoding: 'utf8' });
  assert.equal(fixed.status, 0, fixed.stderr);
  assert.match(fixed.stdout, /ALDUS_WRAPPER_FIXTURE :app:assembleRelease --console=plain/);
  console.log('PASS actual Windows cmd: absolute wrapper in a spaced path works with current-directory executable lookup disabled. Only a temporary echo fixture ran; no Gradle/APK.');
} else console.log('PASS POSIX wrapper argument contract; Windows execution is platform-specific. No Gradle/APK.');
