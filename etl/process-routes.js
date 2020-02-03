const fs = require('fs')
const convert = require('xml-js')

const MongoClient = require('mongodb').MongoClient
const mongoDbUrl = 'mongodb://localhost:27017'

const curry = require('lodash/fp/curry')
const _get = require('lodash/get')
const _isArray = require('lodash/isArray')
const _chunk = require('lodash/chunk')

const doWork = async () => {
  const tracksDirectory = './etl/tracks'
  const dbName = 'mopped'
  const tracksWithRoadsCollectionName = 'tracks-with-roads'

  const connection = await MongoClient.connect(mongoDbUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })

  const db = await connection.db(dbName)
  const tracksWithRoadsCollection = await db.collection(tracksWithRoadsCollectionName)
  await preCleanup(tracksWithRoadsCollection)

  const shapeFileCollection = await db.collection('shapefile')
  const getClosestRoadFct = await getClosestRoadsFromDb(shapeFileCollection)

  const trackPaths = fs.readdirSync(tracksDirectory).map(x => `${tracksDirectory}/${x}`)

  // When I use map, I create an array of Promises waiting to be resolved which are all bulk write operations. 
  // This makes the program eventually crash.
  // return Promise.all(_chunk(trackPaths.slice(0, 2000), 1000).map(async (trackFilePaths, index) => {
  //   console.log(index * 1000)
  //   const inserts = (await Promise.all(trackFilePaths.map(async x => getInsertForOneTrack(x, getClosestRoadFct)))).filter(x => x !== null)
  //   return tracksWithRoadsCollection.bulkWrite(inserts)
  // }))

  // Here, after each chunk, I do a bulk write, wait for it to resolve and return to the next iteration of reduce
  return _chunk(trackPaths, 1000).reduce(async (agg, trackFilePaths, index) => {
    await agg
    console.log(index * 1000)
    const inserts = (await Promise.all(trackFilePaths.map(async x => getInsertForOneTrack(x, getClosestRoadFct)))).filter(x => x !== null)
    await tracksWithRoadsCollection.bulkWrite(inserts)
    return agg
  }, Promise.resolve(0))
}

const preCleanup = async (tracksWithRoadsCollection) => tracksWithRoadsCollection.deleteMany({})

// const groupAndCountRoads = (tracksWithRoadsCollection) => {
  // tracksWithRoadsCollection.aggregate([
  //   { $unwind: '$roadIds' },
  //   { $group: { _id: '$roadIds', count: { $sum: 1 } } },
  //   { $match: { count: { $gt: 1 } } }
  // ])
// }

const getInsertForOneTrack = async (pathToTrack, getClosestRoadFct) => {
  try {
    const xml = fs.readFileSync(pathToTrack, 'utf8')
    const json = convert.xml2js(xml, { compact: true, ignoreComment: true, alwaysChildren: true })
    const coordinates = getArrayOfArrayOfCoordinates(json)
    if (coordinates.length === 0) return null

    const coordinateResults = await getResultFromCoordinates(coordinates, getClosestRoadFct)
    return (({ insertOne: { ...coordinateResults, roadIds: Array.from(coordinateResults.roadIds), coordinates } }))
    // return tracksWithRoadsCollection.insertOne({ ...coordinateResults, roadIds: Array.from(coordinateResults.roadIds), coordinates })
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
    success: [],
    noResult: [],
    ambigousResult: []
  }

  return coordinates.reduce(async (agg, current) => {
    const newAgg = await agg
    const currentResult = await getClosestRoadsFct(current)
    if (currentResult.length === 0) newAgg.noResult.push(current)
    if (currentResult.length >= 1) {
      newAgg.roadIds.add(currentResult[0]._id)
      newAgg.success.push(current)
    }
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
