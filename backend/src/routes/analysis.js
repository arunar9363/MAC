const express = require('express')
const router = express.Router()
const { protect } = require('../middleware/auth')
const upload = require('../middleware/upload')
const {
  runAnalysis,
  getAnalyses,
  getAnalysis,
  downloadPDF,
  getStats,
} = require('../controllers/analysisController')

// All protected
router.use(protect)

router.get('/stats', getStats)
router.get('/', getAnalyses)
router.get('/:id', getAnalysis)
router.get('/:id/pdf', downloadPDF)
router.post('/run',
  upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'audio', maxCount: 1 },
  ]),
  runAnalysis
)

module.exports = router
