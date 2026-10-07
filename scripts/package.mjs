import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
if (manifest.version !== pkg.version) throw new Error('Manifest and package versions must match.');
if (manifest.host_permissions || manifest.content_scripts) throw new Error('Unexpected persistent page access in release manifest.');
if (JSON.stringify(manifest.permissions) !== JSON.stringify(['activeTab', 'storage', 'scripting'])) throw new Error('Unexpected release permissions.');
const name = `bionic-preview-${manifest.version}`;
const destination = resolve('dist', name);
mkdirSync('dist', { recursive: true });
rmSync(destination, { recursive: true, force: true });
mkdirSync(destination);
const files = [
  'manifest.json', 'LICENSE',
  'background/service-worker.js', 'content/content.js', 'content/content.css',
  'popup/popup.html', 'popup/popup.css', 'popup/popup.js',
  'lib/bionic.js', 'lib/gradient.js', 'lib/markdown.js',
  'lib/marked.umd.js', 'lib/marked.LICENSE', 'lib/purify.min.js', 'lib/dompurify.LICENSE',
  'lib/katex.min.js', 'lib/katex.LICENSE',
  ...Object.values(manifest.icons)
];
const hashes = {};
for (const file of files) {
  mkdirSync(resolve(destination, file, '..'), { recursive: true });
  cpSync(file, resolve(destination, file));
  hashes[file] = createHash('sha256').update(readFileSync(file)).digest('hex');
}
const archive = resolve('dist', `${name}.zip`);
rmSync(archive, { force: true });
const result = spawnSync('zip', ['-X', '-q', archive, ...files], { cwd: destination, encoding: 'utf8' });
if (result.status !== 0) throw new Error(result.stderr || 'ZIP packaging failed.');
writeFileSync(resolve('dist', `${name}.checksums.json`), JSON.stringify({ version: manifest.version, files: hashes, archive: createHash('sha256').update(readFileSync(archive)).digest('hex') }, null, 2) + '\n');
console.log(`Prepared ${archive} (${files.length} runtime/license files).`);
