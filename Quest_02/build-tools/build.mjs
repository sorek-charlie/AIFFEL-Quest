// Bundle solar-rush/dist into one self-contained index.html (three.js, CSS, favicon, earth texture inlined).
import { build, transform } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [src, outFile] = process.argv.slice(2);
const b64 = (f) => readFileSync(join(src, f)).toString('base64');

const js = (await build({ entryPoints: [join(src, 'game.js')], bundle: true, format: 'esm', minify: true, write: false, target: 'es2020', legalComments: 'none' })).outputFiles[0].text;
const earth = 'data:image/jpeg;base64,' + b64('assets/earth.jpg');
if (!js.includes('./assets/earth.jpg')) throw new Error('earth texture path not found in bundle');
const script = js.replace('./assets/earth.jpg', earth).replaceAll('</script', '<\\/script');
const css = (await transform(readFileSync(join(src, 'style.css'), 'utf8'), { loader: 'css', minify: true })).code;

let html = readFileSync(join(src, 'index.html'), 'utf8');
const swap = (from, to) => { if (!html.includes(from)) throw new Error('missing: ' + from); html = html.replace(from, () => to); };
swap('<link rel="icon" href="favicon.svg" type="image/svg+xml">', `<link rel="icon" href="data:image/svg+xml;base64,${b64('favicon.svg')}">`);
swap('<link rel="stylesheet" href="style.css">', `<style>${css}</style>`);
swap('<script type="module" src="game.js"></script>', `<script type="module">${script}</script>`);
writeFileSync(outFile, html);
console.log('wrote', outFile, html.length, 'bytes');
