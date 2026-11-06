// Aldus UI primitives (src/ui): accessible names/roles/states, touch targets, typography roles and menu behavior.
// Renders with react-test-renderer and stub RN host components. Does not prove visual layout or TalkBack.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('../.expo/auth-test-tools/node_modules/react');
const { act, create } = require('../.expo/auth-test-tools/node_modules/react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;

const { appThemeTokens } = require('./community-test-loader.cjs')()('src/theme/tokens.ts');
const palette = appThemeTokens.light;
const routerCalls = [];
let canGoBack = false;
const host = name => {
  const Component = ({ children, ...props }) => React.createElement(name, props, typeof children === 'function' ? children({ pressed: false }) : children);
  Component.displayName = name;
  return Component;
};
const rn = {
  View: host('View'), Text: host('Text'), Pressable: host('Pressable'), ScrollView: host('ScrollView'), TextInput: host('TextInput'),
  ActivityIndicator: host('ActivityIndicator'), Modal: ({ visible, children }) => (visible ? React.createElement('Modal', null, children) : null),
  StyleSheet: { create: styles => styles, hairlineWidth: 1, absoluteFill: { position: 'absolute' } },
  Platform: { OS: 'android', select: options => options.android ?? options.default },
  useWindowDimensions: () => globalThis.__window ?? { width: 390, height: 844 },
};
const cache = new Map();
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const resolve = name => {
    if (name === 'react') return React;
    if (name === 'react/jsx-runtime') return require('../.expo/auth-test-tools/node_modules/react/jsx-runtime');
    if (name === 'react-native') return rn;
    if (name === '@expo/vector-icons') return { Ionicons: host('Icon') };
    if (name === 'expo-router') return { router: { canGoBack: () => canGoBack, back: () => routerCalls.push('back'), replace: href => routerCalls.push(['replace', href]) } };
    if (name === 'react-native-safe-area-context') return { useSafeAreaInsets: () => ({ top: 30, bottom: 20, left: 0, right: 0 }) };
    if (name.endsWith('/contexts/AppThemeContext')) return { useAppTheme: () => ({ palette }) };
    const base = name.startsWith('@/') ? name.slice(2) : name.startsWith('.') ? path.resolve(path.dirname(file), name) : null;
    if (base) return load(['.ts', '.tsx'].map(ext => path.resolve(base) + ext).find(candidate => fs.existsSync(candidate)));
    return require(name);
  };
  new Function('require', 'module', 'exports', code)(resolve, module, module.exports);
  return module.exports;
}
const ui = load('src/ui/index.ts');
const flat = style => Array.isArray(style) ? Object.assign({}, ...style.flat(Infinity).filter(Boolean)) : (style ?? {});
const text = node => typeof node === 'string' ? node : (node.children ?? []).map(text).join('');
const render = element => { let renderer; act(() => { renderer = create(element); }); return renderer; };
const pressables = renderer => renderer.root.findAllByType('Pressable');
const resolveStyle = node => flat(typeof node.props.style === 'function' ? node.props.style({ pressed: false }) : node.props.style);

// Tokens: one type scale, serif titles, 4-based spacing.
assert.equal(Object.keys(ui.typography).length, 9, 'nine typography roles');
for (const value of Object.values(ui.space)) assert.equal(value % 2, 0, `space ${value} is on the 2/4 grid`);
assert.equal(ui.typography.title.fontFamily, 'serif');
assert.equal(ui.typography.body.fontFamily, undefined, 'body uses the platform UI font on native');
assert.equal(ui.touchTarget, 44);

(async () => {
  // AppText: headings announce themselves; tones map to palette.
  let r = render(React.createElement(ui.AppText, { variant: 'title' }, 'Sua biblioteca'));
  let node = r.root.findByType('Text');
  assert.equal(node.props.accessibilityRole, 'header');
  assert.equal(flat(node.props.style).fontSize, 26);
  r = render(React.createElement(ui.AppText, { tone: 'secondary' }, 'x'));
  node = r.root.findByType('Text');
  assert.equal(node.props.accessibilityRole, undefined);
  assert.equal(flat(node.props.style).color, palette.secondaryText);

  // Button: role, label, disabled/busy state, primary colors, 44 target, no press while loading.
  let pressed = 0;
  r = render(React.createElement(ui.Button, { label: 'Importar livro', variant: 'primary', icon: 'add', onPress: () => pressed++ }));
  let button = pressables(r)[0];
  assert.equal(button.props.accessibilityRole, 'button');
  assert.equal(button.props.accessibilityLabel, 'Importar livro');
  const style = resolveStyle(button);
  assert.equal(style.backgroundColor, palette.accent);
  assert.ok(style.minHeight >= 44);
  button.props.onPress();
  assert.equal(pressed, 1);
  r = render(React.createElement(ui.Button, { label: 'Salvando', loading: true, onPress: () => pressed++ }));
  button = pressables(r)[0];
  assert.equal(button.props.disabled, true);
  assert.deepEqual({ disabled: button.props.accessibilityState.disabled, busy: button.props.accessibilityState.busy }, { disabled: true, busy: true });
  r = render(React.createElement(ui.Button, { label: 'Excluir', variant: 'danger', onPress() {} }));
  assert.equal(resolveStyle(pressables(r)[0]).backgroundColor, palette.danger);

  // IconButton: always named, 44x44 minimum.
  r = render(React.createElement(ui.IconButton, { icon: 'add', label: 'Adicionar', onPress() {}, appearance: 'filled' }));
  button = pressables(r)[0];
  assert.equal(button.props.accessibilityLabel, 'Adicionar');
  assert.ok(resolveStyle(button).minWidth >= 44 && resolveStyle(button).minHeight >= 44);
  assert.equal(resolveStyle(button).backgroundColor, palette.accent);

  // Chip: selected state exposed and shown by icon, not color only.
  let toggled = 0;
  r = render(React.createElement(ui.Chip, { label: 'Lendo', selected: true, onPress: () => toggled++ }));
  const chip = pressables(r)[0];
  assert.equal(chip.props.accessibilityState.selected, true);
  assert.equal(resolveStyle(chip).backgroundColor, palette.accentSoft);
  assert.equal(r.root.findAllByType('Icon')[0].props.name, 'checkmark');
  chip.props.onPress();
  assert.equal(toggled, 1);

  // ListGroup/ListRow: tappable rows are buttons with chevron; static rows are not buttons.
  let opened = 0;
  r = render(React.createElement(ui.ListGroup, { title: 'Conta' },
    React.createElement(ui.ListRow, { title: 'Minha conta', icon: 'person', onPress: () => opened++ }),
    React.createElement(ui.ListRow, { title: 'Versão', trailing: React.createElement(ui.AppText, null, '1.0') })));
  assert.equal(pressables(r).length, 1);
  assert.equal(pressables(r)[0].props.accessibilityLabel, 'Minha conta');
  assert.ok(r.root.findAllByType('Icon').some(icon => icon.props.name === 'chevron-forward'));
  pressables(r)[0].props.onPress();
  assert.equal(opened, 1);
  assert.ok(text(r.root).includes('Conta'));

  // ScreenHeader: back falls back to a route when there is no history.
  r = render(React.createElement(ui.ScreenHeader, { title: 'Minhas fontes', back: true, fallbackHref: '/discover' }));
  pressables(r)[0].props.onPress();
  assert.deepEqual(routerCalls.pop(), ['replace', '/discover']);
  canGoBack = true;
  pressables(r)[0].props.onPress();
  assert.equal(routerCalls.pop(), 'back');

  // ActionMenu: hidden when closed; item closes the menu and then runs; cancel only closes.
  const calls = [];
  const items = [
    { key: 'file', label: 'Importar arquivo', description: 'EPUB ou PDF', icon: 'document', onPress: () => calls.push('file') },
    { key: 'drive', label: 'Conectar Google Drive', icon: 'logo-google', onPress: () => calls.push('drive'), disabled: true },
  ];
  r = render(React.createElement(ui.ActionMenu, { visible: false, title: 'Adicionar', items, onClose: () => calls.push('close') }));
  assert.equal(r.root.findAllByType('Modal').length, 0);
  r = render(React.createElement(ui.ActionMenu, { visible: true, title: 'Adicionar', items, onClose: () => calls.push('close') }));
  const entries = pressables(r);
  const file = entries.find(entry => entry.props.accessibilityLabel === 'Importar arquivo');
  assert.equal(file.props.accessibilityHint, 'EPUB ou PDF');
  file.props.onPress();
  assert.deepEqual(calls.splice(0), ['close', 'file']);
  assert.equal(entries.find(entry => entry.props.accessibilityLabel === 'Conectar Google Drive').props.disabled, true);
  entries.find(entry => entry.props.accessibilityLabel === 'Cancelar').props.onPress();
  assert.deepEqual(calls.splice(0), ['close']);
  assert.ok(entries.find(entry => entry.props.accessibilityLabel === 'Fechar menu'), 'backdrop dismisses');

  // SearchField: labelled input; clear button only with text.
  let query = 'machado';
  r = render(React.createElement(ui.SearchField, { value: query, onChangeText: value => { query = value; }, placeholder: 'Buscar na biblioteca' }));
  assert.equal(r.root.findByType('TextInput').props.accessibilityLabel, 'Buscar na biblioteca');
  pressables(r).find(entry => entry.props.accessibilityLabel === 'Limpar busca').props.onPress();
  assert.equal(query, '');
  r = render(React.createElement(ui.SearchField, { value: '', onChangeText() {}, placeholder: 'Buscar' }));
  assert.equal(pressables(r).length, 0);

  // EmptyState: heading + optional action slot.
  r = render(React.createElement(ui.EmptyState, { icon: 'library-outline', title: 'Sua estante está vazia', description: 'Importe um livro.' },
    React.createElement(ui.Button, { label: 'Importar livro', onPress() {} })));
  assert.ok(r.root.findAllByType('Text').some(t => t.props.accessibilityRole === 'header' && text(t) === 'Sua estante está vazia'));
  assert.equal(pressables(r).length, 1);

  console.log('PASS ui primitives: tokens, AppText variants, Button/IconButton/Chip states, ListGroup, ScreenHeader back, ActionMenu, SearchField, EmptyState. Stub host components; not a visual/TalkBack proof.');
})().catch(error => { console.error(error); process.exit(1); });
