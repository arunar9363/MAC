const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const path = require('path')
require('dotenv').config()

const connectDB = require('./utils/db')
const authRoutes = require('./routes/auth')
const analysisRoutes = require('./routes/analysis')

const app = express()

connectDB()

app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }))
app.use(morgan('dev'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/uploads', express.static(path.join(__dirname, '../../uploads')))
app.use('/api/auth', authRoutes)
app.use('/api/analyses', analysisRoutes)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'MAC Medical API' })
})

app.use((req, res) => res.status(404).json({ message: 'Route not found' }))

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
})

const PORT = process.env.PORT || 5000
const server = app.listen(PORT, () => {
  console.log(`🧠 MAC Medical API running on http://localhost:${PORT}`)
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌  Port ${PORT} is already in use.`)
    console.error(`   Windows: netstat -ano | findstr :${PORT}  →  taskkill /PID <pid> /F`)
    console.error(`   Mac/Linux: lsof -ti:${PORT} | xargs kill -9`)
    console.error(`   Or set a different PORT in backend/.env (e.g. PORT=5001)\n`)
    process.exit(1)
  } else {
    throw err
  }
})
