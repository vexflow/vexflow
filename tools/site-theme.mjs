// Bundle the website theme into each artifact so standalone pages work offline.
import { readFileSync } from 'node:fs';

const readAsset = (path, encoding) => readFileSync(new URL(path, import.meta.url), encoding);

// Keep single-page reports and cold gallery visits self-contained, including both font licenses.
const licenses = ['./fonts/tangerine/OFL.txt', '../node_modules/@vexflow-fonts/academico/LICENSE.txt'];
const fontNotices = licenses.map((path) => '/*!\n' + readAsset(path, 'utf8').trimEnd() + '\n*/\n').join('');
export const siteTheme =
  fontNotices +
  readAsset('./site-theme.css', 'utf8').replace(
    /url\('([^']+\.(woff2|ttf))'\)/g,
    (_, path, format) => `url('data:font/${format};base64,${readAsset(path, 'base64')}')`
  );

/** Source templates link the real CSS for local use. Single-file exports embed it in place. */
export function inlineSiteTheme(html) {
  return html.replace(
    /<link rel="stylesheet" href="(?:\.\.\/)+tools\/site-theme\.css" \/>/,
    () => `<style>\n${siteTheme}</style>`
  );
}
