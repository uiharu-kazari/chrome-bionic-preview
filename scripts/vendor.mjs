import { copyFileSync, readFileSync } from 'node:fs';
const assets = [
  ['marked/lib/marked.umd.js', 'lib/marked.umd.js'],
  ['marked/LICENSE', 'lib/marked.LICENSE'],
  ['dompurify/dist/purify.min.js', 'lib/purify.min.js'],
  ['dompurify/LICENSE', 'lib/dompurify.LICENSE'],
  ['katex/dist/katex.min.js', 'lib/katex.min.js'],
  ['katex/LICENSE', 'lib/katex.LICENSE']
];
for (const [source, destination] of assets) {
  if (process.argv.includes('--check')) {
    if (!readFileSync(`node_modules/${source}`).equals(readFileSync(destination))) {
      throw new Error(`${destination} differs from its pinned dependency. Run npm run vendor.`);
    }
  } else copyFileSync(`node_modules/${source}`, destination);
}
console.log(process.argv.includes('--check') ? 'Vendored runtime libraries match pinned dependencies.' : 'Updated vendored runtime libraries and licenses.');
