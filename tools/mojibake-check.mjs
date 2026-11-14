import fs from 'node:fs';

const f = 'C:/giri/v7/venture7-clone/raw/about-us.html';
const h = fs.readFileSync(f, 'utf8');

// find U+FFFD occurrences with context
let i = -1, n = 0;
while ((i = h.indexOf('\ufffd', i + 1)) !== -1 && n < 8) {
  n++;
  console.log(JSON.stringify(h.slice(Math.max(0, i - 30), i + 30)));
}
console.log('total \\ufffd in about-us:', (h.match(/\ufffd/g) || []).length);

// Check what byte sequence surrounds one occurrence on disk
const buf = fs.readFileSync(f);
const pos = buf.indexOf(Buffer.from([0xef, 0xbf, 0xbd]));
console.log('first EF BF BD at byte', pos, 'of', buf.length);
if (pos >= 0) {
  console.log('bytes around:', Buffer.from(buf.slice(Math.max(0, pos - 12), pos + 14)).toString('hex'));
  console.log('as latin1-ish:', buf.slice(Math.max(0, pos - 12), pos + 14).toString('latin1'));
}

// Count in a few more files
for (const name of ['home.html', 'contact.html', 'blog.html', 'agentic-ai.html', 'about-us.html']) {
  const s = fs.readFileSync('C:/giri/v7/venture7-clone/raw/' + name, 'utf8');
  console.log(name, 'ufffd:', (s.match(/\ufffd/g) || []).length);
}
