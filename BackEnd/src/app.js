const express = require('express');
const aiRoutes = require('./routes/ai.routes')
const cors = require('cors')

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
}))


// Basic hardening: avoid accidental huge payloads
app.use(express.json({ limit: "256kb" }))

app.get('/', (req, res) => {
    res.send('Hello World')
})

app.use('/ai', aiRoutes)

module.exports = app