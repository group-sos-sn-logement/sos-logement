const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
  folder: "properties",
  resource_type: "auto", // 👈 مهم جدا
  allowed_formats: ["jpg", "png", "jpeg", "mp4", "mov"]
}
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
  if (
    file.mimetype.startsWith("image/") ||
    file.mimetype.startsWith("video/")
  ) {
    cb(null, true);
  } else {
    cb(new Error("Images & Videos only ❌"), false);
  }
}
});

module.exports = upload;
