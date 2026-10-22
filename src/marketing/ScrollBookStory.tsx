import { type PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react';
import type { CatalogPlan } from '@/src/domain/saas/accountPlan';
import type { BookSceneHandle } from './cinematic/BookScene.web';
import { bookChapters, bookScrollProgress, bookStops, followBookScroll, resolveBookPose, smooth } from './bookMotion';
import { bookCss } from './bookStyles';

type StoryProps = PropsWithChildren<{ plans: CatalogPlan[]; cta?: string; ctaText?: string }>;
type Mode = 'static' | 'loading' | 'ready' | 'reduced' | 'limited' | 'unavailable';

/** HTML owns meaning and navigation; a disposable Web-only renderer owns the illustration. */
export function ScrollBookStory({ children, cta = '/auth/signup', ctaText = 'Criar minha conta' }: StoryProps) {
  const track = useRef<HTMLElement>(null), sticky = useRef<HTMLDivElement>(null), scene = useRef<HTMLDivElement>(null);
  const navigation = useRef<(index: number) => void>(() => {}), chapterRef = useRef(0);
  const [chapter, setChapter] = useState(0), [mode, setMode] = useState<Mode>('static');
  const navigate = useCallback((index: number) => navigation.current(index), []);

  useEffect(() => {
    const element = track.current, visual = scene.current, pinned = sticky.current;
    const scroller = element?.closest<HTMLElement>('[data-landing-scroll], .al-page-scroll');
    if (!element || !visual || !pinned || !scroller) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let renderer: BookSceneHandle | undefined, disposed = false, generation = 0, loading = false, failed = false;
    let frame = 0, visible = true, dirtyGeometry = true, enhanced = false;
    let start = 0, distance = 1, stickyHeight = 1, previousAtmosphere = -1, previousIntro = -1, previousCaption = -1, began = 0;
    let previousWidth = 0, previousHeight = 0, previousDpr = 0, previousHeader = -1, previousViewport = -1;
    let progress: number | null = null, lastFrameAt = 0, snap = true, pendingChapter: number | null = null;
    let previousTarget = -1, previousSettled: boolean | undefined;
    let cachedPose: ReturnType<typeof resolveBookPose> | undefined;
    const chapterChange = (next: number) => {
      if (next !== chapterRef.current) { chapterRef.current = next; element.dataset.chapter = String(next); setChapter(next); }
    };
    const measure = () => {
      // Read the layout together. A changed CSS viewport gets its own frame to
      // settle before reading the resulting stage dimensions.
      const headerHeight = scroller.querySelector('.al-header')?.getBoundingClientRect().height ?? 0;
      const viewport = scroller.clientHeight, trackTop = element.getBoundingClientRect().top;
      const scrollTop = scroller.scrollTop, rootTop = scroller.getBoundingClientRect().top;
      const measuredSticky = pinned.offsetHeight, trackHeight = element.offsetHeight;
      const width = visual.clientWidth, height = visual.clientHeight;
      if (headerHeight !== previousHeader || viewport !== previousViewport) {
        element.style.setProperty('--book-header-height', `${headerHeight}px`);
        element.style.setProperty('--book-viewport-height', `${viewport}px`);
        previousHeader = headerHeight; previousViewport = viewport;
        return false;
      }
      start = Math.max(0, trackTop - rootTop + scrollTop - headerHeight);
      stickyHeight = measuredSticky; distance = Math.max(1, trackHeight - stickyHeight);
      const dpr = window.devicePixelRatio || 1;
      if (width !== previousWidth || height !== previousHeight || dpr !== previousDpr) {
        renderer?.resize(width, height); previousWidth = width; previousHeight = height; previousDpr = dpr;
      }
      dirtyGeometry = false;
      return true;
    };
    const update = (at: number) => {
      frame = 0;
      if (disposed || !renderer || !enhanced || !visible || document.hidden) return;
      if (dirtyGeometry && !measure()) { schedule(); return; }
      if (pendingChapter !== null) {
        scroller.scrollTo({ top: start + bookStops[pendingChapter] * distance, behavior: 'auto' });
        pendingChapter = null;
      }
      const target = bookScrollProgress(scroller.scrollTop, start, distance + stickyHeight, stickyHeight);
      const gap = at - lastFrameAt;
      progress = snap || progress === null ? target : followBookScroll(progress, target, gap > 0 && gap < 100 ? gap : 1000 / 60);
      snap = false; lastFrameAt = at;
      const settled = progress === target;
      if (target !== previousTarget) { visual.dataset.bookTarget = target.toFixed(5); previousTarget = target; }
      if (settled !== previousSettled) { visual.dataset.bookSettled = String(settled); previousSettled = settled; }
      const changed = !cachedPose || cachedPose.progress !== progress;
      const pose = changed ? resolveBookPose(progress) : cachedPose!;
      cachedPose = pose;
      if (changed) { visual.dataset.bookProgress = pose.progress.toFixed(5); visual.dataset.bookChapter = String(pose.chapter); }
      const intro = 1 - smooth(Math.min(1, pose.progress / .125));
      if (intro !== previousIntro) { element.style.setProperty('--story-intro', String(intro)); previousIntro = intro; }
      if (pose.atmosphere !== previousAtmosphere) { element.style.setProperty('--story-dark', String(pose.atmosphere)); previousAtmosphere = pose.atmosphere; }
      const caption = pose.captionOpacity * smooth(Math.max(0, Math.min(1, (pose.progress - .075) / .065)));
      if (caption !== previousCaption) { element.style.setProperty('--story-caption', String(caption)); previousCaption = caption; }
      chapterChange(pose.chapter);
      try {
        renderer.render(pose);
        if (!enhanced || !renderer) return;
        if (visual.dataset.renderState !== 'ready') {
          visual.dataset.renderState = 'ready'; visual.dataset.sceneInitMs = (performance.now() - began).toFixed(1);
        }
        // Finite quality probes redraw the same pose; scroll remains its only clock.
        if (progress !== target || renderer.needsBudgetFrame()) schedule();
      } catch { fallback('render-failed'); }
    };
    const schedule = () => { if (!disposed && enhanced && visible && !document.hidden && !frame) frame = requestAnimationFrame(update); };
    const fallback = (reason: string) => {
      generation++; loading = false; enhanced = false;
      if (reason !== 'reduced-motion') failed = true;
      if (frame) cancelAnimationFrame(frame); frame = 0;
      renderer?.dispose(); renderer = undefined;
      cachedPose = undefined; progress = null; lastFrameAt = 0; snap = true;
      previousWidth = 0; previousHeight = 0; pendingChapter = null;
      element.dataset.enhanced = 'false'; element.dataset.motion = media.matches ? 'reduce' : 'static';
      visual.dataset.renderState = reason;
      element.style.setProperty('--story-dark', '0'); element.style.setProperty('--story-intro', '1');
      previousAtmosphere = -1; previousIntro = -1; previousCaption = -1;
      chapterChange(0); setMode(media.matches ? 'reduced' : reason === 'performance-limited' || reason === 'constrained-device' ? 'limited' : 'unavailable');
    };
    const begin = async () => {
      if (disposed || failed || loading || renderer || media.matches || !visible || document.hidden) return;
      const capabilities = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
      if (capabilities.connection?.saveData || ((capabilities.deviceMemory ?? 8) < 4 && navigator.hardwareConcurrency <= 2)) {
        fallback('constrained-device'); return;
      }
      const revision = ++generation; began = performance.now(); loading = true; setMode('loading');
      try {
        const { mountBookScene } = await import('./cinematic/BookScene.web');
        if (disposed || revision !== generation || media.matches || !visible || document.hidden) return;
        const inspection = !!(window as Window & { __ALDUS_CINEMATIC_QA__?: boolean }).__ALDUS_CINEMATIC_QA__;
        renderer = mountBookScene(visual, fallback, inspection);
        enhanced = true; element.dataset.enhanced = 'true'; element.dataset.motion = 'scroll';
        visual.dataset.renderState = 'loading';
        setMode('ready'); dirtyGeometry = true; schedule();
      } catch { if (!disposed && revision === generation) fallback('webgl-unavailable'); }
      finally { if (revision === generation) loading = false; }
    };
    const resize = () => { dirtyGeometry = true; snap = true; schedule(); };
    const visibility = () => {
      if (document.hidden) { if (frame) cancelAnimationFrame(frame); frame = 0; return; }
      dirtyGeometry = true; snap = true; void begin(); schedule();
    };
    const preference = () => {
      if (media.matches) fallback('reduced-motion');
      else { failed = false; dirtyGeometry = true; void begin(); }
    };
    navigation.current = index => {
      const next = Math.max(0, Math.min(bookStops.length - 1, index));
      if (!enhanced || media.matches) { chapterChange(next); return; }
      pendingChapter = next; snap = true; schedule();
    };
    const intersection = typeof IntersectionObserver === 'undefined' ? undefined : new IntersectionObserver(entries => {
      visible = entries[0]?.isIntersecting ?? false;
      if (visible) { dirtyGeometry = true; snap = true; void begin(); schedule(); }
      else if (frame) { cancelAnimationFrame(frame); frame = 0; }
    }, { root: scroller, threshold: 0 });
    intersection?.observe(pinned);
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(resize);
    observer?.observe(scroller); observer?.observe(pinned); observer?.observe(visual);
    scroller.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', visibility); media.addEventListener('change', preference);
    void document.fonts?.ready.then(() => { if (!disposed) resize(); });
    if (media.matches) preference(); else if (!intersection) void begin();
    return () => {
      disposed = true; generation++; navigation.current = () => {};
      if (frame) cancelAnimationFrame(frame); renderer?.dispose();
      intersection?.disconnect(); observer?.disconnect();
      scroller.removeEventListener('scroll', schedule); window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', visibility); media.removeEventListener('change', preference);
    };
  }, []);

  const staticMode = mode !== 'ready';
  return <section ref={track} className="al-book-story" data-book-story data-chapter={chapter} aria-label="Conheça o Aldus pelas páginas de um livro">
    <style>{bookCss}</style>
    <div ref={sticky} className="al-book-sticky">
      <div className="al-story-intro">{children}</div>
      <div className="al-book-presentation">
        <div ref={scene} className="al-book-scene" data-book-scene data-book-progress="0.00000" data-book-chapter="0" aria-hidden="true">
          <div className="al-book-static" data-book-cover><span className="al-static-edition">SUA LEITURA. SEU TEMPO.</span><span className="al-static-emblem">A</span><span className="al-static-name">Aldus<br />Reader</span><span className="al-static-rule">✦</span><small>LEIA · ORGANIZE · DESCUBRA</small></div>
        </div>
      </div>
      <div className="al-book-caption" aria-live="polite" aria-atomic="true">
        <span className="al-book-caption-kicker">{bookChapters[chapter].label}</span>
        <h2>{bookChapters[chapter].title}</h2><p>{bookChapters[chapter].description}</p>
        {chapter === 6 ? <a href={cta} className="al-button">{ctaText} <span aria-hidden="true">↗</span></a> : null}
      </div>
      <div className="al-story-controls">
        <div className="al-book-navigation"><button type="button" aria-label="Etapa anterior do livro" disabled={chapter === 0} onClick={() => navigate(chapterRef.current - 1)}>←</button><span>{String(chapter + 1).padStart(2, '0')} <i>/ {String(bookChapters.length).padStart(2, '0')}</i><small>Prévia ilustrativa · sem dados pessoais</small></span><button type="button" aria-label="Próxima etapa do livro" disabled={chapter === bookStops.length - 1} onClick={() => navigate(chapterRef.current + 1)}>→</button></div>
        <a href="#experiencia" className="al-book-skip">Pular demonstração <span aria-hidden="true">↓</span></a>
        {staticMode && mode !== 'loading' ? <p className="al-story-static-note">{mode === 'reduced' ? 'Apresentação sem movimento, conforme sua preferência.' : mode === 'limited' ? 'Apresentação simplificada para manter a navegação leve.' : 'Explore o Aldus a seguir. A apresentação 3D é opcional.'}</p> : null}
      </div>
    </div>
    <ol className="al-book-outline">{bookChapters.map(item => <li key={item.title}><span>{item.label}</span><h3>{item.title}</h3><p>{item.description}</p></li>)}</ol>
    <noscript><p className="al-book-noscript">A apresentação animada precisa de JavaScript. Recursos, planos e acesso ao Aldus continuam disponíveis nesta página.</p></noscript>
  </section>;
}
