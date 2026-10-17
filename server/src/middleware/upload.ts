import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { tmpdir } from "node:os";

function resolveUploadDirectory() {
  if (process.env.NODE_ENV !== 'test') return path.resolve(process.cwd(), 'uploads');
  const root = process.env.TOKTICKIT_TEST_FILES;
  if (!root || path.dirname(root) !== path.resolve(tmpdir()) || !/^toktickit-lab4-[a-zA-Z0-9]+$/.test(path.basename(root))) {
    throw new Error('SAFETY BLOCK: test uploads require a disposable harness directory.');
  }
  return path.join(root, 'uploads');
}
export const uploadDir = resolveUploadDirectory();
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const storedFilename = `${randomUUID()}${ext}`;
    cb(null, storedFilename);
  },
});

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".pdf",
]);

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype.toLowerCase();

    if (ALLOWED_MIME_TYPES.has(mime) && ALLOWED_EXTENSIONS.has(ext)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only JPG, JPEG, PNG, WEBP, and PDF files under 5 MB are allowed."
        )
      );
    }
  },
});
