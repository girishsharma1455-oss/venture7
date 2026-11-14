import fs from 'node:fs';
import path from 'node:path';

const PUB = 'C:/giri/v7/v8/public';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

const targets = [
  '/assets/theme/images/mobileautomation/mobile_automation.ogg',
  '/assets/uploads/2024/05/party-emoji.png',
  '/assets/uploads/2024/09/Configuration-Customization.png',
  '/assets/uploads/2024/09/Custom-Solutions.png',
  '/assets/uploads/2024/09/Data-Migration.png',
  '/assets/uploads/2024/09/Dedicated-SPOC.png',
  '/assets/uploads/2024/09/Experienced-Team.png',
  '/assets/uploads/2024/09/Future-Ready-Solutions.png',
  '/assets/uploads/2024/09/Integration-with-Existing-Systems.png',
  '/assets/uploads/2024/09/Requirement-Gathering.png',
  '/assets/uploads/2024/09/Scalable-Implementations.png',
  '/assets/uploads/2024/09/Solution-Designing.png',
  '/assets/uploads/2024/09/Transparent-Process.png',
  '/assets/uploads/2024/09/User-Training-Support.png',
  '/assets/uploads/2025/07/Gas-Industry.webp',
  '/assets/uploads/2025/07/healthtech-1.webp',
  '/assets/uploads/2025/07/Mask-group-1.webp',
];

function liveOrigin(p) {
  if (p.startsWith('/assets/uploads/'))
    return 'https://www.venture7.com/wp-content/uploads/' + p.slice('/assets/uploads/'.length);
  if (p.startsWith('/assets/theme/'))
    return 'https://www.venture7.com/wp-content/themes/venture7/' + p.slice('/assets/theme/'.length);
  return null;
}

let ok = 0;
let gone = 0;
for (const t of targets) {
  const abs = path.join(PUB, t.replace(/^\//, ''));
  if (fs.existsSync(abs)) { console.log('EXISTS', t); continue; }
  const url = liveOrigin(t);
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA } });
    if (!res.ok) { console.log('gone-on-live', res.status, t); gone++; continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, buf);
    console.log('RECOVERED', buf.length, 'bytes', t);
    ok++;
  } catch (e) {
    console.log('error', t, e.message);
  }
}
console.log(`\nrecovered: ${ok} | still missing on live: ${gone}`);
