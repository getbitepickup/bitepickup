const multer = require("multer");
const path = require("path");
const { HTTP_STATUS } = require("../utils/constants");

// Configure multer for memory storage (files stored in memory as buffer)
const storage = multer.memoryStorage();

// File filter to accept only images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|heic|heif/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase(),
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(
      new Error(
        "Only image files are allowed (jpeg, jpg, png, gif, webp, heic, heif)",
      ),
    );
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter,
});

// Error handling middleware for multer
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "FILE_TOO_LARGE") {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "File is too large. Maximum size is 5MB.",
      });
    }
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: err.message,
    });
  }

  if (err) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: err.message,
    });
  }

  next();
};

module.exports = {
  upload,
  handleUploadError,
};
