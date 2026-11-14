import type { Metadata, Viewport } from 'next';
import stylesheet from '../../.generated/tailwind';
import WebsiteInteractions from '@/components/WebsiteInteractions';
import CookieNotice from '@/components/CookieNotice';

export const metadata: Metadata = {
  title: 'Venture7® | AI Business Transformation',
  description: 'AI-first product engineering, digital transformation and enterprise technology services from Venture7.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth overflow-x-clip motion-reduce:scroll-auto">
      <head>
        {/* Build-generated Tailwind output; application styling is className utilities. */}
        <style dangerouslySetInnerHTML={{ __html: stylesheet }} />
        <link rel="icon" href="/assets/uploads/2024/01/08100444/v-logo_new.png" />
      </head>
      <body className="m-0 bg-white font-[Poppins,Arial,sans-serif] text-[#1b1b20] antialiased">
        {children}
        <CookieNotice />
        <WebsiteInteractions />
      </body>
    </html>
  );
}
