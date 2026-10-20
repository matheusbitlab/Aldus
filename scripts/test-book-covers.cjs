const assert=require('node:assert/strict'),JSZip=require('jszip');
const React=require('../.expo/auth-test-tools/node_modules/react'),{act,create}=require('../.expo/auth-test-tools/node_modules/react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT=true;
const load=require('./community-test-loader.cjs')({react:React,'react/jsx-runtime':require('../.expo/auth-test-tools/node_modules/react/jsx-runtime'),'react-native':{View:'View',Text:'Text',Image:'Image',ActivityIndicator:'ActivityIndicator',StyleSheet:{create:v=>v,absoluteFill:{position:'absolute'}}}});
const {EpubParserService}=load('src/data/epub/EpubParserService.ts'),{BookCover}=load('src/presentation/components/BookCover.tsx'),{editorialCover}=load('src/presentation/components/bookCoverPresentation.ts');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN9sAAAAASUVORK5CYII=','base64');
async function epub(kind,image=png){
 const z=new JSZip();z.file('mimetype','application/epub+zip');z.file('META-INF/container.xml','<container><rootfiles><rootfile full-path="OPS/book.opf"/></rootfiles></container>');
 z.file('OPS/book.opf',`<package><metadata><title>Teste</title>${kind==='legacy'?'<meta name="cover" content="art"/>':''}</metadata><manifest><item id="text" href="text.xhtml"/><item id="art" href="images/cover.png" media-type="image/png" ${kind==='modern'?'properties="nav cover-image"':''}/></manifest><spine><itemref idref="text"/></spine>${kind.startsWith('guide')?'<guide><reference type="cover" href="cover.xhtml"/></guide>':''}</package>`);
 z.file('OPS/text.xhtml','<h1>Texto</h1><p>Conteúdo preservado.</p>');z.file('OPS/images/cover.png',image);z.file('cover.png',image);z.file('OPS/cover.xhtml',kind==='guide-parent'?'<img src="../cover.png"/>':'<img src="images/cover.png"/>');
 return z.generateAsync({type:'uint8array'});
}
(async()=>{
 const parser=new EpubParserService();let reference;
 for(const kind of ['modern','legacy','guide','guide-parent']){const p=await parser.parse(await epub(kind));assert.equal(p.coverImagePath,'data:image/png;base64,'+png.toString('base64'));reference??=p.chapters;assert.deepEqual(p.chapters,reference);}
 for(const [kind,data] of [['none',png],['modern',Buffer.from('broken')],['modern',Buffer.alloc(1048577)]])assert.equal((await parser.parse(await epub(kind,data))).coverImagePath,null);
 const controller=new AbortController();controller.abort();await assert.rejects(parser.parse(await epub('modern'),controller.signal),e=>e.name==='AbortError');
 const design=editorialCover('stable','Livro.pdf','');assert.equal(design.title,'Livro');assert.equal(design.author,'Autor não informado');assert.deepEqual(design,editorialCover('stable','Livro.pdf',''));
 assert.equal(editorialCover('stable','Título .pdf no meio').title,'Título .pdf no meio');
 assert.equal(editorialCover('pdf','PDF','Arquivo local').author,'Autor não informado');
 let view;const render=async p=>act(async()=>{const e=React.createElement(BookCover,{identity:'A',title:'Título longo '.repeat(20),author:'Autora',format:'epub',...p});if(view)view.update(e);else view=create(e);});
 try{
  await render({source:{uri:'file:///cover.jpg'},thumbnail:{uri:'file:///thumbnail.jpg'}});
  const image=()=>view.root.findByType('Image');assert.equal(image().props.resizeMode,'contain');
  await act(async()=>image().props.onError());assert.equal(image().props.source.uri,'file:///thumbnail.jpg');
  await act(async()=>image().props.onLoad({nativeEvent:{source:{width:12,height:12}}}));assert.equal(view.root.findAllByType('Image').length,0);
  await render({identity:'B',source:{uri:'file:///valid.jpg'}});
  await act(async()=>image().props.onLoad({nativeEvent:{source:{width:300,height:450}}}));assert.equal(view.root.findAllByProps({testID:'book-cover-loading'}).length,0);
  await render({identity:'B',source:{uri:'file:///replacement.jpg'}});assert.equal(view.root.findAllByProps({testID:'book-cover-loading'}).length,1);
  await render({identity:'drive-file',source:null,format:'pdf',compact:true});assert.equal(view.root.findAllByType('Image').length,0);
 }finally{if(view)await act(async()=>view.unmount());}
 console.log('PASS covers: EPUB 3/2/guide, absent/broken/bounded/cancelled; chapters unchanged; deterministic editorial; failure/thumbnail/tiny/reset/list/Drive. No remote book downloads.');
})().catch(e=>{console.error(e);process.exitCode=1;});
