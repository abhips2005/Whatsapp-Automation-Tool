import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

const router = Router();

// Configure multer for image uploads (store in memory for processing)
const storage = multer.memoryStorage();

const imageUpload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (/^image\/(jpeg|png|gif|webp)$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpg, png, gif, webp)'));
    }
  },
  limits: { fileSize: 16 * 1024 * 1024 } // 16MB limit
});

// POST /api/images/upload
router.post('/upload', imageUpload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const uploadPath = path.join(__dirname, '../../uploads/');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    const originalName = req.file.originalname;
    const ext = path.extname(originalName).toLowerCase();
    const baseName = path.basename(originalName, ext);
    const timestamp = Date.now();
    let outExt = ext;
    let outMime = req.file.mimetype;
    let outBuffer = req.file.buffer;

    // Compress if file is > 1MB or not already webp/jpeg
    if (req.file.size > 1024 * 1024 || !['.jpg', '.jpeg', '.webp'].includes(ext)) {
      // Convert to webp for best compression
      outExt = '.webp';
      outMime = 'image/webp';
      outBuffer = await sharp(req.file.buffer)
        .webp({ quality: 80 })
        .toBuffer();
    }

    // Save compressed image
    const outFileName = `${timestamp}-${baseName}${outExt}`;
    const outFilePath = path.join(uploadPath, outFileName);
    fs.writeFileSync(outFilePath, outBuffer);

    res.json({ filePath: `/uploads/${outFileName}` });
  } catch (err) {
    console.error('Image processing error:', err);
    res.status(500).json({ error: 'Failed to process image' });
  }
});

export default router; 