const multer = require('multer')
const path = require('path')
const fs = require('fs')

const uploadsDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../../uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(uploadsDir, req.user._id.toString())
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    const name = `${file.fieldname}-${Date.now()}${ext}`
    cb(null, name)
  },
})

const fileFilter = (req, file, cb) => {
  const allowedVideo = ['video/mp4', 'video/webm', 'video/quicktime', 'video/avi', 'video/x-msvideo']
  const allowedAudio = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/ogg', 'audio/webm', 'audio/x-m4a']

  if (file.fieldname === 'video' && allowedVideo.includes(file.mimetype)) {
    return cb(null, true)
  }
  if (file.fieldname === 'audio' && allowedAudio.includes(file.mimetype)) {
    return cb(null, true)
  }
  if (file.mimetype === 'video/webm' || file.mimetype === 'audio/webm') {
    return cb(null, true)
  }
  cb(new Error(`Unsupported file type: ${file.mimetype}`), false)
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 104857600, // 100MB
  },
})

module.exports = upload