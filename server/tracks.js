const Router = require('express')
const router = new Router()

const init = mongoConnect => {
  router.get('/tracks/geojson', async (req, res) => {
    const collection = await mongoConnect.getTracksWithRoadsCollection()
    const minUse = req.query.minUse ? parseInt(req.query.minUse) : 2
    const resultFroMDb = await collection.aggregate([
      { $unwind: '$roadIds' },
      { $group: { _id: '$roadIds', count: { $sum: 1 } } },
      { $match: { count: { $gte: minUse } } },
      { $lookup: { from: 'shapefile', foreignField: '_id', localField: '_id', as: 'road' } },
      { $project: { useCount: '$count', road: { $arrayElemAt: ['$road', 0] } } }
    ]).toArray()

    return res.json({
      type: 'FeatureCollection',
      features: resultFroMDb.map(x => ({
        type: 'Feature',
        properties: {
          useCount: x.useCount
        },
        geometry: x.road.geoJson
      }), [])
    })
  })

  router.get('/tracks/maxuse', async (req, res) => {
    const collection = await mongoConnect.getTracksWithRoadsCollection()
    const resultFroMDb = (await collection.aggregate([
      { $unwind: '$roadIds' },
      { $group: { _id: '$roadIds', count: { $sum: 1 } } },
      { $group: { _id: null, max: { $max: '$count' } } }
    ]).toArray())[0].max
    res.json(resultFroMDb)
  })

  return router
}

const tracks = init
module.exports = tracks
