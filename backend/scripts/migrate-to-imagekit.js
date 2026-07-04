/**
 * One-time migration: copy existing media from Cloudinary (or any current URL)
 * into ImageKit, and record the new url + fileId on each MongoDB document.
 *
 *  ── SAFETY ──────────────────────────────────────────────────────────────────
 *  • Nothing is deleted from Cloudinary. Old URLs keep working until you decide
 *    to shut Cloudinary down.
 *  • Idempotent: documents that already have an `imagekitFileId` are skipped, so
 *    you can re-run it safely if it stops halfway.
 *  • Only the DB url/fileId fields are changed. The legacy `cloudinaryPublicId`
 *    is left in place as a fallback record.
 *
 *  ── USAGE ───────────────────────────────────────────────────────────────────
 *    cd backend
 *    # ensure .env has IMAGEKIT_* keys AND the current MONGODB_URI
 *    npm run migrate:imagekit
 *
 *  Add --dry-run to preview what would happen without writing anything:
 *    node scripts/migrate-to-imagekit.js --dry-run
 */

require('dotenv').config();
const mongoose = require('mongoose');
const https = require('https');
const http = require('http');
const { getImageKit } = require('../config/imagekit');

const DRY_RUN = process.argv.includes('--dry-run');

// Models + the fields that hold the media url on each
const Brand         = require('../models/Brand');
const Certification = require('../models/Certification');
const GalleryImage  = require('../models/GalleryImage');
const TeamMember    = require('../models/TeamMember');
const LocalVideo    = require('../models/LocalVideo');

const TARGETS = [
  { name: 'Brand',         Model: Brand,         urlField: 'logoUrl',   folder: 'dod-healthcare/brands' },
  { name: 'Certification', Model: Certification, urlField: 'logoUrl',   folder: 'dod-healthcare/certifications' },
  { name: 'GalleryImage',  Model: GalleryImage,  urlField: 'imageUrl',  folder: 'dod-healthcare/gallery' },
  { name: 'TeamMember',    Model: TeamMember,    urlField: 'imageUrl',  folder: 'dod-healthcare/team' },
  { name: 'LocalVideo',    Model: LocalVideo,    urlField: 'videoUrl',  folder: 'dod-healthcare/local-videos' },
];

// Download a remote URL into a Buffer
function download(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode >= 400) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      // follow one redirect if needed
      if (res.statusCode >= 300 && res.headers.location) {
        return download(res.headers.location).then(resolve, reject);
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// Derive a filename from a URL (falls back to the doc id)
function fileNameFrom(url, id) {
  try {
    const clean = url.split('?')[0].split('#')[0];
    const base = clean.substring(clean.lastIndexOf('/') + 1);
    return base || `media-${id}`;
  } catch {
    return `media-${id}`;
  }
}

async function migrateModel({ name, Model, urlField, folder }) {
  const docs = await Model.find({});
  let migrated = 0, skipped = 0, failed = 0;

  console.log(`\n── ${name}: ${docs.length} document(s) ──`);

  for (const doc of docs) {
    const url = doc[urlField];

    // Already on ImageKit? skip.
    if (doc.imagekitFileId) { skipped++; continue; }
    // No media url (e.g. certification using only an emoji seal)? skip.
    if (!url) { skipped++; continue; }
    // Already an ImageKit url? just record it, no re-upload needed.
    const endpoint = process.env.IMAGEKIT_URL_ENDPOINT || '';
    if (endpoint && url.startsWith(endpoint)) { skipped++; continue; }

    try {
      if (DRY_RUN) {
        console.log(`  [dry-run] would migrate ${doc._id}  ${url}`);
        migrated++;
        continue;
      }

      const buffer = await download(url);
      const uploaded = await getImageKit().upload({
        file: buffer,
        fileName: fileNameFrom(url, doc._id),
        folder,
        useUniqueFileName: true,
      });

      doc[urlField] = uploaded.url;
      doc.imagekitFileId = uploaded.fileId;
      await doc.save();

      migrated++;
      console.log(`  ✓ ${doc._id}  →  ${uploaded.url}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${doc._id}  (${url})  — ${err.message}`);
    }
  }

  console.log(`   ${name} done: ${migrated} migrated, ${skipped} skipped, ${failed} failed`);
  return { migrated, skipped, failed };
}

(async () => {
  if (!process.env.IMAGEKIT_PRIVATE_KEY || !process.env.IMAGEKIT_URL_ENDPOINT) {
    console.error('❌ IMAGEKIT_* env vars are missing. Fill them in backend/.env first.');
    process.exit(1);
  }
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is missing in backend/.env');
    process.exit(1);
  }

  console.log(DRY_RUN ? '🔎 DRY RUN — no changes will be written\n' : '🚚 Migrating media to ImageKit…\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ MongoDB connected');

  const totals = { migrated: 0, skipped: 0, failed: 0 };
  for (const t of TARGETS) {
    const r = await migrateModel(t);
    totals.migrated += r.migrated;
    totals.skipped  += r.skipped;
    totals.failed   += r.failed;
  }

  console.log('\n════════════════════════════════════════');
  console.log(`TOTAL: ${totals.migrated} migrated, ${totals.skipped} skipped, ${totals.failed} failed`);
  console.log('════════════════════════════════════════');
  if (totals.failed > 0) {
    console.log('⚠️  Some items failed. Re-run the script — succeeded items are skipped automatically.');
  } else if (!DRY_RUN) {
    console.log('🎉 All media migrated. Verify the site, then you can retire Cloudinary.');
  }

  await mongoose.disconnect();
  process.exit(totals.failed > 0 ? 1 : 0);
})();
