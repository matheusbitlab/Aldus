import { PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react';
import type { CatalogPlan } from '@/src/domain/saas/accountPlan';
import { formatBytes } from '@/src/domain/saas/planPresentation';
import { planLabel } from '@/src/presentation/i18n/ptBR';
import { bookChapters, bookScrollProgress, bookStops, resolveBookPose } from './bookMotion';
import { bookCss } from './bookStyles';

type Scene = 'library' | 'reader' | 'study' | 'plans' | 'final';
const scenes: Scene[] = ['library', 'reader', 'study', 'plans'];

function PrintedPage({ scene, plans, verso = false }: { scene: Scene; plans: CatalogPlan[]; verso?: boolean }) {
  if (verso) return <div className="al-book-print al-book-verso"><span className="al-book-running">ALDUS READER</span><div className="al-book-quote"><span>✦</span><p>{scene === 'reader' ? 'Um tempo só seu. Uma página de cada vez.' : scene === 'study' ? 'Ler. Anotar. Voltar a uma ideia.' : scene === 'plans' ? 'Seus livros, perto de você.' : 'A próxima história começa com você.'}</p><small>LEIA · ORGANIZE · DESCUBRA</small></div><span className="al-book-folio">Uma experiência de leitura</span></div>;
  return <div className={`al-book-print al-book-print-${scene}`}>
    <div className="al-book-running"><span>Aldus Reader</span><span>PRÉVIA ILUSTRATIVA</span></div>
    {scene === 'library' ? <><span className="al-book-kicker">SEUS LIVROS. SEU ESPAÇO.</span><h3>Sua Biblioteca</h3><div className="al-book-filters"><span>Todos</span><span>Lendo</span><span>Favoritos</span></div><div className="al-book-covers">{[['Dom Casmurro', 'Machado de Assis'], ['Entre páginas', 'Título ilustrativo'], ['A hora de ler', 'Título ilustrativo']].map(([title, author], index) => <div key={title}><div className={`al-book-mini-cover al-book-mini-${index}`}><small>ALDUS</small><b>{title}</b><i>{author}</i></div><span>{title}</span></div>)}</div><div className="al-book-reading"><span>CONTINUE SUA LEITURA</span><b>Uma página de cada vez.</b><div><i /></div><small>Progresso ilustrativo</small></div><p className="al-book-mini-note">Organize. Encontre. Retome.</p></> : null}
    {scene === 'reader' ? <><div className="al-book-reader-tools"><span>‹</span><span>Reader · Tema Papel</span><span>Aa</span></div><span className="al-book-kicker">UM TEMPO PARA LER</span><h3>O ritmo<br />de uma página.</h3><p className="al-book-prose">Há um espaço entre a pressa do dia e a próxima linha. Um lugar para imaginar, descobrir e voltar a uma ideia com outro olhar.</p><p className="al-book-prose">Aqui, <mark>a leitura encontra o seu ritmo.</mark> Uma passagem pode ficar com você por muito tempo.</p><div className="al-book-type">Aa <span>Fonte · Espaçamento · Papel</span></div><div className="al-book-page-progress"><span>‹</span><span>Progresso de leitura · ilustração</span><span>›</span></div></> : null}
    {scene === 'study' ? <><span className="al-book-kicker">APRENDER É REVISITAR</span><h3>Uma ideia<br />que fica.</h3><div className="al-book-deck">SEU DECK DE LEITURA <span>✦</span></div><div className="al-book-flashcard"><small>flashcard ilustrativo</small><h4>O que esta leitura despertou em você?</h4><p>Transforme uma passagem importante em uma pergunta.</p></div><div className="al-book-study-notes"><b>Suas anotações</b><p>Guarde uma ideia. Revise no seu ritmo.</p><span>Revisão com repetição espaçada</span></div></> : null}
    {scene === 'plans' ? <><span className="al-book-kicker">UMA BIBLIOTECA QUE CONTINUA</span><h3>Meu Plano</h3><p className="al-book-mini-note">Sincronização e armazenamento privado incluídos no Gratuito.</p><div className="al-book-plan-list">{plans.filter(plan => plan.id === 'free' || plan.id === 'pro').map(plan => <div key={plan.id}><b>{planLabel(plan.id, plan.name)}</b><span>{plan.limits.syncedBooks.toLocaleString('pt-BR')} livros</span><strong>{formatBytes(plan.limits.storageBytes)}</strong></div>)}</div><div className="al-book-cloud">☁ <b>Seus livros entre dispositivos</b></div><p className="al-book-cloud-note">Franquias do catálogo. Disponibilidade da nuvem conforme o ambiente. Pro sem contratação ativa.</p></> : null}
    {scene === 'final' ? <div className="al-book-ending"><span>✦</span><small>UM NOVO CAPÍTULO</small><h3>Traga seus livros.<br /><em>Encontre seu ritmo.</em></h3><p>O resto começa na primeira página.</p><span className="al-book-ending-brand">Aldus Reader</span></div> : null}
    <span className="al-book-folio">{scene === 'final' ? 'Seu próximo capítulo' : 'Demonstração · sem dados pessoais'}</span>
  </div>;
}

/** Connected strips bend around successive hinges; all printed faces stay on paper. */
function PaperStrip({ index, scene, back, plans }: { index: number; scene: Scene; back: Scene; plans: CatalogPlan[] }) {
  return <div className={`al-book-strip al-book-strip-${index}`}>
    <div className="al-book-paper-face al-book-paper-front"><div style={{ left: `${-index * 100}%` }}><PrintedPage scene={scene} plans={plans} /></div></div>
    <div className="al-book-paper-face al-book-paper-back"><div style={{ left: `${-(3 - index) * 100}%` }}><PrintedPage scene={back} plans={plans} verso /></div></div>
    {index < 3 ? <PaperStrip index={index + 1} scene={scene} back={back} plans={plans} /> : null}
  </div>;
}
function BookGeometry({ plans }: { plans: CatalogPlan[] }) {
  return <div className="al-book-geometry">
    <div className="al-book-back-cover" />
    <div className="al-book-page-block" data-book-block><div className="al-book-fore-edge" /><div className="al-book-bottom-edge" /><div className="al-book-top-edge" /></div>
    <div className="al-book-base-page"><PrintedPage scene="final" plans={plans} /></div>
    {scenes.map((scene, index) => <div key={scene} className={`al-book-leaf al-book-leaf-${index}`} data-book-leaf data-leaf-index={index}><PaperStrip index={0} scene={scene} back={scenes[index + 1] ?? 'final'} plans={plans} /></div>)}
    <div className="al-book-front-cover" data-book-cover><div className="al-book-cover-face"><div className="al-book-cover-frame"><span className="al-book-cover-edition">SUA LEITURA. SEU TEMPO.</span><span className="al-book-cover-emblem">A</span><span className="al-book-cover-title">Aldus<span>Reader</span></span><div className="al-book-cover-ornament"><i /><span>✦</span><i /></div><span className="al-book-cover-bottom">MUITO MAIS QUE UMA BIBLIOTECA</span></div></div><div className="al-book-cover-inside"><div>Todo livro<br />abre um<br /><em>universo.</em><span>ALDUS READER</span></div></div><div className="al-book-cover-edge" /><div className="al-book-cover-top" /><div className="al-book-cover-bottom-edge" /></div>
    <div className="al-book-spine" data-book-spine><span>Aldus Reader</span><i>✦</i></div>
    <div className="al-book-ribbon" />
  </div>;
}

export function ScrollBookStory({ children, plans }: PropsWithChildren<{ plans: CatalogPlan[] }>) {
  const track = useRef<HTMLElement>(null), sticky = useRef<HTMLDivElement>(null), scene = useRef<HTMLDivElement>(null);
  const navigation = useRef<(index: number) => void>(() => {});
  const [chapter, setChapter] = useState(0), [reduced, setReduced] = useState(false);
  const chapterRef = useRef(0);
  const navigate = useCallback((index: number) => navigation.current(index), []);
  useEffect(() => {
    const element = track.current, visual = scene.current, pinned = sticky.current;
    const scroller = element?.closest<HTMLElement>('[data-landing-scroll], .al-page-scroll');
    if (!element || !visual || !pinned || !scroller) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0, disposed = false, motionReduced = media.matches, headerHeight = -1, viewportHeight = -1;
    const changeChapter = (index: number) => { if (index !== chapterRef.current) { chapterRef.current = index; setChapter(index); } };
    const geometry = () => {
      const header = scroller.querySelector<HTMLElement>('.al-header');
      const nextHeader = header?.getBoundingClientRect().height ?? 0, nextViewport = scroller.clientHeight;
      if (nextHeader !== headerHeight) { headerHeight = nextHeader; element.style.setProperty('--book-header-height', `${headerHeight}px`); }
      if (nextViewport !== viewportHeight) { viewportHeight = nextViewport; element.style.setProperty('--book-viewport-height', `${viewportHeight}px`); }
      const top = element.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
      return { start: Math.max(0, top - headerHeight), height: element.offsetHeight, stickyHeight: pinned.offsetHeight };
    };
    const update = () => {
      frame = 0;
      if (disposed || motionReduced) return;
      const bounds = geometry(), pose = resolveBookPose(bookScrollProgress(scroller.scrollTop, bounds.start, bounds.height, bounds.stickyHeight));
      visual.dataset.bookProgress = pose.progress.toFixed(4); visual.dataset.bookChapter = String(pose.chapter);
      const css = visual.style;
      css.setProperty('--book-open', String(pose.open)); css.setProperty('--cover-angle', `${pose.coverAngle}deg`); css.setProperty('--cover-z', `${pose.coverZ}px`);
      css.setProperty('--camera-x', `${pose.cameraX}deg`); css.setProperty('--camera-y', `${pose.cameraY}deg`); css.setProperty('--camera-z', `${pose.cameraZ}deg`);
      pose.leaves.forEach((leaf, index) => { css.setProperty(`--leaf-${index}-angle`, `${leaf.angle}deg`); css.setProperty(`--leaf-${index}-curl`, `${leaf.curl}deg`); css.setProperty(`--leaf-${index}-bend`, String(leaf.curl / 10)); css.setProperty(`--leaf-${index}-z`, `${leaf.z}px`); });
      changeChapter(pose.chapter);
    };
    const schedule = () => { if (!disposed && !motionReduced && !frame) frame = requestAnimationFrame(update); };
    const preference = () => {
      motionReduced = media.matches; setReduced(motionReduced);
      element.dataset.motion = motionReduced ? 'reduce' : 'scroll';
      if (motionReduced) { if (frame) cancelAnimationFrame(frame); frame = 0; changeChapter(1); }
      else schedule();
    };
    element.dataset.enhanced = 'true'; preference();
    navigation.current = index => {
      const next = Math.max(0, Math.min(bookStops.length - 1, index));
      if (motionReduced) { changeChapter(next); return; }
      const bounds = geometry(); scroller.scrollTo({ top: bounds.start + bookStops[next] * Math.max(0, bounds.height - bounds.stickyHeight), behavior: 'auto' }); schedule();
    };
    scroller.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    media.addEventListener('change', preference);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    observer?.observe(scroller); observer?.observe(element); observer?.observe(pinned);
    void document.fonts?.ready.then(() => { if (!disposed) schedule(); });
    schedule();
    return () => {
      disposed = true; navigation.current = () => {}; if (frame) cancelAnimationFrame(frame);
      scroller.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); media.removeEventListener('change', preference); observer?.disconnect();
    };
  }, []);
  return <section ref={track} className="al-book-story" data-book-story aria-label="Conheça o Aldus pelas páginas de um livro">
    <style>{bookCss}</style>
    <div ref={sticky} className="al-hero al-container al-book-sticky">
      {children}
      <div className="al-book-presentation">
        <div className="al-book-stage">
          <div className="al-book-floor" />
          <div ref={scene} className="al-book-scene" data-book-scene data-book-progress="0.0000" data-book-chapter="0" aria-hidden="true">
            <BookGeometry plans={plans} />
            <div className="al-book-static"><div className="al-book-static-left"><PrintedPage scene="final" plans={plans} verso /></div><PrintedPage scene={chapter < 2 ? 'library' : chapter === 2 ? 'reader' : chapter === 3 ? 'study' : chapter === 4 ? 'plans' : 'final'} plans={plans} /></div>
          </div>
        </div>
        <div className="al-book-caption" aria-live="polite" aria-atomic="true"><span className="al-book-caption-kicker">{reduced ? 'EXPLORE SEM ANIMAÇÃO' : 'UM LIVRO. MUITAS POSSIBILIDADES.'}</span><h2>{bookChapters[chapter].title}</h2><p>{bookChapters[chapter].description}</p></div>
        <div className="al-book-navigation"><button type="button" aria-label="Etapa anterior do livro" disabled={chapter === 0} onClick={() => navigate(chapterRef.current - 1)}>←</button><span>{chapter + 1} / {bookChapters.length}<small>Prévia ilustrativa · sem dados pessoais</small></span><button type="button" aria-label="Próxima etapa do livro" disabled={chapter === bookStops.length - 1} onClick={() => navigate(chapterRef.current + 1)}>→</button></div>
        <a href="#experiencia" className="al-book-skip">Pular demonstração <span aria-hidden="true">↓</span></a>
        <noscript><p className="al-book-noscript">A demonstração animada precisa de JavaScript. Os recursos e planos continuam disponíveis abaixo.</p></noscript>
      </div>
    </div>
    <ol className="al-book-outline">{bookChapters.slice(1).map(item => <li key={item.title}><h3>{item.title}</h3><p>{item.description}</p></li>)}</ol>
  </section>;
}
