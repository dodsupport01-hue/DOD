// Combines the three stylesheets into one minified file (styles.min.css).
//
// Why: they were three separate render-blocking <link> tags — three round-trips
// before the browser could paint. One minified file is a single request and
// roughly 25% fewer bytes.
//
// Order matters: it must match the original <link> order, or the cascade changes.
//
// Run after editing any CSS:
//     npm install clean-css
//     node build-css.js

const fs = require('fs');
const crypto = require('crypto');
const CleanCSS = require('clean-css');

// fonts.css must come FIRST so the @font-face rules are declared before any
// rule uses them.
const FILES = ['fonts.css', 'styles.css', 'styles-additions.css', 'perf-mobile.css'];
const OUT = 'styles.min.css';

const combined = FILES.map((f) => fs.readFileSync(f, 'utf8')).join('\n');

const result = new CleanCSS({ level: 2, rebase: false }).minify(combined);

if (result.errors.length) {
  console.error('CSS errors:', result.errors);
  process.exit(1);
}
if (result.warnings.length) {
  console.warn('warnings:', result.warnings.slice(0, 5));
}

fs.writeFileSync(OUT, result.styles);

// ─── Cache-bust the <link> in index.html ─────────────────────────────────────
//
// styles.min.css is served with `max-age=86400` and its filename never changes,
// so a CSS deploy is invisible to anything already holding a copy for up to a
// day. That is not theoretical: a font change shipped correctly to the origin
// and the site kept rendering the old faces, because Hostinger's edge was still
// handing out yesterday's stylesheet under the same URL.
//
// Stamping a hash of the built file onto the href makes each build a distinct
// URL, so caches treat it as a new resource and there is nothing stale to
// serve. The hash only changes when the CSS does, so unchanged builds keep
// their cached copy.
const HTML = 'index.html';
const hash = crypto.createHash('sha1').update(result.styles).digest('hex').slice(0, 8);

if (fs.existsSync(HTML)) {
  const html = fs.readFileSync(HTML, 'utf8');
  const stamped = html.replace(
    /href="styles\.min\.css(?:\?v=[a-f0-9]+)?"/,
    'href="styles.min.css?v=' + hash + '"'
  );
  if (stamped !== html) {
    fs.writeFileSync(HTML, stamped);
    console.log('stamped ' + HTML + ' -> styles.min.css?v=' + hash);
  } else if (!html.includes('styles.min.css?v=' + hash)) {
    console.warn('WARNING: could not find the styles.min.css <link> in ' + HTML + ' to stamp.');
  }
}

const kb = (n) => Math.round(n / 1024) + ' KB';
console.log('combined ' + FILES.length + ' files : ' + kb(combined.length));
console.log('minified -> ' + OUT + ' : ' + kb(result.styles.length));
console.log('saved              : ' + kb(combined.length - result.styles.length) + '  (' + Math.round((1 - result.styles.length / combined.length) * 100) + '%)');
