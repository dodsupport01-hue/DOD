/**
 * Storage facade.
 *
 * Routes upload and delete through here rather than talking to a provider
 * directly, so moving between providers is an environment-variable change and
 * a migration run — not a code change in six route files.
 *
 *   STORAGE_DRIVER=imagekit   (default — current behaviour, nothing changes)
 *   STORAGE_DRIVER=r2         (Cloudflare R2 + custom domain)
 *
 * The multer uploaders are shared: both drivers take an in-memory buffer, so
 * the size limits and accepted formats live in one place regardless of where
 * the bytes end up.
 *
 * Switching the driver only affects NEW uploads. Existing documents keep the
 * URLs already stored on them and keep working — run
 * `npm run migrate:r2` to move the old files across.
 */

const multer = require('multer');

const DRIVER = (process.env.STORAGE_DRIVER || 'imagekit').toLowerCase();

// ─── Multer memory storage ───────────────────────────────────────────────────
const memoryStorage = multer.memoryStorage();

const IMAGE_FORMATS = /\.(jpe?g|png|gif|svg|webp)$/i;
const VIDEO_FORMATS = /\.(mp4|mov|webm|avi)$/i;
// Customer reviews send a video plus an optional poster image in one request.
const MEDIA_FORMATS = /\.(mp4|mov|webm|avi|jpe?g|png|webp)$/i;

function makeUploader({ formats, fileSize }) {
  return multer({
    storage: memoryStorage,
    limits: { fileSize },
    fileFilter: (req, file, cb) => {
      if (formats.test(file.originalname)) return cb(null, true);
      cb(new Error(`Unsupported file type: ${file.originalname}`));
    },
  });
}

const uploadBrand = makeUploader({ formats: IMAGE_FORMATS, fileSize: 5 * 1024 * 1024 });
const uploadCert = makeUploader({ formats: IMAGE_FORMATS, fileSize: 5 * 1024 * 1024 });
const uploadGallery = makeUploader({ formats: IMAGE_FORMATS, fileSize: 10 * 1024 * 1024 });
const uploadTeam = makeUploader({ formats: IMAGE_FORMATS, fileSize: 5 * 1024 * 1024 });
const uploadVideo = makeUploader({ formats: VIDEO_FORMATS, fileSize: 200 * 1024 * 1024 });
const uploadReview = makeUploader({ formats: MEDIA_FORMATS, fileSize: 200 * 1024 * 1024 });

// ─── Driver dispatch ─────────────────────────────────────────────────────────
// Required lazily so an unconfigured provider only fails when it is actually
// used — booting the server with one driver must not need the other's keys.

/**
 * @param {Express.Multer.File} file  in-memory file from multer
 * @param {string} folder             e.g. 'dod-healthcare/brands'
 * @returns {Promise<{url: string, fileId: string}>}
 */
async function uploadFile(file, folder) {
  if (DRIVER === 'r2') return require('./r2').uploadToR2(file, folder);
  return require('./imagekit').uploadToImageKit(file, folder);
}

/**
 * Delete a previously uploaded file.
 *
 * The stored id is an ImageKit fileId for old records and an R2 object key for
 * new ones. An R2 key always contains a slash and an ImageKit fileId never
 * does, so a mixed database — which is exactly what you have partway through a
 * migration — deletes correctly from whichever provider actually holds it.
 */
async function deleteFile(fileId) {
  if (!fileId) return;
  if (fileId.includes('/')) return require('./r2').deleteFromR2(fileId);
  return require('./imagekit').deleteFromImageKit(fileId);
}

module.exports = {
  DRIVER,
  uploadBrand,
  uploadCert,
  uploadGallery,
  uploadTeam,
  uploadVideo,
  uploadReview,
  uploadFile,
  deleteFile,
};
