import { memo, useState } from 'react';
import { ActivityIndicator, Image, ImageSourcePropType, StyleSheet, Text, View } from 'react-native';
import { editorialCover } from './bookCoverPresentation';

interface Props {
  identity: string;
  title: string;
  author?: string;
  format: string;
  source?: ImageSourcePropType | null;
  thumbnail?: ImageSourcePropType | null;
  compact?: boolean;
}

export const BookCover = memo(function BookCover(props: Props) {
  // Source identity resets loading/failure when a virtualized card is reused.
  const primary = imageIdentity(props.source), thumbnail = imageIdentity(props.thumbnail);
  const [version, setVersion] = useState({ primary, thumbnail, number: 0 });
  if (primary !== version.primary || thumbnail !== version.thumbnail) {
    setVersion({ primary, thumbnail, number: version.number + 1 });
  }
  return <CoverSurface key={`${props.identity}:${version.number}`} {...props} />;
});

function imageIdentity(source: Props['source']) {
  return source && typeof source === 'object' && 'uri' in source ? source.uri : source;
}

function CoverSurface({ identity, title, author, format, source, thumbnail, compact }: Props) {
  const design = editorialCover(identity, title, author);
  const [failed, setFailed] = useState<Set<number>>(() => new Set());
  const [loaded, setLoaded] = useState(false);
  const candidates = [source, thumbnail];
  const index = candidates.findIndex((candidate, i) => !!candidate && !failed.has(i));
  const selected = index < 0 ? null : candidates[index];
  const reject = () => { setLoaded(false); setFailed(previous => new Set(previous).add(index)); };
  return <View testID="book-cover" accessibilityLabel={`Capa de ${design.title}`} style={[styles.surface, { backgroundColor: design.paper }]}>
    <View style={[styles.spine, { backgroundColor: design.detail }]} />
    <View style={[styles.editorial, compact && styles.compact]}>
      <Text style={[styles.imprint, { color: design.ink }]} numberOfLines={1}>ALDUS · BIBLIOTECA</Text>
      <View style={[styles.rule, { backgroundColor: design.detail }]} />
      <Text style={[styles.title, compact && { fontSize: 11, lineHeight: 14 }, { color: design.ink }]} numberOfLines={compact ? 4 : 5}>{design.title}</Text>
      {!compact ? <Text style={[styles.author, { color: design.ink }]} numberOfLines={2}>{design.author}</Text> : null}
      <Text style={[styles.format, { color: design.ink }]}>{format.toUpperCase()}</Text>
    </View>
    {selected ? <Image key={index} source={selected} resizeMode="contain" accessibilityIgnoresInvertColors
      style={[StyleSheet.absoluteFill, styles.image, { opacity: loaded ? 1 : 0, backgroundColor: design.paper }]}
      onLoad={event => {
        const { width, height } = event.nativeEvent.source;
        if (!Number.isFinite(width) || !Number.isFinite(height) || width < 32 || height < 32) reject();
        else setLoaded(true);
      }} onError={reject} /> : null}
    {selected && !loaded ? <ActivityIndicator testID="book-cover-loading" size="small" color={design.ink} style={styles.loading} /> : null}
  </View>;
}
const styles = StyleSheet.create({
  surface: { flex: 1, width: '100%', overflow: 'hidden' },
  spine: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 5, opacity: 0.45 },
  editorial: { flex: 1, padding: 16, paddingLeft: 20, justifyContent: 'center', gap: 12 },
  compact: { padding: 7, paddingLeft: 10, gap: 6 },
  imprint: { fontSize: 8, letterSpacing: 1.4, fontWeight: '600' },
  rule: { width: 28, height: 2 },
  title: { fontSize: 19, lineHeight: 25, fontFamily: 'serif', fontWeight: '600', flexShrink: 1 },
  author: { fontSize: 11, lineHeight: 16 },
  format: { fontSize: 8, letterSpacing: 1.5, marginTop: 8 },
  image: { width: '100%', height: '100%' },
  loading: { position: 'absolute', right: 8, bottom: 8 },
});
