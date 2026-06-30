import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const ALLOWED_IMAGE_MIMES = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
const ALLOWED_VIDEO_MIMES = ["video/mp4", "video/webm", "video/avi", "video/mpeg", "video/quicktime"];

const BLOCKED_EXTENSIONS = [
  ".exe", ".js", ".bat", ".php", ".zip", ".cmd", ".sh", ".py", ".msi", ".jar", ".bin", ".vbs"
];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB limit
const MAX_VIDEO_SIZE = 25 * 1024 * 1024; // 25MB video limit

const uploadDir = path.join(process.cwd(), "uploads", "avatars");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const randomName = crypto.randomUUID();
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomName}${ext}`);
  }
});

function isSafeExtension(originalname: string): boolean {
  const ext = path.extname(originalname).toLowerCase();
  return !BLOCKED_EXTENSIONS.includes(ext);
}

export const secureImageUpload = multer({
  storage,
  limits: { fileSize: MAX_IMAGE_SIZE },
  fileFilter: (req, file, cb) => {
    if (!isSafeExtension(file.originalname)) {
      return cb(new Error("Security Error: Executable, scripting, or compressed extensions are blocked."));
    }
    if (!ALLOWED_IMAGE_MIMES.includes(file.mimetype)) {
      return cb(new Error("Security Error: Permitted formats are JPG, JPEG, PNG, and PDF."));
    }
    cb(null, true);
  }
});

export const secureVideoUpload = multer({
  storage,
  limits: { fileSize: MAX_VIDEO_SIZE },
  fileFilter: (req, file, cb) => {
    if (!isSafeExtension(file.originalname)) {
      return cb(new Error("Security Error: Executable or scripting extensions are blocked."));
    }
    if (!ALLOWED_VIDEO_MIMES.includes(file.mimetype)) {
      return cb(new Error("Security Error: Only standard video formats (MP4, WEBM, AVI) are permitted."));
    }
    cb(null, true);
  }
});
