export const landingTitle='Aldus Reader — Muito mais que uma biblioteca';
export const landingDescription='Leia EPUB e PDF, organize sua biblioteca e estude no seu ritmo. Conheça o Aldus Reader e comece pela leitura local gratuita.';
export function publicSiteUrl(value:string|undefined):string|null {
 if(!value?.trim())return null;
 try{const url=new URL(value);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||url.pathname!=='/')return null;return url.origin+'/';}catch{return null;}
}
