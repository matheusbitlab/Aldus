// Actual Library, cards, bulk modal and organization repositories. Isolated synthetic
// accounts, storage and book metadata; no managed backend or physical-device claim.
const fs=require('fs'),path=require('path');
const mocks={
 'react-native-safe-area-context':`export const useSafeAreaInsets=()=>({top:0,bottom:0});`,
 '@expo/vector-icons':`import React from 'react';import{Text}from'react-native-web';export const Ionicons=()=>React.createElement(Text,{'aria-hidden':true},'·');`,
 'expo-router':`export const router={push:route=>window.fixture.route=route};`,
 '@/src/constants/mockBooks':`export const MOCK_BOOKS=[];`,
 '@/src/utils/coverHelper':`export const getBookCover=()=>null;`,
 './BookCover':`import React from'react';import{View,Text}from'react-native-web';export const BookCover=({title})=>React.createElement(View,{style:{flex:1,padding:18,backgroundColor:'#254e3e',justifyContent:'center'}},React.createElement(Text,{style:{color:'#f4ecd9'}},title));`,
 '@/src/presentation/contexts/AppThemeContext':`import React from'react';import{appThemeTokens}from'@/src/theme/tokens';export function useAppTheme(){const dark=React.useSyncExternalStore(f=>{window.addEventListener('fixture-theme',f);return()=>window.removeEventListener('fixture-theme',f)},()=>window.fixture.dark);return{palette:appThemeTokens[dark?'dark':'light'],resolvedTheme:dark?'dark':'light',setMode:async mode=>{window.fixture.dark=mode==='dark';window.dispatchEvent(new Event('fixture-theme'))}}}`,
 '@/src/presentation/hooks/useBookImport':`export const useBookImport=()=>({state:{status:'idle'},busy:false,start(){},cancel(){},dismiss(){}});`,
 '@/src/presentation/components/BookImportModal':`export const BookImportModal=()=>null;`,
 '@/src/presentation/components/LibrarySyncControls':`import React from'react';import{Text}from'react-native-web';export const BookCloudControls=()=>React.createElement(Text,null,'Neste dispositivo · fixture');`,
 '@/src/utils/epubOpenMetrics':`export const markEpubLibraryReady=()=>{};export const startEpubOpenTrace=()=>{};`,
 '@/src/presentation/services/dependencies':`import{LibraryOrganizationStore}from'@/src/data/local/LibraryOrganizationStore';import{AccountOrganizationRepository}from'@/src/data/library/AccountOrganizationRepository';import{libraryAccountScope as scope}from'@/src/data/library/LibraryAccountScope';
 scope.set('A');window.fixture={route:null,dark:false,count:60};
 const books=()=>Array.from({length:window.fixture.count},(_,i)=>({id:scope.userId+'-'+i,title:'Livro sintético '+String(i+1).padStart(4,'0'),author:'Aldus QA',fileName:'qa.epub',filePath:'file:///qa.epub',mimeType:'application/epub+zip',progress:i%3===0?.25:0,addedDate:i}));
 window.fixture.books=books;window.fixture.switchAccount=id=>{scope.set(id);window.dispatchEvent(new Event('fixture-change'))};window.fixture.resize=count=>{window.fixture.count=count;window.dispatchEvent(new Event('fixture-change'))};
 const raw=new LibraryOrganizationStore({getItem:async key=>localStorage.getItem(key),setItem:async(key,v)=>localStorage.setItem(key,v)});
 export const libraryOrganization=new AccountOrganizationRepository(raw,{scope,listActive:async()=>books(),findById:async id=>books().find(b=>b.id===id)??null});
 window.fixture.records=()=>libraryOrganization.list();`,
 '@/src/presentation/hooks/useLibrary':`import React from'react';import'@/src/presentation/services/dependencies';export function useLibrary(){const[books,set]=React.useState(()=>window.fixture.books());React.useEffect(()=>{const f=()=>set(window.fixture.books());window.addEventListener('fixture-change',f);return()=>window.removeEventListener('fixture-change',f)},[]);return{books,status:'success',error:null,reload:async()=>set(window.fixture.books())}}`,
 '@react-native-async-storage/async-storage':`export default{};`,
};
const out=path.resolve('.expo/cycle2-library-web');fs.mkdirSync(out,{recursive:true});
const entry=path.resolve('library-bulk-matrix-'+process.pid+'.jsx');
fs.writeFileSync(entry,`import React from'react';import{createRoot}from'react-dom/client';import Library from'./app/(tabs)/library';createRoot(document.getElementById('root')).render(<Library/>);`);
(async()=>{try{await require('../.expo/reader-matrix-tools/node_modules/esbuild').build({entryPoints:[entry],outfile:path.join(out,'matrix.js'),bundle:true,platform:'browser',format:'iife',jsx:'automatic',alias:{'react-native':'react-native-web'},define:{'process.env.NODE_ENV':'"production"','__DEV__':'false'},plugins:[{name:'boundaries',setup(build){build.onResolve({filter:/.*/},args=>args.path in mocks?{path:args.path,namespace:'fixture'}:undefined);build.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:mocks[args.path],loader:'js',resolveDir:process.cwd()}));}}]});}finally{fs.unlinkSync(entry)}})().catch(e=>{console.error(e);process.exitCode=1});
