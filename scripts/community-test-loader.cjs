const fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
module.exports = function makeLoader(overrides = {}) {
  const cache = new Map();
  function load(file) {
    file = path.resolve(file);
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      // A folder import (e.g. `@/src/ui`) resolves to its index module.
      const inferred = [file + '.ts', file + '.tsx', path.join(file, 'index.ts'), path.join(file, 'index.tsx')]
        .find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      if (inferred) file = inferred;
    }
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    } }).outputText;
    const resolve = name => Object.hasOwn(overrides, name) ? overrides[name] : name.startsWith('@/') ? load(name.slice(2)) : name.startsWith('.') ? load(path.resolve(path.dirname(file), name)) : require(name);
    new Function('require', 'module', 'exports', code)(resolve, module, module.exports);
    return module.exports;
  }
  return load;
};
