const express = require('express')
const proxy = require('http-proxy-middleware')
const path = require('path')

const app = express()
const backend = 'localhost:3001'

app.use('/tracks/geojson', proxy({ target: backend, changeOrigin: false }))
app.use('/tracks/roads', proxy({ target: backend, changeOrigin: false }))
se(express.static(path.join(__dirname, 'build')))
app.get('/**', function(req, res) {
    res.sendFile(path.join(__dirname, 'build', 'index.html'))
})

app.listen(5000)
