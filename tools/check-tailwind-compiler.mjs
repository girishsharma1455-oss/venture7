/** Regression checks for reference-to-Tailwind cascade edge cases. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import parser from 'next/dist/compiled/babel/parser.js';

const source = fs.readFileSync('tools/rebuild-tailwind.mjs', 'utf8');
const ast = parser.parse(source, { sourceType: 'module' });
const names = new Set(['split', 'expand', 'encode', 'utility']);
const declarations = ast.program.body.filter(node => node.type === 'FunctionDeclaration' ? names.has(node.id.name) : node.type === 'VariableDeclaration' && node.declarations.some(d => names.has(d.id.name)));
const compiled = declarations.map(node => source.slice(node.start, node.end)).join('\n');
const helpers = vm.runInNewContext(compiled + '\n({expand,utility})');
const result = value => JSON.parse(JSON.stringify(value));

assert.deepEqual(result(helpers.expand('--padding-block-start', '10px')), [['--padding-block-start', '10px']], 'CSS variable identifiers must never be renamed');
assert.deepEqual(result(helpers.expand('padding-block-start', '10px')), [['padding-top', '10px']], 'LTR logical padding must participate in the same cascade as physical padding');
assert.deepEqual(result(helpers.expand('padding-inline', '10px 20px')), [['padding-left', '10px'], ['padding-right', '20px']]);
assert.deepEqual(result(helpers.expand('inset-inline-start', '10px')), [['left', '10px']]);
assert.deepEqual(result(helpers.expand('background', 'var(--blue)')), [['background-color', 'var(--blue)'], ['background-image', 'none']], 'Shorthand backgrounds must not override a higher priority color after utility sorting');
assert.equal(helpers.utility('color', 'var( --e-global-color-primary )'), '[color:var(--e-global-color-primary)]', 'Tailwind must receive a valid variable name rather than underscore-encoded argument whitespace');
assert.equal(helpers.utility('padding-top', 'calc(20px + 1rem)'), '[padding-top:calc(20px_+_1rem)]');
assert.deepEqual(result(helpers.expand('margin', '1px 2px 3px 4px')), [['margin-top', '1px'], ['margin-right', '2px'], ['margin-bottom', '3px'], ['margin-left', '4px']]);
console.log('Passed 8 Tailwind conversion regression checks.');
