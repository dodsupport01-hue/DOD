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

const kb = (n) => Math.round(n / 1024) + ' KB';
console.log('combined ' + FILES.length + ' files : ' + kb(combined.length));
console.log('minified -> ' + OUT + ' : ' + kb(result.styles.length));
console.log('saved              : ' + kb(combined.length - result.styles.length) + '  (' + Math.round((1 - result.styles.length / combined.length) * 100) + '%)');
