const fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
function loader(mocks = {}) {
  const cache = new Map();
  function load(file) {
    file = path.resolve(file); if (cache.has(file)) return cache.get(file);
    const exports = {}; cache.set(file, exports);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    new Function('require', 'exports', code)(name => {
      if (name in mocks) return mocks[name];
      if (name.startsWith('@/')) return load(name.slice(2) + '.ts');
      if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name) + '.ts');
      return require(name);
    }, exports); return exports;
  }
  return load;
}
function sqliteAdapter(database) {
  const adapter = {
    getFirstAsync: async (sql, ...args) => database.prepare(sql).get(...args),
    getAllAsync: async (sql, ...args) => database.prepare(sql).all(...args),
    runAsync: async (sql, ...args) => database.prepare(sql).run(...args),
    execAsync: async sql => database.exec(sql),
    withTransactionAsync: async operation => {
      database.exec('BEGIN'); try { const result = await operation(adapter); database.exec('COMMIT'); return result; }
      catch (error) { database.exec('ROLLBACK'); throw error; }
    },
  };
  adapter.withExclusiveTransactionAsync = adapter.withTransactionAsync; return adapter;
}
module.exports = { loader, sqliteAdapter };
