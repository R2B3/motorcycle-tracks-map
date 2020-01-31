const Mongo = require('mongodb')
const fs = require('fs')
const fsp = require('fs').promises
const convert = require('xml-js')
const curry = require('lodash/fp/curry')
const MongoClient = require('mongodb').MongoClient
const mongoDbUrl = 'mongodb://localhost:27017'
const _get = require('lodash/get')
const _isArray = require('lodash/isArray')

const doWork = async () => {
  const tracksDirectory = './tracks'
  const dbName = 'mopped'
  const tracksWithRoadsCollectionName = 'tracks-with-roads'

  const connection = await MongoClient.connect(mongoDbUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })

  const db = await connection.db(dbName)
  const tracksWithRoadsCollection = await db.collection(tracksWithRoadsCollectionName)
  await tracksWithRoadsCollection.deleteMany({})
  const shapeFileCollection = await db.collection('shapefile')
  const trackPaths = (await fsp.readdir(tracksDirectory)).map(x => `${tracksDirectory}/${x}`)
  return trackPaths.slice(0, 100).map(async trackPath => processOneTrack(trackPath, shapeFileCollection, tracksWithRoadsCollection))
}

// const groupAndCountRoads = (tracksWithRoadsCollection) => {
//   tracksWithRoadsCollection.aggregate([
//     { $unwind: '$roadIds' },
//     { $group: { _id: '$roadIds', count: { $sum: 1 } } },
//     { $match: { count: { $gt: 1 } } }
//   ])
// }

const processOneTrack = async (pathToTrack, shapeFileCollection, tracksWithRoadsCollection) => {
  try {
    const xml = fs.readFileSync(pathToTrack, 'utf8')
    const json = convert.xml2js(xml, { compact: true, ignoreComment: true, alwaysChildren: true })
    const coordinates = getArrayOfArrayOfCoordinates(json)
    const getClosestRoadFct = await getClosestRoadsFromDb(shapeFileCollection)
    const coordinateResults = await getResultFromCoordinates(coordinates, getClosestRoadFct)
    return tracksWithRoadsCollection.insertOne({ ...coordinateResults, roadIds: Array.from(coordinateResults.roadIds) })
  } catch (error) {
    console.log(pathToTrack + ': ' + error)
  }
}

// Empty routes don't contain trkpt, in this case return empty string
const getArrayOfArrayOfCoordinates = trackJson => _isArray(_get(trackJson, 'gpx.trk.trkseg.trkpt')) ? _get(trackJson, 'gpx.trk.trkseg.trkpt').map(x => convertCoordinateObjectToArray(x)) : []

const convertCoordinateObjectToArray = x => [parseFloat(x._attributes.lon), parseFloat(x._attributes.lat)]

const getResultFromCoordinates = async (coordinates, getClosestRoadsFct) => {
  const resultObj = {
    roadIds: new Set(),
    noResult: [],
    ambigousResult: []
  }

  return coordinates.reduce(async (agg, current) => {
    const newAgg = await agg
    const currentResult = await getClosestRoadsFct(current)
    if (currentResult.length === 0) newAgg.noResult.push(current)
    if (currentResult.length >= 1) newAgg.roadIds.add(currentResult[0]._id)
    return newAgg
  }, Promise.resolve(resultObj))
}

const getClosestRoadsFromDb = curry(async (collection, coordinates) => (
  collection.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates },
        distanceField: 'distance',
        maxDistance: 500,
        spherical: true
      }
    }
  ]).toArray()
))

doWork().then(() => console.log('Finished'))

module.exports = {

}
