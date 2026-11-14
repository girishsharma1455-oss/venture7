import fs from 'node:fs';
import path from 'node:path';

const PUB = 'C:/giri/v7/v8/public';
const targets = [
  ['/assets/theme/images/reactNative/bullets.png', '/wp-content/themes/venture7/images/reactNative/bullets.png'],
  ['/assets/theme/images/devOps/icondevops.png', '/wp-content/themes/venture7/images/devOps/icondevops.png'],
  ['/assets/uploads/2025/06/product_banner.jpg', '/wp-content/uploads/2025/06/product_banner.jpg'],
  ['/assets/theme/images/devOps/Group 2052.jpg', '/wp-content/themes/venture7/images/devOps/Group 2052.jpg'],
  ['/assets/theme/images/slider_content/Group 1838.jpg', '/wp-content/themes/venture7/images/slider_content/Group 1838.jpg'],
  ['/assets/uploads/2025/03/Bg-Image-1.jpg', '/wp-content/uploads/2025/03/Bg-Image-1.jpg'],
  ['/assets/uploads/2025/01/card_bg.webp', '/wp-content/uploads/2025/01/card_bg.webp'],
  ['/assets/theme/images/mobileautomation/mobile_automation.ogg', '/wp-content/themes/venture7/images/mobileautomation/mobile_automation.ogg'],
];

for (const [dstRel, srcPath] of targets) {
  const dst = path.join(PUB, dstRel.replace(/^\//, ''));
  if (fs.existsSync(dst)) { console.log('EXISTS', dstRel); continue; }
  const url = 'https://www.venture7.com' + encodeURI(srcPath);
  try {
    const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } });
    if (!res.ok) { console.log('FAIL', res.status, dstRel); continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.writeFileSync(dst, buf);
    console.log('OK  ', buf.length, 'bytes', dstRel);
  } catch (e) {
    console.log('FAIL', dstRel, String(e));
  }
}
// f53241 check
console.log('f532 page exists in raw:', fs.existsSync('C:/giri/v7/venture7-clone/raw/f53241df22d0b94c.html'));
