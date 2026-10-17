import Head from 'expo-router/head';
import { LandingDocument } from './LandingDocument';
import { useAuth } from '@/src/presentation/contexts/AuthContext';
import { accountPlanRepository } from '@/src/presentation/services/dependencies';
import { useSaasRead } from '@/src/presentation/saas/useSaasRead';
import { legalIdentity } from '@/src/legal/legalConfig';
import { landingTitle,landingDescription,publicSiteUrl } from './seo';

const readCatalog=(signal:AbortSignal)=>accountPlanRepository.readCatalog(signal);
const siteUrl=process.env.EXPO_PUBLIC_SITE_URL;
export function LandingPage(){
 const {session,profile}=useAuth(),catalog=useSaasRead(readCatalog);
 const signedIn=!!session&&profile?.id===session.user.id&&profile.account_status==='active'&&!!profile.username;
 const canonical=publicSiteUrl(siteUrl);
 return <div data-landing-interactive="true" data-landing-scroll className="al-page-scroll" style={{height:'100%',overflowY:'auto',overflowX:'hidden'}}>
  <Head><title>{landingTitle}</title><meta name="description" content={landingDescription}/><meta name="robots" content="index,follow"/>
   <meta property="og:title" content={landingTitle}/><meta property="og:description" content={landingDescription}/><meta property="og:type" content="website"/><meta property="og:locale" content="pt_BR"/>
   <meta name="twitter:card" content="summary_large_image"/>
   {canonical?<><link rel="canonical" href={canonical}/><meta property="og:url" content={canonical}/><meta property="og:image" content={`${canonical}aldus-share.png`}/></>:null}
  </Head>
  <LandingDocument signedIn={signedIn} catalog={catalog.data??undefined} contactEmail={legalIdentity.contactEmail}/>
 </div>;
}
