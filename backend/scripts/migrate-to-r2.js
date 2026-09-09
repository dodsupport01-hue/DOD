/**
 * One-time migration: copy existing media from ImageKit / Cloudinary into
 * Cloudflare R2, and point each MongoDB document at the new URL.
 *
 *  ── SAFETY ──────────────────────────────────────────────────────────────────
 *  • Nothing is deleted from ImageKit or Cloudinary. The old files stay exactly
 *    where they are, so you can flip STORAGE_DRIVER back at any point.
 *  • Idempotent. A document whose stored id is already an R2 object key (keys
 *    contain a slash, ImageKit fileIds do not) is skipped, so a run that stops
 *    halfway can simply be run again.
 *  • --dry-run prints what it would do and writes nothing.
 *
 *  ── USAGE ───────────────────────────────────────────────────────────────────
 *    cd backend
 *    npm install                       # picks up @aws-sdk/client-s3
 *    # .env needs MONGODB_URI + the five R2_* vars (see .env.example)
 *    npm run migrate:r2 -- --dry-run   # look first
 *    npm run migrate:r2                # then move
 *
 *  Afterwards set STORAGE_DRIVER=r2 so new uploads go to R2 as well.
 */

const path = require('path');
// Load backend/.env regardless of the current working directory
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const https = require('https');
const http = require('http');

// Some home routers refuse the DNS SRV query that mongodb+srv:// needs, which
// makes Node fail with "querySrv ECONNREFUSED" even though the OS can resolve it.
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch { /* ignore */ }

const { uploadToR2 } = require('../config/r2');

// Cloudinary SDK — used to sign download URLs for accounts with "restricted
// media access" turned on, where plain delivery URLs answer HTTP 401.
const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const DRY_RUN = process.argv.includes('--dry-run');

const Brand = require('../models/Brand');
const Certification = require('../models/Certification');
const GalleryImage = require('../models/GalleryImage');
const TeamMember = require('../models/TeamMember');
const LocalVideo = require('../models/LocalVideo');
const Review = require('../models/Review');

// Each entry is one (model, url field, id field) pair. Reviews appear twice
// because a review carries a video and an optional poster, tracked separately.
const TARGETS = [
  { name: 'Brand',            Model: Brand,         urlField: 'logoUrl',      idField: 'imagekitFileId',  folder: 'dod-healthcare/brands',          resourceType: 'image' },
  { name: 'Certification',    Model: Certification, urlField: 'logoUrl',      idField: 'imagekitFileId',  folder: 'dod-healthcare/certifications',  resourceType: 'image' },
  { name: 'GalleryImage',     Model: GalleryImage,  urlField: 'imageUrl',     idField: 'imagekitFileId',  folder: 'dod-healthcare/gallery',         resourceType: 'image' },
  { name: 'TeamMember',       Model: TeamMember,    urlField: 'imageUrl',     idField: 'imagekitFileId',  folder: 'dod-healthcare/team',            resourceType: 'image' },
  { name: 'LocalVideo',       Model: LocalVideo,    urlField: 'videoUrl',     idField: 'imagekitFileId',  folder: 'dod-healthcare/local-videos',    resourceType: 'video' },
  { name: 'Review (video)',   Model: Review,        urlField: 'videoUrl',     idField: 'imagekitFileId',  folder: 'dod-healthcare/reviews',         resourceType: 'video' },
  { name: 'Review (poster)',  Model: Review,        urlField: 'thumbnailUrl', idField: 'thumbnailFileId', folder: 'dod-healthcare/reviews/posters', resourceType: 'image' },
];

function signedCloudinaryUrl(publicId, resourceType) {
  return cloudinary.url(publicId, { resource_type: resourceType, type: 'upload', secure: true, sign_url: true });
}

/** Download a URL into a Buffer, following up to 5 redirects. */
function download(url, hops = 0) {
  return new Promise((resolve, reject) => {
    if (hops > 5) return reject(new Error('too many redirects'));
    const client = url.startsWith('https') ? https : http;
    client
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          return download(new URL(res.headers.location, url).toString(), hops + 1).then(resolve, reject);
        }
        if (res.statusCode >= 400) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      })
      .on('error', reject);
  });
}

function fileNameFrom(url, id) {
  try {
    const clean = url.split('?')[0].split('#')[0];
    const base = decodeURIComponent(clean.substring(clean.lastIndexOf('/') + 1));
    return base || `media-${id}`;
  } catch {
    return `media-${id}`;
  }
}

/** An R2 object key contains a slash; an ImageKit fileId never does. */
function alreadyOnR2(doc, idField, url) {
  const id = doc[idField];
  if (id && String(id).includes('/')) return true;
  const base = (process.env.R2_PUBLIC_BASE || '').replace(/\/+$/, '');
  return !!(base && url && url.startsWith(base));
}

async function migrateTarget({ name, Model, urlField, idField, folder, resourceType }) {
  const docs = await Model.find({});
  let migrated = 0, skipped = 0, failed = 0;

  console.log(`\n── ${name}: ${docs.length} document(s) ──`);

  for (const doc of docs) {
    const url = doc[urlField];

    if (!url) { skipped++; continue; }                       // nothing stored (e.g. emoji-only seal)
    if (alreadyOnR2(doc, idField, url)) { skipped++; continue; }

    try {
      if (DRY_RUN) {
        console.log(`  [dry-run] would copy ${doc._id}  ${url}`);
        migrated++;
        continue;
      }

      // A signed Cloudinary URL works even on restricted accounts; anything
      // else (ImageKit, or a plain URL) downloads directly.
      let downloadUrl = url;
      if (doc.cloudinaryPublicId && url.includes('res.cloudinary.com')) {
        downloadUrl = signedCloudinaryUrl(doc.cloudinaryPublicId, resourceType);
      }

      let buffer;
      try {
        buffer = await download(downloadUrl);
      } catch (e) {
        if (downloadUrl !== url) buffer = await download(url);
        else throw e;
      }

      const uploaded = await uploadToR2(
        { buffer, originalname: fileNameFrom(url, doc._id), mimetype: '' },
        folder
      );

      doc[urlField] = uploaded.url;
      doc[idField] = uploaded.fileId;
      await doc.save();

      migrated++;
      console.log(`  ✓ ${doc._id}  →  ${uploaded.url}  (${(buffer.length / 1024).toFixed(0)} KB)`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${doc._id}  (${url})  — ${err.message}`);
    }
  }

  console.log(`   ${name} done: ${migrated} copied, ${skipped} skipped, ${failed} failed`);
  return { migrated, skipped, failed };
}

(async () => {
  const missing = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_PUBLIC_BASE'].filter(
    (k) => !process.env[k]
  );
  if (missing.length) {
    console.error(`❌ Missing in backend/.env: ${missing.join(', ')}`);
    process.exit(1);
  }
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is missing in backend/.env');
    process.exit(1);
  }

  console.log(DRY_RUN ? '🔎 DRY RUN — nothing will be written\n' : '🚚 Copying media to Cloudflare R2…\n');
  console.log(`   bucket: ${process.env.R2_BUCKET}`);
  console.log(`   public: ${process.env.R2_PUBLIC_BASE}\n`);

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ MongoDB connected');

  const totals = { migrated: 0, skipped: 0, failed: 0 };
  for (const t of TARGETS) {
    const r = await migrateTarget(t);
    totals.migrated += r.migrated;
    totals.skipped += r.skipped;
    totals.failed += r.failed;
  }

  console.log('\n════════════════════════════════════════');
  console.log(`TOTAL: ${totals.migrated} copied, ${totals.skipped} skipped, ${totals.failed} failed`);
  console.log('════════════════════════════════════════');
  if (totals.failed > 0) {
    console.log('⚠️  Some items failed. Re-run — anything already copied is skipped.');
  } else if (!DRY_RUN) {
    console.log('🎉 Media is on R2. Set STORAGE_DRIVER=r2, restart the API, and check the site.');
    console.log('   Keep ImageKit/Cloudinary for a week before deleting anything.');
  }

  await mongoose.disconnect();
  process.exit(totals.failed > 0 ? 1 : 0);
})();
