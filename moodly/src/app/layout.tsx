import type { Metadata,Viewport } from 'next';
import './globals.css';
import { StoreProvider } from '@/components/store/store-provider';
import { AnnouncementBar } from '@/components/layout/announcement-bar';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { HydrationReady } from '@/components/ui/hydration-ready';
import { extensionAnnotationGuard } from '@/lib/hydration';
import { getStorefront } from '@/lib/server/store';
export const metadata:Metadata={ title:{default:'MOODLY — Good basics. No noise.',template:'%s | MOODLY'},description:'Browse Moodly designs and 240 GSM tees. Choose your colour and size, then request availability or a custom print on WhatsApp before payment.',icons:{icon:'/icon.svg'} };
export const viewport:Viewport={width:'device-width',initialScale:1,themeColor:'#ffffff'};
export const dynamic='force-dynamic';
export default async function RootLayout({children}:{children:React.ReactNode}) {
  const store=await getStorefront();
  return <html lang="en"><head><script dangerouslySetInnerHTML={{__html:extensionAnnotationGuard}}/></head><body><HydrationReady/><StoreProvider initial={store}><a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:bg-ink focus:px-4 focus:py-3 focus:text-white">Skip to content</a><AnnouncementBar/><Header/><main id="main-content">{children}</main><Footer year={new Date().getFullYear()}/><CartDrawer/></StoreProvider></body></html>;
}
