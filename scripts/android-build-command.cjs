const path = require('node:path');
function androidBuildCommand(wrapper, platform = process.platform, comspec = process.env.ComSpec || 'cmd.exe') {
  if (!path.isAbsolute(wrapper)) throw Error('Gradle wrapper must be an absolute path.');
  return platform === 'win32'
    ? { file: comspec, args: ['/d', '/s', '/c', `""${wrapper}" :app:assembleRelease --console=plain"`], options: { windowsVerbatimArguments: true } }
    : { file: wrapper, args: [':app:assembleRelease', '--console=plain'], options: {} };
}
module.exports = { androidBuildCommand };
