import Link from 'next/link';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
export default function NotFound() {
  return <><SiteHeader /><main className="mx-auto flex min-h-[65vh] max-w-5xl flex-col items-center justify-center px-6 py-16 text-center">
    <img src="/assets/uploads/2025/07/08100354/404-1.png" alt="404 — Page not found" className="mb-6 h-auto w-full max-w-lg" />
    <p className="text-lg"><strong>Whoops!</strong> My pet went skateboarding through the web and crashed the page.</p>
    <p className="mb-8">We’re fetching it as fast as we can!</p>
    <Link href="/" className="bg-[#f5ce19] px-8 py-3 text-[#1b1b20] no-underline transition-colors hover:bg-[#ffd927]">Go to home</Link>
  </main><SiteFooter /></>;
}
