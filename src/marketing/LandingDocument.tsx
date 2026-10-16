import { useEffect,useRef,useState } from 'react';
import type { CatalogPlan } from '@/src/domain/saas/accountPlan';
import { catalogPrice,featureLabels,formatBytes } from '@/src/domain/saas/planPresentation';
import { planLabel } from '@/src/presentation/i18n/ptBR';
import { initialCatalogReference } from './catalogReference.generated';
import { landingCss } from './landingStyles';

export interface LandingProps { signedIn?:boolean; catalog?:CatalogPlan[]; contactEmail?:string|null; }
const faqs=[
 ['O Aldus é gratuito?','Sim. Leitura local, importação e ferramentas básicas de estudo fazem parte do plano Gratuito. A proposta inclui sincronização e armazenamento privado com franquia; os serviços de nuvem estão em ativação.'],
 ['Posso importar meus próprios livros?','Você pode adicionar arquivos EPUB e PDF ao aplicativo. Importe apenas obras que você tem direito de usar. Seus arquivos locais continuam disponíveis independentemente de plano pago.'],
 ['Posso ler sem internet?','Livros locais podem ser lidos sem conexão no aplicativo Android. Na Web, mantenha o aplicativo carregado e o arquivo disponível no navegador; abrir o site pela primeira vez pode exigir internet. Importe ou baixe seus livros antes de ficar offline.'],
 ['Minha biblioteca pode sincronizar entre dispositivos?','O Aldus já possui recursos de sincronização de biblioteca, progresso e estudos. A disponibilidade dos envios e das franquias de nuvem está em ativação. Consulte Meu Plano no aplicativo antes de contar com esse serviço entre dispositivos.'],
 ['O que acontece quando o armazenamento fica cheio?','A leitura local continua. Arquivos, notas e progresso existentes são preservados. Novos envios que ultrapassem a franquia aguardam capacidade disponível; alterações permitidas de livros existentes podem continuar sincronizando.'],
 ['Preciso pagar para usar o Reader?','Não. Leitura EPUB e PDF e importação local fazem parte da experiência gratuita. O Pro amplia a capacidade prevista de nuvem, tem preço ainda não definido e não está disponível para contratação.'],
];
function BookMark(){return <svg viewBox="0 0 32 32" width="31" height="31" aria-hidden="true"><path fill="currentColor" d="M4 5h9c3 0 4 2 4 2s1-2 4-2h7v22h-8c-2 0-3 1-3 1s-2-1-4-1H4V5Zm3 3v16h6c1 0 2 .2 2 .2V9s-1-1-3-1H7Zm12 1v15.2s1-.2 2-.2h4V8h-4c-1 0-2 1-2 1Z"/></svg>;}
function Arrow(){return <span aria-hidden="true">↗</span>;}
function AppPreview(){
 const [tab,setTab]=useState<'library'|'reader'|'study'>('library');
 const [theme,setTheme]=useState('paper');
 return <div className="al-preview" aria-label="Demonstração ilustrativa do Aldus">
  <div className="al-preview-top"><span className="al-preview-brand">Aldus</span><span className="al-demo-label">PRÉVIA ILUSTRATIVA</span><span className="al-avatar" aria-hidden="true">A</span></div>
  <div className="al-preview-tabs" role="tablist" aria-label="Explorar a prévia">
   {([['library','Biblioteca'],['reader','Reader'],['study','Estudo']] as const).map(([id,label],index)=><button key={id} id={`preview-tab-${id}`} role="tab" tabIndex={tab===id?0:-1} aria-selected={tab===id} aria-controls="preview-panel" onClick={()=>setTab(id)} onKeyDown={event=>{
    const order=['library','reader','study'] as const;
    const next=event.key==='ArrowRight'?(index+1)%3:event.key==='ArrowLeft'?(index+2)%3:event.key==='Home'?0:event.key==='End'?2:-1;
    if(next>=0){event.preventDefault();setTab(order[next]);requestAnimationFrame(()=>document.getElementById(`preview-tab-${order[next]}`)?.focus());}
   }}>{label}</button>)}
  </div>
  <div id="preview-panel" role="tabpanel" aria-labelledby={`preview-tab-${tab}`}>
   {tab==='library'?<div className="al-demo-library"><div className="al-demo-heading"><div><small>SEU ESPAÇO DE LEITURA</small><h3>Sua Biblioteca</h3></div><span className="al-demo-plus" aria-hidden="true">+</span></div>
    <div className="al-covers">{[['Dom Casmurro','Machado de Assis','warm'],['A hora de ler','Título ilustrativo','sage'],['Entre páginas','Título ilustrativo','ink']].map(([title,author,color])=><div className="al-demo-book" key={title}><div className={`al-cover al-cover-${color}`}><span>ALDUS · LEITURAS</span><strong>{title}</strong><i aria-hidden="true"/><small>{author}</small></div><b>{title}</b><small>Disponível no dispositivo</small></div>)}</div>
    <div className="al-demo-progress"><span>Um lugar para cada história.</span><span aria-hidden="true">▥</span></div>
   </div>:tab==='reader'?<div className={`al-demo-reader al-demo-theme-${theme}`}><div className="al-reader-toolbar"><span>Reader · demonstração</span><span aria-hidden="true">Aa</span></div><h3>O tempo de uma página.</h3><p>Há um espaço entre a pressa do dia e a próxima linha. Um espaço para imaginar, descobrir e voltar a uma ideia com outro olhar.</p><p>Aqui, a leitura encontra o seu ritmo.</p><div className="al-theme-buttons" aria-label="Experimentar temas da prévia">{[['paper','Papel'],['sepia','Sépia'],['dark','Escuro']].map(([id,label])=><button key={id} aria-pressed={theme===id} onClick={()=>setTheme(id)}>{label}</button>)}</div></div>:<div className="al-demo-study"><small>APRENDER TAMBÉM É REVISITAR</small><h3>Uma ideia que fica.</h3><div className="al-flashcard"><span>flashcard ilustrativo</span><h4>O que esta leitura despertou em você?</h4><p>Transforme uma passagem importante em uma pergunta para revisar depois.</p></div><p>Organize seus estudos em um deck e revise no seu ritmo.</p></div>}
  </div>
  <div className="al-preview-bottom">Dados de demonstração · sem biblioteca de usuários</div>
 </div>;
}
export function LandingDocument({signedIn=false,catalog,contactEmail=null}:LandingProps){
 const root=useRef<HTMLDivElement>(null),menu=useRef<HTMLDetailsElement>(null);
 const plans=catalog??initialCatalogReference;
 useEffect(()=>{
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  let observer:IntersectionObserver|undefined;
  const reveal=()=>{observer?.disconnect();root.current?.querySelectorAll('[data-reveal]').forEach(n=>n.setAttribute('data-visible','true'));};
  if(!media.matches&&typeof IntersectionObserver!=='undefined'){
   observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.setAttribute('data-visible','true');observer?.unobserve(entry.target);}},{threshold:.08});
   root.current?.querySelectorAll('[data-reveal]').forEach(n=>{n.setAttribute('data-visible','false');observer!.observe(n);});
  }
  const motion=()=>{if(media.matches)reveal();};media.addEventListener('change',motion);
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&menu.current?.open){menu.current.open=false;menu.current.querySelector('summary')?.focus();}};
  window.addEventListener('keydown',escape);
  return()=>{observer?.disconnect();media.removeEventListener('change',motion);window.removeEventListener('keydown',escape);};
 },[]);
 const closeMenu=()=>{if(menu.current)menu.current.open=false;};
 const cta=signedIn?'/library':'/auth/signup';
 const ctaText=signedIn?'Abrir minha biblioteca':'Criar minha conta';
 const nav=<><a href="#recursos" onClick={closeMenu}>Recursos</a><a href="#como-funciona" onClick={closeMenu}>Como funciona</a><a href="#planos" onClick={closeMenu}>Planos</a><a href="#perguntas" onClick={closeMenu}>Perguntas frequentes</a></>;
 return <div data-aldus-landing ref={root}>
  <style>{landingCss}</style>
  <a className="al-skip" href="#conteudo">Pular para o conteúdo</a>
  <header className="al-header"><div className="al-header-inner">
   <a href="/" className="al-brand" aria-label="Aldus Reader, início"><BookMark/><span>Aldus<span className="al-brand-reader"> Reader</span></span></a>
   <nav className="al-desktop-nav" aria-label="Navegação principal">{nav}</nav>
   <div className="al-header-actions"><a className="al-login" href="/auth/login">Entrar</a><a className="al-button al-button-small" href={cta}>{signedIn?'Biblioteca':'Criar conta'} <Arrow/></a></div>
   <details className="al-mobile-menu" ref={menu}><summary aria-label="Menu de navegação"><span aria-hidden="true">☰</span></summary><nav aria-label="Navegação para celular">{nav}<a href="/auth/login">Entrar</a><a href={cta}>{ctaText} <Arrow/></a></nav></details>
  </div></header>
  <main id="conteudo" tabIndex={-1}>
   <section className="al-hero al-container">
    <div className="al-hero-copy al-enter"><div className="al-eyebrow"><span/> SUA LEITURA. SEU TEMPO.</div><h1>Muito mais que<br/>uma <em>biblioteca.</em></h1><p className="al-lead">Leia, organize e estude. Um lugar para os seus livros — e para tudo o que eles despertam em você.</p>
     <div className="al-hero-actions"><a href={cta} className="al-button">{ctaText} <Arrow/></a><a className="al-text-link" href="#experiencia">Conhecer o Aldus <span aria-hidden="true">↓</span></a></div>
     <p className="al-hero-note">Comece pela leitura local, gratuitamente.<br/>EPUB e PDF, com o seu jeito de ler.</p>
    </div>
    <div className="al-hero-art al-enter"><div className="al-art-halo" aria-hidden="true"/><AppPreview/><div className="al-float-note" aria-hidden="true"><span>✦</span> Um livro.<br/><b>Novas possibilidades.</b></div></div>
   </section>
   <div className="al-ribbon"><div className="al-container"><span>EPUB + PDF</span><span>Leitura local</span><span>Organização pessoal</span><span>deck + flashcard</span><span>No seu ritmo</span></div></div>
   <section id="experiencia" className="al-container al-section" data-reveal><div className="al-section-heading"><div><p className="al-eyebrow">DA PRIMEIRA PÁGINA À PRÓXIMA IDEIA</p><h2>Seu universo de leitura.<br/><em>Bem perto de você.</em></h2></div><p>Uma experiência que acompanha o livro inteiro: o que você lê, o que marca e o que quer guardar.</p></div>
    <div className="al-experience-grid"><article className="al-feature-reader"><div className="al-mini-page" aria-hidden="true"><small>ALDUS READER</small><div>Encontre seu<br/><em>próprio ritmo.</em></div><p>Uma página aberta.<br/>Espaço para novas ideias.</p><div className="al-page-lines"/></div><div><span className="al-kicker">01 · LEITURA</span><h3>O Reader se adapta a você.</h3><p>Escolha fonte, tema e espaçamento. Leia EPUB ou preserve o layout do PDF Original. A Leitura Livre adapta PDFs compatíveis.</p></div></article>
     <article className="al-feature-study"><div className="al-study-art" aria-hidden="true"><span>Uma passagem importante.</span><div>Uma pergunta para depois.</div><small>SEU PRÓXIMO FLASHCARD</small></div><div><span className="al-kicker">02 · ESTUDO</span><h3>Da leitura ao aprendizado.</h3><p>Retome notas e grifos, reúna flashcards em um deck e revise com repetição espaçada nos recursos de estudo do aplicativo.</p></div></article>
    </div>
   </section>
   <section id="recursos" className="al-dark-section"><div className="al-container al-section" data-reveal><div className="al-section-heading"><div><p className="al-eyebrow">MENOS DISPERSÃO. MAIS LEITURA.</p><h2>Um lugar para ler.<br/><em>E continuar descobrindo.</em></h2></div><p>Ferramentas que ajudam a cuidar da sua biblioteca, sem tirar o foco da próxima página.</p></div>
    <div className="al-resources">{[
     ['↳','Seus livros, com você','Importe EPUB e PDF e mantenha arquivos locais para ler sem depender de conexão.','Disponível no aplicativo'],
     ['▤','Tudo encontra seu lugar','Organize livros, acompanhe o progresso e retome suas leituras.','Disponível no aplicativo'],
     ['Aa','Uma leitura mais sua','Temas, fontes e ajustes de leitura para diferentes momentos e preferências.','Disponível no aplicativo'],
     ['✧','Ideias para revisitar','Notas, grifos e ferramentas de estudo ajudam a construir o seu repertório.','Conforme suporte do formato'],
     ['☁','Uma biblioteca entre dispositivos','Sincronização e espaço privado fazem parte do modelo gratuito, sujeitos à franquia.','Serviços de nuvem em ativação'],
     ['◎','Novas formas de compartilhar','Comunidade literária e batalhas de estudo fazem parte da evolução do Aldus.','Em desenvolvimento e homologação'],
    ].map(([icon,title,copy,status])=><article key={title}><span className="al-resource-icon" aria-hidden="true">{icon}</span><h3>{title}</h3><p>{copy}</p><small>{status}</small></article>)}</div>
   </div></section>
   <section id="como-funciona" className="al-container al-section" data-reveal><p className="al-eyebrow">SIMPLES DESDE O COMEÇO</p><h2>Abra espaço para<br/><em>a próxima história.</em></h2><ol className="al-steps">{[['Crie sua conta','Entre no Aldus pelo cadastro do aplicativo.'],['Adicione seus livros','Importe seus arquivos EPUB e PDF.'],['Organize sua biblioteca','Encontre um lugar para cada leitura.'],['Leia e estude','Ajuste o Reader e revisite suas ideias.']].map(([title,copy],i)=><li key={title}><span aria-hidden="true">0{i+1}</span><h3>{title}</h3><p>{copy}</p></li>)}</ol></section>
   <section id="planos" className="al-plans-section"><div className="al-container al-section" data-reveal><div className="al-section-heading"><div><p className="al-eyebrow">LEITURA PARA TODOS</p><h2>Comece com o essencial.<br/><em>Cresça no seu ritmo.</em></h2></div><p>Leitura e importação local são gratuitas. A diferença de capacidade está na franquia de nuvem, sem transformar o Reader em um recurso pago.</p></div>
    <p className="al-catalog-notice" role="note">{catalog?'Catálogo consultado com sua sessão. Valores informativos; nenhuma contratação está ativa.':'Referência inicial do catálogo, gerada da configuração do produto. O catálogo público em tempo real ainda não está disponível.'} Os serviços de nuvem estão em ativação. Consulte Meu Plano no aplicativo.</p>
    <div className="al-plan-grid">{plans.map(plan=><article key={plan.id} className={`al-plan ${plan.id==='pro'?'al-plan-pro':''}`}>
     <div className="al-plan-top"><span className="al-kicker">{plan.id==='free'?'SEU PONTO DE PARTIDA':'MAIS ESPAÇO PARA SUA BIBLIOTECA'}</span><span className="al-plan-state">{plan.id==='free'?'Sem mensalidade':'Contratação indisponível'}</span></div><h3>{planLabel(plan.id,plan.name)}</h3><p className={`al-plan-price ${plan.priceBrlCentavos===null?'al-plan-price-pending':''}`}>{catalogPrice(plan)}</p>
     {plan.id!=='free'&&plan.priceBrlCentavos!==null?<p>Preço de catálogo, apenas informativo.</p>:null}
     <div className="al-plan-capacity"><div><strong>{plan.limits.syncedBooks.toLocaleString('pt-BR')}</strong><span>livros sincronizados</span></div><div><strong>{formatBytes(plan.limits.storageBytes)}</strong><span>armazenamento privado</span></div></div>
     <ul>{Object.entries(featureLabels).filter(([id])=>plan.features[id]===true).map(([id,label])=><li key={id}><span aria-hidden="true">✓</span>{label}</li>)}</ul>
     {plan.id==='free'?<a className="al-button" href={cta}>{ctaText} <Arrow/></a>:<><button className="al-button" disabled>Contratação ainda indisponível</button><p className="al-plan-footnote">Preço e disponibilidade comercial serão informados quando houver uma oferta ativa.</p></>}
    </article>)}</div><p className="al-plans-note">As franquias descrevem o catálogo do Aldus, sem garantir capacidade agregada da infraestrutura de nuvem. Nenhum pagamento é iniciado aqui.</p>
   </div></section>
   <section id="perguntas" className="al-container al-section al-faq-section" data-reveal><div><p className="al-eyebrow">ANTES DA PRÓXIMA PÁGINA</p><h2>Boas perguntas.<br/><em>Respostas claras.</em></h2><p>A leitura começa com confiança.</p></div><div className="al-faq">{faqs.map(([question,answer])=><details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>
   <section className="al-final al-container" data-reveal><BookMark/><p className="al-eyebrow">UM NOVO CAPÍTULO</p><h2>Sua próxima leitura<br/>começa <em>aqui.</em></h2><p>Traga seus livros. Encontre seu ritmo.<br/>O resto começa na primeira página.</p><a className="al-button" href={cta}>{ctaText} <Arrow/></a></section>
  </main>
  <footer className="al-container al-footer"><div><a href="/" className="al-brand"><BookMark/><span>Aldus Reader</span></a><p>Leia. Organize. Descubra.</p></div><nav aria-label="Informações legais"><a href="/legal/privacy">Privacidade</a><a href="/legal/terms">Termos de uso</a><a href="/legal/copyright">Direitos autorais</a><a href={contactEmail?`mailto:${contactEmail}`:'/legal/about'}>Contato</a></nav><p className="al-footer-note">© {new Date().getFullYear()} Aldus Reader. Respeite os direitos de cada obra.</p></footer>
 </div>;
}
