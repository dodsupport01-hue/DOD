/**
 * Cloudflare R2 storage driver.
 *
 * R2 speaks the S3 API, so this is the standard AWS SDK v3 client pointed at an
 * R2 endpoint. Two things make it worth switching to:
 *
 *   • Egress is free. Bandwidth is what every other host meters, and video is
 *     what burns it. A 20 GB/month image CDN allowance disappears quickly once
 *     a page autoplays clips; on R2 the delivery is simply not billed.
 *   • Files are served from Cloudflare's edge, which has POPs in Mumbai, Delhi,
 *     Chennai, Bengaluru and Hyderabad — the visitors this site actually has.
 *
 * Objects are NEVER served from the S3 endpoint directly (it is not cached and
 * requires signing). They are served from a custom domain bound to the bucket —
 * R2_PUBLIC_BASE — which is what puts them behind the CDN.
 */

const crypto = require('crypto');
const path = require('path');

// The site runs on ImageKit, so the S3 SDK is deliberately NOT a dependency —
// there is no reason for the production install to carry it. It is loaded only
// if someone actually selects the R2 driver, with an error that says what to do.
function sdk() {
  try {
    return require('@aws-sdk/client-s3');
  } catch (err) {
    throw new Error(
      'The R2 driver needs the S3 SDK, which is not installed (production runs on ImageKit). ' +
        'Run `npm install @aws-sdk/client-s3` in backend/ first — see cloudflare/SETUP.md.'
    );
  }
}

let _client = null;

function getClient() {
  if (_client) return _client;
  const { S3Client } = sdk();
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error(
      'R2 is not configured — set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET and R2_PUBLIC_BASE.'
    );
  }
  _client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
  return _client;
}

const MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
};

function contentTypeFor(file) {
  if (file.mimetype && file.mimetype !== 'application/octet-stream') return file.mimetype;
  return MIME[path.extname(file.originalname || '').toLowerCase()] || 'application/octet-stream';
}

/**
 * Object keys must be unique and safe in a URL. The original name is kept
 * (readable keys make the bucket browsable) but slugified, with a short random
 * suffix so re-uploading the same filename never overwrites the earlier file.
 */
function buildKey(folder, originalName) {
  const ext = path.extname(originalName || '').toLowerCase();
  const base = path
    .basename(originalName || 'file', ext)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'file';
  return `${folder}/${base}-${crypto.randomBytes(6).toString('hex')}${ext}`;
}

function publicUrl(key) {
  const base = (process.env.R2_PUBLIC_BASE || '').replace(/\/+$/, '');
  if (!base) throw new Error('R2_PUBLIC_BASE is not set — objects would have no public URL.');
  return `${base}/${key}`;
}

/**
 * Upload an in-memory multer file to R2.
 *
 * The long immutable Cache-Control is safe because buildKey() gives every
 * upload a unique key: the bytes behind a URL never change, so the edge and the
 * browser can both hold it forever. This is the single biggest reason R2 files
 * feel instant on a second view.
 *
 * @returns {Promise<{url: string, fileId: string}>} fileId is the object key.
 */
async function uploadToR2(file, folder) {
  if (!file || !file.buffer) throw new Error('No file buffer to upload');
  const key = buildKey(folder, file.originalname);

  const { PutObjectCommand } = sdk();
  await getClient().send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: contentTypeFor(file),
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );

  return { url: publicUrl(key), fileId: key };
}

/** Delete by object key. Safe no-op on a missing key or a failure. */
async function deleteFromR2(key) {
  if (!key) return;
  try {
    const { DeleteObjectCommand } = sdk();
    await getClient().send(
      new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key })
    );
  } catch (err) {
    console.error('R2 delete error:', err.message);
  }
}

module.exports = { getClient, uploadToR2, deleteFromR2, buildKey, publicUrl, contentTypeFor };
