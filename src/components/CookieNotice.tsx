'use client';

import { useEffect, useState } from 'react';

export default function CookieNotice() {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setVisible(!localStorage.getItem('venture7-cookie-consent')); }, []);
  const close = () => {
    localStorage.setItem('venture7-cookie-consent', 'acknowledged');
    setVisible(false);
  };
  if (!visible) return null;
  return (
    <aside role="dialog" aria-label="We value your privacy" className="fixed bottom-5 left-4 z-[9999] box-border w-[calc(100%-2rem)] max-w-[432px] rounded-md border border-solid border-[#eeeeee] bg-white p-6 font-[Poppins,Arial,sans-serif] text-sm leading-6 text-[#222] shadow-lg min-[768px]:bottom-10 min-[768px]:left-10">
      <button type="button" aria-label="Close cookie notice" onClick={close} className="absolute right-2 top-2 flex size-6 cursor-pointer items-center justify-center rounded-full border border-solid border-[#a4b7b4] bg-white text-[#7d9290] hover:bg-[#f1f8f7]">×</button>
      <div className="mb-4 flex items-center gap-5">
        <span aria-hidden="true" className="text-[60px] leading-none">🍪</span>
        <p className="m-0">We use cookies to personalize your experience. By continuing to visit this website you agree to our use of cookies.<a href="/privacy-policy/" className="font-semibold text-[#087584] no-underline hover:underline">Privacy Policy</a></p>
      </div>
      <button type="button" onClick={close} className="w-full cursor-pointer border-0 bg-[#035c56] px-5 py-3 font-[inherit] text-sm font-medium text-white transition-colors hover:bg-[#024843] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#035c56]">Cookies Accept</button>
    </aside>
  );
}
