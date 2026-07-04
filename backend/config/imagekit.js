const ImageKit = require('imagekit');
const multer = require('multer');

// ─── ImageKit client (lazy) ──────────────────────────────────────────────────
// The ImageKit constructor throws if any key is missing. We build it lazily so
// that merely requiring this file (e.g. at server boot, or in tooling) doesn't
// crash the process — it only fails if/when an upload is actually attempted
// without configured keys, with a clear message.
let _imagekit = null;
function getImageKit() {
  if (_imagekit) return _imagekit;
  const { IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT } = process.env;
  if (!IMAGEKIT_PUBLIC_KEY || !IMAGEKIT_PRIVATE_KEY || !IMAGEKIT_URL_ENDPOINT) {
    throw new Error(
      'ImageKit is not configured — set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY and IMAGEKIT_URL_ENDPOINT.'
    );
  }
  _imagekit = new ImageKit({
    publicKey: IMAGEKIT_PUBLIC_KEY,
    privateKey: IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: IMAGEKIT_URL_ENDPOINT,
  });
  return _imagekit;
}

// ─── Multer memory storage ───────────────────────────────────────────────────
// Files are held in RAM as a Buffer, then streamed to ImageKit in the route via
// uploadToImageKit(). This mirrors the previous multer-storage-cloudinary flow
// but works with any provider.
const memoryStorage = multer.memoryStorage();

const IMAGE_FORMATS = /\.(jpe?g|png|gif|svg|webp)$/i;
const VIDEO_FORMATS = /\.(mp4|mov|webm|avi)$/i;

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

// Same size limits / accepted formats as the old Cloudinary config
const uploadBrand   = makeUploader({ formats: IMAGE_FORMATS, fileSize: 5 * 1024 * 1024 });
const uploadCert    = makeUploader({ formats: IMAGE_FORMATS, fileSize: 5 * 1024 * 1024 });
const uploadGallery = makeUploader({ formats: IMAGE_FORMATS, fileSize: 10 * 1024 * 1024 });
const uploadTeam    = makeUploader({ formats: IMAGE_FORMATS, fileSize: 5 * 1024 * 1024 });
const uploadVideo   = makeUploader({ formats: VIDEO_FORMATS, fileSize: 200 * 1024 * 1024 });

/**
 * Upload an in-memory file (from multer memoryStorage) to ImageKit.
 * @param {Express.Multer.File} file  - req.file from multer
 * @param {string} folder             - ImageKit folder, e.g. 'dod-healthcare/brands'
 * @returns {Promise<{url: string, fileId: string}>}
 */
async function uploadToImageKit(file, folder) {
  if (!file || !file.buffer) throw new Error('No file buffer to upload');
  const result = await getImageKit().upload({
    file: file.buffer,               // Buffer is accepted directly
    fileName: file.originalname,     // ImageKit appends a unique suffix by default
    folder,                          // e.g. 'dod-healthcare/brands'
    useUniqueFileName: true,
  });
  return { url: result.url, fileId: result.fileId };
}

/**
 * Delete a file from ImageKit by its fileId. Safe no-op on missing id / errors.
 * @param {string} fileId
 */
async function deleteFromImageKit(fileId) {
  if (!fileId) return;
  try {
    await getImageKit().deleteFile(fileId);
  } catch (err) {
    console.error('ImageKit delete error:', err.message);
  }
}

module.exports = {
  getImageKit,
  uploadBrand,
  uploadCert,
  uploadGallery,
  uploadTeam,
  uploadVideo,
  uploadToImageKit,
  deleteFromImageKit,
};
