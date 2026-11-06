// Descobrir tab (app/(tabs)/search.tsx): sources are visible and reachable without digging into settings.
// Stub stores/host components with react-test-renderer. Does not prove layout, Chromium or Android behavior.
const assert = require('node:assert/strict');
const React = require('../.expo/auth-test-tools/node_modules/react');
const { act, create } = require('../.expo/auth-test-tools/node_modules/react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;

const { appThemeTokens } = require('./community-test-loader.cjs')()('src/theme/tokens.ts');
const palette = appThemeTokens.light;
const routes = [];
const searches = [];
const selected = [];
const host = name => {
  const Component = ({ children, ...props }) => React.createElement(name, props, typeof children === 'function' ? children({ pressed: false }) : children);
  Component.displayName = name;
  return Component;
};
const FlatList = ({ data, renderItem, ListHeaderComponent, ListFooterComponent }) => React.createElement('FlatList', null,
  ListHeaderComponent, ...data.map((item, index) => React.createElement(React.Fragment, { key: index }, renderItem({ item, index }))), ListFooterComponent);
const store = state => Object.assign(selector => (selector ? selector(state) : state), { getState: () => state });
const accountA = '00000000-0000-4000-8000-00000000000a';
const sourcesState = {
  sources: [
    { id: 'drive-a', name: 'Meu Drive', kind: 'google-drive', ownerId: accountA, enabled: true, status: 'active' },
    { id: 'link-a', name: 'Clube de leitura', kind: 'json', ownerId: accountA, enabled: false, status: 'active' },
    { id: 'drive-b', name: 'Drive de outra conta', kind: 'google-drive', ownerId: 'other-account', enabled: true, status: 'active' },
  ],
  load: async () => undefined,
};
const searchState = {
  query: '', results: [], sourceStatuses: [], nextPageUrl: null, status: 'idle', error: null, isSearching: false, pendingSources: [],
  selectedSource: 'Todos', setQuery: value => { searchState.query = value; }, search: async filter => searches.push(filter), loadMore: async () => undefined,
  cancel: () => undefined, selectSource: value => selected.push(value),
};
const overrides = {
  react: React,
  'react/jsx-runtime': require('../.expo/auth-test-tools/node_modules/react/jsx-runtime'),
  'react-native': {
    View: host('View'), Text: host('Text'), Pressable: host('Pressable'), ScrollView: host('ScrollView'), TextInput: host('TextInput'), FlatList,
    ActivityIndicator: host('ActivityIndicator'), Modal: ({ visible, children }) => (visible ? React.createElement('Modal', null, children) : null), Linking: { openURL: async () => undefined },
    StyleSheet: { create: styles => styles, hairlineWidth: 1, absoluteFill: {} }, Platform: { OS: 'android', select: options => options.android ?? options.default },
    useWindowDimensions: () => ({ width: 390, height: 844 }),
  },
  '@expo/vector-icons': { Ionicons: host('Icon') },
  'expo-router': { router: { push: route => routes.push(route), replace: route => routes.push(route), back: () => undefined, canGoBack: () => false } },
  'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 24, bottom: 16, left: 0, right: 0 }) },
  '@/src/presentation/contexts/AppThemeContext': { useAppTheme: () => ({ palette }) },
  '@/src/presentation/components/BookCover': { BookCover: host('BookCover') },
  '@/src/presentation/stores/searchStore': { useSearchStore: store(searchState) },
  '@/src/presentation/stores/downloadStore': { useDownloadStore: store({ jobs: {}, enqueue: async () => undefined, cancel: async () => undefined }) },
  '@/src/presentation/stores/sourceStore': { useSourceStore: store(sourcesState) },
  '@/src/presentation/stores/libraryStore': { useLibraryStore: store({ load: async () => undefined }) },
  '@/src/data/scraping/catalogPlugins': { BUILTIN_CATALOG_NAMES: ['Gutendex', 'Gutenberg'] },
  '@/src/data/scraping/BNDigitalSearchPlugin': { BNDIGITAL_BLOCK_REASON: 'BNDigital indisponível.' },
  '@/src/presentation/services/dependencies': { appDependencies: { searchBooks: {} } },
  '@/src/presentation/components/sourcePresentation': {
    useSourceAccountId: () => accountA,
    sourceVisibleInAccount: (source, account) => (source.ownerId ?? null) === account,
    sourceLibraryTypeLabel: kind => (kind === 'google-drive' ? 'Google Drive' : kind === 'json' ? 'Biblioteca por link' : 'Catálogo de pesquisa'),
  },
  '@/src/domain/types/sourceCatalog': {
    sourceIdentity: () => 'identity',
    sourceCapabilities: source => ({ supportsCatalog: source.kind !== 'search', supportsSearch: source.kind === 'search' }),
  },
};
const load = require('./community-test-loader.cjs')(overrides);
// `@/src/ui` is a folder: resolve its index through the same loader.
Object.defineProperty(overrides, "@/src/ui", { get: () => load("src/ui/index.ts") });
const text = node => typeof node === 'string' ? node : (node.children ?? []).map(text).join('');

(async () => {
  const Discover = load('app/(tabs)/search.tsx').default;
  let view;
  await act(async () => { view = create(React.createElement(Discover)); });
  const all = text(view.root);
  const button = label => view.root.findAllByType('Pressable').find(node => node.props.accessibilityLabel === label);
  // Never hand a test instance to assert: on failure Node would inspect the whole fiber graph.
  const has = label => Boolean(button(label));

  assert.ok(view.root.findAllByType('Text').some(node => node.props.accessibilityRole === 'header' && text(node) === 'Descobrir'), 'screen title is Descobrir');
  for (const label of ['Adicionar fonte', 'Gerenciar fontes', 'BibliON', 'MEC Livros', 'Buscar']) assert.ok(has(label), `visible on first screen: ${label}`);
  assert.match(all, /Suas fontes/);
  assert.match(all, /Bibliotecas digitais/);

  // Only this account's sources are listed; disabled ones say so.
  assert.ok(has('Meu Drive'));
  assert.ok(has('Clube de leitura'));
  assert.equal(view.root.findAllByType('Pressable').filter(node => node.props.accessibilityLabel === 'Meu Drive').length, 2, 'own active source: list row + filter chip');
  assert.equal(has('Drive de outra conta'), false, 'other account sources stay hidden (list and filter chips)');
  assert.match(all, /Biblioteca por link · desativada/);

  await act(async () => button('Adicionar fonte').props.onPress());
  assert.equal(routes.pop(), '/sources?add=1');
  await act(async () => button('Gerenciar fontes').props.onPress());
  assert.equal(routes.pop(), '/sources');
  const driveRow = view.root.findAllByType('Pressable').find(node => node.props.accessibilityLabel === 'Meu Drive' && node.props.accessibilityHint === 'Google Drive');
  await act(async () => driveRow.props.onPress());
  assert.deepEqual(routes.pop(), { pathname: '/sources/[sourceId]', params: { sourceId: 'drive-a' } });
  await act(async () => button('BibliON').props.onPress());
  assert.equal(routes.pop(), '/services/biblion');
  await act(async () => button('MEC Livros').props.onPress());
  assert.equal(routes.pop(), '/services/mec');

  // Search stays primary: disabled while empty, filters are selectable chips.
  assert.equal(button('Buscar').props.disabled, true);
  const chip = button('Gutendex');
  assert.equal(chip.props.accessibilityState.selected, false);
  await act(async () => chip.props.onPress());
  assert.equal(selected.pop(), 'Gutendex');
  assert.equal(button('Todos').props.accessibilityState.selected, false);
  assert.equal(button('Gutendex').props.accessibilityState.selected, true);

  // Once a search runs, the sources block gives way to results.
  searchState.status = 'empty';
  await act(async () => { view.update(React.createElement(Discover)); });
  assert.equal(has('Adicionar fonte'), false);

  console.log('PASS Descobrir: title, search, chips, account-scoped sources, Adicionar/Gerenciar fontes, BibliON/MEC routes. Stub stores; not a visual/Android proof.');
})().catch(error => { console.error(error); process.exit(1); });
