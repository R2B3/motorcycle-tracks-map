const fs = require('fs')
const convert = require('xml-js')
const Mongo = require('mongodb')
const MongoClient = require('mongodb').MongoClient
const mongoDbUrl = 'mongodb://localhost:27017'

const curry = require('lodash/fp/curry')
const _get = require('lodash/get')
const _isArray = require('lodash/isArray')
const _chunk = require('lodash/chunk')

const doWork = async () => {
  const tracksDirectory = './tracks'
  const dbName = 'mopped'
  const tracksWithRoadsCollectionName = 'tracks-with-roads' // 'tracks-with-roads'

  const connection = await MongoClient.connect(mongoDbUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })

  const db = await connection.db(dbName)
  const tracksWithRoadsCollection = await db.collection(tracksWithRoadsCollectionName)
  await preCleanup(tracksWithRoadsCollection)

  const countryCollection = await db.collection('countries')
  const getCountryFct = await getCountryFromDb(countryCollection)
  
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
    const inserts = (await Promise.all(trackFilePaths.map(async x => getInsertForOneTrack(x, getCountryFct, getClosestRoadFct)))).filter(x => x !== null)
    await tracksWithRoadsCollection.bulkWrite(inserts)
    return agg
  }, Promise.resolve(0))
}

const preCleanup = async (tracksWithRoadsCollection) => tracksWithRoadsCollection.deleteMany({})


const getInsertForOneTrack = async (pathToTrack, getCountryFct, getClosestRoadFct) => {
  try {
    const xml = fs.readFileSync(pathToTrack, 'utf8')
    const json = convert.xml2js(xml, { compact: true, ignoreComment: true, alwaysChildren: true })
    const coordinates = getArrayOfArrayOfCoordinates(json)
    if (coordinates.length === 0) return null

    const coordinateResults = await getResultFromCoordinates(coordinates, getCountryFct, getClosestRoadFct)
    // include country but not coordinates
    return (({ insertOne: { ...coordinateResults, roadIds: Array.from(coordinateResults.roadIds).map(x => new Mongo.ObjectID(x) ), countries: Array.from(coordinateResults.countries) }, coordinates }))
  } catch (error) {
    console.log(pathToTrack + ': ' + error)
  }
}

// Empty routes don't contain trkpt, in this case return empty string
const getArrayOfArrayOfCoordinates = trackJson => _isArray(_get(trackJson, 'gpx.trk.trkseg.trkpt')) ? _get(trackJson, 'gpx.trk.trkseg.trkpt').map(x => convertCoordinateObjectToArray(x)) : []

const convertCoordinateObjectToArray = x => [parseFloat(x._attributes.lon), parseFloat(x._attributes.lat)]

const getResultFromCoordinates = async (coordinates, getCountryFct, getClosestRoadsFct) => {
  const resultObj = {
    roadIds: new Set(),
    success: [],
    noResult: [],
    ambigousResult: [],
    countries: new Set(),
  }

  return coordinates.reduce(async (agg, current) => {
    const newAgg = await agg
    
    const country = await getCountryFct(current).then(result => result.length === 0 ? null : result[0]._id)
    newAgg.countries.add(country)
    if (country !== 'Germany') return newAgg

    const currentResult = await getClosestRoadsFct(current)
    if (currentResult.length === 0) newAgg.noResult.push(current)
    if (currentResult.length >= 1) {
      newAgg.roadIds.add(currentResult[0]._id.toString())
      newAgg.success.push(current)
    }
    return newAgg
  }, Promise.resolve(resultObj))
}

const getCountryFromDb = curry(async (collection, coordinates) => (
  collection.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates },
        distanceField: 'distance',
        maxDistance: 0,
        spherical: true
      }
    },
    { $project: { _id: '$properties.NAME_ENGL' } }
  ]).toArray()
))

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
