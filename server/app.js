const express = require('express')
const mongoConnect = require('./mongo-connect.js')
const mapData = require('./map-data.js')
const app = express()

app.use(mapData(mongoConnect))

app.get('/health', async (req, res) => {
  res.sendStatus(200)
})

module.exports = app
