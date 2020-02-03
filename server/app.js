const express = require('express')
const mongoConnect = require('./mongo-connect.js')
const tracks = require('./tracks.js')
const roads = require('./roads.js')
const points = require('./points.js')
const app = express()

app.use(tracks(mongoConnect))
app.use(roads(mongoConnect))
app.use(points(mongoConnect))

app.get('/health', async (req, res) => {
  res.sendStatus(200)
})

module.exports = app
