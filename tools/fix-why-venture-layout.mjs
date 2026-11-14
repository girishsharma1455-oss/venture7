import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

// Keep screenshot-specific corrections when the reference markup is regenerated.
export function fixWhyVentureLayout(source) {
  const begin = source.indexOf('elementor-element-783d759');
  let stop = -1, depth = 0;
  const tags = /<\/?div\b[^>]*>/g;
  tags.lastIndex = source.lastIndexOf('<div', begin);
  for (let match; (match = tags.exec(source));) {
    depth += match[0].startsWith('</') ? -1 : match[0].endsWith('/>') ? 0 : 1;
    if (!depth) { stop = tags.lastIndex; break; }
  }
  if (begin < 0 || stop < 0) throw new Error('Why Venture7 widget not found');
  let section = source.slice(begin, stop);
  section = section.replace(/className="([^"]*)"/g, (attribute, classes) => {
    if (classes.startsWith('elementor-widget-container ')) {
      return `className="${classes.replaceAll(' min-[1200px]:[padding-left:0]! min-[1200px]:[padding-right:0]!', '')} min-[1200px]:[padding-left:0]! min-[1200px]:[padding-right:0]!"`;
    }
    if (classes.startsWith('block__graphic-wrap ')) {
      return 'className="block__graphic-wrap isolate relative mx-auto my-16 min-h-[350px] w-full [--max-size:350px] min-[1200px]:my-40 min-[1200px]:mx-0 min-[1200px]:-top-[5px] min-[1200px]:w-[910px] min-[1200px]:[left:calc(50%_+_1px)] min-[1200px]:-translate-x-1/2 min-[1200px]:[transform:scale(.9)]"';
    }
    if (classes.startsWith('block__features ')) {
      return 'className="block__features relative flex flex-col gap-5 pt-[250px] min-[1200px]:block min-[1200px]:static min-[1200px]:p-0"';
    }
    // Use the full reference composition only where all five cards fit.
    classes = classes.replaceAll('min-[768px]:', 'min-[1200px]:').replaceAll('min-[1280px]:', 'min-[1200px]:');
    if (classes.startsWith('feature__wrap ')) {
      classes = classes.replace(/(?:min-\[1025px\]:)?\[transform:scale\(\.9[05]?\)\]/g, '').replace(/_scale\(\.9[05]?\)/g, '').replaceAll('min-[1025px]:', 'min-[1200px]:');
    }
    if (classes.startsWith('card card--features ')) {
      // Only the background changes on hover; geometry and pulse effects stay fixed.
      classes = classes.split(/\s+/).filter(token => !/^hover:\[(?:transform|background-color):/.test(token) && !/^\[transition:/.test(token)).join(' ');
      classes += ' hover:[background-color:#e2f4f3] [transition:background-color_180ms_ease-out]';
      // Restore the reference's small teal endpoint within a white 30px marker.
      classes = classes.replace(/before:\[border-(?:top|right|bottom|left):10px_solid_#fff\]/g, '');
      classes = classes.replace('before:[left:-30px]', 'before:[left:-15px]');
      classes = classes.replaceAll(' before:[border:10px_solid_#fff]', '');
      classes = classes.replaceAll(' before:box-border', '');
      classes += ' before:box-border before:[border:10px_solid_#fff]';
      classes = classes.replaceAll(' max-[1199px]:!transform-none max-[1199px]:before:hidden', '');
      classes += ' max-[1199px]:!transform-none max-[1199px]:before:hidden';
    }
    return `className="${classes}"`;
  });
  // HTML-to-JSX serializes the empty circle as self-closing. Mount inside it,
  // so all animated layers share its coordinate system rather than the widget's.
  section = section.replace(/(<div className="rounded-circle rounded-circle--inner rounded-circle--1[^\"]*")\s*\/>\s*<WhyVentureRings\s*\/>/, '$1><WhyVentureRings /></div>');
  return source.slice(0, begin) + section + source.slice(stop);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const file = 'src/app/page.tsx';
  fs.writeFileSync(file, fixWhyVentureLayout(fs.readFileSync(file, 'utf8')));
}
