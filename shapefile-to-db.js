const shapefile = require('shapefile')
const fs = require('fs')
const MongoClient = require('mongodb').MongoClient
const mongoDbUrl = 'mongodb://localhost:27017'
const mongoClient = new MongoClient(mongoDbUrl, { useNewUrlParser: true, useUnifiedTopology: true })
const mongoConnection = mongoClient.connect().catch(error => console.log(error))
const SHAPEFILE_PATH = 'ver01_l.shp'

// Both utm and utm-latlng return same coordinates (as it seems). One of either can be removed
const utm1 = require('utm')
const UTM_ZONE_NUM = 32
const UTM_ZONE_LETTER = 'U'

const utmObj = require('utm-latlng')
const utm2 = new utmObj()

// # source.read() <>
// Returns a Promise for the next record from the underlying stream. The yielded result is an object with the following properties:

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
      // coordinates: coordinates.map(x => utm1.toLatLon(x[0], x[1], UTM_ZONE_NUM, UTM_ZONE_LETTER)).map(x => ([x.longitude, x.latitude])),
      coordinates: coordinates.map(x => utm2.convertUtmToLatLng(x[0], x[1], UTM_ZONE_NUM, UTM_ZONE_LETTER)).map(x => ([x.lng, x.lat]))
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

//   {
//     "_id" : ObjectId("5e2755f18eab6b4fe0d0badc"),
//     "type" : "Feature",
//     "properties" : {
//         "LAND" : "FR",
//         "MODELLART" : "DLM1000",
//         "OBJART" : "42003",
//         "OBJART_TXT" : "AX_Strassenachse",
//         "OBJID" : "DEBKGDL100000IFP",
//         "HDU_X" : null,
//         "BEGINN" : "2018-12-31T08:00:00Z",
//         "ENDE" : null,
//         "OBJART_Z" : "42002",
//         "OBJID_Z" : "DEBKGDL100005L48",
//         "BEZ" : "D437",
//         "FSZ" : 2,
//         "FTR" : null,
//         "IBD" : null,
//         "WDM" : null,
//         "ZUS" : null,
//         "BEMERKUNG" : "primary route",
//         "SYMBOLNR" : "42003_102"
//     },
//     "geometry" : {
//         "type" : "LineString",
//         "coordinates" : [
//             [
//                 318501.785924221,
//                 5214093.35207233
//             ],
//             [
//                 318292.688344192,
//                 5214164.01703589
//             ],
//             [
//                 318158.608399048,
//                 5214175.10555059
//             ],
//             [
//                 318045.964105944,
//                 5214172.58585099
//             ],
//             [
//                 317686.596689292,
//                 5214116.60657968
//             ]
//         ]
//     }
// }
