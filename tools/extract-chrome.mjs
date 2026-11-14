/**
 * Extracts the shared site chrome (header + footer) and the homepage's
 * stylesheet/style-block list from the generated homepage, so the 404 page
 * (and anything else) can render the exact same chrome.
 */
import fs from 'node:fs';

const home = fs.readFileSync('C:/giri/v7/v8/src/app/page.tsx', 'utf8');

const headerStart = home.indexOf('<header ');
const headerEnd = home.indexOf('</header>', headerStart);
if (headerStart < 0 || headerEnd < 0) throw new Error('header not found');
const headerJsx = home.slice(headerStart, headerEnd + '</header>'.length).trim();

const footerStart = home.indexOf('<footer id="colophon"');
const footerEnd = home.lastIndexOf('</footer>');
if (footerStart < 0 || footerEnd < 0) throw new Error('footer not found');
const footerJsx = home.slice(footerStart, footerEnd + '</footer>'.length).trim();

fs.writeFileSync(
  'C:/giri/v7/v8/src/components/SiteHeader.tsx',
  `/* Shared site header — extracted from the original theme markup. */
export default function SiteHeader() {
  return (
    <>
      ${headerJsx}
    </>
  );
}
`
);

fs.writeFileSync(
  'C:/giri/v7/v8/src/components/SiteFooter.tsx',
  `/* Shared site footer — extracted from the original theme markup. */
export default function SiteFooter() {
  return (
    <>
      ${footerJsx}
    </>
  );
}
`
);

// stylesheets + inline style blocks used by the homepage (same for every page
// that uses the standard theme chrome)
const links = [];
const styles = [];
for (const line of home.split('\n')) {
  const t = line.trim();
  if (t.startsWith('<link rel="stylesheet"')) links.push(t);
  else if (t.startsWith('<style dangerouslySetInnerHTML=')) styles.push(t);
}
fs.writeFileSync(
  'C:/giri/v7/v8/src/components/ThemeStyles.tsx',
  `/* The theme stylesheet + inline style blocks the site serves on every page. */
export default function ThemeStyles() {
  return (
    <>
${links.join('\n')}
${styles.join('\n')}
    </>
  );
}
`
);

console.log('header bytes:', headerJsx.length, '| footer bytes:', footerJsx.length);
console.log('stylesheets:', links.length, '| inline styles:', styles.length);
