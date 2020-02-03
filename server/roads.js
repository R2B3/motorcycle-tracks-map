
const Router = require('express')
const router = new Router()

const init = mongoConnect => {
  router.get('/roads/geojson', async (req, res) => {
    const collection = await mongoConnect.getShapefileCollection()
    let { lonMin, lonMax, latMin, latMax } = req.query
    lonMin = parseFloat(lonMin)
    lonMax = parseFloat(lonMax)
    latMin = parseFloat(latMin)
    latMax = parseFloat(latMax)

    const searchPolygon = [[
      [lonMin, latMax],
      [lonMax, latMax],
      [lonMax, latMin],
      [lonMin, latMin],
      [lonMin, latMax]
    ]]

    const resultFroMDb = await collection.aggregate([
      {
        $match:
          {
            geoJson: {
              $geoWithin: {
                $geometry: {
                  type: 'Polygon',
                  coordinates: searchPolygon
                }
              }
            }
          }
      }
    ]).toArray()

    return res.json({
      type: 'FeatureCollection',
      features: resultFroMDb.map(x => ({
        type: 'Feature',
        properties: {
          name: x.objId
        },
        geometry: x.geoJson
      }), [])
    })
  })

  return router
}

const roads = init
module.exports = roads
