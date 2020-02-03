const shapefile = require('shapefile')
const MongoClient = require('mongodb').MongoClient
const mongoDbUrl = 'mongodb://localhost:27017'
const mongoClient = new MongoClient(mongoDbUrl, { useNewUrlParser: true, useUnifiedTopology: true })
const mongoConnection = mongoClient.connect().catch(error => console.log(error))
const SHAPEFILE_PATH = 'ver01_l.shp'
const utm = require('utm')
const UTM_ZONE_NUM = 32
const UTM_ZONE_LETTER = 'U'

const readShapeFile = async (path, dbCollection) => {
  shapefile.open(path)
    .then(source => source.read()
      .then(function log (result) {
        if (result.done) return
        const document = transformShapeObject(result.value)
        if (document.country === 'DE') writeToDb(dbCollection, document)
        return source.read().then(log)
      }))
    .catch(error => console.error(error.stack))
}

const writeToDb = async (dbCollection, document) => dbCollection.insertOne(document)

const transformShapeObject = shapeObject => {
  const {
    geometry: {
      type,
      coordinates
    },
    properties: {
      LAND: country,
      OBJART_TXT: objType,
      OBJID: objId,
      BEZ: name
    }
  } = shapeObject

  return ({
    geoJson: {
      type,
      coordinates: coordinates.map(x => utm.toLatLon(x[0], x[1], UTM_ZONE_NUM, UTM_ZONE_LETTER)).map(x => ([x.longitude, x.latitude])),
    },
    objId,
    name,
    objType,
    country,
    shapeObject
  })
}

mongoConnection
  .then(() => mongoClient.db('mopped'))
  .then(db => db.collection('shapefile'))
  .then(collection => readShapeFile(SHAPEFILE_PATH, collection))
  .catch(err => console.log(err))
