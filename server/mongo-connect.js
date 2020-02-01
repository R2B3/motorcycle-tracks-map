const MongoClient = require('mongodb').MongoClient
const mongoDbUrl = 'mongodb://localhost:27017'
const mongoClient = new MongoClient(mongoDbUrl, { useNewUrlParser: true, useUnifiedTopology: true })
const mongoConnection = mongoClient.connect().catch(error => console.log(error))

const getTracksWithRoadsCollection = () => mongoConnection
  .then(() => mongoClient.db('mopped'))
  .then(db => db.collection('tracks-with-roads'))
  .catch(err => console.log(err))

module.exports = {
  getTracksWithRoadsCollection
}
